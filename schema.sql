-- =========================================================
-- VALAR — BRAVE & WEAR
-- SUPABASE DATABASE
-- Run this in the Supabase SQL Editor for a NEW VALAR project.
-- =========================================================

create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'T-Shirts',
  description text default '',
  price numeric(12,2) not null check (price >= 0),
  stock integer not null default 0 check (stock >= 0),
  sizes text[] not null default '{}',
  colors text[] not null default '{}',
  image_url text default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null,
  customer_name text not null,
  phone text not null,
  delivery_location text not null,
  payment_method text not null check (
    payment_method in ('Airtel Money','Mpamba','Visa Card','Cash on delivery / pickup')
  ),
  payment_status text not null default 'pending' check (
    payment_status in ('pending','paid','failed','cash_pending','refunded')
  ),
  order_status text not null default 'new' check (
    order_status in ('new','confirmed','processing','ready','out_for_delivery','completed','cancelled')
  ),
  total numeric(12,2) not null check (total >= 0),
  notes text default '',
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  size text default '',
  color text default '',
  line_total numeric(12,2) not null check (line_total >= 0)
);

create index if not exists products_active_idx on public.products(active);
create index if not exists orders_created_idx on public.orders(created_at desc);
create index if not exists order_items_order_idx on public.order_items(order_id);

alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "Public can view active products" on public.products;
create policy "Public can view active products"
on public.products for select
using (active = true or (auth.role() = 'authenticated' and auth.jwt() ->> 'email' = 'fca.valar@gmail.com'));

drop policy if exists "Admin can insert products" on public.products;
create policy "Admin can insert products"
on public.products for insert to authenticated
with check (auth.jwt() ->> 'email' = 'fca.valar@gmail.com');

drop policy if exists "Admin can update products" on public.products;
create policy "Admin can update products"
on public.products for update to authenticated
using (auth.jwt() ->> 'email' = 'fca.valar@gmail.com')
with check (auth.jwt() ->> 'email' = 'fca.valar@gmail.com');

drop policy if exists "Admin can delete products" on public.products;
create policy "Admin can delete products"
on public.products for delete to authenticated
using (auth.jwt() ->> 'email' = 'fca.valar@gmail.com');

drop policy if exists "Customers can create orders" on public.orders;
create policy "Customers can create orders"
on public.orders for insert to anon, authenticated
with check (true);

drop policy if exists "Admin can read orders" on public.orders;
create policy "Admin can read orders"
on public.orders for select to authenticated
using (auth.jwt() ->> 'email' = 'fca.valar@gmail.com');

drop policy if exists "Admin can update orders" on public.orders;
create policy "Admin can update orders"
on public.orders for update to authenticated
using (auth.jwt() ->> 'email' = 'fca.valar@gmail.com')
with check (auth.jwt() ->> 'email' = 'fca.valar@gmail.com');

drop policy if exists "Customers can create order items" on public.order_items;
create policy "Customers can create order items"
on public.order_items for insert to anon, authenticated
with check (true);

drop policy if exists "Admin can read order items" on public.order_items;
create policy "Admin can read order items"
on public.order_items for select to authenticated
using (auth.jwt() ->> 'email' = 'fca.valar@gmail.com');

-- Keep updated_at current.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists products_updated_at on public.products;
create trigger products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

-- IMPORTANT:
-- The anonymous order policies above allow a customer to submit an order.
-- For production, add CAPTCHA/rate limiting and server-side payment/order
-- validation before going live.
