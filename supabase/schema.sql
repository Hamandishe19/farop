-- =============================================================================
-- Farop Clothing — complete Supabase setup (one script)
-- =============================================================================
--
-- BEFORE RUNNING
--   1. Authentication → Users → Add user → Create new user: your email and a
--      strong password, with "Auto confirm user" ticked. This is the one
--      developer admin account.
--   2. Put that email and your name in the two lines just below.
--
-- THEN: SQL Editor → New query → paste this whole file → Run.
--
-- It creates every table, security rule, function and the photo bucket, and
-- makes your account the developer admin. Safe to run again at any time
-- (nothing is duplicated and no data is deleted).
--
-- Everyone else is added later from the website's admin area (Team page).
-- =============================================================================

-- ⬇⬇⬇  EDIT THESE TWO VALUES  ⬇⬇⬇
select set_config('farop.developer_email', 'tfhamandishe@gmail.com', false);
select set_config('farop.developer_name', 'Tatenda Hamandishe', false);
-- ⬆⬆⬆  EDIT THESE TWO VALUES  ⬆⬆⬆


-- -----------------------------------------------------------------------------
-- 1. Shared helper: keep updated_at current on every update
-- -----------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;


-- -----------------------------------------------------------------------------
-- 2. Admins and roles  (mirrors src/lib/auth/roles.ts)
--
--   regular   – add / edit / hide products; finances only if granted
--               (permissions: 'finance.view', 'finance.edit')
--   supreme   – + delete products, business settings, finances,
--               manage regular admins
--   developer – everything, incl. supreme admins, technical settings and
--               password resets. Exactly ONE, hidden from all other admins.
--
-- Rows are added / changed / removed only by the website's server (with the
-- service key) after it has checked the actor's role — so there are no write
-- policies here.
-- -----------------------------------------------------------------------------
create table if not exists public.admin_users (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  name        text,
  email       text,
  role        text not null default 'regular' check (role in ('regular', 'supreme', 'developer')),
  permissions text[] not null default '{}'
              check (permissions <@ array['finance.view', 'finance.edit']),
  created_at  timestamptz not null default now()
);

-- Only ever one developer admin.
create unique index if not exists admin_users_single_developer
  on public.admin_users ((true)) where role = 'developer';

alter table public.admin_users enable row level security;

-- The signed-in user's admin role (null = not an admin). SECURITY DEFINER so
-- security rules can check it without exposing the table.
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

-- Supreme / developer always; a regular admin only with the granted permission.
create or replace function public.has_permission(p text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users
    where user_id = auth.uid()
      and (role in ('supreme', 'developer') or p = any (permissions))
  );
$$;

-- Admins can read the admin list — except the developer's row, which only the
-- developer can see.
drop policy if exists "admins can read admin list" on public.admin_users;
create policy "admins can read admin list" on public.admin_users
  for select using (
    public.is_admin()
    and (role <> 'developer' or user_id = auth.uid() or public.admin_role() = 'developer')
  );


-- -----------------------------------------------------------------------------
-- 3. Products  (the public sees active ones; admins see and edit all)
-- -----------------------------------------------------------------------------
create table if not exists public.products (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name              text not null check (char_length(name) between 2 and 120),
  short_description text not null,
  description       text,
  categories        text[] not null check (
                      cardinality(categories) > 0
                      and categories <@ array['boys', 'girls', 'babywear', 'shoes']
                    ),
  type              text not null check (
                      type in ('tops', 'bottoms', 'dresses', 'bodysuits', 'sets', 'outerwear', 'accessories', 'shoes')
                    ),
  condition         text not null default 'new' check (condition in ('new', 'preloved')),
  price             numeric(10, 2) check (price is null or price >= 0),
  currency          text check (currency is null or currency ~ '^[A-Z]{3}$'),
  sizes             text[] not null default '{}',
  availability      text check (
                      availability is null or availability in ('in_stock', 'limited', 'out_of_stock', 'made_to_order')
                    ),
  image_url         text,
  image_alt         text,
  active            boolean not null default true,
  featured          boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists products_active_idx on public.products (active);

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

drop policy if exists "senior admins can delete products" on public.products;
drop policy if exists "admins can delete products" on public.products;
create policy "senior admins can delete products" on public.products
  for delete using (public.admin_role() in ('supreme', 'developer'));


-- -----------------------------------------------------------------------------
-- 4. Business settings  (WhatsApp, phone, EcoCash number & fee, delivery days,
--    hours…): one row, readable by everyone, editable by supreme / developer.
-- -----------------------------------------------------------------------------
create table if not exists public.site_settings (
  id         smallint primary key default 1 check (id = 1),
  data       jsonb not null default '{}'::jsonb,
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


-- -----------------------------------------------------------------------------
-- 5. Product photos  (public bucket: anyone can view; only admins can upload,
--    replace or delete; JPG / PNG / WebP / AVIF up to 5 MB)
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
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


-- -----------------------------------------------------------------------------
-- 6. Business finances
--    Read:  supreme / developer, or a regular admin granted 'finance.view'
--           (or 'finance.edit').
--    Write: supreme / developer, or a regular admin granted 'finance.edit'.
-- -----------------------------------------------------------------------------

-- Cost prices: kept out of `products` (which the public can read) so they stay private.
create table if not exists public.product_costs (
  product_id uuid primary key references public.products (id) on delete cascade,
  cost_price numeric(10, 2) not null check (cost_price >= 0),
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

drop trigger if exists product_costs_touch_updated_at on public.product_costs;
create trigger product_costs_touch_updated_at
  before update on public.product_costs
  for each row execute function public.touch_updated_at();

-- Sales: WhatsApp orders recorded once confirmed. Only 'paid' counts as revenue.
create table if not exists public.sales (
  id             uuid primary key default gen_random_uuid(),
  sold_on        date not null,
  customer_name  text,
  customer_phone text,
  payment_method text not null check (payment_method in ('cod', 'ecocash')),
  status         text not null default 'paid' check (status in ('pending', 'paid', 'cancelled')),
  delivery_fee   numeric(10, 2) not null default 0 check (delivery_fee >= 0),
  payment_fee    numeric(10, 2) not null default 0 check (payment_fee >= 0), -- EcoCash fee charged
  discount       numeric(10, 2) not null default 0 check (discount >= 0),
  notes          text,
  created_by     uuid references auth.users (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists sales_sold_on_idx on public.sales (sold_on);

drop trigger if exists sales_touch_updated_at on public.sales;
create trigger sales_touch_updated_at
  before update on public.sales
  for each row execute function public.touch_updated_at();

-- Sale items keep their own copy of name, price, cost, category and condition:
-- sold products are removed from the catalogue, and history must still add up.
create table if not exists public.sale_items (
  id         uuid primary key default gen_random_uuid(),
  sale_id    uuid not null references public.sales (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  name       text not null,
  quantity   integer not null check (quantity between 1 and 999),
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  unit_cost  numeric(10, 2) check (unit_cost is null or unit_cost >= 0),
  category   text check (category is null or category in ('boys', 'girls', 'babywear', 'shoes')),
  condition  text check (condition is null or condition in ('new', 'preloved')),
  position   smallint not null default 0
);

create index if not exists sale_items_sale_idx on public.sale_items (sale_id);
create index if not exists sale_items_product_idx on public.sale_items (product_id);

-- Expense categories the business adds itself (e.g. "Market stall fees").
create table if not exists public.expense_categories (
  key        text primary key check (key ~ '^custom-[a-z0-9]+(-[a-z0-9]+)*$'),
  name       text not null check (char_length(name) between 2 and 60),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists expense_categories_name_idx on public.expense_categories (lower(name));

-- Expenses: a built-in category key or a custom one (custom-…).
create table if not exists public.expenses (
  id          uuid primary key default gen_random_uuid(),
  spent_on    date not null,
  category    text not null check (
                category in ('stock', 'delivery', 'packaging', 'rent', 'wages', 'marketing', 'utilities', 'fees', 'other')
                or category ~ '^custom-[a-z0-9]+(-[a-z0-9]+)*$'
              ),
  amount      numeric(10, 2) not null check (amount > 0),
  description text,
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists expenses_spent_on_idx on public.expenses (spent_on);
create index if not exists expenses_category_idx on public.expenses (category);

alter table public.product_costs enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_categories enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['product_costs', 'sales', 'sale_items', 'expenses', 'expense_categories'] loop
    execute format('drop policy if exists "finance can read" on public.%I', t);
    execute format(
      'create policy "finance can read" on public.%I for select '
      'using (public.has_permission(''finance.view'') or public.has_permission(''finance.edit''))',
      t
    );
    execute format('drop policy if exists "finance can write" on public.%I', t);
    execute format(
      'create policy "finance can write" on public.%I for all '
      'using (public.has_permission(''finance.edit'')) with check (public.has_permission(''finance.edit''))',
      t
    );
  end loop;
end $$;

-- Removes a sale's products from the catalogue (they've been sold). SECURITY
-- DEFINER because regular admins with 'finance.edit' can't delete products
-- otherwise; it checks that permission itself and only touches this sale's products.
create or replace function public.remove_sold_products(p_sale_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_removed integer;
begin
  if not public.has_permission('finance.edit') then
    raise exception 'Not allowed';
  end if;
  delete from public.products
  where id in (
    select product_id from public.sale_items
    where sale_id = p_sale_id and product_id is not null
  );
  get diagnostics v_removed = row_count;
  return v_removed;
end;
$$;

-- Saves a sale and its items together (all or nothing), then — unless the sale
-- is cancelled — removes the sold products from the catalogue. Runs as the
-- caller, so the security rules above decide whether they may.
create or replace function public.save_sale(p_id uuid, p_sale jsonb, p_items jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_id is null then
    insert into public.sales (
      sold_on, customer_name, customer_phone, payment_method, status,
      delivery_fee, payment_fee, discount, notes, created_by
    )
    values (
      (p_sale->>'sold_on')::date, p_sale->>'customer_name', p_sale->>'customer_phone',
      p_sale->>'payment_method', p_sale->>'status',
      coalesce((p_sale->>'delivery_fee')::numeric, 0), coalesce((p_sale->>'payment_fee')::numeric, 0),
      coalesce((p_sale->>'discount')::numeric, 0), p_sale->>'notes', auth.uid()
    )
    returning id into v_id;
  else
    update public.sales set
      sold_on        = (p_sale->>'sold_on')::date,
      customer_name  = p_sale->>'customer_name',
      customer_phone = p_sale->>'customer_phone',
      payment_method = p_sale->>'payment_method',
      status         = p_sale->>'status',
      delivery_fee   = coalesce((p_sale->>'delivery_fee')::numeric, 0),
      payment_fee    = coalesce((p_sale->>'payment_fee')::numeric, 0),
      discount       = coalesce((p_sale->>'discount')::numeric, 0),
      notes          = p_sale->>'notes'
    where id = p_id
    returning id into v_id;
    if v_id is null then
      raise exception 'Sale not found';
    end if;
    delete from public.sale_items where sale_id = v_id;
  end if;

  insert into public.sale_items (sale_id, product_id, name, quantity, unit_price, unit_cost, category, condition, position)
  select v_id, (item->>'product_id')::uuid, item->>'name', (item->>'quantity')::integer,
         (item->>'unit_price')::numeric, (item->>'unit_cost')::numeric,
         item->>'category', item->>'condition', coalesce((item->>'position')::smallint, 0)
  from jsonb_array_elements(p_items) as item;

  if p_sale->>'status' <> 'cancelled' then
    perform public.remove_sold_products(v_id);
  end if;

  return v_id;
end;
$$;


-- -----------------------------------------------------------------------------
-- 7. Who may call the database functions directly
--    Signed-out visitors (anon) may not call the finance functions at all.
-- -----------------------------------------------------------------------------
revoke execute on function public.save_sale(uuid, jsonb, jsonb) from public, anon;
revoke execute on function public.remove_sold_products(uuid) from public, anon;
grant execute on function public.save_sale(uuid, jsonb, jsonb) to authenticated;
grant execute on function public.remove_sold_products(uuid) to authenticated;


-- -----------------------------------------------------------------------------
-- 8. Your developer admin account  (uses the email and name at the top)
-- -----------------------------------------------------------------------------
do $$
declare
  v_email text := lower(trim(current_setting('farop.developer_email', true)));
  v_name  text := nullif(trim(current_setting('farop.developer_name', true)), '');
  v_user  uuid;
  v_other text;
begin
  if v_email is null or v_email = '' or v_email = 'you@example.com' then
    raise notice 'Developer admin NOT set: put your email at the top of this script and run it again.';
    return;
  end if;

  select id into v_user from auth.users where lower(email) = v_email;
  if v_user is null then
    raise notice 'Developer admin NOT set: no user with email % — create it under Authentication → Users first, then run this again.', v_email;
    return;
  end if;

  select email into v_other from public.admin_users where role = 'developer' and user_id <> v_user;
  if v_other is not null then
    raise notice 'Developer admin NOT changed: % is already the developer admin (there can only be one).', v_other;
    return;
  end if;

  insert into public.admin_users (user_id, email, name, role, permissions)
  values (v_user, v_email, coalesce(v_name, v_email), 'developer', '{}')
  on conflict (user_id) do update
    set role = 'developer', email = excluded.email, name = excluded.name, permissions = '{}';

  raise notice 'Done: % is the developer admin. Sign in at /admin/login.', v_email;
end $$;
