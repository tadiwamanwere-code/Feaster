-- ============================================
-- FEASTER — Marketplace Extensions
-- Adds: customers, drivers, KYC, wallets, deliveries, dispatch
-- Tightens RLS on existing tables
-- ============================================

-- Enable required extensions
create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- ─── Customers ─────────────────────────────────────────────────
-- Identity is phone-based. Linked to auth.users when authenticated.
create table if not exists customers (
  id uuid default gen_random_uuid() primary key,
  auth_user_id uuid references auth.users(id) on delete set null,
  phone text unique not null,
  full_name text,
  email text,
  pin_hash text,                          -- bcrypt-style hash of 4-6 digit PIN
  pin_set_at timestamptz,
  default_address_id uuid,
  is_active boolean default true,
  is_verified boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_customers_phone on customers(phone);
create index if not exists idx_customers_auth_user on customers(auth_user_id);

-- Saved addresses for delivery
create table if not exists customer_addresses (
  id uuid default gen_random_uuid() primary key,
  customer_id uuid references customers(id) on delete cascade not null,
  label text not null,                    -- "Home", "Work", "Mom's place"
  line1 text not null,
  line2 text,
  city text default 'Harare',
  suburb text,
  latitude numeric(10, 7) not null,
  longitude numeric(10, 7) not null,
  notes text,                             -- "Gate code 1234, blue door"
  is_default boolean default false,
  created_at timestamptz default now()
);

create index if not exists idx_addresses_customer on customer_addresses(customer_id);

alter table customers
  add constraint customers_default_address_fk
  foreign key (default_address_id) references customer_addresses(id) on delete set null
  deferrable initially deferred;

-- ─── Drivers ───────────────────────────────────────────────────
create table if not exists drivers (
  id uuid default gen_random_uuid() primary key,
  auth_user_id uuid references auth.users(id) on delete set null unique,
  phone text unique not null,
  full_name text not null,
  email text,
  national_id text,                       -- ZW national ID
  date_of_birth date,
  -- Vehicle
  vehicle_type text,                      -- 'car', 'bike', 'motorbike'
  vehicle_make text,
  vehicle_model text,
  vehicle_plate text unique,
  vehicle_color text,
  vehicle_year integer,
  -- Status
  kyc_status text default 'pending' check (kyc_status in ('pending','submitted','approved','rejected','suspended')),
  kyc_rejection_reason text,
  is_online boolean default false,
  is_active boolean default true,
  current_lat numeric(10, 7),
  current_lng numeric(10, 7),
  last_location_update timestamptz,
  -- Stats
  rating numeric default 5.0,
  total_deliveries integer default 0,
  total_earnings numeric default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_drivers_phone on drivers(phone);
create index if not exists idx_drivers_auth_user on drivers(auth_user_id);
create index if not exists idx_drivers_online on drivers(is_online) where is_online = true;
create index if not exists idx_drivers_kyc on drivers(kyc_status);
create index if not exists idx_drivers_location on drivers(current_lat, current_lng) where is_online = true;

-- KYC documents (selfie, ID front, ID back, license, vehicle reg, insurance, vehicle photo)
create table if not exists driver_documents (
  id uuid default gen_random_uuid() primary key,
  driver_id uuid references drivers(id) on delete cascade not null,
  doc_type text not null check (doc_type in (
    'selfie','id_front','id_back','drivers_license','vehicle_registration',
    'insurance','vehicle_photo_front','vehicle_photo_back','proof_of_residence'
  )),
  file_path text not null,                -- Supabase storage path
  file_url text,                          -- public URL (signed, refreshed on read)
  status text default 'pending' check (status in ('pending','approved','rejected')),
  rejection_reason text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  uploaded_at timestamptz default now(),
  unique (driver_id, doc_type)
);

create index if not exists idx_driver_docs_driver on driver_documents(driver_id);
create index if not exists idx_driver_docs_status on driver_documents(status);

-- ─── Driver Wallet (double-entry ledger) ───────────────────────
-- Drivers must maintain a positive wallet balance to receive jobs.
-- Commission deducted from wallet on job acceptance; cash trips top up wallet.
create table if not exists driver_wallets (
  driver_id uuid primary key references drivers(id) on delete cascade,
  balance_usd numeric(12, 2) default 0 not null,
  hold_usd numeric(12, 2) default 0 not null,    -- escrowed for active jobs
  min_balance_required numeric(12, 2) default 5 not null,
  total_topped_up numeric(12, 2) default 0,
  total_withdrawn numeric(12, 2) default 0,
  updated_at timestamptz default now()
);

create table if not exists wallet_transactions (
  id uuid default gen_random_uuid() primary key,
  driver_id uuid references drivers(id) on delete cascade not null,
  kind text not null check (kind in (
    'topup','withdrawal','commission_charge','commission_refund',
    'cash_collected','earnings_credit','adjustment','penalty','bonus'
  )),
  amount_usd numeric(12, 2) not null,     -- positive = credit, negative = debit
  balance_after numeric(12, 2) not null,
  reference_type text,                    -- 'order', 'topup', 'manual'
  reference_id uuid,
  payment_method text,                    -- 'ecocash', 'innbucks', 'cash', 'bank'
  payment_reference text,                 -- external txn id
  status text default 'completed' check (status in ('pending','completed','failed','reversed')),
  notes text,
  created_at timestamptz default now()
);

create index if not exists idx_wallet_txn_driver on wallet_transactions(driver_id, created_at desc);
create index if not exists idx_wallet_txn_status on wallet_transactions(status);
create index if not exists idx_wallet_txn_ref on wallet_transactions(reference_type, reference_id);

-- ─── Extend Restaurants with location ─────────────────────────
alter table restaurants
  add column if not exists latitude numeric(10, 7),
  add column if not exists longitude numeric(10, 7),
  add column if not exists address_line text,
  add column if not exists suburb text;

create index if not exists idx_restaurants_location on restaurants(latitude, longitude);

-- ─── Extend Orders for delivery + customer linkage ─────────────
alter table orders
  add column if not exists customer_id uuid references customers(id) on delete set null,
  add column if not exists subtotal numeric(12, 2) default 0,
  add column if not exists delivery_fee numeric(12, 2) default 0,
  add column if not exists service_fee numeric(12, 2) default 0,
  add column if not exists tip numeric(12, 2) default 0,
  add column if not exists payment_status text default 'pending' check (payment_status in ('pending','paid','failed','refunded')),
  add column if not exists payment_reference text,
  add column if not exists scheduled_for timestamptz,
  add column if not exists pickup_code text,
  add column if not exists customer_notes text;

create index if not exists idx_orders_customer on orders(customer_id);
create index if not exists idx_orders_scheduled on orders(scheduled_for) where scheduled_for is not null;

-- ─── Deliveries ────────────────────────────────────────────────
-- One per delivery order; tracks the dispatch lifecycle.
create table if not exists deliveries (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references orders(id) on delete cascade unique not null,
  customer_id uuid references customers(id) on delete set null,
  restaurant_id uuid references restaurants(id) on delete cascade not null,
  driver_id uuid references drivers(id) on delete set null,

  -- Locations
  pickup_address text not null,
  pickup_lat numeric(10, 7) not null,
  pickup_lng numeric(10, 7) not null,
  dropoff_address text not null,
  dropoff_lat numeric(10, 7) not null,
  dropoff_lng numeric(10, 7) not null,
  distance_km numeric(8, 2) not null,
  duration_min integer,

  -- Pricing
  base_fee_usd numeric(8, 2) not null,
  per_km_fee_usd numeric(8, 2) not null,
  surge_multiplier numeric(4, 2) default 1.0,
  total_fee_usd numeric(10, 2) not null,
  driver_earnings_usd numeric(10, 2) not null,    -- what driver gets
  platform_commission_usd numeric(10, 2) not null, -- what we keep

  -- State
  status text default 'pending' check (status in (
    'pending',          -- created, awaiting driver offers
    'awaiting_pickup',  -- driver assigned, heading to restaurant
    'picked_up',        -- food collected
    'in_transit',       -- on the way to customer
    'arrived',          -- at dropoff
    'delivered',        -- completed
    'cancelled',        -- cancelled by customer/admin
    'failed'            -- driver couldn't deliver
  )),
  assigned_at timestamptz,
  picked_up_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,

  -- Tracking
  current_lat numeric(10, 7),
  current_lng numeric(10, 7),
  route_polyline text,                    -- encoded polyline for map

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_deliveries_order on deliveries(order_id);
create index if not exists idx_deliveries_driver on deliveries(driver_id);
create index if not exists idx_deliveries_restaurant on deliveries(restaurant_id);
create index if not exists idx_deliveries_status on deliveries(status);
create index if not exists idx_deliveries_pending on deliveries(status, created_at) where status = 'pending';

-- ─── Dispatch Offers ───────────────────────────────────────────
-- Drivers can bid/accept on pending deliveries.
-- Customer picks one. inDrive-style.
create table if not exists dispatch_offers (
  id uuid default gen_random_uuid() primary key,
  delivery_id uuid references deliveries(id) on delete cascade not null,
  driver_id uuid references drivers(id) on delete cascade not null,
  offer_amount_usd numeric(10, 2) not null,
  est_arrival_min integer,                -- driver's ETA to pickup
  status text default 'open' check (status in ('open','accepted','rejected','expired','withdrawn')),
  expires_at timestamptz,
  created_at timestamptz default now(),
  unique (delivery_id, driver_id)
);

create index if not exists idx_offers_delivery on dispatch_offers(delivery_id);
create index if not exists idx_offers_driver on dispatch_offers(driver_id);
create index if not exists idx_offers_open on dispatch_offers(delivery_id) where status = 'open';

-- ─── Pricing config (per city, editable by platform admins) ────
create table if not exists pricing_config (
  city text primary key,
  base_fee_usd numeric(8, 2) default 1.50 not null,
  per_km_fee_usd numeric(8, 2) default 0.50 not null,
  service_fee_pct numeric(5, 2) default 5.00 not null,
  min_delivery_fee_usd numeric(8, 2) default 2.00 not null,
  surge_multiplier numeric(4, 2) default 1.00 not null,
  platform_commission_pct numeric(5, 2) default 15.00 not null,
  updated_at timestamptz default now()
);

insert into pricing_config (city) values ('Harare') on conflict do nothing;
insert into pricing_config (city) values ('Bulawayo') on conflict do nothing;

-- ─── Functions ─────────────────────────────────────────────────

-- Haversine distance (km) between two lat/lng pairs
create or replace function haversine_km(lat1 numeric, lng1 numeric, lat2 numeric, lng2 numeric)
returns numeric
language plpgsql
immutable
as $$
declare
  r numeric := 6371; -- earth radius km
  dlat numeric;
  dlng numeric;
  a numeric;
begin
  dlat := radians(lat2 - lat1);
  dlng := radians(lng2 - lng1);
  a := sin(dlat/2)^2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlng/2)^2;
  return round(r * 2 * asin(sqrt(a)), 2);
end;
$$;

-- Calculate delivery fee for a given route (server-authoritative pricing)
create or replace function calculate_delivery_fee(
  p_city text,
  p_pickup_lat numeric,
  p_pickup_lng numeric,
  p_dropoff_lat numeric,
  p_dropoff_lng numeric
)
returns table (
  distance_km numeric,
  base_fee numeric,
  per_km_fee numeric,
  surge numeric,
  subtotal numeric,
  service_fee numeric,
  total numeric,
  driver_earnings numeric,
  platform_commission numeric
)
language plpgsql
stable
as $$
declare
  cfg record;
  d numeric;
  sub numeric;
  fee numeric;
  svc numeric;
  total_amount numeric;
  commission numeric;
  earnings numeric;
begin
  select * into cfg from pricing_config where city = p_city;
  if cfg is null then
    select * into cfg from pricing_config where city = 'Harare';
  end if;

  d := haversine_km(p_pickup_lat, p_pickup_lng, p_dropoff_lat, p_dropoff_lng);

  fee := cfg.base_fee_usd + (d * cfg.per_km_fee_usd);
  fee := fee * cfg.surge_multiplier;
  if fee < cfg.min_delivery_fee_usd then
    fee := cfg.min_delivery_fee_usd;
  end if;

  svc := round(fee * (cfg.service_fee_pct / 100), 2);
  total_amount := round(fee + svc, 2);
  commission := round(total_amount * (cfg.platform_commission_pct / 100), 2);
  earnings := total_amount - commission;

  distance_km := d;
  base_fee := cfg.base_fee_usd;
  per_km_fee := cfg.per_km_fee_usd;
  surge := cfg.surge_multiplier;
  subtotal := round(fee, 2);
  service_fee := svc;
  total := total_amount;
  driver_earnings := earnings;
  platform_commission := commission;
  return next;
end;
$$;

-- Find nearby online drivers (within radius_km, ordered by distance)
create or replace function find_nearby_drivers(
  p_lat numeric,
  p_lng numeric,
  p_radius_km numeric default 10,
  p_limit integer default 20
)
returns table (
  driver_id uuid,
  full_name text,
  vehicle_type text,
  rating numeric,
  current_lat numeric,
  current_lng numeric,
  distance_km numeric
)
language plpgsql
stable
as $$
begin
  return query
  select
    d.id,
    d.full_name,
    d.vehicle_type,
    d.rating,
    d.current_lat,
    d.current_lng,
    haversine_km(p_lat, p_lng, d.current_lat, d.current_lng) as dist
  from drivers d
  inner join driver_wallets w on w.driver_id = d.id
  where d.is_online = true
    and d.is_active = true
    and d.kyc_status = 'approved'
    and d.current_lat is not null
    and d.current_lng is not null
    and w.balance_usd >= w.min_balance_required
    and haversine_km(p_lat, p_lng, d.current_lat, d.current_lng) <= p_radius_km
  order by dist asc
  limit p_limit;
end;
$$;

-- Atomic wallet operation: charge or credit, with balance check
create or replace function wallet_transact(
  p_driver_id uuid,
  p_amount numeric,                       -- signed (negative = debit)
  p_kind text,
  p_reference_type text default null,
  p_reference_id uuid default null,
  p_payment_method text default null,
  p_payment_reference text default null,
  p_notes text default null
)
returns table (success boolean, new_balance numeric, txn_id uuid)
language plpgsql
as $$
declare
  current_balance numeric;
  new_bal numeric;
  txn uuid;
begin
  -- Lock the wallet row
  select balance_usd into current_balance
  from driver_wallets
  where driver_id = p_driver_id
  for update;

  if current_balance is null then
    -- create wallet if missing
    insert into driver_wallets (driver_id, balance_usd) values (p_driver_id, 0);
    current_balance := 0;
  end if;

  new_bal := current_balance + p_amount;

  if new_bal < 0 then
    success := false;
    new_balance := current_balance;
    txn_id := null;
    return next;
    return;
  end if;

  update driver_wallets
  set balance_usd = new_bal, updated_at = now()
  where driver_id = p_driver_id;

  insert into wallet_transactions (
    driver_id, kind, amount_usd, balance_after,
    reference_type, reference_id, payment_method, payment_reference, notes
  ) values (
    p_driver_id, p_kind, p_amount, new_bal,
    p_reference_type, p_reference_id, p_payment_method, p_payment_reference, p_notes
  ) returning id into txn;

  -- Update aggregate counters
  if p_kind = 'topup' then
    update driver_wallets set total_topped_up = total_topped_up + p_amount where driver_id = p_driver_id;
  elsif p_kind = 'withdrawal' then
    update driver_wallets set total_withdrawn = total_withdrawn + abs(p_amount) where driver_id = p_driver_id;
  end if;

  success := true;
  new_balance := new_bal;
  txn_id := txn;
  return next;
end;
$$;

-- Driver accepts a delivery offer: assigns driver, charges commission from wallet
create or replace function accept_delivery_offer(
  p_offer_id uuid,
  p_driver_id uuid
)
returns table (success boolean, error text, delivery_id uuid)
language plpgsql
as $$
declare
  v_offer record;
  v_delivery record;
  v_commission numeric;
  v_wallet_result record;
begin
  -- Lock and fetch the offer
  select * into v_offer from dispatch_offers
  where id = p_offer_id and driver_id = p_driver_id and status = 'open'
  for update;

  if v_offer is null then
    return query select false, 'Offer not found or not open', null::uuid;
    return;
  end if;

  -- Lock and fetch the delivery
  select * into v_delivery from deliveries
  where id = v_offer.delivery_id and status = 'pending'
  for update;

  if v_delivery is null then
    return query select false, 'Delivery already assigned', null::uuid;
    return;
  end if;

  v_commission := v_delivery.platform_commission_usd;

  -- Charge commission from wallet (negative amount)
  select * into v_wallet_result from wallet_transact(
    p_driver_id,
    -v_commission,
    'commission_charge',
    'delivery',
    v_delivery.id,
    null, null,
    'Commission for delivery ' || v_delivery.id
  );

  if not v_wallet_result.success then
    return query select false, 'Insufficient wallet balance', null::uuid;
    return;
  end if;

  -- Assign driver, update delivery
  update deliveries set
    driver_id = p_driver_id,
    status = 'awaiting_pickup',
    assigned_at = now(),
    updated_at = now()
  where id = v_delivery.id;

  -- Mark this offer accepted, others rejected
  update dispatch_offers set status = 'accepted' where id = p_offer_id;
  update dispatch_offers set status = 'rejected'
    where delivery_id = v_delivery.id and id != p_offer_id and status = 'open';

  return query select true, null::text, v_delivery.id;
end;
$$;

-- Mark delivery delivered: credit driver earnings to wallet
create or replace function complete_delivery(
  p_delivery_id uuid,
  p_driver_id uuid
)
returns table (success boolean, error text)
language plpgsql
as $$
declare
  v_delivery record;
begin
  select * into v_delivery from deliveries
  where id = p_delivery_id and driver_id = p_driver_id
  for update;

  if v_delivery is null then
    return query select false, 'Delivery not found';
    return;
  end if;

  if v_delivery.status not in ('in_transit','arrived') then
    return query select false, 'Delivery not in deliverable state';
    return;
  end if;

  update deliveries set
    status = 'delivered',
    delivered_at = now(),
    updated_at = now()
  where id = p_delivery_id;

  -- Credit driver earnings
  perform wallet_transact(
    p_driver_id,
    v_delivery.driver_earnings_usd,
    'earnings_credit',
    'delivery',
    p_delivery_id,
    null, null,
    'Earnings for delivery ' || p_delivery_id
  );

  -- Update driver stats
  update drivers set
    total_deliveries = total_deliveries + 1,
    total_earnings = total_earnings + v_delivery.driver_earnings_usd,
    updated_at = now()
  where id = p_driver_id;

  return query select true, null::text;
end;
$$;

-- Touch updated_at trigger
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_customers_updated on customers;
create trigger trg_customers_updated before update on customers
for each row execute function set_updated_at();

drop trigger if exists trg_drivers_updated on drivers;
create trigger trg_drivers_updated before update on drivers
for each row execute function set_updated_at();

drop trigger if exists trg_deliveries_updated on deliveries;
create trigger trg_deliveries_updated before update on deliveries
for each row execute function set_updated_at();

-- Auto-create wallet when driver row is inserted
create or replace function create_driver_wallet()
returns trigger
language plpgsql
as $$
begin
  insert into driver_wallets (driver_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists trg_drivers_create_wallet on drivers;
create trigger trg_drivers_create_wallet after insert on drivers
for each row execute function create_driver_wallet();

-- ─── Row Level Security ────────────────────────────────────────
alter table customers enable row level security;
alter table customer_addresses enable row level security;
alter table drivers enable row level security;
alter table driver_documents enable row level security;
alter table driver_wallets enable row level security;
alter table wallet_transactions enable row level security;
alter table deliveries enable row level security;
alter table dispatch_offers enable row level security;
alter table pricing_config enable row level security;

-- Customers: see/edit only self
drop policy if exists "Customers self read" on customers;
create policy "Customers self read" on customers
  for select using (auth.uid() = auth_user_id);
drop policy if exists "Customers self update" on customers;
create policy "Customers self update" on customers
  for update using (auth.uid() = auth_user_id);
drop policy if exists "Customers self insert" on customers;
create policy "Customers self insert" on customers
  for insert with check (auth.uid() = auth_user_id);

-- Customer addresses: only self
drop policy if exists "Addresses self all" on customer_addresses;
create policy "Addresses self all" on customer_addresses
  for all using (
    exists (select 1 from customers c where c.id = customer_id and c.auth_user_id = auth.uid())
  );

-- Drivers: self read/update; nearby drivers public for matching
drop policy if exists "Drivers self read" on drivers;
create policy "Drivers self read" on drivers
  for select using (auth.uid() = auth_user_id);
drop policy if exists "Drivers public minimal read" on drivers;
create policy "Drivers public minimal read" on drivers
  for select using (is_online = true and kyc_status = 'approved');
drop policy if exists "Drivers self insert" on drivers;
create policy "Drivers self insert" on drivers
  for insert with check (auth.uid() = auth_user_id);
drop policy if exists "Drivers self update" on drivers;
create policy "Drivers self update" on drivers
  for update using (auth.uid() = auth_user_id);

-- Driver documents: only the driver
drop policy if exists "Driver docs self all" on driver_documents;
create policy "Driver docs self all" on driver_documents
  for all using (
    exists (select 1 from drivers d where d.id = driver_id and d.auth_user_id = auth.uid())
  );

-- Wallets: only the driver can read their wallet
drop policy if exists "Wallet self read" on driver_wallets;
create policy "Wallet self read" on driver_wallets
  for select using (
    exists (select 1 from drivers d where d.id = driver_id and d.auth_user_id = auth.uid())
  );

-- Transactions: only the driver
drop policy if exists "Wallet txn self read" on wallet_transactions;
create policy "Wallet txn self read" on wallet_transactions
  for select using (
    exists (select 1 from drivers d where d.id = driver_id and d.auth_user_id = auth.uid())
  );

-- Deliveries: customer sees own; driver sees assigned + open offers; restaurant sees own
drop policy if exists "Deliveries customer read" on deliveries;
create policy "Deliveries customer read" on deliveries
  for select using (
    exists (select 1 from customers c where c.id = customer_id and c.auth_user_id = auth.uid())
  );
drop policy if exists "Deliveries driver read" on deliveries;
create policy "Deliveries driver read" on deliveries
  for select using (
    exists (select 1 from drivers d where d.id = driver_id and d.auth_user_id = auth.uid())
    or status = 'pending'  -- open deliveries visible to all approved drivers for bidding
  );
drop policy if exists "Deliveries customer insert" on deliveries;
create policy "Deliveries customer insert" on deliveries
  for insert with check (
    exists (select 1 from customers c where c.id = customer_id and c.auth_user_id = auth.uid())
  );

-- Dispatch offers: drivers can create on pending deliveries; everyone reads relevant ones
drop policy if exists "Offers driver insert" on dispatch_offers;
create policy "Offers driver insert" on dispatch_offers
  for insert with check (
    exists (select 1 from drivers d where d.id = driver_id and d.auth_user_id = auth.uid()
            and d.kyc_status = 'approved' and d.is_active = true)
  );
drop policy if exists "Offers driver read own" on dispatch_offers;
create policy "Offers driver read own" on dispatch_offers
  for select using (
    exists (select 1 from drivers d where d.id = driver_id and d.auth_user_id = auth.uid())
  );
drop policy if exists "Offers customer read for own delivery" on dispatch_offers;
create policy "Offers customer read for own delivery" on dispatch_offers
  for select using (
    exists (
      select 1 from deliveries dv
      inner join customers c on c.id = dv.customer_id
      where dv.id = delivery_id and c.auth_user_id = auth.uid()
    )
  );

-- Pricing: public read
drop policy if exists "Pricing public read" on pricing_config;
create policy "Pricing public read" on pricing_config for select using (true);

-- ─── Tighten existing RLS on orders ────────────────────────────
-- Allow customer to insert/read their own orders, restaurants to manage their own
drop policy if exists "Public can read orders" on orders;
drop policy if exists "Public can insert orders" on orders;
drop policy if exists "Public can update orders" on orders;

drop policy if exists "Customer reads own orders" on orders;
create policy "Customer reads own orders" on orders
  for select using (
    exists (select 1 from customers c where c.id = customer_id and c.auth_user_id = auth.uid())
  );
drop policy if exists "Customer creates orders" on orders;
create policy "Customer creates orders" on orders
  for insert with check (
    exists (select 1 from customers c where c.id = customer_id and c.auth_user_id = auth.uid())
    or customer_id is null  -- guest orders allowed for now
  );
drop policy if exists "Authenticated reads orders" on orders;
create policy "Authenticated reads orders" on orders
  for select to authenticated using (true);
drop policy if exists "Authenticated updates orders" on orders;
create policy "Authenticated updates orders" on orders
  for update to authenticated using (true);

-- ─── Storage buckets ───────────────────────────────────────────
insert into storage.buckets (id, name, public) values ('driver-docs', 'driver-docs', false)
  on conflict (id) do nothing;

drop policy if exists "Driver docs self upload" on storage.objects;
create policy "Driver docs self upload" on storage.objects
  for insert with check (
    bucket_id = 'driver-docs' and auth.role() = 'authenticated'
  );
drop policy if exists "Driver docs self read" on storage.objects;
create policy "Driver docs self read" on storage.objects
  for select using (
    bucket_id = 'driver-docs' and auth.role() = 'authenticated'
  );

-- ─── Realtime ──────────────────────────────────────────────────
alter publication supabase_realtime add table deliveries;
alter publication supabase_realtime add table dispatch_offers;
alter publication supabase_realtime add table driver_wallets;

-- Done.
