# spotloop – Interactive Prototype

Mobile-first loyalty app **UI prototype** (React + Vite). Daten und Punkte kommen aus **statischen Demo‑Spots** in `src/MySpot.jsx` – **kein** Server, **kein** Supabase, **kein** E‑Mail‑Login.

**Admin / Händler („Spot“):** Im grünen **Screen‑Switcher** oben **„Admin“** bzw. **„Dashboard“** oder **„Händler‑Setup“** wählen – das sind **Klick‑Demos**, keine separaten Konten.

## Production (Vercel)

- **Live:** [https://spotloop-app-wheat.vercel.app](https://spotloop-app-wheat.vercel.app)
- Vercel‑Projektname: **spotloop-app**.

Wenn du irgendwo eine **andere** App mit echtem Backend siehst (Profil zeigt dauerhaft **0** Punkte, Login funktioniert nicht), prüfe im Vercel‑Dashboard **welches Git‑Repository** mit dem Projekt verknüpft ist – möglicherweise läuft dort noch nicht dieser Stand.

## Supabase

Siehe **[docs/SUPABASE.md](./docs/SUPABASE.md)** – Schritt 1 (Spots), Schritt 2 (Auth), **Schritt 3 (Follows & Stempel in der DB)**.

Ohne `VITE_SUPABASE_*` läuft die App automatisch im **Demo-Modus** (keine Netzwerk-Abfragen, kein Login).

## Run locally

```bash
cd /Users/richardmassagli/myspot
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

## Prototype screens

Use the dark green **screen switcher** at the top to jump between flows:

| Screen | Description |
|--------|-------------|
| Startseite | Landing, 4-stage model, traction |
| Check-in | QR scan → stamp → success |
| Wallet | Stamp cards, rewards, Apple/Google passes |
| Entdecken | Spot marketplace with filters |
| Meine Spots | Guest profile & active cards |
| Konto | Einstellungen / Mitgliedschaft (Demo) |
| Dashboard | Merchant metrics & AI tips |
| Kampagne | Campaign builder with credits |
| Händler-Setup | Merchant onboarding |
| Investor | Investor pitch view |
| spotloop Card | Card-linked loyalty demo |
| Anmeldung | Guest onboarding (phone → profile) |
| Nachrichten | Push-style notifications |
| Gruppe | Group poll / WhatsApp share |
| Scan-Flow | Receipt scan + payment split |
| Admin | Platform admin dashboard |

Bottom nav appears on main guest screens (Home, Spots, Wallet, Rewards).
