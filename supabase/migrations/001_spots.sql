-- Schritt 1 (spotloop): Tabelle `spots` für die Gäste-Ansicht
-- Im Supabase Dashboard: SQL → New query → ausführen.

create table if not exists public.spots (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default '',
  area text not null default '',
  pts integer not null default 0,
  max_stamps integer not null default 10,
  reward text not null default '',
  color text not null default '#0B7A3E',
  emoji text not null default '📍',
  img text not null default '#E8F5EE',
  action text not null default '',
  followers integer not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists spots_sort_order_idx on public.spots (sort_order, name);

alter table public.spots enable row level security;

-- Öffentliches Lesen (später für Schreibzugriff eigene Policies / Auth)
drop policy if exists "spots_select_anon" on public.spots;
create policy "spots_select_anon"
  on public.spots
  for select
  to anon, authenticated
  using (true);

-- Seed nur wenn Tabelle leer (idempotent)
insert into public.spots (name, category, area, pts, max_stamps, reward, color, emoji, img, action, followers, sort_order)
select v.name, v.category, v.area, v.pts, v.max_stamps, v.reward, v.color, v.emoji, v.img, v.action, v.followers, v.sort_order
from (
  values
    ('Café Central', 'Café', 'Mitte', 5, 10, 'Gratis Kaffee', '#8B5CF6', '☕', '#F3E8FF', '2× Punkte heute!', 382, 1),
    ('Bar Roma', 'Drinks', 'West', 3, 8, 'Gratis Cocktail', '#EF4444', '🍹', '#FEE2E2', 'Happy Hour 16–19h', 248, 2),
    ('Bäckerei Katz', 'Bäckerei', 'Nord', 8, 10, 'Gratis Brezel', '#F59E0B', '🥐', '#FEF3C7', '', 156, 3),
    ('Pizzeria Verde', 'Lunch', 'Süd', 2, 8, 'Gratis Dessert', '#10B981', '🍕', '#D1FAE5', 'Neu bei spotloop!', 94, 4),
    ('Matcha House', 'Café', 'Ost',                   0, 6, 'Gratis Matcha', '#0F8A4B', '🍵', '#ECFDF3', '', 211, 5),
    ('Burger & Soul', 'Lunch', 'Mitte', 1, 6, 'Gratis Beilage', '#FF7A2F', '🍔', '#FFF7ED', 'Lunch-Deal 11–14h', 178, 6)
) as v(name, category, area, pts, max_stamps, reward, color, emoji, img, action, followers, sort_order)
where not exists (select 1 from public.spots limit 1);
