-- Durable, user-owned AI stock-action previews with atomic Confirm/Cancel.

create table public.ai_pending_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  product_id bigint not null
    references public.products (id) on delete restrict,
  movement_type public.stock_movement_type not null,
  quantity bigint not null check (quantity > 0),
  supplier_id bigint references public.suppliers (id) on delete restrict,
  current_stock_at_preview bigint not null check (current_stock_at_preview >= 0),
  expected_stock_at_preview bigint not null check (expected_stock_at_preview >= 0),
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'cancelled')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  completed_at timestamptz,
  stock_movement_id bigint unique
    references public.stock_movements (id) on delete restrict,
  constraint ai_pending_actions_supplier_scope_check
    check (supplier_id is null or movement_type = 'stock_in'),
  constraint ai_pending_actions_completion_check check (
    (status = 'pending' and completed_at is null and stock_movement_id is null)
    or (status = 'cancelled' and completed_at is not null and stock_movement_id is null)
    or (status = 'confirmed' and completed_at is not null and stock_movement_id is not null)
  )
);

create index ai_pending_actions_user_id_idx
  on public.ai_pending_actions (user_id);
create index ai_pending_actions_product_id_idx
  on public.ai_pending_actions (product_id);
create index ai_pending_actions_supplier_id_idx
  on public.ai_pending_actions (supplier_id)
  where supplier_id is not null;
create index ai_pending_actions_pending_expiry_idx
  on public.ai_pending_actions (expires_at)
  where status = 'pending';

alter table public.ai_pending_actions enable row level security;

create policy ai_pending_actions_owner_read
on public.ai_pending_actions for select to authenticated
using (
  (select auth.uid()) is not null
  and user_id = (select auth.uid())
  and (select private.current_user_role()) is not null
);

create policy ai_pending_actions_owner_insert
on public.ai_pending_actions for insert to authenticated
with check (
  (select auth.uid()) is not null
  and user_id = (select auth.uid())
  and (select private.current_user_role()) is not null
);

revoke all on table public.ai_pending_actions from public, anon, authenticated;
grant select on table public.ai_pending_actions to authenticated;
grant insert (
  product_id,
  movement_type,
  quantity,
  supplier_id,
  current_stock_at_preview,
  expected_stock_at_preview
) on table public.ai_pending_actions to authenticated;
create function public.confirm_ai_pending_action(p_action_id uuid)
returns table (
  action_id uuid,
  action_status text,
  movement_id bigint,
  product_id bigint,
  final_stock bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  pending public.ai_pending_actions%rowtype;
  created_movement_id bigint;
  resulting_stock bigint;
begin
  if (select auth.uid()) is null
     or (select private.current_user_role()) is null then
    raise exception 'an authenticated StockSense user is required'
      using errcode = 'insufficient_privilege';
  end if;

  select action.*
  into pending
  from public.ai_pending_actions as action
  where action.id = p_action_id
    and action.user_id = (select auth.uid())
  for update;

  if not found then
    raise exception 'pending action not found'
      using errcode = 'P0002';
  end if;
  if pending.status <> 'pending' then
    raise exception 'pending action is already %', pending.status
      using errcode = 'P0001';
  end if;
  if pending.expires_at <= now() then
    raise exception 'pending action has expired'
      using errcode = 'P0001';
  end if;

  insert into public.stock_movements (
    product_id,
    movement_type,
    quantity,
    supplier_id
  ) values (
    pending.product_id,
    pending.movement_type,
    pending.quantity,
    pending.supplier_id
  )
  returning id into created_movement_id;

  update public.ai_pending_actions as action
  set status = 'confirmed',
      completed_at = now(),
      stock_movement_id = created_movement_id
  where action.id = pending.id;

  select product.current_stock
  into resulting_stock
  from public.products as product
  where product.id = pending.product_id;

  return query select
    pending.id,
    'confirmed'::text,
    created_movement_id,
    pending.product_id,
    resulting_stock;
end;
$$;

create function public.cancel_ai_pending_action(p_action_id uuid)
returns table (
  action_id uuid,
  action_status text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  pending public.ai_pending_actions%rowtype;
begin
  if (select auth.uid()) is null
     or (select private.current_user_role()) is null then
    raise exception 'an authenticated StockSense user is required'
      using errcode = 'insufficient_privilege';
  end if;

  select action.*
  into pending
  from public.ai_pending_actions as action
  where action.id = p_action_id
    and action.user_id = (select auth.uid())
  for update;

  if not found then
    raise exception 'pending action not found'
      using errcode = 'P0002';
  end if;
  if pending.status <> 'pending' then
    raise exception 'pending action is already %', pending.status
      using errcode = 'P0001';
  end if;
  if pending.expires_at <= now() then
    raise exception 'pending action has expired'
      using errcode = 'P0001';
  end if;

  update public.ai_pending_actions as action
  set status = 'cancelled', completed_at = now()
  where action.id = pending.id;

  return query select pending.id, 'cancelled'::text;
end;
$$;

revoke all on function public.confirm_ai_pending_action(uuid)
  from public, anon;
revoke all on function public.cancel_ai_pending_action(uuid)
  from public, anon;
grant execute on function public.confirm_ai_pending_action(uuid)
  to authenticated;
grant execute on function public.cancel_ai_pending_action(uuid)
  to authenticated;

comment on table public.ai_pending_actions is
  'Server-created, user-owned, expiring AI stock-action previews.';
comment on function public.confirm_ai_pending_action(uuid) is
  'Atomically consumes one pending action and inserts exactly one stock ledger entry.';
