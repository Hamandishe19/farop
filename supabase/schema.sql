-- Farop Clothing — Supabase schema.
-- Run once in the Supabase dashboard: SQL Editor → New query → paste → Run.
-- Safe to re-run: every statement is idempotent.

-- ---------------------------------------------------------------------------
-- Admins: a user can use the admin area only if listed here. Their role
-- decides what they may do (mirrors src/lib/auth/roles.ts):
--   regular   – add / edit / hide products
--   supreme   – + delete products, edit business settings, manage regular admins
--   developer – + manage supreme admins, technical settings
-- Rows are added / changed / removed by the website's server (service key)
-- after it has checked the actor's role, so there are no write policies here.
-- ---------------------------------------------------------------------------
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users add column if not exists name text;
alter table public.admin_users add column if not exists email text;
alter table public.admin_users add column if not exists role text not null default 'regular';

alter table public.admin_users drop constraint if exists admin_users_role_check;
alter table public.admin_users
  add constraint admin_users_role_check check (role in ('regular', 'supreme', 'developer'));

alter table public.admin_users enable row level security;

-- SECURITY DEFINER so policies can check admin status without exposing the table.
create or replace function public.admin_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.admin_users where user_id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.admin_role() is not null;
$$;

drop policy if exists "admins can read admin list" on public.admin_users;
create policy "admins can read admin list" on public.admin_users
  for select using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Products
-- ---------------------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 120),
  short_description text not null,
  description text,
  categories text[] not null check (
    cardinality(categories) > 0
    and categories <@ array['boys', 'girls', 'babywear', 'shoes']
  ),
  type text not null check (
    type in ('tops', 'bottoms', 'dresses', 'bodysuits', 'sets', 'outerwear', 'accessories', 'shoes')
  ),
  condition text not null default 'new' check (condition in ('new', 'preloved')),
  price numeric(10, 2) check (price is null or price >= 0),
  currency text check (currency is null or currency ~ '^[A-Z]{3}$'),
  sizes text[] not null default '{}',
  availability text check (
    availability is null or availability in ('in_stock', 'limited', 'out_of_stock', 'made_to_order')
  ),
  image_url text,
  image_alt text,
  active boolean not null default true,
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_active_idx on public.products (active);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists products_touch_updated_at on public.products;
create trigger products_touch_updated_at
  before update on public.products
  for each row execute function public.touch_updated_at();

alter table public.products enable row level security;

drop policy if exists "anyone can read active products" on public.products;
create policy "anyone can read active products" on public.products
  for select using (active or public.is_admin());

drop policy if exists "admins can insert products" on public.products;
create policy "admins can insert products" on public.products
  for insert with check (public.is_admin());

drop policy if exists "admins can update products" on public.products;
create policy "admins can update products" on public.products
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins can delete products" on public.products;
create policy "admins can delete products" on public.products
  for delete using (public.admin_role() in ('supreme', 'developer'));

-- ---------------------------------------------------------------------------
-- Business settings (WhatsApp, phone, EcoCash number, delivery days, hours…):
-- one row, readable by everyone, editable by supreme and developer admins.
-- ---------------------------------------------------------------------------
create table if not exists public.site_settings (
  id smallint primary key default 1 check (id = 1),
  data jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

drop trigger if exists site_settings_touch_updated_at on public.site_settings;
create trigger site_settings_touch_updated_at
  before update on public.site_settings
  for each row execute function public.touch_updated_at();

alter table public.site_settings enable row level security;

drop policy if exists "anyone can read settings" on public.site_settings;
create policy "anyone can read settings" on public.site_settings
  for select using (true);

drop policy if exists "senior admins can insert settings" on public.site_settings;
create policy "senior admins can insert settings" on public.site_settings
  for insert with check (public.admin_role() in ('supreme', 'developer'));

drop policy if exists "senior admins can update settings" on public.site_settings;
create policy "senior admins can update settings" on public.site_settings
  for update using (public.admin_role() in ('supreme', 'developer'))
  with check (public.admin_role() in ('supreme', 'developer'));

-- ---------------------------------------------------------------------------
-- Product photos: public to view, only admins can upload / replace / delete.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "admins can upload product images" on storage.objects;
create policy "admins can upload product images" on storage.objects
  for insert with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "admins can update product images" on storage.objects;
create policy "admins can update product images" on storage.objects
  for update using (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "admins can delete product images" on storage.objects;
create policy "admins can delete product images" on storage.objects
  for delete using (bucket_id = 'product-images' and public.is_admin());

-- ---------------------------------------------------------------------------
-- The first admin (you, the developer) is added by hand. After creating the
-- user (Authentication → Users → Add user), run with their email and name:
--
--   insert into public.admin_users (user_id, email, name, role)
--   select id, email, 'Your name', 'developer' from auth.users where email = 'you@example.com'
--   on conflict (user_id) do update set role = excluded.role;
--
-- Everyone else can then be added from the admin area (Team page).
-- ---------------------------------------------------------------------------
