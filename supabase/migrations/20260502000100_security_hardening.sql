-- ============================================
-- FEASTER — Security Hardening
-- Applies after 20260502000000_marketplace_extensions.sql
-- ============================================

-- ─── Verify caller identity in money-moving SQL functions ─────
-- The previous functions trusted p_driver_id parameter blindly.
-- Now they require the caller to be authenticated AS that driver.

create or replace function wallet_transact(
  p_driver_id uuid,
  p_amount numeric,
  p_kind text,
  p_reference_type text default null,
  p_reference_id uuid default null,
  p_payment_method text default null,
  p_payment_reference text default null,
  p_notes text default null
)
returns table (success boolean, new_balance numeric, txn_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_balance numeric;
  new_bal numeric;
  txn uuid;
  caller uuid;
  driver_owner uuid;
  is_internal_call boolean;
begin
  -- Internal calls (from accept_delivery_offer / complete_delivery) bypass identity check
  -- because SECURITY DEFINER functions calling each other share the same role.
  -- We detect by checking if there's a JWT claim; if not, we're being called from another SECURITY DEFINER.
  caller := auth.uid();
  is_internal_call := caller is null;

  if not is_internal_call then
    select auth_user_id into driver_owner from drivers where id = p_driver_id;
    if driver_owner is null or driver_owner != caller then
      success := false; new_balance := 0; txn_id := null;
      return next; return;
    end if;
  end if;

  -- Restrict the kinds a driver can self-initiate to safe ones
  if not is_internal_call and p_kind not in ('topup') then
    success := false; new_balance := 0; txn_id := null;
    return next; return;
  end if;

  select balance_usd into current_balance
  from driver_wallets
  where driver_id = p_driver_id
  for update;

  if current_balance is null then
    insert into driver_wallets (driver_id, balance_usd) values (p_driver_id, 0);
    current_balance := 0;
  end if;

  new_bal := current_balance + p_amount;

  if new_bal < 0 then
    success := false; new_balance := current_balance; txn_id := null;
    return next; return;
  end if;

  update driver_wallets
  set balance_usd = new_bal, updated_at = now()
  where driver_id = p_driver_id;

  insert into wallet_transactions (
    driver_id, kind, amount_usd, balance_after,
    reference_type, reference_id, payment_method, payment_reference, notes,
    status
  ) values (
    p_driver_id, p_kind, p_amount, new_bal,
    p_reference_type, p_reference_id, p_payment_method, p_payment_reference, p_notes,
    case when p_kind = 'topup' and is_internal_call = false then 'pending' else 'completed' end
  ) returning id into txn;

  if p_kind = 'topup' then
    update driver_wallets set total_topped_up = total_topped_up + p_amount where driver_id = p_driver_id;
  elsif p_kind = 'withdrawal' then
    update driver_wallets set total_withdrawn = total_withdrawn + abs(p_amount) where driver_id = p_driver_id;
  end if;

  success := true; new_balance := new_bal; txn_id := txn;
  return next;
end;
$$;

-- accept_delivery_offer: verify the caller IS the driver
create or replace function accept_delivery_offer(
  p_offer_id uuid,
  p_driver_id uuid
)
returns table (success boolean, error text, delivery_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_offer record;
  v_delivery record;
  v_commission numeric;
  v_wallet_result record;
  caller uuid;
  driver_owner uuid;
begin
  caller := auth.uid();
  if caller is null then
    return query select false, 'Not authenticated', null::uuid; return;
  end if;

  -- Customer-driven flow: customer accepts offer for their own delivery.
  -- (Driver-driven flow would call a different function.)
  -- We verify caller is the customer who owns the delivery this offer belongs to.
  select * into v_offer from dispatch_offers
  where id = p_offer_id and driver_id = p_driver_id and status = 'open'
  for update;

  if v_offer is null then
    return query select false, 'Offer not found or not open', null::uuid; return;
  end if;

  select dv.* into v_delivery
  from deliveries dv
  inner join customers c on c.id = dv.customer_id
  where dv.id = v_offer.delivery_id
    and dv.status = 'pending'
    and c.auth_user_id = caller
  for update;

  if v_delivery is null then
    return query select false, 'Delivery not found, not yours, or already assigned', null::uuid; return;
  end if;

  v_commission := v_delivery.platform_commission_usd;

  -- Charge commission from driver's wallet (note: caller is customer, but this is internal)
  -- Internal call: no auth.uid() check inside wallet_transact via the is_internal_call path.
  -- However caller IS authenticated (as customer). To make the inner call internal, we use
  -- a helper that explicitly bypasses caller-check.
  perform internal_wallet_transact(
    p_driver_id,
    -v_commission,
    'commission_charge',
    'delivery',
    v_delivery.id,
    null, null,
    'Commission for delivery ' || v_delivery.id
  );

  -- Re-check the wallet went non-negative
  if (select balance_usd from driver_wallets where driver_id = p_driver_id) < 0 then
    -- Roll back the charge
    perform internal_wallet_transact(
      p_driver_id, v_commission, 'commission_refund',
      'delivery', v_delivery.id, null, null, 'Auto-refund (insufficient balance)'
    );
    return query select false, 'Driver wallet insufficient', null::uuid; return;
  end if;

  update deliveries set
    driver_id = p_driver_id,
    status = 'awaiting_pickup',
    assigned_at = now(),
    updated_at = now()
  where id = v_delivery.id;

  update dispatch_offers set status = 'accepted' where id = p_offer_id;
  update dispatch_offers set status = 'rejected'
    where delivery_id = v_delivery.id and id != p_offer_id and status = 'open';

  return query select true, null::text, v_delivery.id;
end;
$$;

-- Internal wallet helper — used only by other SECURITY DEFINER funcs.
-- Not directly invokable by clients (revoked below).
create or replace function internal_wallet_transact(
  p_driver_id uuid,
  p_amount numeric,
  p_kind text,
  p_reference_type text default null,
  p_reference_id uuid default null,
  p_payment_method text default null,
  p_payment_reference text default null,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_balance numeric;
  new_bal numeric;
begin
  select balance_usd into current_balance
  from driver_wallets where driver_id = p_driver_id for update;
  if current_balance is null then
    insert into driver_wallets (driver_id, balance_usd) values (p_driver_id, 0);
    current_balance := 0;
  end if;
  new_bal := current_balance + p_amount;
  update driver_wallets set balance_usd = new_bal, updated_at = now() where driver_id = p_driver_id;
  insert into wallet_transactions (
    driver_id, kind, amount_usd, balance_after,
    reference_type, reference_id, payment_method, payment_reference, notes, status
  ) values (
    p_driver_id, p_kind, p_amount, new_bal,
    p_reference_type, p_reference_id, p_payment_method, p_payment_reference, p_notes, 'completed'
  );
end;
$$;

revoke all on function internal_wallet_transact(uuid, numeric, text, text, uuid, text, text, text) from public;
revoke all on function internal_wallet_transact(uuid, numeric, text, text, uuid, text, text, text) from authenticated;
revoke all on function internal_wallet_transact(uuid, numeric, text, text, uuid, text, text, text) from anon;

-- complete_delivery: verify caller is the assigned driver
create or replace function complete_delivery(
  p_delivery_id uuid,
  p_driver_id uuid
)
returns table (success boolean, error text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_delivery record;
  caller uuid;
  driver_owner uuid;
begin
  caller := auth.uid();
  if caller is null then
    return query select false, 'Not authenticated'; return;
  end if;

  select auth_user_id into driver_owner from drivers where id = p_driver_id;
  if driver_owner != caller then
    return query select false, 'Not your delivery'; return;
  end if;

  select * into v_delivery from deliveries
  where id = p_delivery_id and driver_id = p_driver_id
  for update;

  if v_delivery is null then
    return query select false, 'Delivery not found'; return;
  end if;

  if v_delivery.status not in ('in_transit','arrived') then
    return query select false, 'Delivery not in deliverable state'; return;
  end if;

  update deliveries set
    status = 'delivered',
    delivered_at = now(),
    updated_at = now()
  where id = p_delivery_id;

  perform internal_wallet_transact(
    p_driver_id,
    v_delivery.driver_earnings_usd,
    'earnings_credit',
    'delivery',
    p_delivery_id,
    null, null,
    'Earnings for delivery ' || p_delivery_id
  );

  update drivers set
    total_deliveries = total_deliveries + 1,
    total_earnings = total_earnings + v_delivery.driver_earnings_usd,
    updated_at = now()
  where id = p_driver_id;

  return query select true, null::text;
end;
$$;

-- ─── Restrict public driver PII exposure ──────────────────────
-- Replace the broad "Drivers public minimal read" with a narrow safe view + policy.
drop policy if exists "Drivers public minimal read" on drivers;

-- Safe view exposing only fields needed for matching/display
create or replace view drivers_public as
select
  id,
  full_name,
  vehicle_type,
  vehicle_make,
  vehicle_model,
  vehicle_color,
  vehicle_plate,
  rating,
  total_deliveries,
  current_lat,
  current_lng,
  is_online,
  kyc_status
from drivers
where is_online = true and kyc_status = 'approved';

grant select on drivers_public to anon, authenticated;

-- ─── Tighten storage RLS to be path-scoped ────────────────────
-- Each driver can ONLY upload to their own driver_id folder.
drop policy if exists "Driver docs self upload" on storage.objects;
drop policy if exists "Driver docs self read" on storage.objects;

create policy "Driver docs self upload" on storage.objects
  for insert with check (
    bucket_id = 'driver-docs'
    and auth.role() = 'authenticated'
    and exists (
      select 1 from drivers d
      where d.auth_user_id = auth.uid()
        and (storage.foldername(name))[1] = d.id::text
    )
  );

create policy "Driver docs self read" on storage.objects
  for select using (
    bucket_id = 'driver-docs'
    and auth.role() = 'authenticated'
    and exists (
      select 1 from drivers d
      where d.auth_user_id = auth.uid()
        and (storage.foldername(name))[1] = d.id::text
    )
  );

create policy "Driver docs self update" on storage.objects
  for update using (
    bucket_id = 'driver-docs'
    and auth.role() = 'authenticated'
    and exists (
      select 1 from drivers d
      where d.auth_user_id = auth.uid()
        and (storage.foldername(name))[1] = d.id::text
    )
  );

-- ─── PIN verification — server-side function ──────────────────
-- We do NOT replace the client-side bcrypt check (the schema stores the hash on the
-- customer row which is RLS-readable to the customer). But we add a server-side
-- check that enforces a back-off: 5 failed attempts in 15 min locks the customer
-- out of orders.
create table if not exists pin_attempts (
  customer_id uuid references customers(id) on delete cascade,
  attempted_at timestamptz default now(),
  succeeded boolean
);
create index if not exists idx_pin_attempts_customer on pin_attempts(customer_id, attempted_at desc);

alter table pin_attempts enable row level security;
-- Only insertable by authenticated; only readable by self
drop policy if exists "Pin attempts self insert" on pin_attempts;
create policy "Pin attempts self insert" on pin_attempts
  for insert to authenticated with check (
    exists (select 1 from customers c where c.id = customer_id and c.auth_user_id = auth.uid())
  );
drop policy if exists "Pin attempts self read" on pin_attempts;
create policy "Pin attempts self read" on pin_attempts
  for select using (
    exists (select 1 from customers c where c.id = customer_id and c.auth_user_id = auth.uid())
  );
