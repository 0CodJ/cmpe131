cmpe-131
\n+## Auth, Roles, and Admin Approval Setup
\n+This app uses Supabase Auth and a `profiles` table to store roles and approval status.\n+\n+1) Create environment variables in `.env.local` at project root:\n+```
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Current change:
- New timeline UI
- Removed zoom function
- Timeline now has a upper bound and lower bound for each day.

\n+2) In Supabase SQL editor, create the `profiles` table and policies:\n+\n+```
-- Profiles table mirrors auth.users and stores role/approval
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'user',
  approved boolean not null default false,
  inserted_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Policies: users can read their own row and admins can read all
create policy if not exists "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy if not exists "profiles_select_admin" on public.profiles
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Users can insert their own row (on first login/signup)
create policy if not exists "profiles_insert_self" on public.profiles
  for insert with check (auth.uid() = id);

-- Admins can update any profile (to approve users / change roles)
create policy if not exists "profiles_update_admin" on public.profiles
  for update using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Optional: users can update their email only on their own row
create policy if not exists "profiles_update_self_email" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
```
\n+3) Seed your first admin (run in SQL editor; replace YOUR_USER_ID):\n+```
update public.profiles
set role = 'admin', approved = true
where id = 'YOUR_USER_ID';
```
To get `YOUR_USER_ID`, sign up once in the app, then query:
```
select id, email from public.profiles;
```
\n+4) Ensure your `historical_events` table exists (used by Add Event):
```
create table if not exists public.historical_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  month int not null,
  day int not null,
  year int not null,
  category text not null,
  created_at timestamp with time zone default now()
);

alter table public.historical_events enable row level security;

-- Allow only approved users to insert
create policy if not exists "events_insert_approved" on public.historical_events
  for insert with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.approved = true
    )
  );

-- Anyone can read
create policy if not exists "events_select_all" on public.historical_events
  for select using (true);
```
\n+5) Run locally:
```
npm install
npm run dev
```
\n+After signup, non-admin users will show as "Pending approval" and cannot add events until an admin approves them in the Admin Dashboard.
