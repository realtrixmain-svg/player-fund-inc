-- Shared client-portal DB for player-fund / hamilton-pe / hamilton-portfolio.
-- One Supabase project, one auth.users table. `site` on profiles/documents scopes
-- what a normal client sees; is_admin=true bypasses the site check entirely, so
-- one admin account can manage all three portals. Idempotent — safe to re-run.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  site text not null default 'unassigned' check (site in ('unassigned', 'player-fund', 'hamilton-pe', 'hamilton-portfolio')),
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.profiles add column if not exists site text not null default 'unassigned';
alter table public.profiles alter column site set default 'unassigned';
alter table public.profiles drop constraint if exists profiles_site_check;
-- 'unassigned' is a real, allowed value here and nowhere else: no documents row
-- and no storage bucket can ever carry it, so a profile sitting on it reads
-- nothing at all. It is the fail-closed landing spot for any account that was
-- created without going through a signup edge function.
alter table public.profiles add constraint profiles_site_check check (site in ('unassigned', 'player-fund', 'hamilton-pe', 'hamilton-portfolio'));

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  storage_path text not null, -- object path inside the 'documents' storage bucket
  site text not null default 'player-fund' check (site in ('player-fund', 'hamilton-pe', 'hamilton-portfolio')),
  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
alter table public.documents add column if not exists site text not null default 'player-fund';
alter table public.documents drop constraint if exists documents_site_check;
alter table public.documents add constraint documents_site_check check (site in ('player-fund', 'hamilton-pe', 'hamilton-portfolio'));

alter table public.profiles enable row level security;
alter table public.documents enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "documents_select_authenticated" on public.documents;
drop policy if exists "documents_write_admin" on public.documents;

-- profiles: a user can only ever see/edit their own row
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- RLS alone doesn't stop a client from updating is_admin/site on their own row (the
-- policy above only restricts WHICH row, not which columns) - lock those columns
-- down at the grant level so only full_name is writable by end users.
revoke update on public.profiles from authenticated;
grant update (full_name) on public.profiles to authenticated;

-- documents: a signed-in client sees only documents tagged for their own site;
-- an admin (any site) sees and writes across all sites
create policy "documents_select_own_site" on public.documents
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and (p.site = documents.site or p.is_admin)
    )
  );
create policy "documents_write_admin" on public.documents
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- auto-create a profile row the moment someone signs up. `site` is NEVER read
-- from raw_user_meta_data: that field is client-supplied at signup (attacker
-- can set it directly via the public /auth/v1/signup endpoint with nothing
-- more than the anon key), and this DB is shared across three tenants, so
-- trusting it let any signup on any site claim to be a client of any other
-- site's portal and read its documents.
--
-- It defaults to 'unassigned', NOT to a real site. Supabase's own
-- /auth/v1/signup endpoint is reachable by anyone holding the anon key, and
-- the anon key ships in portal/config.js by design - so account creation
-- cannot be prevented here, only made worthless. An account made that way
-- lands on 'unassigned' and can read nothing. Only the per-site signup edge
-- function (supabase/functions/signup-<site>/), which redeems an access code
-- first, moves a profile onto a real site, using the service-role key
-- server-side. Also turn off public signups in the dashboard (SETUP.md step 1)
-- - this default is the second lock, not the first.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, site)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'unassigned'
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- storage: one shared private 'documents' bucket for all three portals. A given
-- object is only readable by a client whose profile.site matches the site of the
-- documents row pointing at it (or by an admin). Create the bucket first
-- (Storage > New bucket > name "documents" > Public = OFF), then run this.
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

drop policy if exists "documents_bucket_read_authenticated" on storage.objects;
drop policy if exists "documents_bucket_write_admin" on storage.objects;

create policy "documents_bucket_read_own_site" on storage.objects
  for select using (
    bucket_id = 'documents'
    and exists (
      select 1 from public.documents d
      join public.profiles p on p.id = auth.uid()
      where d.storage_path = storage.objects.name and (d.site = p.site or p.is_admin)
    )
  );
create policy "documents_bucket_write_admin" on storage.objects
  for all using (
    bucket_id = 'documents'
    and exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- Google Drive sync (see functions/drive-sync): tracks which Drive file a row came
-- from, so re-syncs update in place instead of creating duplicate document rows.
alter table public.documents add column if not exists drive_file_id text;
create unique index if not exists documents_drive_file_id_idx
  on public.documents (drive_file_id) where drive_file_id is not null;

-- ---------------------------------------------------------------------------
-- Access codes: nobody creates an account without one.
--
-- One row = one invited person. `code` is whatever the admin wants it to be -
-- an ID number, a pre-approved phone number, a generated string. `site` is what
-- the code unlocks, and the signup edge function assigns profiles.site from the
-- code row, so a hamilton-portfolio code can never open a hamilton-pe account.
-- That is the whole point: the code, not the sign-up page, decides which
-- documents the person will be able to see.
--
-- Single-use: redeemed_at is stamped when it is spent. Set `email` to lock a
-- code to one address, or leave it null to let the invitee use any address.
-- Admin workflow is Table editor -> access_codes -> Insert row; no UI for it.
create table if not exists public.access_codes (
  code text primary key,
  site text not null check (site in ('player-fund', 'hamilton-pe', 'hamilton-portfolio')),
  email text,          -- optional: if set, only this address may redeem the code
  label text,          -- free text for the admin: who this was issued to
  expires_at timestamptz,
  redeemed_by uuid references auth.users(id) on delete set null,
  redeemed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Codes are matched case-insensitively (an invitee typing "hp-4f2a" should not
-- fail against "HP-4F2A"), so normalise on the way in rather than at match time
-- - a hand-typed row in the Table editor gets the same treatment as one from a
-- script, and the primary key stops two codes differing only by case.
create or replace function public.normalize_access_code()
returns trigger as $$
begin
  new.code := upper(btrim(new.code));
  new.email := nullif(lower(btrim(new.email)), '');
  return new;
end;
$$ language plpgsql set search_path = public;

drop trigger if exists access_codes_normalize on public.access_codes;
create trigger access_codes_normalize
  before insert or update on public.access_codes
  for each row execute function public.normalize_access_code();

-- No policies below the RLS switch, on purpose: that denies every anon and
-- authenticated request outright. Only the service-role key (which bypasses
-- RLS) can read or spend a code, and that key lives in the signup edge
-- functions, server-side. Revoking the grants as well means a client that
-- somehow got a session still cannot enumerate unredeemed codes.
alter table public.access_codes enable row level security;
revoke all on public.access_codes from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Per-site storage buckets.
--
-- The shared 'documents' bucket above scoped access with a join back to the
-- documents table: an object was readable if SOME documents row pointed at it
-- with a matching site. That works, but it makes the file's blast radius depend
-- on a row's `site` column being right - mis-tag one row and the file behind it
-- is exposed to another portal's clients. One bucket per site moves the boundary
-- onto the object's own location, so a hamilton-pe client cannot read a
-- player-fund file even if a documents row is wrong.
--
-- Bucket name is always 'documents-' || profiles.site, which is what
-- portal/portal-dashboard.js derives from its own SITE constant.
insert into storage.buckets (id, name, public)
values
  ('documents-player-fund', 'documents-player-fund', false),
  ('documents-hamilton-pe', 'documents-hamilton-pe', false),
  ('documents-hamilton-portfolio', 'documents-hamilton-portfolio', false)
on conflict (id) do nothing;

drop policy if exists "site_bucket_read_own_site" on storage.objects;
drop policy if exists "site_bucket_write_admin" on storage.objects;

create policy "site_bucket_read_own_site" on storage.objects
  for select using (
    bucket_id like 'documents-%'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (p.is_admin or bucket_id = 'documents-' || p.site)
    )
  );
create policy "site_bucket_write_admin" on storage.objects
  for all using (
    bucket_id like 'documents-%'
    and exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- The legacy 'documents' bucket and its policies are left in place on purpose.
-- The six player-fund PDFs have already been copied into documents-player-fund
-- at identical paths and verified downloading from there, so nothing reads the
-- legacy bucket any more - it is a rollback copy, not a live dependency. Safe to
-- drop in the Storage UI whenever the duplicate ~24 MB is worth reclaiming.
-- See SETUP.md step 4b.

-- ---------------------------------------------------------------------------
-- Administrator step-up verification.
--
-- An admin password on its own opens nothing. After signing in, an admin gets a
-- six-digit code emailed through Resend by functions/admin-verify; redeeming it
-- writes an admin_sessions row, and public.is_verified_admin() below is what
-- every admin power in the system actually hangs off - cross-site document
-- reads, every write into the per-site buckets, and the access-code API.
--
-- Both tables are RLS-on with no policies and no grants: only the service-role
-- key inside functions/admin-verify can write them, so a browser holding an
-- admin JWT cannot mint itself a session.
create table if not exists public.admin_login_codes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  code_hash text not null,          -- sha-256 of "<user_id>:<code>", never the code
  attempts int not null default 0,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- session_id is the claim of the same name on the caller's Supabase access token,
-- stable across token refreshes. Elevation is bound to it, not just to the user:
-- keyed on user_id alone, a second sign-in on the same account (someone holding
-- a stolen password) would be carried into the verified window the moment the
-- real admin redeemed a code in their own browser, without ever receiving one.
create table if not exists public.admin_sessions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  session_id uuid,
  verified_at timestamptz not null default now(),
  expires_at timestamptz not null
);
alter table public.admin_sessions add column if not exists session_id uuid;

alter table public.admin_login_codes enable row level security;
alter table public.admin_sessions enable row level security;
revoke all on public.admin_login_codes from anon, authenticated;
revoke all on public.admin_sessions from anon, authenticated;

create or replace function public.is_verified_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    join public.admin_sessions s on s.user_id = p.id
    where p.id = auth.uid()
      and p.is_admin
      and s.expires_at > now()
      and s.session_id is not null
      and s.session_id::text = (auth.jwt() ->> 'session_id')
  );
$$;
-- A security-definer function in the public schema is exposed as an RPC and
-- PUBLIC holds EXECUTE by default, so drop that and grant explicitly. anon is
-- on the list on purpose: the documents SELECT policy ORs this function in, and
-- without the grant an unauthenticated read would raise "permission denied for
-- function" instead of the empty result that proves RLS is doing its job.
revoke execute on function public.is_verified_admin() from public;
grant execute on function public.is_verified_admin() to authenticated, anon, service_role;

-- Re-point every admin branch at the gate. Before this, is_admin on its own was
-- enough; now the emailed code has to have been redeemed as well.
drop policy if exists "documents_select_own_site" on public.documents;
drop policy if exists "documents_write_admin" on public.documents;

create policy "documents_select_own_site" on public.documents
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.site = documents.site
    )
    or public.is_verified_admin()
  );
create policy "documents_write_admin" on public.documents
  for all using (public.is_verified_admin()) with check (public.is_verified_admin());

drop policy if exists "site_bucket_read_own_site" on storage.objects;
drop policy if exists "site_bucket_write_admin" on storage.objects;

create policy "site_bucket_read_own_site" on storage.objects
  for select using (
    bucket_id like 'documents-%'
    and (
      public.is_verified_admin()
      or exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and bucket_id = 'documents-' || p.site
      )
    )
  );
create policy "site_bucket_write_admin" on storage.objects
  for all using (bucket_id like 'documents-%' and public.is_verified_admin())
  with check (bucket_id like 'documents-%' and public.is_verified_admin());

-- Three more storage policies existed only in the live project and never in this
-- file (they predate it - same intent, different names). RLS policies are
-- permissive and OR together, so leaving them on plain is_admin would have given
-- an admin who had not redeemed their emailed code full read/write on every
-- bucket anyway. Recreated here against the same gate so the two can't drift
-- apart again.
drop policy if exists "documents_read_own_site_bucket" on storage.objects;
create policy "documents_read_own_site_bucket" on storage.objects
  for select using (
    bucket_id = any (array['documents-player-fund','documents-hamilton-pe','documents-hamilton-portfolio'])
    and (
      public.is_verified_admin()
      or exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and storage.objects.bucket_id = 'documents-' || p.site
      )
    )
  );

drop policy if exists "documents_write_admin_buckets" on storage.objects;
create policy "documents_write_admin_buckets" on storage.objects
  for all using (
    bucket_id = any (array['documents-player-fund','documents-hamilton-pe','documents-hamilton-portfolio'])
    and public.is_verified_admin()
  )
  with check (
    bucket_id = any (array['documents-player-fund','documents-hamilton-pe','documents-hamilton-portfolio'])
    and public.is_verified_admin()
  );

-- The legacy shared 'documents' bucket is a rollback copy nothing reads. Keep it
-- reachable only by a verified admin rather than by any is_admin account.
drop policy if exists "documents_bucket_read_own_site" on storage.objects;
drop policy if exists "documents_bucket_write_admin" on storage.objects;
drop policy if exists "documents_legacy_bucket_admin_only" on storage.objects;
create policy "documents_legacy_bucket_admin_only" on storage.objects
  for all using (bucket_id = 'documents' and public.is_verified_admin())
  with check (bucket_id = 'documents' and public.is_verified_admin());
