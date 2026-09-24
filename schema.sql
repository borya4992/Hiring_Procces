-- HP-Hiring Procces — Supabase sxemasi
-- Buni Supabase loyihangizda SQL Editor ga to'liq nusxalab, Run tugmasini bosing.
-- Bo'sh yoki mavjud loyihada qayta ishlatish xavfsiz (if not exists / drop policy).

create extension if not exists pgcrypto;

-- ============================================================
-- 1) FOYDALANUVCHILAR
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text not null unique,
  role text not null check (role in ('admin', 'director', 'deputy', 'head', 'recruiter')),
  avatar text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 2) BUYURTMALAR
-- ============================================================
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  position text not null,
  department text not null,
  source text not null,
  type text not null,
  order_date date not null,
  deadline date not null,
  comment text not null default '',
  status text not null,
  qty integer not null default 1,
  urgency text not null,
  responsible_id uuid,
  key_position boolean not null default false,
  closed_at date,
  created_by uuid
);

-- ============================================================
-- 3) NOMZODLAR
-- ============================================================
create table if not exists public.candidates (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  position text not null,
  source text not null,
  previous_position text not null default '',
  type text not null,
  date date not null,
  comment text not null default '',
  stage text not null,
  hired_date date,
  created_by uuid,
  probation_result text,
  probation_decided_at date,
  rejected_from text,
  rejected_at date,
  stage_dates jsonb not null default '{}'::jsonb,
  key_position boolean not null default false
);

-- ============================================================
-- 4) O'CHIRILGANLAR (restore uchun)
-- ============================================================
create table if not exists public.deleted_orders (
  id uuid primary key,
  position text not null,
  department text not null,
  source text not null,
  type text not null,
  order_date date not null,
  deadline date not null,
  comment text not null default '',
  status text not null,
  qty integer not null default 1,
  urgency text not null,
  responsible_id uuid,
  key_position boolean not null default false,
  closed_at date,
  created_by uuid,
  deleted_at timestamptz not null default now()
);

create table if not exists public.deleted_candidates (
  id uuid primary key,
  full_name text not null,
  position text not null,
  source text not null,
  previous_position text not null default '',
  type text not null,
  date date not null,
  comment text not null default '',
  stage text not null,
  hired_date date,
  created_by uuid,
  probation_result text,
  probation_decided_at date,
  rejected_from text,
  rejected_at date,
  stage_dates jsonb not null default '{}'::jsonb,
  key_position boolean not null default false,
  deleted_at timestamptz not null default now()
);

create index if not exists idx_orders_status on public.orders (status);
create index if not exists idx_orders_order_date on public.orders (order_date desc);
create index if not exists idx_candidates_stage on public.candidates (stage);
create index if not exists idx_candidates_date on public.candidates (date desc);
create index if not exists idx_profiles_email on public.profiles (lower(email));

-- ============================================================
-- 5) AUTH — yangi foydalanuvchi profili
-- Authentication > Users da user qo'shilganda profil avtomatik yaratiladi.
-- Birinchi foydalanuvchi admin bo'ladi.
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, role)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'full_name',
      split_part(new.email, '@', 1)
    ),
    lower(new.email),
    case
      when coalesce(new.raw_user_meta_data->>'role', '') in ('admin', 'director', 'deputy', 'head', 'recruiter')
        then new.raw_user_meta_data->>'role'
      when not exists (select 1 from public.profiles where role = 'admin') then 'admin'
      else 'recruiter'
    end
  )
  on conflict (id) do update
    set name = excluded.name,
        email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

insert into public.profiles (id, name, email, role)
select
  u.id,
  coalesce(u.raw_user_meta_data->>'name', u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  lower(u.email),
  coalesce(nullif(u.raw_user_meta_data->>'role', ''), 'recruiter')
from auth.users u
on conflict (id) do nothing;

update public.profiles
set role = 'admin'
where id = (select id from auth.users order by created_at asc limit 1)
  and not exists (select 1 from public.profiles where role = 'admin');

-- ============================================================
-- 6) RPC
-- ============================================================
create or replace function public.app_needs_setup()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (select 1 from public.profiles);
$$;

create or replace function public.my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.apply_order_closures(rows jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r jsonb;
begin
  if public.my_role() not in ('admin', 'head', 'recruiter') then
    raise exception 'forbidden';
  end if;
  for r in select value from jsonb_array_elements(rows)
  loop
    update public.orders
      set status = coalesce(r->>'status', status),
          closed_at = nullif(r->>'closed_at', '')::date
    where id = (r->>'id')::uuid;
  end loop;
end;
$$;

revoke all on function public.app_needs_setup() from public;
grant execute on function public.app_needs_setup() to anon, authenticated;
revoke all on function public.my_role() from public;
grant execute on function public.my_role() to authenticated;
revoke all on function public.apply_order_closures(jsonb) from public;
grant execute on function public.apply_order_closures(jsonb) to authenticated;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.orders to authenticated;
grant select, insert, update, delete on public.candidates to authenticated;
grant select, insert, update, delete on public.deleted_orders to authenticated;
grant select, insert, update, delete on public.deleted_candidates to authenticated;

-- ============================================================
-- 7) RLS
-- ============================================================
alter table public.profiles enable row level security;
alter table public.orders enable row level security;
alter table public.candidates enable row level security;
alter table public.deleted_orders enable row level security;
alter table public.deleted_candidates enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated using (true);

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles
  for all to authenticated
  using (public.my_role() = 'admin')
  with check (public.my_role() = 'admin');

drop policy if exists orders_select on public.orders;
create policy orders_select on public.orders
  for select to authenticated using (true);

drop policy if exists orders_write on public.orders;
create policy orders_write on public.orders
  for all to authenticated
  using (public.my_role() in ('admin', 'head'))
  with check (public.my_role() in ('admin', 'head'));

drop policy if exists candidates_select on public.candidates;
create policy candidates_select on public.candidates
  for select to authenticated using (true);

drop policy if exists candidates_write on public.candidates;
create policy candidates_write on public.candidates
  for all to authenticated
  using (public.my_role() in ('admin', 'recruiter'))
  with check (public.my_role() in ('admin', 'recruiter'));

drop policy if exists deleted_orders_select on public.deleted_orders;
create policy deleted_orders_select on public.deleted_orders
  for select to authenticated using (true);

drop policy if exists deleted_orders_write on public.deleted_orders;
create policy deleted_orders_write on public.deleted_orders
  for all to authenticated
  using (public.my_role() in ('admin', 'head'))
  with check (public.my_role() in ('admin', 'head'));

drop policy if exists deleted_candidates_select on public.deleted_candidates;
create policy deleted_candidates_select on public.deleted_candidates
  for select to authenticated using (true);

drop policy if exists deleted_candidates_write on public.deleted_candidates;
create policy deleted_candidates_write on public.deleted_candidates
  for all to authenticated
  using (public.my_role() in ('admin', 'recruiter'))
  with check (public.my_role() in ('admin', 'recruiter'));

-- ============================================================
-- 8) REALTIME (boshqa foydalanuvchi o'zgarishini ko'rish)
-- ============================================================
alter table public.profiles replica identity full;
alter table public.orders replica identity full;
alter table public.candidates replica identity full;
alter table public.deleted_orders replica identity full;
alter table public.deleted_candidates replica identity full;

do $$ begin alter publication supabase_realtime add table public.profiles; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.orders; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.candidates; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.deleted_orders; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.deleted_candidates; exception when duplicate_object then null; end $$;

notify pgrst, 'reload schema';
