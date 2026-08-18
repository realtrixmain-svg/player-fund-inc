-- Shared client-portal DB for player-fund / hamilton-pe / hamilton-portfolio.
-- One Supabase project, one auth.users table. `site` on profiles/documents scopes
-- what a normal client sees; is_admin=true bypasses the site check entirely, so
-- one admin account can manage all three portals. Idempotent — safe to re-run.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  site text not null default 'player-fund' check (site in ('player-fund', 'hamilton-pe', 'hamilton-portfolio')),
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.profiles add column if not exists site text not null default 'player-fund';
alter table public.profiles drop constraint if exists profiles_site_check;
alter table public.profiles add constraint profiles_site_check check (site in ('player-fund', 'hamilton-pe', 'hamilton-portfolio'));

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

-- auto-create a profile row the moment someone signs up, tagged with the site
-- they signed up on (portal-auth.js passes this in signUp's options.data.site)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, site)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'site', 'player-fund')
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
