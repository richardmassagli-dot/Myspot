# Supabase einbinden (Schritt für Schritt)

## Schritt 1 – Spots aus der Datenbank

1. **Supabase-Projekt** anlegen oder bestehendes öffnen.
2. Im **SQL Editor** den Inhalt von [`supabase/migrations/001_spots.sql`](../supabase/migrations/001_spots.sql) ausführen (legt `public.spots` an, RLS-Lese-Policy, Demo-Seed).
3. Unter **Project Settings → API** URL und `anon` key kopieren.
4. Lokal: `.env.example` nach `.env.local` kopieren und Werte eintragen:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. `npm run dev` – auf der Startseite erscheint bei Bedarf ein Hinweiszeile (Laden / Fehler / leere Tabelle). Ohne `.env` bleibt alles im **Demo-Modus** (wie bisher).

**Vercel:** dieselben Variablen unter *Project → Settings → Environment Variables* setzen und neu deployen.

### Spalten-Mapping (DB → UI)

| Spalte (`spots`) | UI-Feld |
|------------------|---------|
| `name` | Name |
| `category` | Kategorie (`cat`) |
| `area` | Bereich |
| `pts` | aktuelle Punkte |
| `max_stamps` | Stempel bis Reward (`max`) |
| `reward`, `color`, `emoji`, `img`, `action`, `followers` | wie gehabt |
| `owner_id` | Besitzer (`auth.users.id`), Plattform-Seed: `null` |
| `approval_status` | `pending` / `approved` / `rejected` – öffentliche Liste nur `approved` |

---

## Schritt 2 – Auth (Login / Registrierung) ✅

**Code:** `src/context/AuthContext.jsx`, `SpotsProvider` + `AuthProvider` in `src/main.jsx`, Screen **Login** oben in der Leiste sowie Formular-Flow in `MySpot.jsx` (`GuestAuthScreen`).

### Supabase-Dashboard

1. **Authentication → Providers → Email:** aktivieren (Standard).
2. **Authentication → URL configuration**
   - **Site URL:** z. B. `https://spotloop-app-wheat.vercel.app` bzw. deine Produktions-URL.
   - **Redirect URLs:** z. B. `http://localhost:5173/**`, `https://deine-domain.vercel.app/**`  
     (Wildcard erlaubt laut Supabase-Konfiguration.)

### Verhalten in der App

- Sind **URL + Anon-Key** gesetzt, gilt **Supabase-Modus**: folgende Screens erfordern eine Sitzung:
  - Wallet, Profil (Rewards), Konto (Einstellungen), Check-in, Benachrichtigungen, **Händler-Onboarding** (Spot anlegen).
- **Startseite, Entdecken, Spot-Detail, Händler-Dashboard-Demo** bleiben ohne Login erreichbar.
- Ohne Env-Variablen: wie bisher **reiner Demo-Modus**, kein Login nötig.

### Passwort-Reset / Magic Link

Noch nicht im UI verdrahtet – kann als **Schritt 2b** ergänzt werden (`resetPasswordForEmail`, eigene Route).

---

## Schritt 3 – Follows & Stempelstände pro Nutzer ✅

1. Im **SQL Editor** [`supabase/migrations/002_user_guest_data.sql`](../supabase/migrations/002_user_guest_data.sql) ausführen (Tabellen `user_spot_follows`, `user_spot_progress`, RLS nur für `authenticated`).
2. Spots müssen **aus der DB** kommen (`source === "supabase"`): Nur dann werden „Folgen“ und Stempel **persistent** gespeichert. Ohne Spots in der DB (reiner Demo-Fallback) bleibt „Folgen“ nur lokal im Browser.

### Verhalten

| Datenquelle | Folgen / Wallet |
|-------------|-----------------|
| Eingeloggt + Live-Spots aus Supabase | Follows & Stempel in Postgres, Wallet = gefolgte Spots mit deinen Punkten |
| Demo-Modus oder Demo-Fallback-Spots | Wie bisher: Beispiel-Karten im Wallet; „Folgen“ nur lokal auf Entdecken/Spot-Detail |

Check-in (**Punkt sichern**) schreibt bei Live-DB einen Stempel für den gewählten Spot (max. `max_stamps` aus `spots`).

---

## Schritt 4 – Händler-Spots & Admin-Freigabe ✅

1. Migration **003** anwenden (eine Variante):
   - **SQL Editor:** Inhalt von [`003_merchant_admin_spots.sql`](../supabase/migrations/003_merchant_admin_spots.sql) einfügen und ausführen.
   - **Oder lokal:** Connection-URI mit Datenbank-Passwort unter *Project Settings → Database* kopieren (nicht ins Repo committen), dann:
     ```bash
     DATABASE_URL="postgresql://postgres...." npm run db:apply-003
     ```
   Was die Migration macht:
   - Spalten `owner_id`, `approval_status` (Default **`pending`**; Zeilen ohne Owner werden auf **`approved`** gesetzt)
   - Öffentliches Lesen nur noch für freigegebene Spots (+ eigene Entwürfe für den Besitzer + alle Zeilen für App-Admins)
   - `INSERT` für eingeloggte Händler: nur `owner_id = auth.uid()` und `approval_status = 'pending'` (oder beliebig als Admin)
   - RPC **`admin_set_spot_approval(p_spot_id, p_status)`** für Freigabe/Ablehnung

2. **Admin im JWT:** Im Supabase-Dashboard unter **Authentication → Users** einen Nutzer wählen und in den Metadaten z. B. `is_admin: true` (User metadata oder App metadata) setzen. Danach **neu anmelden**, damit das Token den Eintrag enthält. Die DB-Funktion `is_app_admin()` wertet `user_metadata` / `app_metadata` aus.

3. **App-Verhalten:**
   - **Entdecken / `loadSpotsFromSupabase`:** nur `approval_status = 'approved'`.
   - **Händler-Onboarding:** legt einen Spot mit `pending` an (nach Login).
   - **Admin-Screen („Freigaben“):** ausstehende Spots listen, Freigeben oder Ablehnen (ruft RPC auf); nach Freigabe erscheint der Spot für Gäste.

### Code (Referenz)

- `src/lib/loadSpots.js` – öffentliche Spot-Liste
- `src/lib/merchantSpots.js` – Spot anlegen, eigene Spots, Pending-Liste, RPC
- `src/lib/admin.js` – Client-Hilfe `isAppAdminAccess`
- `MySpot.jsx` – Onboarding, Händler-Dashboard, Admin-Tab „Freigaben“

---

## Optionale nächste Schritte

- Passwort-Reset, E-Mail-Templates, QR-Zuordnung pro Spot
- Echte Metriken im Händler-Dashboard statt Demo-Zahlen
