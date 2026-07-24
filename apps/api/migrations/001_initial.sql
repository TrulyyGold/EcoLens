-- EcoLens initial schema for Supabase Postgres.
-- Apply with `supabase db push` or in the Supabase SQL editor.

create extension if not exists pgcrypto;

create table if not exists public.scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  result jsonb not null,
  constraint scans_result_is_object check (jsonb_typeof(result) = 'object'),
  constraint scans_result_contract_keys check (
    result ?& array[
      'scan_id', 'status', 'identification', 'description', 'safety',
      'recipes', 'facts', 'created_at', 'chat_available', 'analysis_meta'
    ]
  )
);

create index if not exists scans_user_created_at_idx
  on public.scans (user_id, created_at desc);
create index if not exists scans_created_at_idx
  on public.scans (created_at desc);

alter table public.scans enable row level security;
alter table public.scans force row level security;

-- Direct Supabase clients may access only their own rows. The trusted API should
-- use SUPABASE_SERVICE_ROLE_KEY, which bypasses RLS, and must never expose it.
drop policy if exists "Users can read their own scans" on public.scans;
create policy "Users can read their own scans"
  on public.scans for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own scans" on public.scans;
create policy "Users can insert their own scans"
  on public.scans for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own scans" on public.scans;
create policy "Users can update their own scans"
  on public.scans for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own scans" on public.scans;
create policy "Users can delete their own scans"
  on public.scans for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scan_id uuid not null references public.scans(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, scan_id)
);

create index if not exists favorites_user_created_at_idx
  on public.favorites (user_id, created_at desc);
create index if not exists favorites_scan_id_idx
  on public.favorites (scan_id);

alter table public.favorites enable row level security;
alter table public.favorites force row level security;

drop policy if exists "Users can read their own favorites" on public.favorites;
create policy "Users can read their own favorites"
  on public.favorites for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own favorites" on public.favorites;
create policy "Users can insert their own favorites"
  on public.favorites for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own favorites" on public.favorites;
create policy "Users can delete their own favorites"
  on public.favorites for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users(id) on delete cascade,
  scan_id uuid not null references public.scans(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (length(content) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_scan_created_at_idx
  on public.chat_messages (scan_id, created_at asc);
create index if not exists chat_messages_user_id_idx
  on public.chat_messages (user_id);

alter table public.chat_messages enable row level security;
alter table public.chat_messages force row level security;

drop policy if exists "Users can read their own chat messages" on public.chat_messages;
create policy "Users can read their own chat messages"
  on public.chat_messages for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own chat messages" on public.chat_messages;
create policy "Users can insert their own chat messages"
  on public.chat_messages for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- Private image bucket. The backend uploads through the service role and returns
-- one-hour signed URLs. Keep this bucket private; do not add an anonymous SELECT
-- policy. For direct mobile uploads, change object paths to `${auth.uid()}/...`
-- and add policies that compare the first storage.foldername(name) segment with
-- auth.uid()::text.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'scan-images',
  'scan-images',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
