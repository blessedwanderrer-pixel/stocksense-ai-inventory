-- StockSense initial inventory schema.
-- Cost data is deliberately separated from products so RLS can enforce
-- manager-only access at the table boundary.

create type public.app_role as enum ('manager', 'staff');
create type public.stock_movement_type as enum ('stock_in', 'sale', 'damaged');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null default 'staff',
  created_at timestamptz not null default now()
);

create table public.categories (
  id bigint generated always as identity primary key,
  name text not null unique check (btrim(name) <> ''),
  created_at timestamptz not null default now()
);

create table public.products (
  id bigint generated always as identity primary key,
  category_id bigint not null references public.categories (id) on delete restrict,
  sku text not null unique check (btrim(sku) <> ''),
  name text not null check (btrim(name) <> ''),
  description text,
  current_stock bigint not null default 0 check (current_stock >= 0),
  low_stock_threshold bigint not null default 0 check (low_stock_threshold >= 0),
  selling_price numeric(12, 2) not null check (selling_price >= 0),
  created_at timestamptz not null default now()
);

create table public.product_financials (
  product_id bigint primary key references public.products (id) on delete cascade,
  cost_price numeric(12, 2) not null check (cost_price >= 0),
  created_at timestamptz not null default now()
);

create table public.suppliers (
  id bigint generated always as identity primary key,
  name text not null check (btrim(name) <> ''),
  contact_name text,
  email text,
  phone text,
  created_at timestamptz not null default now()
);

create table public.stock_movements (
  id bigint generated always as identity primary key,
  product_id bigint not null references public.products (id) on delete restrict,
  movement_type public.stock_movement_type not null,
  quantity bigint not null check (quantity > 0),
  supplier_id bigint references public.suppliers (id) on delete restrict,
  performed_by uuid not null default auth.uid() references auth.users (id) on delete restrict,
  occurred_at timestamptz not null default now(),
  constraint stock_movements_supplier_scope_check
    check (supplier_id is null or movement_type = 'stock_in')
);

create index products_category_id_idx on public.products (category_id);
create index stock_movements_product_id_idx on public.stock_movements (product_id);
create index stock_movements_supplier_id_idx on public.stock_movements (supplier_id)
  where supplier_id is not null;
create index stock_movements_performed_by_idx on public.stock_movements (performed_by);
create index stock_movements_sales_date_product_idx
  on public.stock_movements (occurred_at, product_id)
  where movement_type = 'sale';

create schema private;
revoke all on schema private from public, anon, authenticated;

create function private.current_user_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
  from public.profiles as p
  where p.id = (select auth.uid());
$$;

create function private.is_manager()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select private.current_user_role()) = 'manager', false);
$$;

revoke all on function private.current_user_role() from public, anon;
revoke all on function private.is_manager() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.current_user_role() to authenticated;
grant execute on function private.is_manager() to authenticated;

create function private.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, role)
  values (new.id, 'staff');
  return new;
end;
$$;

revoke all on function private.create_profile_for_new_user() from public, anon, authenticated;

create trigger create_profile_after_auth_user
after insert on auth.users
for each row execute function private.create_profile_for_new_user();

-- Backfill any users that existed before this migration as least-privileged staff.
insert into public.profiles (id, role)
select u.id, 'staff'::public.app_role
from auth.users as u
on conflict (id) do nothing;

create function private.guard_product_stock_changes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and new.current_stock <> 0
     and current_user not in ('postgres', 'service_role') then
    raise exception 'initial stock must be recorded as a stock_in movement'
      using errcode = 'check_violation';
  end if;

  if tg_op = 'UPDATE' and new.current_stock is distinct from old.current_stock
     and current_user not in ('postgres', 'service_role') then
    raise exception 'stock can only be changed through stock_movements'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

revoke all on function private.guard_product_stock_changes() from public, anon, authenticated;

create trigger guard_product_stock_changes
before insert or update of current_stock on public.products
for each row execute function private.guard_product_stock_changes();

create function private.apply_stock_movement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  stock_delta bigint;
begin
  if (select auth.uid()) is null then
    raise exception 'an authenticated user is required'
      using errcode = 'insufficient_privilege';
  end if;

  if (select private.current_user_role()) is null then
    raise exception 'the authenticated user has no StockSense profile'
      using errcode = 'insufficient_privilege';
  end if;

  new.performed_by := (select auth.uid());
  new.occurred_at := now();

  stock_delta := case new.movement_type
    when 'stock_in' then new.quantity
    when 'sale' then -new.quantity
    when 'damaged' then -new.quantity
  end;

  update public.products as p
  set current_stock = p.current_stock + stock_delta
  where p.id = new.product_id
    and p.current_stock + stock_delta >= 0;

  if not found then
    raise exception 'product does not exist or movement would make stock negative'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

revoke all on function private.apply_stock_movement() from public, anon, authenticated;

create trigger apply_stock_movement_before_insert
before insert on public.stock_movements
for each row execute function private.apply_stock_movement();

create function private.prevent_stock_movement_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'stock movements are append-only'
    using errcode = 'insufficient_privilege';
end;
$$;

revoke all on function private.prevent_stock_movement_mutation() from public, anon, authenticated;

create trigger prevent_stock_movement_update_or_delete
before update or delete on public.stock_movements
for each row execute function private.prevent_stock_movement_mutation();

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_financials enable row level security;
alter table public.suppliers enable row level security;
alter table public.stock_movements enable row level security;

create policy profiles_read_self_or_manager
on public.profiles for select to authenticated
using (
  (select auth.uid()) is not null
  and (id = (select auth.uid()) or (select private.is_manager()))
);

create policy profiles_manager_update_roles
on public.profiles for update to authenticated
using ((select private.is_manager()))
with check ((select private.is_manager()));

create policy categories_authenticated_read
on public.categories for select to authenticated
using ((select private.current_user_role()) is not null);

create policy categories_manager_insert
on public.categories for insert to authenticated
with check ((select private.is_manager()));

create policy categories_manager_update
on public.categories for update to authenticated
using ((select private.is_manager()))
with check ((select private.is_manager()));

create policy categories_manager_delete
on public.categories for delete to authenticated
using ((select private.is_manager()));

create policy products_authenticated_read
on public.products for select to authenticated
using ((select private.current_user_role()) is not null);

create policy products_manager_insert
on public.products for insert to authenticated
with check ((select private.is_manager()));

create policy products_manager_update
on public.products for update to authenticated
using ((select private.is_manager()))
with check ((select private.is_manager()));

create policy products_manager_delete
on public.products for delete to authenticated
using ((select private.is_manager()));

create policy product_financials_manager_read
on public.product_financials for select to authenticated
using ((select private.is_manager()));

create policy product_financials_manager_insert
on public.product_financials for insert to authenticated
with check ((select private.is_manager()));

create policy product_financials_manager_update
on public.product_financials for update to authenticated
using ((select private.is_manager()))
with check ((select private.is_manager()));

create policy product_financials_manager_delete
on public.product_financials for delete to authenticated
using ((select private.is_manager()));

create policy suppliers_authenticated_read
on public.suppliers for select to authenticated
using ((select private.current_user_role()) is not null);

create policy suppliers_manager_insert
on public.suppliers for insert to authenticated
with check ((select private.is_manager()));

create policy suppliers_manager_update
on public.suppliers for update to authenticated
using ((select private.is_manager()))
with check ((select private.is_manager()));

create policy suppliers_manager_delete
on public.suppliers for delete to authenticated
using ((select private.is_manager()));

create policy stock_movements_authenticated_read
on public.stock_movements for select to authenticated
using ((select private.current_user_role()) is not null);

create policy stock_movements_authenticated_insert
on public.stock_movements for insert to authenticated
with check (
  (select private.current_user_role()) is not null
  and performed_by = (select auth.uid())
);

revoke all on table public.profiles from public, anon, authenticated;
revoke all on table public.categories from public, anon, authenticated;
revoke all on table public.products from public, anon, authenticated;
revoke all on table public.product_financials from public, anon, authenticated;
revoke all on table public.suppliers from public, anon, authenticated;
revoke all on table public.stock_movements from public, anon, authenticated;

grant select on table public.profiles to authenticated;
grant update (role) on table public.profiles to authenticated;

grant select on table public.categories to authenticated;
grant insert (name) on table public.categories to authenticated;
grant update (name) on table public.categories to authenticated;
grant delete on table public.categories to authenticated;

grant select on table public.products to authenticated;
grant insert (category_id, sku, name, description, low_stock_threshold, selling_price)
  on table public.products to authenticated;
grant update (category_id, sku, name, description, low_stock_threshold, selling_price)
  on table public.products to authenticated;
grant delete on table public.products to authenticated;

grant select on table public.product_financials to authenticated;
grant insert (product_id, cost_price) on table public.product_financials to authenticated;
grant update (cost_price) on table public.product_financials to authenticated;
grant delete on table public.product_financials to authenticated;

grant select on table public.suppliers to authenticated;
grant insert (name, contact_name, email, phone) on table public.suppliers to authenticated;
grant update (name, contact_name, email, phone) on table public.suppliers to authenticated;
grant delete on table public.suppliers to authenticated;

grant select on table public.stock_movements to authenticated;
grant insert (product_id, movement_type, quantity, supplier_id)
  on table public.stock_movements to authenticated;

grant usage, select on all sequences in schema public to authenticated;

comment on table public.product_financials is
  'Manager-only cost data, separated from staff-readable product data.';
comment on table public.stock_movements is
  'Append-only inventory ledger. Sales support best-selling calculations by date range.';
