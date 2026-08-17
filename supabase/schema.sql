-- Player Fund Inc client portal — run once in Supabase SQL editor.
-- Auth (users, email verification) is handled by Supabase's built-in auth.users,
-- this file only adds the app-level tables + RLS on top of it.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  storage_path text not null, -- object path inside the 'documents' storage bucket
  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.documents enable row level security;

-- profiles: a user can only ever see/edit their own row
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- RLS alone doesn't stop a client from updating is_admin on their own row (the
-- policy above only restricts WHICH row, not which columns) - lock that column
-- down at the grant level so only full_name is writable by end users.
revoke update on public.profiles from authenticated;
grant update (full_name) on public.profiles to authenticated;

-- documents: any signed-in (and therefore email-verified) client can read the list;
-- only admins can add/edit/remove documents
create policy "documents_select_authenticated" on public.documents
  for select using (auth.role() = 'authenticated');
create policy "documents_write_admin" on public.documents
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- auto-create a profile row the moment someone signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- storage: private 'documents' bucket, readable by any authenticated user,
-- writable only by admins. Create the bucket first (Storage > New bucket >
-- name "documents" > Public = OFF), then run this.
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

create policy "documents_bucket_read_authenticated" on storage.objects
  for select using (bucket_id = 'documents' and auth.role() = 'authenticated');
create policy "documents_bucket_write_admin" on storage.objects
  for all using (
    bucket_id = 'documents'
    and exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );
