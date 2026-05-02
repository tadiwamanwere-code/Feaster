-- ============================================
-- FEASTER — Critical Security Fixes
-- Applies after 20260502000100_security_hardening.sql
-- ============================================

-- ─── 1. Drivers cannot self-elevate KYC, earnings, rating ──────
-- Original UPDATE policy let a driver update ANY column of their own row.
-- We replace with a column-restricted policy via a BEFORE UPDATE trigger.

drop policy if exists "Drivers self update" on drivers;
create policy "Drivers self update" on drivers
  for update using (auth.uid() = auth_user_id)
  with check (auth.uid() = auth_user_id);

-- Trigger: forbid self-changing of privileged columns
create or replace function drivers_protect_privileged_cols()
returns trigger
language plpgsql
as $$
begin
  -- Allow internal SECURITY DEFINER calls (no auth.uid()) to change anything
  if auth.uid() is null then return new; end if;
  -- Customer-facing UPDATE must preserve these fields
  if old.kyc_status is distinct from new.kyc_status then
    raise exception 'kyc_status cannot be self-modified';
  end if;
  if old.kyc_rejection_reason is distinct from new.kyc_rejection_reason then
    raise exception 'kyc_rejection_reason cannot be self-modified';
  end if;
  if old.is_active is distinct from new.is_active then
    raise exception 'is_active cannot be self-modified';
  end if;
  if old.rating is distinct from new.rating then
    raise exception 'rating cannot be self-modified';
  end if;
  if old.total_deliveries is distinct from new.total_deliveries then
    raise exception 'total_deliveries cannot be self-modified';
  end if;
  if old.total_earnings is distinct from new.total_earnings then
    raise exception 'total_earnings cannot be self-modified';
  end if;
  if old.auth_user_id is distinct from new.auth_user_id then
    raise exception 'auth_user_id cannot be self-modified';
  end if;
  if old.phone is distinct from new.phone then
    raise exception 'phone cannot be self-modified';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_drivers_protect on drivers;
create trigger trg_drivers_protect
before update on drivers
for each row execute function drivers_protect_privileged_cols();

-- Same protection for customers (no self-flipping is_verified, default_address_id rules etc.)
create or replace function customers_protect_privileged_cols()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is null then return new; end if;
  if old.auth_user_id is distinct from new.auth_user_id then
    raise exception 'auth_user_id cannot be self-modified';
  end if;
  if old.phone is distinct from new.phone then
    raise exception 'phone cannot be self-modified';
  end if;
  if old.is_active is distinct from new.is_active then
    raise exception 'is_active cannot be self-modified';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_customers_protect on customers;
create trigger trg_customers_protect
before update on customers
for each row execute function customers_protect_privileged_cols();

-- ─── 2. Orders RLS — restrict to involved parties only ─────────
-- Previous: any authenticated user could read/update ALL orders.
-- New: customer reads own; restaurant admin (any authenticated user with the
-- restaurant in scope) reads/updates orders for their restaurant ONLY.
-- v1: we use auth.uid() existing without explicit restaurant_owner table —
-- the existing app uses email-based admin auth, so any authenticated user
-- accessing /admin/:slug is admin. We pin reads/updates by including a
-- claim check or simply scope by restaurant_id via a security definer RPC.

drop policy if exists "Authenticated reads orders" on orders;
drop policy if exists "Authenticated updates orders" on orders;

-- Customer self-read
drop policy if exists "Customer reads own orders" on orders;
create policy "Customer reads own orders" on orders
  for select using (
    exists (select 1 from customers c where c.id = customer_id and c.auth_user_id = auth.uid())
  );

-- Restaurant-side: any authenticated user can read orders for ANY restaurant
-- they "manage". For now we treat any authenticated email-auth user as
-- a restaurant admin (the existing /admin/:slug enforces UI-level auth).
-- TODO: introduce restaurant_members(restaurant_id, auth_user_id) table for
-- proper scoping. Until then, this is loose — but no longer "any auth user
-- updates ANY order"; only authenticated session can.
drop policy if exists "Restaurant staff reads orders" on orders;
create policy "Restaurant staff reads orders" on orders
  for select to authenticated using (
    -- email-based admin (no phone) → treat as restaurant staff
    (select coalesce((auth.jwt() ->> 'phone'), '')) = ''
  );

drop policy if exists "Restaurant staff updates orders" on orders;
create policy "Restaurant staff updates orders" on orders
  for update to authenticated using (
    (select coalesce((auth.jwt() ->> 'phone'), '')) = ''
  );

-- Customer creates own orders only (replaces the "guest insert allowed" loophole)
drop policy if exists "Customer creates orders" on orders;
create policy "Customer creates orders" on orders
  for insert with check (
    exists (select 1 from customers c where c.id = customer_id and c.auth_user_id = auth.uid())
  );

-- ─── 3. Server-authoritative order pricing RPC ─────────────────
-- Replaces direct INSERT into orders from the client.
-- Reprices items from menu_items, computes totals, validates restaurant.
create or replace function place_order(
  p_restaurant_id uuid,
  p_items jsonb,         -- [{ item_id, quantity, notes }]
  p_order_type text,
  p_payment_method text,
  p_scheduled_for timestamptz default null,
  p_customer_notes text default null
)
returns table (order_id uuid, total numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
  v_caller uuid;
  v_subtotal numeric := 0;
  v_total numeric := 0;
  v_items jsonb := '[]'::jsonb;
  v_item record;
  v_status text;
  v_order_id uuid;
begin
  v_caller := auth.uid();
  if v_caller is null then raise exception 'not authenticated'; end if;

  select id into v_customer_id from customers where auth_user_id = v_caller;
  if v_customer_id is null then raise exception 'customer profile required'; end if;

  if p_order_type not in ('dine_in','pre_order','delivery','takeout') then
    raise exception 'invalid order type';
  end if;
  if p_order_type = 'pre_order' and p_scheduled_for is null then
    raise exception 'pre_order requires scheduled_for';
  end if;

  -- Reprice each line server-side from menu_items
  for v_item in
    select
      (i->>'item_id')::uuid as item_id,
      (i->>'quantity')::int as quantity,
      coalesce(i->>'notes','') as notes
    from jsonb_array_elements(p_items) i
  loop
    if v_item.quantity is null or v_item.quantity < 1 or v_item.quantity > 99 then
      raise exception 'invalid quantity';
    end if;
    declare
      mi record;
    begin
      select id, name, price, is_available, restaurant_id
      into mi from menu_items where id = v_item.item_id;
      if mi is null then raise exception 'menu item not found'; end if;
      if mi.restaurant_id != p_restaurant_id then raise exception 'item not on this menu'; end if;
      if not mi.is_available then raise exception 'item unavailable'; end if;
      v_subtotal := v_subtotal + (mi.price * v_item.quantity);
      v_items := v_items || jsonb_build_object(
        'item_id', mi.id,
        'name', mi.name,
        'quantity', v_item.quantity,
        'price', mi.price,
        'notes', v_item.notes
      );
    end;
  end loop;

  if v_subtotal <= 0 then raise exception 'empty order'; end if;

  v_total := v_subtotal;
  v_status := case
    when p_order_type = 'delivery' then 'pending'
    when p_order_type = 'pre_order' then 'confirmed'
    else 'confirmed'
  end;

  insert into orders (
    restaurant_id, customer_id, items, order_type, payment_method, payment_status,
    subtotal, total, scheduled_for, status, customer_notes, created_at,
    customer_phone, customer_name
  ) values (
    p_restaurant_id, v_customer_id, v_items, p_order_type, p_payment_method, 'pending',
    v_subtotal, v_total, p_scheduled_for, v_status, p_customer_notes, now(),
    (select phone from customers where id = v_customer_id),
    (select full_name from customers where id = v_customer_id)
  ) returning id into v_order_id;

  order_id := v_order_id;
  total := v_total;
  return next;
end;
$$;

revoke all on function place_order(uuid, jsonb, text, text, timestamptz, text) from public, anon;
grant execute on function place_order(uuid, jsonb, text, text, timestamptz, text) to authenticated;

-- ─── 4. Server-authoritative delivery creation ─────────────────
create or replace function create_delivery_for_order(
  p_order_id uuid,
  p_pickup_lat numeric,
  p_pickup_lng numeric,
  p_pickup_address text,
  p_dropoff_lat numeric,
  p_dropoff_lng numeric,
  p_dropoff_address text
)
returns table (delivery_id uuid, total_fee numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
  v_caller uuid;
  v_quote record;
  v_delivery_id uuid;
  v_city text;
begin
  v_caller := auth.uid();
  if v_caller is null then raise exception 'not authenticated'; end if;

  -- Validate caller owns the order
  select o.*, r.city
  into v_order
  from orders o
  inner join customers c on c.id = o.customer_id
  inner join restaurants r on r.id = o.restaurant_id
  where o.id = p_order_id and c.auth_user_id = v_caller;

  if v_order is null then raise exception 'order not found or not yours'; end if;
  if v_order.order_type != 'delivery' then raise exception 'order not a delivery'; end if;

  -- Validate lat/lng
  if p_pickup_lat is null or p_pickup_lng is null
     or p_dropoff_lat is null or p_dropoff_lng is null then
    raise exception 'coordinates required';
  end if;
  if p_pickup_lat not between -90 and 90 or p_dropoff_lat not between -90 and 90
     or p_pickup_lng not between -180 and 180 or p_dropoff_lng not between -180 and 180 then
    raise exception 'invalid coordinates';
  end if;

  v_city := coalesce(v_order.city, 'Harare');

  -- Server-computed quote
  select * into v_quote from calculate_delivery_fee(
    v_city, p_pickup_lat, p_pickup_lng, p_dropoff_lat, p_dropoff_lng
  );

  insert into deliveries (
    order_id, customer_id, restaurant_id,
    pickup_address, pickup_lat, pickup_lng,
    dropoff_address, dropoff_lat, dropoff_lng,
    distance_km, base_fee_usd, per_km_fee_usd, surge_multiplier,
    total_fee_usd, driver_earnings_usd, platform_commission_usd,
    status
  ) values (
    p_order_id, v_order.customer_id, v_order.restaurant_id,
    p_pickup_address, p_pickup_lat, p_pickup_lng,
    p_dropoff_address, p_dropoff_lat, p_dropoff_lng,
    v_quote.distance_km, v_quote.base_fee, v_quote.per_km_fee, v_quote.surge,
    v_quote.total, v_quote.driver_earnings, v_quote.platform_commission,
    'pending'
  ) returning id into v_delivery_id;

  -- Update order with the server-computed delivery_fee + total
  update orders set
    delivery_fee = v_quote.total,
    total = subtotal + v_quote.total
  where id = p_order_id;

  delivery_id := v_delivery_id;
  total_fee := v_quote.total;
  return next;
end;
$$;

revoke all on function create_delivery_for_order(uuid, numeric, numeric, text, numeric, numeric, text) from public, anon;
grant execute on function create_delivery_for_order(uuid, numeric, numeric, text, numeric, numeric, text) to authenticated;

-- ─── 5. Anonymized open-delivery feed for drivers ──────────────
-- Drivers should not see customer dropoff_address or precise lat/lng of
-- pending deliveries until they win the offer. Return distance + obfuscated
-- pickup info only.
create or replace function get_open_deliveries_near_me(
  p_lat numeric,
  p_lng numeric,
  p_radius_km numeric default 15,
  p_limit integer default 30
)
returns table (
  id uuid,
  restaurant_id uuid,
  restaurant_name text,
  restaurant_logo text,
  pickup_lat numeric,
  pickup_lng numeric,
  pickup_address text,
  -- Dropoff hidden until accepted; only show distance + suburb-precision (~1km)
  dropoff_lat_approx numeric,
  dropoff_lng_approx numeric,
  distance_km numeric,
  total_fee_usd numeric,
  driver_earnings_usd numeric,
  platform_commission_usd numeric,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_caller uuid;
  v_driver record;
begin
  v_caller := auth.uid();
  if v_caller is null then raise exception 'not authenticated'; end if;

  select * into v_driver from drivers where auth_user_id = v_caller;
  if v_driver is null or v_driver.kyc_status != 'approved' or not v_driver.is_online then
    return;
  end if;

  return query
  select
    d.id,
    d.restaurant_id,
    r.name,
    r.logo_url,
    d.pickup_lat,
    d.pickup_lng,
    d.pickup_address,
    -- ~1.1km grid: round to 2 decimal places (~1.1km at equator)
    round(d.dropoff_lat::numeric, 2),
    round(d.dropoff_lng::numeric, 2),
    haversine_km(p_lat, p_lng, d.pickup_lat, d.pickup_lng),
    d.total_fee_usd,
    d.driver_earnings_usd,
    d.platform_commission_usd,
    d.created_at
  from deliveries d
  inner join restaurants r on r.id = d.restaurant_id
  where d.status = 'pending'
    and d.created_at > now() - interval '20 minutes'
    and haversine_km(p_lat, p_lng, d.pickup_lat, d.pickup_lng) <= p_radius_km
  order by haversine_km(p_lat, p_lng, d.pickup_lat, d.pickup_lng) asc
  limit p_limit;
end;
$$;

revoke all on function get_open_deliveries_near_me(numeric, numeric, numeric, integer) from public, anon;
grant execute on function get_open_deliveries_near_me(numeric, numeric, numeric, integer) to authenticated;

-- Tighten driver-side delivery read: drivers can ONLY see deliveries assigned
-- to them, not all pending (use the RPC instead).
drop policy if exists "Deliveries driver read" on deliveries;
create policy "Deliveries driver read" on deliveries
  for select using (
    exists (select 1 from drivers d where d.id = driver_id and d.auth_user_id = auth.uid())
  );

-- ─── 6. State-transition RPCs (replace raw UPDATEs) ────────────
-- Enforces the legal state machine and verifies caller is the assigned driver.

create or replace function driver_advance_delivery(
  p_delivery_id uuid,
  p_target_status text
)
returns table (success boolean, error text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid;
  v_driver record;
  v_delivery record;
  v_legal_transitions jsonb := jsonb_build_object(
    'awaiting_pickup', jsonb_build_array('picked_up','cancelled','failed'),
    'picked_up',       jsonb_build_array('in_transit','cancelled','failed'),
    'in_transit',      jsonb_build_array('arrived','cancelled','failed'),
    'arrived',         jsonb_build_array('delivered','failed')
  );
begin
  v_caller := auth.uid();
  if v_caller is null then return query select false, 'not authenticated'; return; end if;

  select * into v_driver from drivers where auth_user_id = v_caller;
  if v_driver is null then return query select false, 'driver not found'; return; end if;

  select * into v_delivery from deliveries
  where id = p_delivery_id and driver_id = v_driver.id
  for update;
  if v_delivery is null then return query select false, 'not your delivery'; return; end if;

  if not (v_legal_transitions ? v_delivery.status) or
     not (v_legal_transitions->v_delivery.status @> to_jsonb(p_target_status)) then
    return query select false, format('illegal transition %s -> %s', v_delivery.status, p_target_status);
    return;
  end if;

  update deliveries set
    status = p_target_status,
    picked_up_at = case when p_target_status = 'picked_up' then now() else picked_up_at end,
    updated_at = now()
  where id = p_delivery_id;

  return query select true, null::text;
end;
$$;

revoke all on function driver_advance_delivery(uuid, text) from public, anon;
grant execute on function driver_advance_delivery(uuid, text) to authenticated;

-- ─── 7. complete_delivery — idempotent + state-checked ─────────
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
  v_caller uuid;
  v_driver_owner uuid;
begin
  v_caller := auth.uid();
  if v_caller is null then return query select false, 'not authenticated'; return; end if;

  select auth_user_id into v_driver_owner from drivers where id = p_driver_id;
  if v_driver_owner is null or v_driver_owner != v_caller then
    return query select false, 'forbidden'; return;
  end if;

  select * into v_delivery from deliveries
  where id = p_delivery_id and driver_id = p_driver_id
  for update;
  if v_delivery is null then return query select false, 'delivery not found'; return; end if;

  -- Idempotency: never credit twice
  if v_delivery.status = 'delivered' then
    return query select false, 'already delivered'; return;
  end if;

  if v_delivery.status not in ('in_transit','arrived') then
    return query select false, 'delivery not in deliverable state'; return;
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

revoke all on function complete_delivery(uuid, uuid) from public, anon;
grant execute on function complete_delivery(uuid, uuid) to authenticated;

-- ─── 8. accept_delivery_offer — enforce expires_at + idempotency ─
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
  v_caller uuid;
begin
  v_caller := auth.uid();
  if v_caller is null then
    return query select false, 'not authenticated', null::uuid; return;
  end if;

  select * into v_offer from dispatch_offers
  where id = p_offer_id and driver_id = p_driver_id and status = 'open'
  for update;
  if v_offer is null then
    return query select false, 'offer not found or not open', null::uuid; return;
  end if;

  if v_offer.expires_at is not null and v_offer.expires_at < now() then
    update dispatch_offers set status = 'expired' where id = p_offer_id;
    return query select false, 'offer expired', null::uuid; return;
  end if;

  -- Caller must be the customer who owns this delivery
  select dv.* into v_delivery
  from deliveries dv
  inner join customers c on c.id = dv.customer_id
  where dv.id = v_offer.delivery_id
    and dv.status = 'pending'
    and c.auth_user_id = v_caller
  for update;
  if v_delivery is null then
    return query select false, 'delivery not yours or already assigned', null::uuid; return;
  end if;

  -- Charge driver wallet (using internal helper that bypasses caller-check)
  perform internal_wallet_transact(
    p_driver_id,
    -v_delivery.platform_commission_usd,
    'commission_charge',
    'delivery',
    v_delivery.id,
    null, null,
    'Commission for delivery ' || v_delivery.id
  );

  if (select balance_usd from driver_wallets where driver_id = p_driver_id) < 0 then
    perform internal_wallet_transact(
      p_driver_id, v_delivery.platform_commission_usd, 'commission_refund',
      'delivery', v_delivery.id, null, null, 'Auto-refund (insufficient balance)'
    );
    return query select false, 'driver wallet insufficient', null::uuid; return;
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

revoke all on function accept_delivery_offer(uuid, uuid) from public, anon;
grant execute on function accept_delivery_offer(uuid, uuid) to authenticated;

-- ─── 9. cancel_delivery RPC with auth + commission refund ──────
create or replace function cancel_delivery(
  p_delivery_id uuid,
  p_reason text default null
)
returns table (success boolean, error text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid;
  v_delivery record;
  v_customer_id uuid;
  v_driver_owner uuid;
  v_is_customer boolean := false;
  v_is_driver boolean := false;
begin
  v_caller := auth.uid();
  if v_caller is null then return query select false, 'not authenticated'; return; end if;

  select * into v_delivery from deliveries where id = p_delivery_id for update;
  if v_delivery is null then return query select false, 'delivery not found'; return; end if;

  if v_delivery.status in ('delivered','cancelled','failed') then
    return query select false, 'already finalized'; return;
  end if;

  -- Verify caller is involved
  select id into v_customer_id from customers where auth_user_id = v_caller;
  if v_customer_id = v_delivery.customer_id then v_is_customer := true; end if;

  if v_delivery.driver_id is not null then
    select auth_user_id into v_driver_owner from drivers where id = v_delivery.driver_id;
    if v_driver_owner = v_caller then v_is_driver := true; end if;
  end if;

  if not (v_is_customer or v_is_driver) then
    return query select false, 'forbidden'; return;
  end if;

  -- If driver was assigned and commission charged, refund it
  if v_delivery.driver_id is not null and v_delivery.status != 'pending' then
    perform internal_wallet_transact(
      v_delivery.driver_id,
      v_delivery.platform_commission_usd,
      'commission_refund',
      'delivery',
      p_delivery_id,
      null, null,
      'Refund — delivery cancelled'
    );
  end if;

  update deliveries set
    status = 'cancelled',
    cancelled_at = now(),
    cancellation_reason = p_reason,
    updated_at = now()
  where id = p_delivery_id;

  return query select true, null::text;
end;
$$;

revoke all on function cancel_delivery(uuid, text) from public, anon;
grant execute on function cancel_delivery(uuid, text) to authenticated;

-- ─── 10. wallet_transactions — explicit INSERT policy ──────────
-- Drivers can only insert pending top-ups for themselves. Everything else
-- must go through SECURITY DEFINER RPCs.
drop policy if exists "Wallet txn driver insert pending topup" on wallet_transactions;
create policy "Wallet txn driver insert pending topup" on wallet_transactions
  for insert to authenticated with check (
    kind = 'topup'
    and status = 'pending'
    and balance_after = 0
    and amount_usd > 0
    and exists (select 1 from drivers d where d.id = driver_id and d.auth_user_id = auth.uid())
  );

-- ─── 11. Deliveries — explicit UPDATE policy via RPCs only ─────
-- We don't grant a generic UPDATE policy; transitions go through the
-- driver_advance_delivery / complete_delivery / cancel_delivery RPCs which
-- run as SECURITY DEFINER and check authorization themselves.
-- Belt-and-braces: revoke direct table updates from public.
revoke update on deliveries from public, anon, authenticated;

-- ─── 12. Offer policy — also require online ────────────────────
drop policy if exists "Offers driver insert" on dispatch_offers;
create policy "Offers driver insert" on dispatch_offers
  for insert with check (
    exists (
      select 1 from drivers d
      where d.id = driver_id
        and d.auth_user_id = auth.uid()
        and d.kyc_status = 'approved'
        and d.is_active = true
        and d.is_online = true
    )
  );

-- ─── 13. Latitude/longitude bounds checks ──────────────────────
do $$
begin
  -- customer_addresses
  begin
    alter table customer_addresses add constraint chk_addr_lat check (latitude between -90 and 90);
  exception when duplicate_object then null; end;
  begin
    alter table customer_addresses add constraint chk_addr_lng check (longitude between -180 and 180);
  exception when duplicate_object then null; end;
  -- deliveries
  begin
    alter table deliveries add constraint chk_pickup_lat check (pickup_lat between -90 and 90);
  exception when duplicate_object then null; end;
  begin
    alter table deliveries add constraint chk_pickup_lng check (pickup_lng between -180 and 180);
  exception when duplicate_object then null; end;
  begin
    alter table deliveries add constraint chk_dropoff_lat check (dropoff_lat between -90 and 90);
  exception when duplicate_object then null; end;
  begin
    alter table deliveries add constraint chk_dropoff_lng check (dropoff_lng between -180 and 180);
  exception when duplicate_object then null; end;
end $$;
