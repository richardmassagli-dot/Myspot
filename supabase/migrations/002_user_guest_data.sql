-- Schritt 3: Gast-Daten (Follows + Stempelstände pro User)
-- Voraussetzung: 001_spots.sql (Tabelle public.spots)

create table if not exists public.user_spot_follows (
  user_id uuid not null references auth.users (id) on delete cascade,
  spot_id uuid not null references public.spots (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, spot_id)
);

create index if not exists user_spot_follows_user_idx on public.user_spot_follows (user_id, created_at desc);

create table if not exists public.user_spot_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  spot_id uuid not null references public.spots (id) on delete cascade,
  stamps int not null default 0 check (stamps >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, spot_id)
);

alter table public.user_spot_follows enable row level security;
alter table public.user_spot_progress enable row level security;

drop policy if exists "user_spot_follows_own" on public.user_spot_follows;
create policy "user_spot_follows_own"
  on public.user_spot_follows for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "user_spot_progress_own" on public.user_spot_progress;
create policy "user_spot_progress_own"
  on public.user_spot_progress for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
