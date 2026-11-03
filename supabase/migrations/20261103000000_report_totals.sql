-- SKBEquip: totals calculated in the database
--
-- Run this whole file once in Supabase -> SQL Editor (see supabase/README.md).
-- It is all-or-nothing: if any step fails, nothing is changed.
--
-- Why: the app used to download every work and maintenance record and add them up
-- in the browser. Supabase returns at most 1,000 rows per request, so after a few
-- months the Reports, Overview and cost figures would silently come out too low.
-- These functions add things up inside the database and return just the totals.
--
-- They only READ data, and they run with the permissions of the logged-in user
-- (security invoker), so the existing security rules still apply.
--
-- Parameter types are copied from the table columns (%type), so the functions match
-- this database whether ids/dates are stored as text, uuid or date.

begin;

-- 1. Hours worked per day, for one project, between two dates ------------------
-- Used by Reports (last 7 days and last 6 months).
create or replace function public.work_hours_by_day(
  p_project_id public.work_records.project_id%type,
  p_from       public.work_records.entry_date%type,
  p_to         public.work_records.entry_date%type
)
returns table (entry_date public.work_records.entry_date%type, hours numeric)
language sql
stable
security invoker
set search_path = public
as $$
  select w.entry_date, coalesce(sum(w.total_hours), 0)::numeric
  from public.work_records w
  where w.project_id = p_project_id
    and w.entry_date between p_from and p_to
  group by w.entry_date
  order by w.entry_date;
$$;


-- 2. Maintenance summary for one project ---------------------------------------
-- Used by Reports, the dashboard cost card and the Maintenance page counters.
create or replace function public.maintenance_summary(
  p_project_id public.maintenance_records.project_id%type
)
returns table (
  record_count    bigint,
  total_cost      numeric,
  routine_count   bigint,
  repair_count    bigint,
  emergency_count bigint,
  active_count    bigint,
  due_count       bigint,
  overdue_count   bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    count(*),
    coalesce(sum(r.cost_of_maintenance), 0)::numeric,
    count(*) filter (where r.maintenance_type = 'Routine'),
    count(*) filter (where r.maintenance_type = 'Repair'),
    count(*) filter (where r.maintenance_type = 'Emergency'),
    count(*) filter (where r.status = 'Active'),
    count(*) filter (where r.status = 'Due'),
    count(*) filter (where r.status = 'Overdue')
  from public.maintenance_records r
  where r.project_id = p_project_id;
$$;


-- 3. One row of figures per project ----------------------------------------------
-- Used by the Overview page. Ids are compared as text so this works whatever type
-- each table uses for its project id.
create or replace function public.project_overview(
  p_today public.work_records.entry_date%type
)
returns table (
  project_id    text,
  machine_count bigint,
  hours_today   numeric,
  alert_count   bigint,
  maint_cost    numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  with
    m as (select project_id::text as pid, count(*) as n from public.machines group by 1),
    w as (select project_id::text as pid, sum(total_hours) as h from public.work_records where entry_date = p_today group by 1),
    a as (select project_id::text as pid, count(*) as n from public.alerts group by 1),
    c as (select project_id::text as pid, sum(cost_of_maintenance) as total from public.maintenance_records group by 1)
  select
    p.id::text,
    coalesce(m.n, 0),
    coalesce(w.h, 0)::numeric,
    coalesce(a.n, 0),
    coalesce(c.total, 0)::numeric
  from public.projects p
  left join m on m.pid = p.id::text
  left join w on w.pid = p.id::text
  left join a on a.pid = p.id::text
  left join c on c.pid = p.id::text;
$$;


-- 4. The different site names used in a project's work records -----------------
-- Used by the Site filter on the Records page.
create or replace function public.work_record_sites(
  p_project_id public.work_records.project_id%type
)
returns table (site text)
language sql
stable
security invoker
set search_path = public
as $$
  select distinct w.project_site::text
  from public.work_records w
  where w.project_id = p_project_id
    and coalesce(w.project_site, '') <> ''
  order by 1;
$$;


-- 5. Who may call these --------------------------------------------------------
-- Logged-in users only (the same people who can already read the tables).
revoke execute on function public.work_hours_by_day(public.work_records.project_id%type, public.work_records.entry_date%type, public.work_records.entry_date%type) from public, anon;
revoke execute on function public.maintenance_summary(public.maintenance_records.project_id%type) from public, anon;
revoke execute on function public.project_overview(public.work_records.entry_date%type) from public, anon;
revoke execute on function public.work_record_sites(public.work_records.project_id%type) from public, anon;

grant execute on function public.work_hours_by_day(public.work_records.project_id%type, public.work_records.entry_date%type, public.work_records.entry_date%type) to authenticated;
grant execute on function public.maintenance_summary(public.maintenance_records.project_id%type) to authenticated;
grant execute on function public.project_overview(public.work_records.entry_date%type) to authenticated;
grant execute on function public.work_record_sites(public.work_records.project_id%type) to authenticated;


-- 6. Index for the Maintenance page (newest first within a project) ----------
create index if not exists maintenance_records_project_date_idx
  on public.maintenance_records (project_id, maintenance_date desc);

commit;

-- Tell the Supabase API about the new functions straight away.
notify pgrst, 'reload schema';
