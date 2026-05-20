-- Schritt 4: Händler-Spots (owner_id), Freigabe-Status, Admin-RPC
-- Nach 001_spots.sql und 002_user_guest_data.sql ausführen.

-- ─── Spalten ─────────────────────────────────────────────────────
alter table public.spots add column if not exists owner_id uuid references auth.users (id) on delete set null;
alter table public.spots add column if not exists approval_status text;

-- Standard: neue Zeilen = pending (Händler). Plattform-Spots ohne owner gleich freigeben.
update public.spots set approval_status = 'approved' where owner_id is null and (approval_status is null or btrim(approval_status) = '');
update public.spots set approval_status = 'pending' where approval_status is null or btrim(approval_status) = '';
alter table public.spots alter column approval_status set default 'pending';
alter table public.spots alter column approval_status set not null;

-- Check nur anlegen wenn noch nicht vorhanden
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'spots_approval_status_check'
  ) then
    alter table public.spots add constraint spots_approval_status_check
      check (approval_status in ('pending', 'approved', 'rejected'));
  end if;
end $$;

-- ─── Admin-Flag aus JWT (wie Dashboard „Authentication / Users“) ───
create or replace function public.is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    (auth.jwt() -> 'user_metadata' -> 'is_admin') = 'true'::jsonb
    or (auth.jwt() -> 'app_metadata' -> 'is_admin') = 'true'::jsonb
    or lower(coalesce(auth.jwt() -> 'user_metadata' ->> 'is_admin', '')) in ('true', '1', 't', 'yes')
    or lower(coalesce(auth.jwt() -> 'app_metadata' ->> 'is_admin', '')) in ('true', '1', 't', 'yes');
$$;

-- Nicht-Admins dürfen approval_status nicht ändern (Admin nutzt RPC unten)
create or replace function public.spots_lock_approval_for_non_admin()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'update' and not public.is_app_admin() then
    if new.approval_status is distinct from old.approval_status then
      new.approval_status := old.approval_status;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists tr_spots_lock_approval on public.spots;
create trigger tr_spots_lock_approval
  before update on public.spots
  for each row
  execute procedure public.spots_lock_approval_for_non_admin();

-- ─── RLS: Lesen ──────────────────────────────────────────────────
drop policy if exists "spots_select_anon" on public.spots;
drop policy if exists "spots_select_public" on public.spots;

create policy "spots_select_public"
  on public.spots
  for select
  to anon, authenticated
  using (
    approval_status = 'approved'
    or owner_id = (select auth.uid())
    or public.is_app_admin()
  );

-- Einfügen: Händler nur pending + eigene user_id; Admin beliebig
drop policy if exists "spots_insert_authenticated" on public.spots;
create policy "spots_insert_authenticated"
  on public.spots
  for insert
  to authenticated
  with check (
    public.is_app_admin()
    or (
      owner_id = (select auth.uid())
      and approval_status = 'pending'
    )
  );

-- Aktualisieren: eigener Spot oder Admin
drop policy if exists "spots_update_owner_or_admin" on public.spots;
create policy "spots_update_owner_or_admin"
  on public.spots
  for update
  to authenticated
  using (
    owner_id = (select auth.uid())
    or public.is_app_admin()
  )
  with check (
    owner_id = (select auth.uid())
    or public.is_app_admin()
  );

-- ─── Admin: Freigabe setzen (umgeht Trigger-Block nicht – is_admin im JWT) ───
create or replace function public.admin_set_spot_approval(p_spot_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_app_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_status not in ('pending', 'approved', 'rejected') then
    raise exception 'invalid approval_status';
  end if;
  update public.spots
  set approval_status = p_status
  where id = p_spot_id;
end;
$$;

grant execute on function public.admin_set_spot_approval(uuid, text) to authenticated;
