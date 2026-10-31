-- SKBEquip: security + data-integrity fixes
--
-- Run this whole file once in Supabase -> SQL Editor. It is all-or-nothing:
-- if any step fails, nothing is changed.
--
-- IMPORTANT: run it together with the matching app code. Section 4 moves the
-- "lifetime hours" bookkeeping from the app into the database. The old app code
-- also adds those hours, so old code + this SQL would count hours twice.
--
-- What it does:
--   1. is_operator() helper used by the security rules
--   2. Security rules: logged-in users can READ; only operators can WRITE.
--      Turns security ON for projects and project_weather_locations (it was OFF,
--      so anyone on the internet could read, change or delete them).
--   3. Deleting a machine keeps its maintenance history (instead of failing)
--   4. Machine lifetime hours are updated by the database whenever a work record
--      is added, edited or deleted (no more lost updates when two people save)
--   5. One machine code per project (skipped, with a notice, if duplicates exist)
--   6. Indexes for faster page loads
--   7. Small hardening of the existing new-user function

begin;

-- 1. Helper: is the current user an operator? -------------------------------
-- SECURITY DEFINER so it can read profiles regardless of profiles' own rules.
create or replace function public.is_operator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'operator'
  );
$$;

revoke execute on function public.is_operator() from public, anon;
grant execute on function public.is_operator() to authenticated;


-- 2. Security rules -----------------------------------------------------------
alter table public.projects enable row level security;
alter table public.project_weather_locations enable row level security;

-- Same four rules on every data table: anyone logged in can read, only operators
-- can insert / update / delete. Replaces the old "Require login" rule, which let
-- every logged-in user (including brand-new viewer sign-ups) change anything.
do $$
declare
  t text;
begin
  foreach t in array array['machines', 'work_records', 'maintenance_records', 'alerts', 'projects', 'project_weather_locations']
  loop
    execute format('drop policy if exists "Require login" on public.%I', t);
    execute format('drop policy if exists "Logged-in users can read" on public.%I', t);
    execute format('drop policy if exists "Operators can insert" on public.%I', t);
    execute format('drop policy if exists "Operators can update" on public.%I', t);
    execute format('drop policy if exists "Operators can delete" on public.%I', t);

    execute format('create policy "Logged-in users can read" on public.%I for select to authenticated using (true)', t);
    execute format('create policy "Operators can insert" on public.%I for insert to authenticated with check ((select public.is_operator()))', t);
    execute format('create policy "Operators can update" on public.%I for update to authenticated using ((select public.is_operator())) with check ((select public.is_operator()))', t);
    execute format('create policy "Operators can delete" on public.%I for delete to authenticated using ((select public.is_operator()))', t);
  end loop;
end $$;

-- app_settings: tighten the existing operator-only update rule so the new values
-- are also checked, and limit it to logged-in users.
drop policy if exists "Only operators can update settings" on public.app_settings;
create policy "Only operators can update settings" on public.app_settings
  for update to authenticated
  using ((select public.is_operator()))
  with check ((select public.is_operator()));


-- 3. Deleting a machine -------------------------------------------------------
-- Maintenance records stay as history (machine link cleared); alerts go with it.
alter table public.maintenance_records
  drop constraint if exists maintenance_records_machine_id_fkey;
alter table public.maintenance_records
  add constraint maintenance_records_machine_id_fkey
    foreign key (machine_id) references public.machines(id) on delete set null;

alter table public.alerts
  drop constraint if exists alerts_machine_id_fkey;
alter table public.alerts
  add constraint alerts_machine_id_fkey
    foreign key (machine_id) references public.machines(id) on delete cascade;


-- 4. Lifetime hours kept in sync by the database --------------------------------
-- Work records point at machines by (machine_code, project_id). On every change
-- the old hours are taken off the old machine and the new hours added to the new
-- one, in a single atomic UPDATE each, so concurrent saves can't overwrite each
-- other. Existing totals are left exactly as they are.
create or replace function public.apply_work_hours_to_machine()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') and coalesce(old.total_hours, 0) <> 0 and old.machine_code is not null then
    update public.machines
       set total_lifetime_hours = greatest(0, coalesce(total_lifetime_hours, 0) - old.total_hours)
     where machine_code = old.machine_code
       and project_id is not distinct from old.project_id;
  end if;

  if tg_op in ('INSERT', 'UPDATE') and coalesce(new.total_hours, 0) <> 0 and new.machine_code is not null then
    update public.machines
       set total_lifetime_hours = greatest(0, coalesce(total_lifetime_hours, 0) + new.total_hours)
     where machine_code = new.machine_code
       and project_id is not distinct from new.project_id;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists work_records_apply_hours on public.work_records;
create trigger work_records_apply_hours
  after insert or delete or update of total_hours, machine_code, project_id
  on public.work_records
  for each row execute function public.apply_work_hours_to_machine();


-- 5. One machine code per project ---------------------------------------------
do $$
begin
  if exists (
    select 1 from public.machines
    where project_id is not null
    group by project_id, machine_code
    having count(*) > 1
  ) then
    raise notice 'Skipped the unique machine code rule: some project has two machines with the same code. Run the duplicate check in supabase/README.md, fix them, then run this block again.';
  elsif not exists (select 1 from pg_constraint where conname = 'machines_project_code_unique') then
    alter table public.machines
      add constraint machines_project_code_unique unique (project_id, machine_code);
  end if;
end $$;


-- 6. Indexes (every page filters by project, and by date for work records) ------
create index if not exists work_records_project_date_idx on public.work_records (project_id, entry_date);
create index if not exists work_records_project_code_idx on public.work_records (project_id, machine_code);
create index if not exists maintenance_records_project_idx on public.maintenance_records (project_id);
create index if not exists maintenance_records_machine_idx on public.maintenance_records (machine_id);
create index if not exists alerts_project_idx on public.alerts (project_id);
create index if not exists alerts_machine_idx on public.alerts (machine_id);
create index if not exists project_weather_locations_project_idx on public.project_weather_locations (project_id);


-- 7. Harden the existing new-user function ---------------------------------------
-- SECURITY DEFINER functions should pin search_path (Supabase's linter flags this).
alter function public.handle_new_user() set search_path = public;

commit;
