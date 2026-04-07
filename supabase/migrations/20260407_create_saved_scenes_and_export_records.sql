create table if not exists public.saved_scenes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  snapshot jsonb not null,
  thumbnail_data_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists saved_scenes_user_id_updated_at_idx
on public.saved_scenes (user_id, updated_at desc);

drop trigger if exists saved_scenes_set_updated_at on public.saved_scenes;
create trigger saved_scenes_set_updated_at
before update on public.saved_scenes
for each row
execute function public.set_users_updated_at();

alter table public.saved_scenes enable row level security;

drop policy if exists "Users can view their own saved scenes" on public.saved_scenes;
create policy "Users can view their own saved scenes"
on public.saved_scenes
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own saved scenes" on public.saved_scenes;
create policy "Users can insert their own saved scenes"
on public.saved_scenes
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own saved scenes" on public.saved_scenes;
create policy "Users can update their own saved scenes"
on public.saved_scenes
for update
using (auth.uid() = user_id);

drop policy if exists "Users can delete their own saved scenes" on public.saved_scenes;
create policy "Users can delete their own saved scenes"
on public.saved_scenes
for delete
using (auth.uid() = user_id);

create table if not exists public.export_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  scene_name text,
  snapshot jsonb,
  aspect text,
  scale integer,
  duration_seconds integer,
  storage_path text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists export_records_user_id_created_at_idx
on public.export_records (user_id, created_at desc);

alter table public.export_records enable row level security;

drop policy if exists "Users can view their own export records" on public.export_records;
create policy "Users can view their own export records"
on public.export_records
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own export records" on public.export_records;
create policy "Users can insert their own export records"
on public.export_records
for insert
with check (auth.uid() = user_id);
