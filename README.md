# SKBEquip — Construction Equipment Management

A Next.js 16 + Supabase app for tracking construction machines across project sites:
daily work entries and operator hours, maintenance history, hour-based maintenance
alerts, reports (CSV / PDF), and live site weather.

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env` (or `.env.local`) in the project root:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
   ```

3. Run the dev server and open http://localhost:3000:

   ```bash
   npm run dev
   ```

Other scripts: `npm run build`, `npm start`, `npm run lint`.

## Supabase setup

The database schema is not in this repo. The app expects these tables:

| Table | Used for |
|---|---|
| `projects` | Construction sites (`name`, `location`, `status`: active / completed / on-hold) |
| `machines` | Fleet, per project (`machine_code`, `name`, `type`, `operator`, `site`, `status`, `total_lifetime_hours`, `maint_status`, …) |
| `work_records` | Daily machine work entries (`entry_date`, `start_time`, `end_time`, `total_hours`, `status`, …) |
| `maintenance_records` | Repairs / services (`part_repaired_or_replaced`, `hours_at_maintenance`, `recommended_hours_until_next`, `cost_of_maintenance`, `status`, …) |
| `alerts` | Computed Due Soon / Overdue alerts, one per machine + part |
| `app_settings` | Single row (`id = 1`): company name, currency, timezone, due-soon threshold, auto-reset, notification flags |
| `project_weather_locations` | Extra weather locations per project |
| `profiles` | User role: `operator` (full access) or `viewer` (dashboard, overview, projects, reports) |

**Security and database changes:** all data access happens from the browser with the
anon key, so Row Level Security is what actually protects the data. The rules (logged-in
users read, only operators write) and other database changes are in
`supabase/migrations/`. See `supabase/README.md` for how to run them and how to make a
user an operator.

**Lifetime hours** are kept up to date by a database trigger on `work_records`
(added in the migration). The app no longer adds or subtracts them itself.

**Password reset:** add `<your-site-url>/reset-password` (and
`http://localhost:3000/reset-password` for development) to
*Authentication → URL Configuration → Redirect URLs* in Supabase.

## How some things work

- **Machine status and "hours today"** are worked out from today's work records each
  time a page loads (`withLiveStatus` in `src/lib/useMachines.ts`), so they reset
  automatically at midnight. "In maintenance" is set by hand on the machine.
- **Maintenance alerts** (`src/lib/alertsSync.ts`) track each machine + part
  separately. The latest service of a part, plus its recommended interval, is compared
  with the machine's lifetime hours. The result updates `alerts`,
  `machines.maint_status` and `maintenance_records.status`.
- **Currency and timezone** come from Settings. "Today" everywhere means today in the
  company timezone (`src/lib/format.ts`). Changing currency changes the symbol only;
  amounts are not converted.
- **Alert dismissals** are remembered per project in the browser (localStorage).
