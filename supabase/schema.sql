-- Run this whole file in Supabase Dashboard -> SQL Editor -> New query -> Run

create extension if not exists "pgcrypto";

-- One row per user profile (created automatically on first Google login)
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  created_at timestamptz default now()
);

-- One row per Instagram professional account a user has connected
create table if not exists ig_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade not null,
  page_id text not null,
  ig_user_id text not null,
  ig_username text,
  access_token text not null,
  created_at timestamptz default now()
);

-- One row per automation rule a user configures
create table if not exists automation_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade not null,
  ig_connection_id uuid references ig_connections (id) on delete cascade not null,
  keyword text not null default '',        -- '' = match every comment
  comment_reply text not null,
  dm_message text not null,
  enabled boolean default true,
  created_at timestamptz default now()
);

-- Optional: raw log of every webhook event, handy for debugging
create table if not exists webhook_logs (
  id uuid primary key default gen_random_uuid(),
  payload jsonb,
  created_at timestamptz default now()
);

-- Row Level Security: every user can only see their own rows
alter table profiles enable row level security;
alter table ig_connections enable row level security;
alter table automation_rules enable row level security;

create policy "profiles: owner read/write" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "ig_connections: owner read/write" on ig_connections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "automation_rules: owner read/write" on automation_rules
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Auto-create a profile row whenever someone signs up via Google
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
