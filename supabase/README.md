# Database changes

SQL files in `migrations/` are run by hand in **Supabase → SQL Editor**, in filename order.

## 20261101000000_security_and_data_integrity.sql

Run it once, at the same time you start using the matching app code (it moves the
"lifetime hours" bookkeeping into the database, and old app code would double-count).

1. Supabase → **SQL Editor** → **New query**
2. Paste the whole file → **Run**
3. You should see "Success. No rows returned". If a NOTICE about duplicate machine
   codes appears, everything else was still applied; see below.

If anything fails, nothing is changed (the file runs as one transaction).

## Useful snippets

**Make someone an operator** (new sign-ups are viewers):

```sql
update public.profiles set role = 'operator'
where id = (select id from auth.users where email = 'person@example.com');
```

**Find duplicate machine codes** (needed before the one-code-per-project rule can be added):

```sql
select project_id, machine_code, count(*), array_agg(id) as machine_ids
from public.machines
group by project_id, machine_code
having count(*) > 1;
```

After merging or renaming the duplicates, run section 5 of the migration file again.

**Check that a user's role is what you expect:**

```sql
select u.email, p.role from auth.users u join public.profiles p on p.id = u.id order by u.email;
```
