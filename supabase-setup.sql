-- ============================================
-- FEASTER — Supabase Database Setup
-- Run this ONCE in your Supabase SQL Editor
-- Dashboard → SQL Editor → New Query → Paste → Run
-- ============================================

-- 1. Restaurants
create table if not exists restaurants (
  id uuid default gen_random_uuid() primary key,
  slug text unique not null,
  name text not null,
  description text,
  cuisine_type text,
  city text default 'Harare',
  whatsapp_number text,
  logo_url text,
  cover_photo_url text,
  opening_hours jsonb default '{}',
  payment_methods text[] default '{cash}',
  subscription_tier text default 'pro',
  kitchen_pin text default '1234',
  rating numeric,
  table_count integer default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- 2. Menu Items
create table if not exists menu_items (
  id uuid default gen_random_uuid() primary key,
  restaurant_id uuid references restaurants(id) on delete cascade not null,
  name text not null,
  description text,
  price numeric not null,
  category text,
  image_url text,
  is_available boolean default true,
  sort_order integer default 0,
  created_at timestamptz default now()
);

-- 3. Tables (for QR codes / dine-in)
create table if not exists tables (
  id uuid default gen_random_uuid() primary key,
  restaurant_id uuid references restaurants(id) on delete cascade not null,
  table_number text not null,
  is_active boolean default true
);

-- 4. Orders
create table if not exists orders (
  id uuid default gen_random_uuid() primary key,
  restaurant_id uuid not null,
  table_id text,
  customer_name text,
  customer_phone text,
  items jsonb default '[]',
  order_type text default 'dine_in',
  payment_method text default 'cash',
  cash_amount numeric,
  delivery_time timestamptz,
  total numeric default 0,
  notes text,
  status text default 'pending',
  created_at timestamptz default now()
);

-- 5. Indexes for fast queries
create index if not exists idx_restaurants_slug on restaurants(slug);
create index if not exists idx_restaurants_active on restaurants(is_active);
create index if not exists idx_menu_items_restaurant on menu_items(restaurant_id);
create index if not exists idx_menu_items_sort on menu_items(restaurant_id, sort_order);
create index if not exists idx_tables_restaurant on tables(restaurant_id);
create index if not exists idx_orders_restaurant on orders(restaurant_id);
create index if not exists idx_orders_status on orders(status);
create index if not exists idx_orders_created on orders(created_at desc);

-- 6. Row Level Security (RLS) — allow public reads, authenticated writes
alter table restaurants enable row level security;
alter table menu_items enable row level security;
alter table tables enable row level security;
alter table orders enable row level security;

-- Restaurants: anyone can read active, authenticated can write
create policy "Public can read active restaurants" on restaurants for select using (true);
create policy "Authenticated can insert restaurants" on restaurants for insert to authenticated with check (true);
create policy "Authenticated can update restaurants" on restaurants for update to authenticated using (true);
create policy "Authenticated can delete restaurants" on restaurants for delete to authenticated using (true);

-- Menu items: anyone can read, authenticated can write
create policy "Public can read menu items" on menu_items for select using (true);
create policy "Authenticated can insert menu items" on menu_items for insert to authenticated with check (true);
create policy "Authenticated can update menu items" on menu_items for update to authenticated using (true);
create policy "Authenticated can delete menu items" on menu_items for delete to authenticated using (true);

-- Tables: anyone can read, authenticated can write
create policy "Public can read tables" on tables for select using (true);
create policy "Authenticated can insert tables" on tables for insert to authenticated with check (true);
create policy "Authenticated can delete tables" on tables for delete to authenticated using (true);

-- Orders: anyone can read and insert (customers place orders), authenticated can update
create policy "Public can read orders" on orders for select using (true);
create policy "Public can insert orders" on orders for insert with check (true);
create policy "Public can update orders" on orders for update using (true);

-- 7. Storage bucket for restaurant images
insert into storage.buckets (id, name, public) values ('restaurants', 'restaurants', true)
on conflict (id) do nothing;

-- Storage policies — anyone can read, authenticated can upload
create policy "Public can read restaurant images" on storage.objects for select using (bucket_id = 'restaurants');
create policy "Anyone can upload restaurant images" on storage.objects for insert with check (bucket_id = 'restaurants');
create policy "Anyone can update restaurant images" on storage.objects for update using (bucket_id = 'restaurants');

-- 8. Enable Realtime for orders (live kitchen updates)
alter publication supabase_realtime add table orders;

-- Done! Your Feaster database is ready.
