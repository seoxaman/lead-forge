-- =================================================================
-- LeadForge — Bad Lead Reports Table Setup
-- Run this in Supabase: SQL Editor → New Query → paste → RUN
-- =================================================================

-- Change this to YOUR admin email (the one that should access /admin)
-- Used in the RLS policies below
-- If you change it later, you must re-run policies 3 and 4

-- =================================================================
-- 1. CREATE TABLE
-- =================================================================
create table if not exists public.bad_lead_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  user_email text,
  -- Lead snapshot fields (so report is independent of user's localStorage)
  lead_id text not null,
  lead_name text,
  lead_niche text,
  lead_address text,
  lead_phone text,
  lead_email text,
  lead_city text,
  lead_country text,
  lead_gmb_url text,
  lead_rating numeric,
  lead_reviews integer,
  -- Report details
  reasons text[] default '{}',         -- array of reason codes
  notes text,                          -- free-text notes from user
  status text not null default 'open'  -- open / verified / rejected
    check (status in ('open', 'verified', 'rejected')),
  -- Timestamps & admin notes
  reported_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewer_notes text
);

-- =================================================================
-- 2. INDEXES (for fast filtering)
-- =================================================================
create index if not exists idx_bad_lead_reports_user_id
  on public.bad_lead_reports(user_id);

create index if not exists idx_bad_lead_reports_status
  on public.bad_lead_reports(status);

create index if not exists idx_bad_lead_reports_reported_at
  on public.bad_lead_reports(reported_at desc);

create index if not exists idx_bad_lead_reports_country
  on public.bad_lead_reports(lead_country);

-- =================================================================
-- 3. ROW LEVEL SECURITY (RLS)
-- =================================================================
alter table public.bad_lead_reports enable row level security;

-- Drop old policies if re-running this script
drop policy if exists "Users insert own reports" on public.bad_lead_reports;
drop policy if exists "Users view own reports" on public.bad_lead_reports;
drop policy if exists "Admin view all reports" on public.bad_lead_reports;
drop policy if exists "Admin update all reports" on public.bad_lead_reports;

-- Policy 1: Users can insert their own bad lead reports
create policy "Users insert own reports"
  on public.bad_lead_reports
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Policy 2: Users can view their own reports
create policy "Users view own reports"
  on public.bad_lead_reports
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Policy 3: ADMIN can view ALL reports
-- ⚠️ Replace 'seoxaman@gmail.com' with YOUR admin email
create policy "Admin view all reports"
  on public.bad_lead_reports
  for select
  to authenticated
  using (auth.jwt() ->> 'email' = 'seoxaman@gmail.com');

-- Policy 4: ADMIN can update reports (mark verified/rejected)
-- ⚠️ Replace 'seoxaman@gmail.com' with YOUR admin email
create policy "Admin update all reports"
  on public.bad_lead_reports
  for update
  to authenticated
  using (auth.jwt() ->> 'email' = 'seoxaman@gmail.com');

-- =================================================================
-- 4. (OPTIONAL) Test query — verify table is working
-- =================================================================
-- Run this AFTER inserting some test data:
--
--   select id, user_email, lead_name, reasons, status, reported_at
--   from public.bad_lead_reports
--   order by reported_at desc
--   limit 10;
