-- Cambridge Science Mind Map app
-- 1) Run this in Supabase SQL Editor.
-- 2) Create a public storage bucket named: science-images
-- 3) Set bucket public = ON for easiest image display.

create extension if not exists "uuid-ossp";

create table if not exists public.science_folders (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);

create table if not exists public.science_maps (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  folder_id uuid not null references public.science_folders(id) on delete cascade,
  title text not null,
  created_at timestamptz default now()
);

create table if not exists public.science_nodes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  map_id uuid not null references public.science_maps(id) on delete cascade,
  parent_id uuid references public.science_nodes(id) on delete set null,
  keyword text not null,
  meaning_vi text default '',
  explanation_en text default '',
  example_en text default '',
  image_url text default '',
  x integer default 420,
  y integer default 260,
  created_at timestamptz default now()
);

alter table public.science_folders enable row level security;
alter table public.science_maps enable row level security;
alter table public.science_nodes enable row level security;

create policy "folders_select_own" on public.science_folders for select using (auth.uid() = user_id);
create policy "folders_insert_own" on public.science_folders for insert with check (auth.uid() = user_id);
create policy "folders_update_own" on public.science_folders for update using (auth.uid() = user_id);
create policy "folders_delete_own" on public.science_folders for delete using (auth.uid() = user_id);

create policy "maps_select_own" on public.science_maps for select using (auth.uid() = user_id);
create policy "maps_insert_own" on public.science_maps for insert with check (auth.uid() = user_id);
create policy "maps_update_own" on public.science_maps for update using (auth.uid() = user_id);
create policy "maps_delete_own" on public.science_maps for delete using (auth.uid() = user_id);

create policy "nodes_select_own" on public.science_nodes for select using (auth.uid() = user_id);
create policy "nodes_insert_own" on public.science_nodes for insert with check (auth.uid() = user_id);
create policy "nodes_update_own" on public.science_nodes for update using (auth.uid() = user_id);
create policy "nodes_delete_own" on public.science_nodes for delete using (auth.uid() = user_id);

-- Optional storage policies if you keep the bucket private.
-- For easiest setup, create bucket science-images and set it Public.
