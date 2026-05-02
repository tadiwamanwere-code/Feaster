-- ============================================
-- FEASTER — Final RLS Audit & Hardening
-- Closes the remaining cross-user-data gaps surfaced by live-DB audit.
-- ============================================

-- ─── 1. is_platform_admin() helper ─────────────────────────────
-- All restaurant management uses email auth (no phone claim in JWT).
-- Customers and drivers always have a phone claim. We use that as the
-- admin signal until a proper restaurant_members table is added.
create or replace function is_platform_admin()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  jwt_phone text;
  jwt_role text;
begin
  jwt_phone := coalesce(auth.jwt() ->> 'phone', '');
  jwt_role  := coalesce(auth.jwt() ->> 'role', '');
  -- Email-auth admin: no phone claim AND authenticated role.
  return jwt_phone = '' and jwt_role = 'authenticated';
end;
$$;

revoke all on function is_platform_admin() from public, anon;
grant execute on function is_platform_admin() to authenticated;

-- ─── 2. Lock down restaurants / menu_items / tables writes ─────
-- These were left wide open by the original supabase-setup.sql:
-- ANY authenticated user (customers + drivers included) could write.

drop policy if exists "Authenticated can insert restaurants" on restaurants;
drop policy if exists "Authenticated can update restaurants" on restaurants;
drop policy if exists "Authenticated can delete restaurants" on restaurants;

create policy "Admin inserts restaurants" on restaurants
  for insert to authenticated with check (is_platform_admin());
create policy "Admin updates restaurants" on restaurants
  for update to authenticated using (is_platform_admin()) with check (is_platform_admin());
create policy "Admin deletes restaurants" on restaurants
  for delete to authenticated using (is_platform_admin());

drop policy if exists "Authenticated can insert menu items" on menu_items;
drop policy if exists "Authenticated can update menu items" on menu_items;
drop policy if exists "Authenticated can delete menu items" on menu_items;

create policy "Admin inserts menu items" on menu_items
  for insert to authenticated with check (is_platform_admin());
create policy "Admin updates menu items" on menu_items
  for update to authenticated using (is_platform_admin()) with check (is_platform_admin());
create policy "Admin deletes menu items" on menu_items
  for delete to authenticated using (is_platform_admin());

drop policy if exists "Authenticated can insert tables" on tables;
drop policy if exists "Authenticated can delete tables" on tables;

create policy "Admin inserts tables" on tables
  for insert to authenticated with check (is_platform_admin());
create policy "Admin deletes tables" on tables
  for delete to authenticated using (is_platform_admin());

-- ─── 3. customer_addresses — split FOR ALL, add WITH CHECK ─────
-- Original "Addresses self all" used FOR ALL with USING only.
-- During UPDATE, a customer could change customer_id to point at another
-- user. Splitting policies + adding WITH CHECK forbids this.

drop policy if exists "Addresses self all" on customer_addresses;

create policy "Addresses self select" on customer_addresses
  for select using (
    exists (select 1 from customers c where c.id = customer_id and c.auth_user_id = auth.uid())
  );

create policy "Addresses self insert" on customer_addresses
  for insert with check (
    exists (select 1 from customers c where c.id = customer_id and c.auth_user_id = auth.uid())
  );

create policy "Addresses self update" on customer_addresses
  for update
  using (
    exists (select 1 from customers c where c.id = customer_id and c.auth_user_id = auth.uid())
  )
  with check (
    -- After-state customer_id must still belong to caller — blocks ownership transfer
    exists (select 1 from customers c where c.id = customer_id and c.auth_user_id = auth.uid())
  );

create policy "Addresses self delete" on customer_addresses
  for delete using (
    exists (select 1 from customers c where c.id = customer_id and c.auth_user_id = auth.uid())
  );

-- ─── 4. customers / drivers — add WITH CHECK on self-update ────
-- Triggers already block privileged-column changes; WITH CHECK is a second layer.
drop policy if exists "Customers self update" on customers;
create policy "Customers self update" on customers
  for update
  using (auth.uid() = auth_user_id)
  with check (auth.uid() = auth_user_id);

drop policy if exists "Drivers self update" on drivers;
create policy "Drivers self update" on drivers
  for update
  using (auth.uid() = auth_user_id)
  with check (auth.uid() = auth_user_id);

-- ─── 5. Customer access to driver info via SECURITY DEFINER RPCs ─
-- Drivers table stays self-read-only. Customers see ONLY what they need
-- (name, phone, vehicle, rating, live location) and only when there's an
-- active offer or delivery linking them.

create or replace function get_driver_for_delivery(p_delivery_id uuid)
returns table (
  id uuid,
  full_name text,
  phone text,
  vehicle_type text,
  vehicle_make text,
  vehicle_model text,
  vehicle_color text,
  vehicle_plate text,
  rating numeric,
  total_deliveries integer,
  current_lat numeric,
  current_lng numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_caller uuid;
begin
  v_caller := auth.uid();
  if v_caller is null then return; end if;

  return query
  select
    d.id, d.full_name, d.phone,
    d.vehicle_type, d.vehicle_make, d.vehicle_model, d.vehicle_color, d.vehicle_plate,
    d.rating, d.total_deliveries, d.current_lat, d.current_lng
  from drivers d
  inner join deliveries dv on dv.driver_id = d.id
  inner join customers c on c.id = dv.customer_id
  where dv.id = p_delivery_id and c.auth_user_id = v_caller;
end;
$$;

revoke all on function get_driver_for_delivery(uuid) from public, anon;
grant execute on function get_driver_for_delivery(uuid) to authenticated;

-- For the offer-pick screen: customers see all open offers' drivers (safe cols only)
create or replace function get_offers_for_my_delivery(p_delivery_id uuid)
returns table (
  offer_id uuid,
  driver_id uuid,
  offer_amount_usd numeric,
  est_arrival_min integer,
  expires_at timestamptz,
  driver_name text,
  vehicle_type text,
  vehicle_plate text,
  rating numeric,
  total_deliveries integer,
  current_lat numeric,
  current_lng numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_caller uuid;
begin
  v_caller := auth.uid();
  if v_caller is null then return; end if;

  return query
  select
    o.id, o.driver_id, o.offer_amount_usd, o.est_arrival_min, o.expires_at,
    d.full_name, d.vehicle_type, d.vehicle_plate, d.rating, d.total_deliveries,
    d.current_lat, d.current_lng
  from dispatch_offers o
  inner join deliveries dv on dv.id = o.delivery_id
  inner join customers c on c.id = dv.customer_id
  inner join drivers d on d.id = o.driver_id
  where o.delivery_id = p_delivery_id
    and c.auth_user_id = v_caller
    and o.status = 'open'
    and (o.expires_at is null or o.expires_at > now())
  order by o.offer_amount_usd asc;
end;
$$;

revoke all on function get_offers_for_my_delivery(uuid) from public, anon;
grant execute on function get_offers_for_my_delivery(uuid) to authenticated;

-- ─── 6. Admin RPCs for KYC review ──────────────────────────────
-- Admins need to flip kyc_status, but the drivers_protect_privileged_cols
-- trigger blocks self-modification. SECURITY DEFINER bypasses auth.uid()
-- check inside the trigger (we set search_path so this is consistent).

create or replace function admin_review_driver_kyc(
  p_driver_id uuid,
  p_approve boolean,
  p_reason text default null
)
returns table (success boolean, error text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin boolean;
begin
  v_admin := is_platform_admin();
  if not v_admin then return query select false, 'admin only'; return; end if;

  -- Bypass the privileged-column trigger by clearing auth context inside this func.
  -- (The trigger's `if auth.uid() is null then return new;` short-circuits.)
  perform set_config('request.jwt.claims', '', true);

  update drivers set
    kyc_status = case when p_approve then 'approved' else 'rejected' end,
    kyc_rejection_reason = case when p_approve then null else p_reason end,
    updated_at = now()
  where id = p_driver_id;

  return query select true, null::text;
end;
$$;

revoke all on function admin_review_driver_kyc(uuid, boolean, text) from public, anon;
grant execute on function admin_review_driver_kyc(uuid, boolean, text) to authenticated;

-- Admin reads of driver_documents (so they can see uploaded files for review)
drop policy if exists "Admin reads driver docs" on driver_documents;
create policy "Admin reads driver docs" on driver_documents
  for select to authenticated using (is_platform_admin());

drop policy if exists "Admin updates driver docs" on driver_documents;
create policy "Admin updates driver docs" on driver_documents
  for update to authenticated using (is_platform_admin()) with check (is_platform_admin());

-- Same for driver-docs storage bucket (admins read everything in driver-docs/*)
drop policy if exists "Admin reads driver doc files" on storage.objects;
create policy "Admin reads driver doc files" on storage.objects
  for select using (
    bucket_id = 'driver-docs' and is_platform_admin()
  );

-- ─── 7. Admin can read drivers/customers for ops ───────────────
drop policy if exists "Admin reads drivers" on drivers;
create policy "Admin reads drivers" on drivers
  for select to authenticated using (is_platform_admin());

drop policy if exists "Admin reads customers" on customers;
create policy "Admin reads customers" on customers
  for select to authenticated using (is_platform_admin());

drop policy if exists "Admin reads deliveries" on deliveries;
create policy "Admin reads deliveries" on deliveries
  for select to authenticated using (is_platform_admin());

-- ─── 8. Wallet transactions — admin can credit/debit (manual ops) ─
-- This is a last-resort manual control for the admin UI: complete a pending
-- top-up, issue a bonus, fix a mistake. Goes through a single SECURITY
-- DEFINER RPC so all moves are logged.

create or replace function admin_complete_topup(p_txn_id uuid)
returns table (success boolean, error text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin boolean;
  v_txn record;
begin
  v_admin := is_platform_admin();
  if not v_admin then return query select false, 'admin only'; return; end if;

  select * into v_txn from wallet_transactions
  where id = p_txn_id and kind = 'topup' and status = 'pending'
  for update;
  if v_txn is null then return query select false, 'pending top-up not found'; return; end if;

  perform internal_wallet_transact(
    v_txn.driver_id,
    v_txn.amount_usd,
    'topup',
    'topup',
    v_txn.id,
    v_txn.payment_method,
    v_txn.payment_reference,
    'Admin-confirmed top-up'
  );

  update wallet_transactions set status = 'completed' where id = p_txn_id;

  return query select true, null::text;
end;
$$;

revoke all on function admin_complete_topup(uuid) from public, anon;
grant execute on function admin_complete_topup(uuid) to authenticated;

-- ─── 9. Force RLS on owners (defence in depth) ─────────────────
-- By default RLS doesn't apply to a table's owner. Forcing means even
-- the postgres role honours RLS unless they explicitly bypass.
-- (SECURITY DEFINER funcs run with definer rights and ignore RLS, which
-- is what we want — nothing else changes.)
alter table customers force row level security;
alter table customer_addresses force row level security;
alter table drivers force row level security;
alter table driver_documents force row level security;
alter table driver_wallets force row level security;
alter table wallet_transactions force row level security;
alter table deliveries force row level security;
alter table dispatch_offers force row level security;
alter table orders force row level security;
alter table pin_attempts force row level security;
alter table auth_rate_limits force row level security;

-- Done.
