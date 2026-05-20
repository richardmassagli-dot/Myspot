import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "./context/AuthContext.jsx";
import { useGuestSpotData } from "./context/GuestDataContext.jsx";
import { useSpots } from "./context/SpotsContext.jsx";
import { DEMO_SPOTS } from "./data/demoSpots.js";
import { isAppAdminAccess } from "./lib/admin.js";
import {
  adminSetSpotApproval,
  createMerchantSpot,
  loadMerchantSpotsForUser,
  loadPendingSpotsForAdmin,
} from "./lib/merchantSpots.js";

// ─── Design Tokens – myspot Brand ─────────────────────────────────
const C = {
  green:   "#0B7A3E",   // exact brand green from flyer
  fresh:   "#1DB954",   // lighter accent green
  mint:    "#E8F5EE",   // soft green bg
  white:   "#FFFFFF",
  bg:      "#F5F7F5",   // very slight green tint
  dark:    "#0D1B12",   // near-black with green tint (from flyer header)
  darkGreen:"#0A3D1F",  // deep dark green header
  mid:     "#2D4A35",
  muted:   "#6B8070",
  border:  "#DCE8DC",
  purple:  "#6D5DF6",
  orange:  "#FF7A2F",
  red:     "#E53E3E",
  gold:    "#F5A623",
};

// ─── Shared Components ────────────────────────────────────────────
function Screen({ children, bg = C.bg, pad = true }) {
  return (
    <div style={{
      background: bg,
      minHeight: "100%",
      padding: pad ? "0 0 80px" : 0,
      fontFamily: "'Inter', -apple-system, 'Helvetica Neue', sans-serif",
    }}>
      {children}
    </div>
  );
}

function Btn({ children, onClick, type = "button", disabled = false, variant = "primary", full = true, small = false, style = {} }) {
  const styles = {
    primary:   { background: C.green,     color: "#fff",    border: "none", boxShadow: `0 3px 12px rgba(11,122,62,.3)` },
    secondary: { background: C.mint,      color: C.green,   border: `1.5px solid ${C.green}`, boxShadow:"none" },
    ghost:     { background: "transparent",color: C.muted,  border: `1.5px solid ${C.border}`, boxShadow:"none" },
    dark:      { background: C.darkGreen, color: "#fff",    border: "none", boxShadow:"0 3px 12px rgba(0,0,0,.25)" },
    orange:    { background: C.orange,    color: "#fff",    border: "none", boxShadow:"none" },
    purple:    { background: C.purple,    color: "#fff",    border: "none", boxShadow:"none" },
  };
  return (
    <button type={type} disabled={disabled} onClick={onClick} style={{
      ...styles[variant],
      width: full ? "100%" : "auto",
      padding: small ? "9px 16px" : "13px 20px",
      borderRadius: 10,
      fontSize: small ? 13 : 14,
      fontWeight: 700,
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.65 : 1,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      transition: "all .15s",
      letterSpacing: -0.1,
      ...style,
    }}>
      {children}
    </button>
  );
}

function Card({ children, style = {}, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: C.white,
      borderRadius: 14,
      border: `1px solid ${C.border}`,
      padding: 16,
      boxShadow: "0 1px 6px rgba(0,0,0,.06)",
      cursor: onClick ? "pointer" : "default",
      ...style,
    }}>
      {children}
    </div>
  );
}

function ProgressBar({ value, max, color = C.green, height = 7 }) {
  return (
    <div style={{ background: C.mint, borderRadius: 99, height, overflow: "hidden" }}>
      <div style={{ background: color, height, borderRadius: 99, width: `${Math.min((value / max) * 100, 100)}%`, transition: "width .5s ease" }} />
    </div>
  );
}

function Tag({ children, color = C.green, bg = C.mint }) {
  return (
    <span style={{ background: bg, color, borderRadius: 6, padding: "3px 9px", fontSize: 11, fontWeight: 700, display: "inline-block", letterSpacing: -0.1 }}>
      {children}
    </span>
  );
}

// myspot Logo matching the flyer exactly
function Logo({ size = 28, light = false }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
      {/* Circle with m */}
      <div style={{ width: size, height: size, background: C.green, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: `0 2px 8px rgba(11,122,62,.3)` }}>
        <span style={{ fontSize: size * .52, fontWeight: 900, color: "#fff", lineHeight: 1, fontFamily: "Inter, sans-serif", letterSpacing: -1 }}>m</span>
      </div>
      <span style={{ fontSize: size * .85, fontWeight: 800, color: light ? "#fff" : C.dark, letterSpacing: -0.8 }}>spotloop</span>
    </div>
  );
}

// Section label like in flyer
function SectionLabel({ children, light = false }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: light ? "rgba(255,255,255,.6)" : C.muted, textTransform: "uppercase", marginBottom: 6 }}>
      {children}
    </div>
  );
}

function BackBtn({ onClick, dark = false }) {
  return (
    <button onClick={onClick} style={{ background: dark ? "rgba(255,255,255,.12)" : C.white, border: `1px solid ${dark ? "rgba(255,255,255,.18)" : C.border}`, borderRadius: 10, width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: dark ? "#fff" : C.dark, fontSize: 17 }}>←</button>
  );
}

// Check item like in flyer
function Check({ children, light = false }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 7 }}>
      <div style={{ width: 18, height: 18, borderRadius: "50%", background: light ? "rgba(255,255,255,.2)" : C.mint, border: `1.5px solid ${light ? "rgba(255,255,255,.4)" : C.green}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
        <span style={{ fontSize: 9, color: light ? "#fff" : C.green, fontWeight: 900 }}>✓</span>
      </div>
      <span style={{ fontSize: 13, color: light ? "rgba(255,255,255,.9)" : C.mid, lineHeight: 1.4 }}>{children}</span>
    </div>
  );
}

/** Punkte-/Karten-Kennzahlen aus der aktuellen Spot-Liste (Supabase oder Demo). */
function getWalletStats(spotsList) {
  const base = spotsList?.length ? spotsList : DEMO_SPOTS;
  const myCards = base.slice(0, 5);
  return {
    totalPts: myCards.reduce((a, s) => a + s.pts, 0),
    cardCount: myCards.length,
  };
}

const CATS = ["Alle", "Café", "Lunch", "Drinks", "Bäckerei", "Date", "Nightlife"];

function SettingsMenuRow({ icon, title, sub, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "14px 16px",
        background: C.white,
        border: "none",
        borderBottom: `1px solid ${C.border}`,
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      <span style={{ fontSize: 22, width: 36, textAlign: "center" }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>{title}</div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{sub}</div>
      </div>
      <span style={{ fontSize: 18, color: C.muted }}>›</span>
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════
// A. STARTSEITE (Landing)
// ═══════════════════════════════════════════════════════════════════
function Landing({ goTo }) {
  const { spots, loading, error, source, refresh } = useSpots();
  const { user, needsAuth } = useAuth();

  return (
    <Screen bg={C.bg} pad={false}>
      {/* ── HERO – dunkelgrüner Header wie im Flyer ── */}
      <div style={{ background: C.darkGreen, padding: "36px 24px 32px", position: "relative", overflow: "hidden" }}>
        {/* Subtle pattern */}
        <div style={{ position: "absolute", top: -60, right: -60, width: 220, height: 220, borderRadius: "50%", background: "rgba(255,255,255,.03)" }} />
        <div style={{ position: "absolute", bottom: -30, left: -30, width: 160, height: 160, borderRadius: "50%", background: "rgba(27,185,84,.06)" }} />

        <div style={{ position: "relative" }}>
          <Logo size={26} light />
          <div style={{ marginTop: 24, marginBottom: 20 }}>
            <div style={{ fontSize: 32, fontWeight: 900, color: "#fff", lineHeight: 1.1, letterSpacing: -1 }}>
              Dein Besuch.<br />
              <span style={{ color: C.fresh }}>Deine Vorteile.</span>
            </div>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,.65)", marginTop: 10, lineHeight: 1.5 }}>
              Die digitale Loyalty-Plattform<br />für lokale Gastronomie.
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <Check light>Mehr Stammgäste für Händler</Check>
            <Check light>Mehr Vorteile für Gäste</Check>
            <Check light>Messbar. Einfach. Ohne Aufwand.</Check>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button onClick={() => goTo("checkin")} style={{ background: C.green, color: "#fff", border: "none", borderRadius: 10, padding: "14px 20px", fontSize: 15, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 4px 16px rgba(11,122,62,.4)" }}>
              <span style={{ fontSize: 17 }}>⬛</span> QR scannen & Punkte sichern
            </button>
            <button onClick={() => goTo("discover")} style={{ background: "rgba(255,255,255,.1)", color: "#fff", border: "1px solid rgba(255,255,255,.25)", borderRadius: 10, padding: "13px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              Spots entdecken →
            </button>
            {needsAuth && !user && (
              <button type="button" onClick={() => goTo("auth")} style={{ background: "rgba(255,255,255,.15)", color: "#fff", border: "1px solid rgba(255,255,255,.35)", borderRadius: 10, padding: "12px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Konto: Anmelden oder registrieren
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── WARUM MYSPOT – wie rechte Spalte im Flyer ── */}
      <div style={{ background: C.white, padding: "20px 24px", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: C.green, letterSpacing: 0.5, marginBottom: 14 }}>WARUM MYSPOT?</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            { icon: "🚫💳", title: "Keine Plastikkarte",   sub: "Alles digital im Wallet oder in der App." },
            { icon: "⚡",    title: "Ohne Mehraufwand",     sub: "Für Gäste und Personal." },
            { icon: "⭐",    title: "Punkte & Rewards",     sub: "Bei deinen Lieblings-Spots sammeln." },
            { icon: "🎁",    title: "Exklusive Aktionen",   sub: "Rabatte, Gratis, 2× Punkte und mehr." },
            { icon: "📊",    title: "Immer im Blick",       sub: "Fortschritt und Aktionen auf einen Blick." },
            { icon: "📍",    title: "Spots entdecken",       sub: "Neue Lieblingsorte in deiner Nähe finden." },
          ].map((b, i) => (
            <div key={i} style={{ background: C.bg, borderRadius: 12, padding: "11px 12px" }}>
              <div style={{ fontSize: 18, marginBottom: 5 }}>{b.icon.split("")[0]}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.dark, marginBottom: 2 }}>{b.title}</div>
              <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.3 }}>{b.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── DAS 4-STUFEN-MODELL wie im Flyer ── */}
      <div style={{ padding: "20px 24px 0", background: C.bg }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 }}>Das 4-Stufen-Modell</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: C.dark, marginBottom: 16, letterSpacing: -0.3 }}>Von einmalig zu automatisch</div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { n: "1", color: C.green,   label: "QR-Check-in",       sub: "Sofort starten",      desc: "QR scannen am Tisch, Tresen oder auf dem Bon. Ohne App-Download." },
            { n: "2", color: "#0B6B8A", label: "Wallet",             sub: "Bequem bleiben",      desc: "myspot-Karte mit 1 Klick ins Apple oder Google Wallet." },
            { n: "3", color: C.purple,  label: "Native App",         sub: "Mehr entdecken",      desc: "Entdecke neue Spots, Aktionen & Rewards auf einem Marktplatz." },
            { n: "4", color: C.orange,  label: "Card-Linked",        sub: "Automatisch sammeln", desc: "Karte einmal verknüpfen. Ganz normal zahlen. Punkte automatisch." },
          ].map((s, i) => (
            <div key={i} style={{ background: C.white, borderRadius: 12, padding: "12px 14px", border: `1px solid ${C.border}`, display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: s.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#fff", flexShrink: 0 }}>{s.n}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 3 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: C.dark }}>{s.label}</div>
                  <div style={{ background: s.color + "18", color: s.color, borderRadius: 5, padding: "1px 7px", fontSize: 10, fontWeight: 700 }}>{s.sub}</div>
                </div>
                <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.4 }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── SO FUNKTIONIERT'S ── */}
      <div style={{ padding: "20px 24px 0" }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: C.green, letterSpacing: 0.5, marginBottom: 12 }}>SO FUNKTIONIERT'S</div>
        <div style={{ display: "flex", gap: 0, position: "relative" }}>
          <div style={{ position: "absolute", left: 19, top: 20, bottom: 60, width: 1.5, background: C.border }} />
          {[
            { icon: "⬛", title: "QR scannen",      sub: "Am Tisch, Tresen oder auf dem Bon – kein Download nötig." },
            { icon: "⭐", title: "Punkte sammeln",   sub: "Jeder Besuch bringt Punkte. Fortschritt immer im Blick." },
            { icon: "🎁", title: "Reward erhalten",  sub: "Punkte einlösen für Gratis-Kaffee, Drinks und mehr." },
          ].map((s, i) => (
            <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: i < 2 ? 14 : 0, width: "100%" }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: C.green, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0, zIndex: 1, boxShadow: `0 2px 8px ${C.green}40` }}>
                <span style={{ color: "#fff" }}>{s.icon}</span>
              </div>
              <div style={{ paddingTop: 6 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>{s.title}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 2, lineHeight: 1.4 }}>{s.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── BELIEBTE SPOTS ── */}
      <div style={{ padding: "20px 24px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.dark }}>Beliebte Spots</div>
          <button onClick={() => goTo("discover")} style={{ background: "none", border: "none", color: C.green, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Alle anzeigen →</button>
        </div>
        {(loading || error || source === "demo-fallback") && (
          <div style={{ fontSize: 11, color: C.mid, marginBottom: 10, padding: "8px 10px", background: "#ECFDF5", borderRadius: 8, border: `1px solid ${C.border}` }}>
            {loading && "Lade Spots von Supabase … "}
            {!loading && error && <>Supabase: {error} · zeige Demo-Daten. </>}
            {!loading && !error && source === "demo-fallback" && <>Keine Zeilen in „spots“ – Demo-Daten. </>}
            {!loading && (error || source === "demo-fallback") && (
              <button type="button" onClick={() => refresh()} style={{ marginLeft: 4, border: "none", background: "none", color: C.green, fontWeight: 700, cursor: "pointer", padding: 0 }}>Erneut laden</button>
            )}
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {spots.slice(0, 3).map(s => (
            <div key={s.id} onClick={() => goTo("spot", s)} style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: s.img, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{s.emoji}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>{s.name}</div>
                <div style={{ fontSize: 11, color: C.muted }}>{s.cat} · {s.area}</div>
                {s.action && <div style={{ marginTop: 4 }}><Tag color={C.orange} bg="#FFF3E8">{s.action}</Tag></div>}
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10, color: C.muted }}>Reward</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.green }}>{s.reward}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── TRAKTIONSZAHLEN wie im Flyer ── */}
      <div style={{ padding: "20px 24px 0" }}>
        <div style={{ background: C.darkGreen, borderRadius: 14, padding: "18px 20px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.5)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12 }}>Traktion (MVP)</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            {[["200+", "Pilotbetriebe"], ["50K+", "QR-Scans"], ["25K+", "Check-ins"], ["10K+", "Follower"]].map(([n, l]) => (
              <div key={l}>
                <div style={{ fontSize: 22, fontWeight: 900, color: C.fresh, letterSpacing: -1 }}>{n}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.6)" }}>{l}</div>
              </div>
            ))}
          </div>
          <button onClick={() => goTo("investor")} style={{ width: "100%", background: C.green, color: "#fff", border: "none", borderRadius: 9, padding: "12px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            📈 Investor-Ansicht öffnen →
          </button>
        </div>
      </div>

      {/* ── CTA ── */}
      <div style={{ padding: "20px 24px 40px" }}>
        <button onClick={() => goTo("checkin")} style={{ width: "100%", background: C.green, color: "#fff", border: "none", borderRadius: 10, padding: "15px 20px", fontSize: 15, fontWeight: 800, cursor: "pointer", boxShadow: `0 4px 16px rgba(11,122,62,.35)` }}>
          Jetzt starten →
        </button>
        <div style={{ textAlign: "center", fontSize: 11, color: C.muted, marginTop: 10 }}>
          Kein App-Download · Sofort loslegen · DSGVO-konform
        </div>
      </div>
    </Screen>
  );
}

// ═══════════════════════════════════════════════════════════════════
// B. QR CHECK-IN FLOW
// ═══════════════════════════════════════════════════════════════════
function CheckIn({ goTo }) {
  const [step, setStep] = useState(0); // 0=scan, 1=spot, 2=success
  const [busyStamp, setBusyStamp] = useState(false);
  const { spots } = useSpots();
  const { spotWithUserPts, persistGuestData, addStamp } = useGuestSpotData();
  const spot = spots[0] ?? DEMO_SPOTS[0];
  const live = spotWithUserPts(spot);

  if (step === 0) return (
    <Screen bg="#111" pad={false}>
      <div style={{ padding: "20px 24px 0" }}>
        <BackBtn onClick={() => goTo("home")} dark />
      </div>
      <div style={{ padding: "32px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,.7)", marginBottom: 8 }}>QR-Code scannen</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,.4)", marginBottom: 32 }}>Halte die Kamera auf den Code am Tisch oder Tresen</div>

        {/* Scanner frame */}
        <div style={{ width: 220, height: 220, margin: "0 auto 32px", position: "relative" }}>
          <div style={{ position: "absolute", inset: 0, border: "2px solid rgba(255,255,255,.1)", borderRadius: 24 }} />
          {/* Corners */}
          {[["0,0","tl"],["auto,0","tr"],["0,auto","bl"],["auto,auto","br"]].map(([pos,id]) => {
            const [t,r,b,l] = pos.split(",").map(v => v === "0" ? 0 : v === "auto" ? "auto" : v);
            return (
              <div key={id} style={{ position: "absolute", top: id.includes("t") ? 0 : "auto", bottom: id.includes("b") ? 0 : "auto", left: id.includes("l") ? 0 : "auto", right: id.includes("r") ? 0 : "auto", width: 28, height: 28, borderTop: id.includes("t") ? `3px solid ${C.fresh}` : "none", borderBottom: id.includes("b") ? `3px solid ${C.fresh}` : "none", borderLeft: id.includes("l") ? `3px solid ${C.fresh}` : "none", borderRight: id.includes("r") ? `3px solid ${C.fresh}` : "none", borderRadius: id === "tl" ? "8px 0 0 0" : id === "tr" ? "0 8px 0 0" : id === "bl" ? "0 0 0 8px" : "0 0 8px 0" }} />
            );
          })}
          {/* Scan line animation */}
          <div style={{ position: "absolute", left: 8, right: 8, height: 2, background: `linear-gradient(90deg, transparent, ${C.fresh}, transparent)`, top: "50%", borderRadius: 1, animation: "none" }} />
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 40 }}>📷</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)" }}>Kamera aktiv</div>
          </div>
        </div>

        <button onClick={() => setStep(1)} style={{ background: C.green, color: "#fff", border: "none", borderRadius: 14, padding: "14px 32px", fontSize: 15, fontWeight: 700, cursor: "pointer", boxShadow: `0 4px 20px rgba(15,138,75,.4)` }}>
          ⬛ Scan simulieren
        </button>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,.3)", marginTop: 16 }}>Kein App-Download nötig · Sofort loslegen</div>
      </div>
    </Screen>
  );

  if (step === 1) return (
    <Screen bg={C.bg} pad={false}>
      <div style={{ background: spot.img, padding: "32px 24px 24px", position: "relative" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <BackBtn onClick={() => setStep(0)} />
          <Tag color={C.green} bg={C.mint}>📍 Du bist vor Ort</Tag>
        </div>
        <div style={{ textAlign: "center", marginTop: 20 }}>
          <div style={{ fontSize: 52, marginBottom: 8 }}>{spot.emoji}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.dark, letterSpacing: -0.5 }}>{spot.name}</div>
          <div style={{ fontSize: 14, color: C.muted }}>{spot.cat} · {spot.area}</div>
        </div>
      </div>

      <div style={{ padding: "20px 24px" }}>
        {/* Loyalty card */}
        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>Deine Stempelkarte</div>
            <div style={{ fontSize: 13, color: C.muted }}>{live.pts}/{spot.max} Punkte</div>
          </div>
          <ProgressBar value={live.pts} max={spot.max} />
          <div style={{ marginTop: 10, fontSize: 13, color: C.muted }}>
            Nächster Reward: <span style={{ color: C.green, fontWeight: 700 }}>{spot.reward}</span> bei {spot.max} Punkten
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
            {Array.from({ length: spot.max }).map((_, i) => (
              <div key={i} style={{ width: 28, height: 28, borderRadius: 8, background: i < live.pts ? C.green : C.border, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: i < live.pts ? "#fff" : C.muted }}>
                {i < live.pts ? "✓" : i + 1}
              </div>
            ))}
          </div>
        </Card>

        {/* Punkt sichern CTA */}
        <div style={{ background: `linear-gradient(135deg, ${C.green}, ${C.fresh})`, borderRadius: 20, padding: 20, marginBottom: 14, textAlign: "center" }}>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,.8)", marginBottom: 4 }}>Sammle jetzt</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#fff", marginBottom: 4 }}>+1 Punkt</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,.7)" }}>Neuer Stand: {Math.min(live.pts + 1, spot.max)}/{spot.max} Punkte</div>
        </div>

        <Btn
          disabled={busyStamp}
          onClick={async () => {
            setBusyStamp(true);
            try {
              if (persistGuestData) await addStamp(spot.id, spot.max);
            } finally {
              setBusyStamp(false);
              setStep(2);
            }
          }}
        >
          {busyStamp ? "…" : "⭐ Punkt sichern"}
        </Btn>

        {spot.action && (
          <div style={{ background: "#FFF7ED", border: `1px solid #FED7AA`, borderRadius: 12, padding: "10px 14px", marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 16 }}>🔥</span>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.orange }}>{spot.action}</div>
          </div>
        )}
      </div>
    </Screen>
  );

  // Step 2: Success
  const afterPts = persistGuestData
    ? spotWithUserPts(spot).pts
    : Math.min(spot.pts + 1, spot.max);
  const remain = Math.max(0, spot.max - afterPts);

  return (
    <Screen bg={C.bg} pad={false}>
      <div style={{ background: `linear-gradient(160deg, ${C.green}, ${C.fresh})`, padding: "48px 24px 36px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -30, right: -30, width: 140, height: 140, borderRadius: "50%", background: "rgba(255,255,255,.08)" }} />
        <div style={{ fontSize: 56, marginBottom: 12 }}>🎉</div>
        <div style={{ fontSize: 24, fontWeight: 800, color: "#fff", marginBottom: 6, letterSpacing: -0.5 }}>Punkt gesammelt!</div>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,.85)" }}>{spot.name}</div>

        <div style={{ background: "rgba(255,255,255,.15)", borderRadius: 16, padding: 16, margin: "20px 0 0" }}>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,.8)", marginBottom: 6 }}>Neuer Stand</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: "#fff", marginBottom: 8 }}>{afterPts}/{spot.max}</div>
          <ProgressBar value={afterPts} max={spot.max} color="rgba(255,255,255,.9)" />
          <div style={{ fontSize: 12, color: "rgba(255,255,255,.7)", marginTop: 6 }}>
            Noch {remain} Punkte bis: {spot.reward}
          </div>
        </div>
      </div>

      <div style={{ padding: "20px 24px" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.dark, marginBottom: 12 }}>Was möchtest du als nächstes?</div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button onClick={() => goTo("wallet")} style={{ background: C.dark, color: "#fff", border: "none", borderRadius: 14, padding: "14px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>💳</span>
            <div style={{ textAlign: "left" }}>
              <div>Karte ins Wallet speichern</div>
              <div style={{ fontSize: 11, fontWeight: 400, color: "rgba(255,255,255,.6)" }}>Apple Wallet · Google Wallet</div>
            </div>
          </button>

          <button style={{ background: C.white, color: C.dark, border: `1.5px solid ${C.border}`, borderRadius: 14, padding: "14px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>❤️</span>
            <div style={{ textAlign: "left" }}>
              <div>Spot folgen</div>
              <div style={{ fontSize: 11, fontWeight: 400, color: C.muted }}>Aktionen & Rewards nie verpassen</div>
            </div>
          </button>

          <button onClick={() => goTo("discover")} style={{ background: C.mint, color: C.green, border: "none", borderRadius: 14, padding: "14px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>🗺️</span>
            <div style={{ textAlign: "left" }}>
              <div>Weitere Spots entdecken</div>
              <div style={{ fontSize: 11, fontWeight: 400, color: C.green }}>Neue Lieblingsorte finden</div>
            </div>
          </button>
        </div>
      </div>
    </Screen>
  );
}

// ═══════════════════════════════════════════════════════════════════
// C. WALLET – Alle Stempelkarten zentral
// ═══════════════════════════════════════════════════════════════════
function WalletScreen({ goTo }) {
  const [activeCard, setActiveCard] = useState(null);
  const [tab, setTab] = useState("karten"); // karten | rewards | passes
  const { mySpotCards, persistGuestData } = useGuestSpotData();

  const myCards = mySpotCards;
  const readyRewards = myCards.filter(s => s.pts >= s.max);
  const totalPts = myCards.reduce((a, s) => a + s.pts, 0);

  // Einzelne Karten-Detailansicht
  if (activeCard) {
    const s = activeCard;
    const isReady = s.pts >= s.max;
    return (
      <Screen bg={C.bg} pad={false}>
        {/* Card Hero */}
        <div style={{ background: `linear-gradient(135deg, ${s.color}, ${s.color}cc)`, padding: "28px 24px 32px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -30, right: -30, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,.08)" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <button onClick={() => setActiveCard(null)} style={{ background: "rgba(255,255,255,.2)", border: "none", borderRadius: 12, width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff", fontSize: 18 }}>←</button>
            {isReady && (
              <div style={{ background: C.orange, borderRadius: 99, padding: "5px 14px", fontSize: 12, fontWeight: 700, color: "#fff" }}>🎁 Einlösbar!</div>
            )}
          </div>

          {/* Digital Wallet Card */}
          <div style={{ background: "rgba(255,255,255,.12)", backdropFilter: "blur(10px)", borderRadius: 20, padding: "20px 20px 16px", border: "1px solid rgba(255,255,255,.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <div style={{ width: 24, height: 24, background: "rgba(255,255,255,.25)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>●</div>
                  <span style={{ fontSize: 14, fontWeight: 800, color: "#fff", letterSpacing: -0.3 }}>myspot</span>
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", letterSpacing: -0.3 }}>{s.name}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.75)" }}>{s.cat} · {s.area}</div>
              </div>
              <div style={{ fontSize: 36 }}>{s.emoji}</div>
            </div>

            {/* Stamps */}
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 14 }}>
              {Array.from({ length: s.max }).map((_, i) => (
                <div key={i} style={{ width: 28, height: 28, borderRadius: 8, background: i < s.pts ? "rgba(255,255,255,.9)" : "rgba(255,255,255,.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: i < s.pts ? s.color : "rgba(255,255,255,.4)", fontWeight: 700, border: i < s.pts ? "none" : "1.5px solid rgba(255,255,255,.2)" }}>
                  {i < s.pts ? "✓" : ""}
                </div>
              ))}
            </div>

            {/* Progress */}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "rgba(255,255,255,.7)", marginBottom: 6 }}>
              <span>{s.pts} von {s.max} Punkten</span>
              <span>{s.reward}</span>
            </div>
            <div style={{ background: "rgba(255,255,255,.15)", borderRadius: 99, height: 6 }}>
              <div style={{ background: "rgba(255,255,255,.9)", height: 6, borderRadius: 99, width: `${Math.min((s.pts / s.max) * 100, 100)}%`, transition: "width .5s" }} />
            </div>

            {/* Barcode */}
            <div style={{ background: "#fff", borderRadius: 10, padding: "8px 10px", marginTop: 14 }}>
              <div style={{ display: "flex", gap: 1, height: 26, alignItems: "flex-end" }}>
                {Array.from({ length: 48 }).map((_, i) => (
                  <div key={i} style={{ flex: 1, height: `${i % 3 === 0 ? 100 : i % 2 === 0 ? 70 : 85}%`, background: "#111", borderRadius: 1 }} />
                ))}
              </div>
              <div style={{ fontSize: 8, color: "#999", textAlign: "center", marginTop: 3, letterSpacing: 2 }}>MYSP-{s.name.slice(0,2).toUpperCase()}-0042</div>
            </div>
          </div>
        </div>

        <div style={{ padding: "20px 24px" }}>
          {isReady ? (
            <div style={{ background: "#FFF7ED", border: `2px solid ${C.orange}`, borderRadius: 16, padding: 16, marginBottom: 14, textAlign: "center" }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>🎁</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: C.dark, marginBottom: 4 }}>Reward bereit!</div>
              <div style={{ fontSize: 14, color: C.muted, marginBottom: 14 }}>{s.reward} bei {s.name}</div>
              <button style={{ background: C.orange, color: "#fff", border: "none", borderRadius: 12, padding: "13px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer", width: "100%" }}>
                🎁 Jetzt einlösen
              </button>
            </div>
          ) : (
            <div style={{ background: C.mint, border: `1px solid ${C.green}20`, borderRadius: 14, padding: 14, marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.green }}>
                🎯 Noch {s.max - s.pts} Punkte bis: <strong>{s.reward}</strong>
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => goTo("checkin")} style={{ flex: 2, padding: "13px", background: C.green, color: "#fff", border: "none", borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              ⬛ QR scannen & Punkt sichern
            </button>
            <button style={{ flex: 1, padding: "13px", background: C.dark, color: "#fff", border: "none", borderRadius: 12, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              💳 Wallet
            </button>
          </div>
        </div>
      </Screen>
    );
  }

  return (
    <Screen bg={C.bg} pad={false}>
      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${C.dark}, #1f2937)`, padding: "24px 24px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", letterSpacing: -0.5 }}>Mein Wallet</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.6)", marginTop: 2 }}>{myCards.length} Stempelkarten · {totalPts} Punkte</div>
          </div>
          <Logo size={22} />
        </div>

        {/* Summary stats */}
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { n: myCards.length, l: "Karten", icon: "💳" },
            { n: totalPts, l: "Punkte", icon: "⭐" },
            { n: readyRewards.length, l: "Rewards", icon: "🎁" },
          ].map((m, i) => (
            <div key={i} style={{ flex: 1, background: "rgba(255,255,255,.1)", borderRadius: 12, padding: "10px 8px", textAlign: "center" }}>
              <div style={{ fontSize: 9, marginBottom: 2 }}>{m.icon}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>{m.n}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,.6)" }}>{m.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: C.white, padding: "12px 24px 0", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", gap: 0 }}>
          {[["karten", "💳 Stempelkarten"], ["rewards", "🎁 Rewards"], ["passes", "📱 Wallet Passes"]].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{ flex: 1, background: "none", border: "none", borderBottom: `2.5px solid ${tab === id ? C.green : "transparent"}`, padding: "10px 4px", fontSize: 11, fontWeight: tab === id ? 700 : 500, color: tab === id ? C.green : C.muted, cursor: "pointer" }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "16px 24px" }}>

        {/* ── STEMPELKARTEN ── */}
        {tab === "karten" && <>
          {myCards.length === 0 && (
            <Card style={{ marginBottom: 14, textAlign: "center" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: C.dark, marginBottom: 8 }}>Noch keine Stempelkarten</div>
              <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.5, marginBottom: 16 }}>
                {persistGuestData
                  ? "Speichere Spots unter „Entdecken“ mit „+ Folgen“. Deine Stempelstände werden mit deinem Konto synchronisiert."
                  : "Demo: Es werden Beispiel-Karten angezeigt, sobald die Spot-Liste geladen ist."}
              </div>
              <Btn onClick={() => goTo("discover")}>Spots entdecken</Btn>
            </Card>
          )}
          {myCards.length > 0 && readyRewards.length > 0 && (
            <div style={{ background: "#FFF7ED", border: `1.5px solid ${C.orange}`, borderRadius: 14, padding: "10px 14px", marginBottom: 14, display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 18 }}>🎁</span>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.orange }}>
                {readyRewards.length} Reward{readyRewards.length > 1 ? "s" : ""} bereit zum Einlösen!
              </div>
            </div>
          )}

          {myCards.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {myCards.map(s => {
              const isReady = s.pts >= s.max;
              const pct = Math.min((s.pts / s.max) * 100, 100);
              return (
                <div key={s.id} onClick={() => setActiveCard(s)} style={{ background: C.white, borderRadius: 18, border: `1.5px solid ${isReady ? C.orange : C.border}`, padding: "14px 16px", cursor: "pointer", boxShadow: isReady ? `0 4px 16px ${C.orange}20` : "0 2px 8px rgba(0,0,0,.05)", transition: "all .2s" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 14, background: s.img, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{s.emoji}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>{s.name}</div>
                        {isReady
                          ? <div style={{ background: C.orange, color: "#fff", borderRadius: 99, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>🎁 Einlösbar</div>
                          : <div style={{ fontSize: 13, fontWeight: 700, color: C.green }}>{s.pts}/{s.max}</div>
                        }
                      </div>
                      <div style={{ fontSize: 11, color: C.muted }}>{s.cat} · {s.area}</div>
                    </div>
                  </div>

                  {/* Stamp dots */}
                  <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
                    {Array.from({ length: s.max }).map((_, i) => (
                      <div key={i} style={{ flex: 1, height: 6, borderRadius: 99, background: i < s.pts ? s.color : C.border, transition: "background .3s" }} />
                    ))}
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: 12, color: C.muted }}>
                      {isReady ? <span style={{ color: C.orange, fontWeight: 700 }}>✨ {s.reward} bereit!</span> : `${s.max - s.pts} Punkte bis: ${s.reward}`}
                    </div>
                    <div style={{ fontSize: 11, color: C.muted }}>→</div>
                  </div>
                </div>
              );
            })}
          </div>
          )}

          {myCards.length > 0 && (
          <button onClick={() => goTo("discover")} style={{ width: "100%", background: C.mint, color: C.green, border: `1.5px solid ${C.green}30`, borderRadius: 14, padding: "13px", fontSize: 13, fontWeight: 700, cursor: "pointer", marginTop: 12 }}>
            + Neue Spots entdecken
          </button>
          )}
        </>}

        {/* ── REWARDS ── */}
        {tab === "rewards" && <>
          {readyRewards.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>🎯</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.dark, marginBottom: 6 }}>Noch keine Rewards bereit</div>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>Sammel weiter Punkte bei deinen Lieblingsspots!</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {myCards.map(s => (
                  <div key={s.id} style={{ background: C.white, borderRadius: 12, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontSize: 18 }}>{s.emoji}</span>
                      <div style={{ fontSize: 12, fontWeight: 600, color: C.dark }}>{s.name}</div>
                    </div>
                    <div style={{ fontSize: 12, color: C.muted }}>{s.max - s.pts} Punkte fehlen</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {readyRewards.map(s => (
                <div key={s.id} style={{ background: `linear-gradient(135deg, ${s.color}15, ${s.color}05)`, border: `2px solid ${s.color}40`, borderRadius: 18, padding: 16 }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 14, background: s.img, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>{s.emoji}</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>{s.name}</div>
                      <div style={{ fontSize: 13, color: C.green, fontWeight: 700 }}>🎁 {s.reward}</div>
                    </div>
                  </div>
                  <button style={{ width: "100%", background: s.color, color: "#fff", border: "none", borderRadius: 12, padding: "11px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    Jetzt einlösen beim nächsten Besuch
                  </button>
                </div>
              ))}
            </div>
          )}
        </>}

        {/* ── WALLET PASSES ── */}
        {tab === "passes" && <>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 14 }}>
            Speichere deine myspot-Karten direkt in Apple Wallet oder Google Wallet – Punkte immer im Blick, auch offline.
          </div>

          {/* Main pass */}
          <div style={{ background: `linear-gradient(135deg, #1a1a2e, #0f3460)`, borderRadius: 22, padding: 20, marginBottom: 14, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -20, right: -20, width: 110, height: 110, borderRadius: "50%", background: `${C.fresh}15` }} />
            <div style={{ position: "relative" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 28, height: 28, background: `linear-gradient(135deg,${C.green},${C.fresh})`, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>●</div>
                  <span style={{ fontSize: 16, fontWeight: 800, color: "#fff", letterSpacing: -0.5 }}>myspot</span>
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.5)" }}>Loyalty Pass</div>
              </div>

              {/* All spots mini */}
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                {myCards.slice(0, 4).map(s => (
                  <div key={s.id} style={{ flex: 1, background: "rgba(255,255,255,.08)", borderRadius: 10, padding: "8px 4px", textAlign: "center" }}>
                    <div style={{ fontSize: 16, marginBottom: 3 }}>{s.emoji}</div>
                    <div style={{ fontSize: 8, color: "rgba(255,255,255,.6)", marginBottom: 3 }}>{s.name.split(" ")[0]}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: s.pts >= s.max ? C.orange : C.fresh }}>{s.pts}/{s.max}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "rgba(255,255,255,.6)", marginBottom: 8 }}>
                <span>Gesamt {totalPts} Punkte · {myCards.length} Spots</span>
                <span style={{ color: readyRewards.length > 0 ? C.orange : "rgba(255,255,255,.4)", fontWeight: 700 }}>{readyRewards.length > 0 ? `${readyRewards.length} Rewards bereit 🎁` : "Weiter sammeln →"}</span>
              </div>

              {/* Barcode */}
              <div style={{ background: "#fff", borderRadius: 10, padding: "8px 10px" }}>
                <div style={{ display: "flex", gap: 1, height: 24, alignItems: "flex-end" }}>
                  {Array.from({ length: 52 }).map((_, i) => (
                    <div key={i} style={{ flex: 1, height: `${i % 4 === 0 ? 100 : i % 2 === 0 ? 65 : 82}%`, background: "#111", borderRadius: 1 }} />
                  ))}
                </div>
                <div style={{ fontSize: 8, color: "#888", textAlign: "center", marginTop: 3, letterSpacing: 2 }}>MYSP-ALL-0042</div>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button style={{ background: "#000", color: "#fff", border: "none", borderRadius: 14, padding: "14px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
              🍎 Zu Apple Wallet hinzufügen
            </button>
            <button style={{ background: "#4285F4", color: "#fff", border: "none", borderRadius: 14, padding: "14px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
              🔵 Zu Google Wallet hinzufügen
            </button>
          </div>

          <div style={{ background: C.bg, borderRadius: 12, padding: "10px 14px", marginTop: 12, display: "flex", gap: 8, alignItems: "flex-start" }}>
            <span style={{ fontSize: 16 }}>📍</span>
            <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
              Geofencing aktiv: Du wirst benachrichtigt wenn du in der Nähe eines deiner Lieblingsspots bist.
            </div>
          </div>
        </>}

      </div>
    </Screen>
  );
}

// ═══════════════════════════════════════════════════════════════════
// D. DISCOVER / MARKTPLATZ
// ═══════════════════════════════════════════════════════════════════
function Discover({ goTo }) {
  const [cat, setCat] = useState("Alle");
  const [search, setSearch] = useState("");
  const [localFollowed, setLocalFollowed] = useState({});
  const { spots } = useSpots();
  const { user, needsAuth } = useAuth();
  const { persistGuestData, isFollowed, toggleFollow, spotWithUserPts } = useGuestSpotData();

  const followOn = (id) =>
    persistGuestData ? isFollowed(id) : !!localFollowed[id];

  const onToggleFollow = async (e, s) => {
    e.stopPropagation();
    if (persistGuestData) {
      try {
        await toggleFollow(s.id, !isFollowed(s.id));
      } catch {
        /* optional toast */
      }
    } else {
      setLocalFollowed((f) => ({ ...f, [s.id]: !f[s.id] }));
    }
  };

  const filtered = spots.filter(s =>
    (cat === "Alle" || s.cat === cat) &&
    (search === "" || s.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <Screen bg={C.bg} pad={false}>
      {/* Header */}
      <div style={{ background: C.white, padding: "16px 24px 0", borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <Logo size={24} />
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {needsAuth && !user && (
              <button type="button" onClick={() => goTo("auth")} style={{ background: C.darkGreen, color: "#fff", border: "none", borderRadius: 10, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                Login
              </button>
            )}
            <button onClick={() => goTo("profile")} style={{ background: C.mint, color: C.green, border: "none", borderRadius: 10, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              👤 Profil
            </button>
          </div>
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍  Wonach hast du Lust?" style={{ width: "100%", background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 12, padding: "11px 14px", fontSize: 14, color: C.dark, outline: "none", marginBottom: 14 }} />
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 14 }}>
          {CATS.map(c => (
            <button key={c} onClick={() => setCat(c)} style={{ background: cat === c ? C.green : C.bg, color: cat === c ? "#fff" : C.mid, border: `1.5px solid ${cat === c ? C.green : C.border}`, borderRadius: 99, padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", flexShrink: 0, transition: "all .2s" }}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "16px 24px" }}>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 14 }}>{filtered.length} Spots gefunden</div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map((s) => {
            const d = spotWithUserPts(s);
            const fo = followOn(s.id);
            return (
            <Card key={s.id} onClick={() => goTo("spot", s)}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{ width: 64, height: 64, borderRadius: 16, background: s.img, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, flexShrink: 0 }}>{s.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: C.dark }}>{s.name}</div>
                      <div style={{ fontSize: 12, color: C.muted }}>{s.cat} · {s.area}</div>
                    </div>
                    <button onClick={(e) => onToggleFollow(e, s)} style={{ background: fo ? C.green : C.white, color: fo ? "#fff" : C.green, border: `1.5px solid ${C.green}`, borderRadius: 99, padding: "4px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
                      {fo ? "✓ Folge ich" : "+ Folgen"}
                    </button>
                  </div>
                  {s.action && <Tag color={C.orange} bg="#FFF7ED">{s.action}</Tag>}
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.muted, marginBottom: 4 }}>
                      <span>{d.pts}/{d.max} Punkte</span>
                      <span style={{ color: C.green, fontWeight: 600 }}>{s.reward}</span>
                    </div>
                    <ProgressBar value={d.pts} max={d.max} />
                  </div>
                </div>
              </div>
            </Card>
          );})}
        </div>
      </div>
    </Screen>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SPOT DETAIL
// ═══════════════════════════════════════════════════════════════════
function SpotDetail({ spot, goTo }) {
  const { persistGuestData, isFollowed, toggleFollow, spotWithUserPts } = useGuestSpotData();
  const [localFollow, setLocalFollow] = useState(false);
  if (!spot) return null;
  const display = spotWithUserPts(spot);
  const following = persistGuestData ? isFollowed(spot.id) : localFollow;

  return (
    <Screen bg={C.bg} pad={false}>
      <div style={{ background: spot.img, padding: "20px 24px 28px", position: "relative" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <BackBtn onClick={() => goTo("discover")} />
          <button
            type="button"
            onClick={() => {
              if (persistGuestData) toggleFollow(spot.id, !isFollowed(spot.id));
              else setLocalFollow((f) => !f);
            }}
            style={{
              background: following ? C.green : C.white,
              color: following ? "#fff" : C.green,
              border: `1.5px solid ${C.green}`,
              borderRadius: 99,
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {following ? "✓ Folge ich" : "+ Folgen"}
          </button>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 52, marginBottom: 8 }}>{spot.emoji}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.dark, letterSpacing: -0.5 }}>{spot.name}</div>
          <div style={{ fontSize: 14, color: C.muted }}>{spot.cat} · {spot.area} · {spot.followers} Follower</div>
          {spot.action && <div style={{ marginTop: 8 }}><Tag color={C.orange} bg="#FFF7ED">{spot.action}</Tag></div>}
        </div>
      </div>

      <div style={{ padding: "20px 24px" }}>
        <Card style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>Deine Stempelkarte</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: C.green }}>{display.pts}/{display.max}</div>
          </div>
          <ProgressBar value={display.pts} max={display.max} />
          <div style={{ marginTop: 10, fontSize: 13, color: C.muted }}>
            Reward: <span style={{ color: C.green, fontWeight: 700 }}>{spot.reward}</span> · noch {display.max - display.pts} Punkte
          </div>
          <div style={{ display: "flex", gap: 5, marginTop: 12, flexWrap: "wrap" }}>
            {Array.from({ length: spot.max }).map((_, i) => (
              <div key={i} style={{ width: 26, height: 26, borderRadius: 8, background: i < display.pts ? spot.color : C.border, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: i < display.pts ? "#fff" : C.muted }}>
                {i < display.pts ? "✓" : ""}
              </div>
            ))}
          </div>
        </Card>

        <Btn onClick={() => goTo("checkin")} style={{ marginBottom: 10 }}>⬛ QR scannen & Punkt sichern</Btn>
        <Btn variant="secondary" onClick={() => goTo("wallet")}>💳 Wallet-Karte anzeigen</Btn>
      </div>
    </Screen>
  );
}

// ═══════════════════════════════════════════════════════════════════
// E. GÄSTE PROFIL / WALLET
// ═══════════════════════════════════════════════════════════════════
function Profile({ goTo }) {
  const { user, needsAuth, signOut } = useAuth();
  const { mySpotCards } = useGuestSpotData();
  const mySpots = mySpotCards.slice(0, 4);
  const totalPts = mySpots.reduce((a, s) => a + s.pts, 0);
  const readyRewards = mySpots.filter(s => s.pts >= s.max).length;

  return (
    <Screen bg={C.bg} pad={false}>
      <div style={{ background: `linear-gradient(135deg, ${C.green}, ${C.fresh})`, padding: "32px 24px 28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <Logo size={24} />
          <button onClick={() => goTo("home")} style={{ background: "rgba(255,255,255,.2)", color: "#fff", border: "none", borderRadius: 10, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>← Home</button>
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 4, letterSpacing: -0.5 }}>Meine Vorteile</div>
        {needsAuth && user && (
          <div style={{ fontSize: 12, color: "rgba(255,255,255,.9)", marginTop: 6 }}>{user.email}</div>
        )}
        <div style={{ fontSize: 13, color: "rgba(255,255,255,.8)", marginTop: 6 }}>Du folgst {mySpots.length} Spots</div>
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          {[{ n: totalPts, l: "Punkte gesamt" }, { n: mySpots.length, l: "Spots" }, { n: readyRewards, l: "Rewards bereit" }].map((m, i) => (
            <div key={i} style={{ flex: 1, background: "rgba(255,255,255,.15)", borderRadius: 12, padding: "10px 8px", textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>{m.n}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,.7)" }}>{m.l}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: "16px 24px" }}>
        {/* Hint */}
        <div style={{ background: "#FFF7ED", border: `1px solid #FED7AA`, borderRadius: 12, padding: "10px 14px", marginBottom: 16, display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 16 }}>🎯</span>
          <div style={{ fontSize: 13, color: "#92400E", fontWeight: 600 }}>
            Noch 2 Punkte bis zu deinem nächsten Reward bei Café Central.
          </div>
        </div>

        <div style={{ fontSize: 15, fontWeight: 700, color: C.dark, marginBottom: 12 }}>Aktive Stempelkarten</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {mySpots.map(s => (
            <Card key={s.id} onClick={() => goTo("spot", s)}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: s.img, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{s.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>{s.name}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: s.pts >= s.max ? C.orange : C.green }}>
                      {s.pts}/{s.max} {s.pts >= s.max ? "🎁" : ""}
                    </div>
                  </div>
                  <ProgressBar value={s.pts} max={s.max} color={s.pts >= s.max ? C.orange : C.green} />
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
                    {s.pts >= s.max ? `✨ ${s.reward} einlösbar!` : `${s.max - s.pts} Punkte bis: ${s.reward}`}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div style={{ marginTop: 20 }}>
          {needsAuth && user && (
            <Btn variant="ghost" onClick={() => signOut().catch(() => {})} style={{ marginBottom: 10, color: "#fff", borderColor: "rgba(255,255,255,.35)" }}>
              Abmelden
            </Btn>
          )}
          <Btn onClick={() => goTo("wallet")} variant="dark">💳 Wallet-Karte anzeigen</Btn>
          <Btn onClick={() => goTo("discover")} variant="secondary" style={{ marginTop: 10 }}>Neue Spots entdecken</Btn>
          <Btn onClick={() => goTo("settings")} variant="ghost" style={{ marginTop: 10 }}>⚙️ Konto &amp; Einstellungen</Btn>
        </div>
      </div>
    </Screen>
  );
}

// ═══════════════════════════════════════════════════════════════════
// E2. KONTO / EINSTELLUNGEN (Demo – keine Cloud-Daten)
// ═══════════════════════════════════════════════════════════════════
function GuestSettingsScreen({ goTo }) {
  const { spots, source } = useSpots();
  const { user, needsAuth, signOut } = useAuth();
  const { mySpotCards } = useGuestSpotData();
  const { totalPts, cardCount } = getWalletStats(mySpotCards);

  return (
    <Screen bg={C.bg} pad={false}>
      <div style={{ background: C.white, padding: "16px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 12 }}>
        <BackBtn onClick={() => goTo("profile")} />
        <div style={{ fontSize: 17, fontWeight: 800, color: C.dark }}>Konto</div>
      </div>

      <div style={{ padding: "16px 20px" }}>
        {needsAuth && user && (
          <Card style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: C.muted }}>Eingeloggt als</div>
            <div style={{ fontWeight: 700, color: C.dark, marginTop: 4 }}>{user.email}</div>
            <Btn variant="secondary" small full={false} style={{ marginTop: 12 }} onClick={() => signOut().catch(() => {})}>
              Abmelden
            </Btn>
          </Card>
        )}

        <Card style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.dark }}>Mitgliedschaft</div>
            <Tag color={C.green} bg={C.mint}>Kostenlos</Tag>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ background: C.bg, borderRadius: 12, padding: "14px 12px", textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: C.dark }}>{totalPts}</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>Gesammelte Punkte</div>
            </div>
            <div style={{ background: C.bg, borderRadius: 12, padding: "14px 12px", textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: C.dark }}>{cardCount}</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>Stempelkarten</div>
            </div>
          </div>
        </Card>

        <div style={{ background: C.white, borderRadius: 14, border: `1px solid ${C.border}`, overflow: "hidden", marginBottom: 16 }}>
          <SettingsMenuRow icon="🔔" title="Benachrichtigungen" sub="Push & E-Mail" onClick={() => goTo("benachrichtigungen")} />
          <SettingsMenuRow icon="🔒" title="Datenschutz & Sicherheit" sub="Daten, Kontrolle, DSGVO" onClick={() => goTo("profile")} />
          <button
            type="button"
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "14px 16px",
              background: C.white,
              border: "none",
              borderBottom: `1px solid ${C.border}`,
              cursor: "pointer",
              textAlign: "left",
              opacity: 0.65,
            }}
          >
            <span style={{ fontSize: 22, width: 36, textAlign: "center" }}>💳</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>Zahlungsmethoden</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Karte hinzufügen · im Prototyp nicht angebunden</div>
            </div>
            <span style={{ fontSize: 18, color: C.muted }}>›</span>
          </button>
          <SettingsMenuRow icon="🎁" title="Einladungen" sub="Freunde werben" onClick={() => goTo("gruppe")} />
          <button
            type="button"
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "14px 16px",
              background: C.white,
              border: "none",
              borderBottom: `1px solid ${C.border}`,
              cursor: "pointer",
              textAlign: "left",
              opacity: 0.65,
            }}
          >
            <span style={{ fontSize: 22, width: 36, textAlign: "center" }}>❓</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>Hilfe &amp; Support</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>FAQ & Kontakt · folgt mit Live-Backend</div>
            </div>
            <span style={{ fontSize: 18, color: C.muted }}>›</span>
          </button>
          <SettingsMenuRow icon="⚙️" title="Einstellungen" sub="App-Einstellungen" onClick={() => goTo("profile")} />
        </div>

        <div style={{ background: "#FEF3C7", border: `1px solid #FCD34D`, borderRadius: 12, padding: "12px 14px", fontSize: 12, color: "#92400E", lineHeight: 1.5 }}>
          <strong>Supabase:</strong> Spots {source === "supabase" ? "(Live aus DB)" : "(Demo oder Fallback)"}. <strong>Schritt 2:</strong> Wallet, Profil, Check-in &amp; Konto erfordern Anmeldung, sobald URL + Anon-Key gesetzt sind.
        </div>
      </div>
    </Screen>
  );
}

// ═══════════════════════════════════════════════════════════════════
// F. HÄNDLER DASHBOARD
// ═══════════════════════════════════════════════════════════════════
function MerchantDashboard({ goTo }) {
  const { user, needsAuth } = useAuth();
  const { source } = useSpots();
  const [tab, setTab] = useState("today");
  const [mySpots, setMySpots] = useState([]);
  const [myErr, setMyErr] = useState(null);

  useEffect(() => {
    if (!needsAuth || !user || source !== "supabase") {
      setMySpots([]);
      setMyErr(null);
      return;
    }
    let cancelled = false;
    loadMerchantSpotsForUser(user.id)
      .then((rows) => {
        if (!cancelled) setMySpots(rows);
      })
      .catch((e) => {
        if (!cancelled) setMyErr(e?.message ?? String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [needsAuth, user, source]);

  const displayName =
    mySpots[0]?.name ??
    (needsAuth && user && source === "supabase" ? "Kein Spot angelegt" : "Café Central");
  const displaySub = mySpots[0]
    ? `Händler-Dashboard · ${
        mySpots[0].approvalStatus === "pending"
          ? "Freigabe ausstehend"
          : mySpots[0].area || "Dein Bereich"
      }`
    : needsAuth && user && source === "supabase"
      ? "Lege im Setup einen Spot an – danach erscheint er hier."
      : "Händler-Dashboard · Stuttgart-Mitte";

  const metrics = [
    { label: "QR-Scans",       val: "147",  trend: "+12%",  icon: "⬛", color: C.purple },
    { label: "Check-ins",      val: "89",   trend: "+8%",   icon: "✓",  color: C.green  },
    { label: "Neue Follower",  val: "23",   trend: "+31%",  icon: "❤️", color: C.orange },
    { label: "Wiederbesuche",  val: "54",   trend: "+5%",   icon: "🔄", color: C.green  },
    { label: "Rewards eingelöst", val: "12", trend: "+2%",  icon: "🎁", color: C.fresh  },
    { label: "Kampagnenerfolg",val: "68%",  trend: "+14%",  icon: "📢", color: C.purple },
  ];

  return (
    <Screen bg={C.bg} pad={false}>
      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${C.dark} 0%, #1f2937 100%)`, padding: "24px 24px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <Logo size={22} />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => goTo("onboarding")} style={{ background: "rgba(255,255,255,.1)", color: "#fff", border: "none", borderRadius: 10, padding: "6px 12px", fontSize: 12, cursor: "pointer" }}>⚙️ Setup</button>
            <button onClick={() => goTo("home")} style={{ background: "rgba(255,255,255,.1)", color: "#fff", border: "none", borderRadius: 10, padding: "6px 12px", fontSize: 12, cursor: "pointer" }}>← App</button>
          </div>
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 2, letterSpacing: -0.5 }}>{displayName}</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,.6)" }}>{displaySub}</div>
        {myErr && (
          <div style={{ marginTop: 10, fontSize: 11, color: "#FCA5A5" }}>{myErr}</div>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          {["today", "week", "month"].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ background: tab === t ? C.green : "rgba(255,255,255,.1)", color: "#fff", border: "none", borderRadius: 99, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              {t === "today" ? "Heute" : t === "week" ? "Woche" : "Monat"}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "16px 24px" }}>
        {/* Metrics grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
          {metrics.map((m, i) => (
            <Card key={i} style={{ padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: m.color + "20", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>{m.icon}</div>
                <span style={{ fontSize: 11, color: C.green, fontWeight: 700 }}>{m.trend}</span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: C.dark, margin: "8px 0 2px", letterSpacing: -0.5 }}>{m.val}</div>
              <div style={{ fontSize: 11, color: C.muted }}>{m.label}</div>
            </Card>
          ))}
        </div>

        {/* AI Diagnosis */}
        <Card style={{ marginBottom: 14, border: `1.5px solid ${C.purple}20`, background: "#FAFAFF" }}>
          <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 20 }}>💡</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>Diagnose für dich</div>
              <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5, marginTop: 4 }}>
                Deine QR-Scans sind <strong>gut</strong>, aber deine Wiederkehr-Rate ist <strong>niedriger als der Durchschnitt</strong>.
              </div>
            </div>
          </div>
          <div style={{ background: C.mint, borderRadius: 10, padding: "8px 12px", fontSize: 12, color: C.green, fontWeight: 600 }}>
            💬 Empfehlung: Teste einen stärkeren Reward oder eine 2×-Punkte-Aktion für diese Woche.
          </div>
        </Card>

        {/* Quick Actions */}
        <div style={{ fontSize: 14, fontWeight: 700, color: C.dark, marginBottom: 10 }}>Schnellaktionen</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
          {[
            { icon: "⬛", label: "QR-Code", sub: "Anzeigen & Download", action: () => {} },
            { icon: "🎁", label: "Reward", sub: "Bearbeiten", action: () => {} },
            { icon: "📢", label: "Kampagne", sub: "Erstellen", action: () => goTo("campaign") },
            { icon: "📊", label: "Analytics", sub: "Details anzeigen", action: () => {} },
          ].map((a, i) => (
            <button key={i} onClick={a.action} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14, textAlign: "left", cursor: "pointer" }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>{a.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>{a.label}</div>
              <div style={{ fontSize: 11, color: C.muted }}>{a.sub}</div>
            </button>
          ))}
        </div>

        {/* Follower mini */}
        <Card>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.dark, marginBottom: 10 }}>👥 Deine Community</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: C.green }}>382</div>
              <div style={{ fontSize: 11, color: C.muted }}>Follower gesamt</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>248</div>
              <div style={{ fontSize: 11, color: C.muted }}>aktiv letzte 30 Tage</div>
            </div>
          </div>
          <ProgressBar value={248} max={382} style={{ marginTop: 10 }} />
        </Card>
      </div>
    </Screen>
  );
}

// ═══════════════════════════════════════════════════════════════════
// G. KAMPAGNEN-SYSTEM (mit Credit-System)
// ═══════════════════════════════════════════════════════════════════
const PLAN_CREDITS = { Starter: 2, Growth: 5, Pro: 10 };
const CREDIT_PRICES = [
  { max: 250,  price: 19,  label: "0–250 Follower" },
  { max: 1000, price: 39,  label: "251–1.000 Follower" },
  { max: 2500, price: 79,  label: "1.001–2.500 Follower" },
  { max: 5000, price: 149, label: "2.501–5.000 Follower" },
];
const CAMP_TYPES = [
  { id: "push",    icon: "🔔", label: "Push-Benachrichtigung", sub: "Direkt aufs Handy · hohe Öffnungsrate" },
  { id: "feed",    icon: "📌", label: "Prominenter Feed-Platz",  sub: "Erscheint ganz oben bei Followern" },
  { id: "segment", icon: "🎯", label: "Gezielte Ansprache",      sub: "Nur an ausgewählte Segmente" },
];
const CAMP_IDEAS = [
  "2× Punkte heute!",
  "Gratis Kaffee bei 10 Punkten",
  "Happy Hour 16–19 Uhr",
  "Geburtstagsvorteil",
  "Inaktive Gäste zurückholen",
  "Fast am Reward – komm vorbei!",
];
const SEGMENTS = [
  { id: "all",      label: "Alle Follower",      reach: 382, icon: "👥" },
  { id: "inactive", label: "30+ Tage inaktiv",   reach: 58,  icon: "↩" },
  { id: "near",     label: "Fast am Reward",      reach: 74,  icon: "⭐" },
  { id: "vip",      label: "Top-Gäste",           reach: 31,  icon: "💎" },
  { id: "bday",     label: "Bald Geburtstag",     reach: 12,  icon: "🎂" },
];

function CampaignScreen({ goTo }) {
  const plan = "Growth";
  const used = 3;
  const total = PLAN_CREDITS[plan];
  const follower = 382;
  const extraPrice = CREDIT_PRICES.find(p => follower <= p.max)?.price ?? 149;
  const needsPay = used >= total;

  const [step, setStep] = useState(0);
  const [campType, setCampType] = useState("push");
  const [segment, setSegment] = useState("all");
  const [msg, setMsg] = useState("");
  const [ablauf, setAblauf] = useState("7");
  const [sent, setSent] = useState(false);
  const [draft, setDraft] = useState(false);

  const seg = SEGMENTS.find(s => s.id === segment);
  const estVisits = Math.round(seg.reach * (campType === "push" ? .22 : campType === "feed" ? .15 : .28));

  if (sent) return (
    <Screen bg={C.bg} pad={false}>
      <div style={{ background: `linear-gradient(135deg, ${C.green}, ${C.fresh})`, padding: "48px 24px 36px", textAlign: "center" }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>🚀</div>
        <div style={{ fontSize: 24, fontWeight: 800, color: "#fff", letterSpacing: -0.5 }}>Kampagne gesendet!</div>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,.85)", marginTop: 6 }}>Admin prüft · läuft in Kürze</div>
      </div>
      <div style={{ padding: "24px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
          {[[seg.reach, "Follower erreicht"], [`~${estVisits}`, "Besuche geschätzt"], [`${ablauf} Tage`, "Laufzeit"], [needsPay ? `${extraPrice}€` : "Gratis", "Kosten"]].map(([n, l]) => (
            <Card key={l} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: C.green }}>{n}</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{l}</div>
            </Card>
          ))}
        </div>
        <Btn onClick={() => { setSent(false); setStep(0); setMsg(""); goTo("merchant"); }}>← Zurück zum Dashboard</Btn>
      </div>
    </Screen>
  );

  return (
    <Screen bg={C.bg} pad={false}>
      <div style={{ background: C.dark, padding: "16px 24px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <BackBtn onClick={() => goTo("merchant")} dark />
          <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>Kampagne erstellen</div>
          <div style={{ background: needsPay ? "#FEE2E2" : C.mint, borderRadius: 99, padding: "4px 10px" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: needsPay ? C.red : C.green }}>{total - used} Credits</span>
          </div>
        </div>

        {/* Credit bar */}
        <div style={{ background: "rgba(255,255,255,.08)", borderRadius: 12, padding: "10px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,.6)" }}>{plan}-Plan · {used}/{total} verwendet</span>
            <span style={{ fontSize: 11, color: needsPay ? "#FCA5A5" : C.fresh, fontWeight: 700 }}>
              {needsPay ? `Zusatz: ${extraPrice}€` : `${total - used} frei`}
            </span>
          </div>
          <div style={{ background: "rgba(255,255,255,.1)", borderRadius: 99, height: 6 }}>
            <div style={{ background: needsPay ? C.red : C.fresh, height: 6, borderRadius: 99, width: `${(used / total) * 100}%` }} />
          </div>
        </div>
      </div>

      <div style={{ padding: "16px 24px" }}>
        {/* Step indicator */}
        <div style={{ display: "flex", gap: 3, marginBottom: 20 }}>
          {["Typ", "Zielgruppe", "Nachricht", "Vorschau"].map((l, i) => (
            <div key={l} style={{ flex: 1, textAlign: "center" }}>
              <div style={{ height: 3, borderRadius: 99, background: i <= step ? C.green : C.border, marginBottom: 4 }} />
              <div style={{ fontSize: 8, color: i <= step ? C.green : C.muted, fontWeight: i === step ? 700 : 400 }}>{i < step ? "✓" : l}</div>
            </div>
          ))}
        </div>

        {/* Step 0: Typ */}
        {step === 0 && <>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.dark, marginBottom: 12 }}>Kampagnenart</div>
          {CAMP_TYPES.map(t => (
            <div key={t.id} onClick={() => setCampType(t.id)} style={{ display: "flex", alignItems: "center", gap: 12, background: campType === t.id ? C.mint : C.white, border: `1.5px solid ${campType === t.id ? C.green : C.border}`, borderRadius: 14, padding: "12px 14px", marginBottom: 8, cursor: "pointer" }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: campType === t.id ? C.green : C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{t.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>{t.label}</div>
                <div style={{ fontSize: 11, color: C.muted }}>{t.sub}</div>
              </div>
              {campType === t.id && <span style={{ color: C.green, fontWeight: 700 }}>✓</span>}
            </div>
          ))}

          <div style={{ fontSize: 13, fontWeight: 700, color: C.dark, marginTop: 16, marginBottom: 8 }}>Laufzeit</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            {["3", "7", "14", "30"].map(d => (
              <button key={d} onClick={() => setAblauf(d)} style={{ flex: 1, padding: "10px 4px", background: ablauf === d ? C.green : C.white, color: ablauf === d ? "#fff" : C.dark, border: `1.5px solid ${ablauf === d ? C.green : C.border}`, borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{d}d</button>
            ))}
          </div>

          <div style={{ fontSize: 13, fontWeight: 700, color: C.dark, marginBottom: 8 }}>Kampagnenideen</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
            {CAMP_IDEAS.map(ci => (
              <button key={ci} onClick={() => { setMsg(ci); setStep(2); }} style={{ background: C.bg, color: C.mid, border: `1px solid ${C.border}`, borderRadius: 99, padding: "6px 12px", fontSize: 12, cursor: "pointer" }}>{ci}</button>
            ))}
          </div>

          <Btn onClick={() => setStep(1)}>Weiter →</Btn>
        </>}

        {/* Step 1: Zielgruppe */}
        {step === 1 && <>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.dark, marginBottom: 12 }}>Zielgruppe wählen</div>
          {SEGMENTS.map(s => (
            <div key={s.id} onClick={() => setSegment(s.id)} style={{ display: "flex", alignItems: "center", gap: 12, background: segment === s.id ? C.mint : C.white, border: `1.5px solid ${segment === s.id ? C.green : C.border}`, borderRadius: 14, padding: "12px 14px", marginBottom: 8, cursor: "pointer" }}>
              <span style={{ fontSize: 22 }}>{s.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>{s.label}</div>
                <div style={{ fontSize: 11, color: C.muted }}>{s.reach} Follower</div>
              </div>
              {segment === s.id && <span style={{ color: C.green, fontWeight: 700 }}>✓</span>}
            </div>
          ))}
          <Card style={{ marginTop: 12, marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div style={{ fontSize: 12, color: C.muted }}>Geschätzte Reichweite</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.green }}>{seg.reach} · ~{estVisits} Besuche</div>
            </div>
          </Card>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="ghost" onClick={() => setStep(0)} style={{ flex: 1 }}>← Zurück</Btn>
            <Btn onClick={() => setStep(2)} style={{ flex: 2 }}>Weiter →</Btn>
          </div>
        </>}

        {/* Step 2: Nachricht */}
        {step === 2 && <>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.dark, marginBottom: 12 }}>Nachricht verfassen</div>
          <div style={{ background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 14, padding: 4, marginBottom: 12 }}>
            <textarea value={msg} onChange={e => setMsg(e.target.value.slice(0, 120))} placeholder="z.B. Heute 2× Punkte bei uns – nur bis 22 Uhr! 🎉" style={{ width: "100%", border: "none", padding: 12, fontSize: 14, color: C.dark, outline: "none", resize: "none", height: 80, fontFamily: "inherit", borderRadius: 10 }} />
            <div style={{ display: "flex", justifyContent: "flex-end", padding: "4px 12px 8px", fontSize: 11, color: msg.length > 100 ? C.red : C.muted }}>{msg.length}/120</div>
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.dark, marginBottom: 8 }}>Schnellvorlagen</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
            {CAMP_IDEAS.map(ci => (
              <button key={ci} onClick={() => setMsg(ci)} style={{ background: C.bg, color: C.mid, border: `1px solid ${C.border}`, borderRadius: 10, padding: "9px 12px", fontSize: 12, cursor: "pointer", textAlign: "left" }}>{ci}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="ghost" onClick={() => setStep(1)} style={{ flex: 1 }}>← Zurück</Btn>
            <Btn onClick={() => setStep(3)} style={{ flex: 2 }} variant={msg ? "primary" : "ghost"}>Vorschau →</Btn>
          </div>
        </>}

        {/* Step 3: Vorschau */}
        {step === 3 && <>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.dark, marginBottom: 12 }}>Vorschau & Absenden</div>

          {/* Push preview */}
          <div style={{ background: C.dark, borderRadius: 16, padding: 14, marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,.4)", marginBottom: 8 }}>Push-Benachrichtigung</div>
            <div style={{ background: "rgba(255,255,255,.08)", borderRadius: 12, padding: 10, display: "flex", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg,${C.green},${C.fresh})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>●</div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>Café Central · myspot</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.7)", marginTop: 2, lineHeight: 1.4 }}>{msg || "Deine Nachricht..."}</div>
              </div>
            </div>
          </div>

          {/* Feed preview */}
          <div style={{ background: C.mint, borderRadius: "14px 14px 14px 4px", padding: 12, marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.green, marginBottom: 4 }}>Café Central · myspot</div>
            <div style={{ fontSize: 13, color: C.mid, lineHeight: 1.5 }}>{msg || "Deine Nachricht..."}</div>
            <div style={{ marginTop: 8 }}><Tag>Jetzt ansehen →</Tag></div>
          </div>

          {/* Summary */}
          <Card style={{ marginBottom: 14 }}>
            {[
              ["Typ", CAMP_TYPES.find(t => t.id === campType)?.label || ""],
              ["Zielgruppe", `${seg.label} · ${seg.reach} Follower`],
              ["Besuche geschätzt", `~${estVisits}`],
              ["Laufzeit", `${ablauf} Tage`],
              ["Kosten", needsPay ? `${extraPrice}€ (Zusatz-Credit)` : "Inklusive"],
            ].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 12, color: C.muted }}>{k}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: k === "Kosten" && needsPay ? C.orange : C.dark }}>{v}</div>
              </div>
            ))}
          </Card>

          {/* Spam protection */}
          <div style={{ background: C.bg, borderRadius: 10, padding: "8px 12px", marginBottom: 16, display: "flex", gap: 8 }}>
            <span style={{ fontSize: 14 }}>🛡️</span>
            <div style={{ fontSize: 11, color: C.muted }}>Jeder Gast erhält max. 1 Kampagne / 7 Tage. Admin prüft vor Ausspielung.</div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="ghost" onClick={() => { setDraft(true); }} style={{ flex: 1 }}>💾 Entwurf</Btn>
            <Btn onClick={() => setSent(true)} style={{ flex: 2 }} variant={needsPay ? "orange" : "primary"}>
              {needsPay ? `📤 Senden · ${extraPrice}€` : "📤 Kostenlos senden"}
            </Btn>
          </div>
          {draft && (
            <div style={{ background: C.mint, border: `1px solid ${C.green}`, borderRadius: 10, padding: 10, marginTop: 10, fontSize: 12, color: C.green, fontWeight: 600, textAlign: "center" }}>
              ✓ Als Entwurf gespeichert
            </div>
          )}
        </>}
      </div>
    </Screen>
  );
}

// ═══════════════════════════════════════════════════════════════════
// H. HÄNDLER ONBOARDING
// ═══════════════════════════════════════════════════════════════════
function Onboarding({ goTo }) {
  const { user, needsAuth } = useAuth();
  const { refresh } = useSpots();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [cat, setCat] = useState("");
  const [reward, setReward] = useState("");
  const [pts, setPts] = useState("10");
  const [submitErr, setSubmitErr] = useState(null);
  const [finishing, setFinishing] = useState(false);

  const finishOnboarding = async () => {
    setSubmitErr(null);
    if (needsAuth && !user) {
      setSubmitErr("Bitte anmelden – du wirst zum Login weitergeleitet.");
      goTo("auth");
      return;
    }
    if (!needsAuth) {
      goTo("merchant");
      return;
    }
    setFinishing(true);
    try {
      const categoryForDb = (cat.includes(" ") ? cat.slice(cat.indexOf(" ") + 1) : cat).trim() || cat;
      const emojiForDb = [...cat.trim()][0] || "📍";
      await createMerchantSpot({
        name: name.trim(),
        category: categoryForDb,
        area: "",
        reward,
        maxStamps: Number(pts) || 10,
        emoji: emojiForDb,
      });
      await refresh();
      goTo("merchant");
    } catch (e) {
      setSubmitErr(e?.message ?? String(e));
    } finally {
      setFinishing(false);
    }
  };

  const steps = [
    { label: "Profil", icon: "🏪" },
    { label: "Bilder", icon: "📸" },
    { label: "Reward", icon: "🎁" },
    { label: "QR-Code", icon: "⬛" },
    { label: "Los!", icon: "🚀" },
  ];

  return (
    <Screen bg={C.bg} pad={false}>
      <div style={{ background: `linear-gradient(135deg, ${C.dark}, #1f2937)`, padding: "20px 24px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <BackBtn onClick={() => goTo("merchant")} dark />
          <Logo size={22} />
          <div style={{ width: 40 }} />
        </div>
        <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", marginBottom: 4 }}>Händler-Onboarding</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,.6)" }}>Schritt {step + 1} von {steps.length}</div>
        <div style={{ display: "flex", gap: 4, marginTop: 12 }}>
          {steps.map((s, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{ width: "100%", height: 3, borderRadius: 99, background: i <= step ? C.green : "rgba(255,255,255,.15)" }} />
              <div style={{ fontSize: 9, color: i <= step ? C.fresh : "rgba(255,255,255,.3)" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: "24px 24px" }}>
        {step === 0 && <>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.dark, marginBottom: 6, letterSpacing: -0.5 }}>Profil anlegen</div>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>Wie heißt dein Spot?</div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.mid, marginBottom: 6 }}>Name deines Spots</div>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="z.B. Café Central" style={{ width: "100%", background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 12, padding: "13px 14px", fontSize: 14, color: C.dark, outline: "none" }} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.mid, marginBottom: 8 }}>Kategorie</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {["☕ Café", "🍹 Bar", "🍕 Restaurant", "🥐 Bäckerei", "🍔 Imbiss", "🍵 Teehaus"].map(c => (
                <button key={c} onClick={() => setCat(c)} style={{ background: cat === c ? C.green : C.white, color: cat === c ? "#fff" : C.mid, border: `1.5px solid ${cat === c ? C.green : C.border}`, borderRadius: 10, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{c}</button>
              ))}
            </div>
          </div>
          <Btn onClick={() => name && cat && setStep(1)} style={{ opacity: name && cat ? 1 : .5 }}>Weiter →</Btn>
        </>}

        {step === 1 && <>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.dark, marginBottom: 6, letterSpacing: -0.5 }}>Bilder hochladen</div>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>Logo & Profilbild machen deinen Spot attraktiver.</div>
          {[{ label: "Logo", sub: "Empfohlen: 200×200px" }, { label: "Titelbild", sub: "Empfohlen: 1200×400px" }, { label: "Galerie (optional)", sub: "Bis zu 6 Bilder" }].map((u, i) => (
            <div key={i} style={{ background: C.bg, border: `2px dashed ${C.border}`, borderRadius: 14, padding: "20px", textAlign: "center", marginBottom: 10, cursor: "pointer" }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>📸</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.mid }}>{u.label}</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{u.sub}</div>
              <div style={{ marginTop: 8, fontSize: 12, color: C.green, fontWeight: 700 }}>+ Hochladen</div>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <Btn variant="ghost" onClick={() => setStep(0)} style={{ flex: 1 }}>← Zurück</Btn>
            <Btn onClick={() => setStep(2)} style={{ flex: 2 }}>Weiter →</Btn>
          </div>
        </>}

        {step === 2 && <>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.dark, marginBottom: 6, letterSpacing: -0.5 }}>Reward festlegen</div>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>Was bekommen treue Gäste als Belohnung?</div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.mid, marginBottom: 8 }}>Dein Reward</div>
            {["Gratis Kaffee", "Gratis Drink", "Gratis Dessert", "10% Rabatt", "Gratis Brezel"].map(r => (
              <div key={r} onClick={() => setReward(r)} style={{ background: reward === r ? C.mint : C.white, border: `1.5px solid ${reward === r ? C.green : C.border}`, borderRadius: 12, padding: "11px 14px", marginBottom: 6, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{r}</span>
                {reward === r && <span style={{ color: C.green }}>✓</span>}
              </div>
            ))}
          </div>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.mid, marginBottom: 6 }}>Punkte bis zum Reward</div>
            <div style={{ display: "flex", gap: 8 }}>
              {["5", "8", "10", "12"].map(p => (
                <button key={p} onClick={() => setPts(p)} style={{ flex: 1, padding: "11px", background: pts === p ? C.green : C.white, color: pts === p ? "#fff" : C.dark, border: `1.5px solid ${pts === p ? C.green : C.border}`, borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>{p}</button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="ghost" onClick={() => setStep(1)} style={{ flex: 1 }}>← Zurück</Btn>
            <Btn onClick={() => reward && setStep(3)} style={{ flex: 2, opacity: reward ? 1 : .5 }}>Weiter →</Btn>
          </div>
        </>}

        {step === 3 && <>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.dark, marginBottom: 6, letterSpacing: -0.5 }}>Dein QR-Code</div>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>Drucke ihn aus und stelle ihn auf jeden Tisch.</div>
          <div style={{ background: C.white, border: `2px solid ${C.border}`, borderRadius: 20, padding: 24, textAlign: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>{name || "Dein Spot"} · myspot</div>
            <div style={{ width: 140, height: 140, background: `linear-gradient(135deg, ${C.green}22, ${C.fresh}22)`, borderRadius: 16, margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ fontSize: 70 }}>⬛</div>
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>Scan mich und sammle Punkte!</div>
            <Tag>myspot.app/cc-42ab</Tag>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>
            <Btn>⬇️ QR-Aufsteller herunterladen</Btn>
            <Btn variant="secondary">📄 PDF drucken</Btn>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="ghost" onClick={() => setStep(2)} style={{ flex: 1 }}>← Zurück</Btn>
            <Btn onClick={() => setStep(4)} style={{ flex: 2 }}>Weiter →</Btn>
          </div>
        </>}

        {step === 4 && <>
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>🎉</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: C.dark, marginBottom: 6, letterSpacing: -0.5 }}>
              {needsAuth ? "Alles vorbereitet" : "Dein Spot ist live!"}
            </div>
            <div style={{ fontSize: 14, color: C.muted, marginBottom: 24, lineHeight: 1.5 }}>
              {needsAuth ? (
                <>
                  Mit <strong>„Zum Dashboard“</strong> legst du {name || "deinen Spot"} zur Prüfung an (Status: ausstehend).
                  Nach Admin-Freigabe erscheint er unter Entdecken für Gäste.
                </>
              ) : (
                <>
                  {name || "Dein Spot"} ist jetzt auf myspot (Demo).
                  <br />
                  Stelle den QR-Code auf und warte auf deine ersten Gäste.
                </>
              )}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { icon: "✓", text: "Profil angelegt" },
              { icon: "✓", text: "Bilder hochgeladen" },
              { icon: "✓", text: `Reward: ${reward} bei ${pts} Punkten` },
              { icon: "✓", text: "QR-Code bereit" },
            ].map((c, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", background: C.mint, borderRadius: 12, padding: "10px 14px" }}>
                <span style={{ color: C.green, fontWeight: 700, fontSize: 16 }}>{c.icon}</span>
                <span style={{ fontSize: 13, color: C.mid, fontWeight: 600 }}>{c.text}</span>
              </div>
            ))}
          </div>
          {submitErr && (
            <div style={{ background: "#FEE2E2", color: "#991B1B", borderRadius: 10, padding: "10px 12px", fontSize: 13, marginTop: 12 }}>
              {submitErr}
            </div>
          )}
          <Btn onClick={finishOnboarding} disabled={finishing} style={{ marginTop: 24 }}>
            {finishing ? "Wird gespeichert …" : "🚀 Zum Dashboard →"}
          </Btn>
        </>}
      </div>
    </Screen>
  );
}

// ═══════════════════════════════════════════════════════════════════
// I. INVESTOR VIEW
// ═══════════════════════════════════════════════════════════════════
function InvestorView({ goTo }) {
  return (
    <Screen bg={C.white} pad={false}>
      {/* Hero */}
      <div style={{ background: `linear-gradient(160deg, ${C.dark} 0%, #1a2744 100%)`, padding: "40px 24px 36px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: "50%", background: `${C.green}15` }} />
        <div style={{ position: "absolute", bottom: -20, left: 20, width: 100, height: 100, borderRadius: "50%", background: `${C.purple}20` }} />
        <div style={{ position: "relative" }}>
          <Logo size={26} />
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#fff", margin: "20px 0 10px", letterSpacing: -0.5, lineHeight: 1.25 }}>
            Web-App für Conversion,<br />Wallet für Retention,<br />App für Wachstum.
          </h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,.7)", lineHeight: 1.6, margin: 0 }}>
            myspot baut den einfachsten Weg von<br />Erst-Besucher zu Stammgast.
          </p>
        </div>
      </div>

      {/* 3-Stage Model */}
      <div style={{ padding: "24px 24px 0" }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: C.dark, marginBottom: 16, letterSpacing: -0.3 }}>Das 3-Stufen-Modell</div>
        {[
          {
            stage: "01", title: "Web-App", sub: "Conversion",
            color: C.green, bg: C.mint,
            points: ["QR scannen · kein Download", "Sofort Punkte sammeln", "Maximale Conversion", "Null Reibung"],
            metric: "Einstieg",
          },
          {
            stage: "02", title: "Wallet", sub: "Retention",
            color: C.purple, bg: "#F5F3FF",
            points: ["Apple & Google Wallet", "Punkte immer sichtbar", "Geofencing-Erinnerungen", "Kein App-Zwang"],
            metric: "Bequemlichkeit",
          },
          {
            stage: "03", title: "Native App", sub: "Plattform",
            color: C.orange, bg: "#FFF7ED",
            points: ["Discovery-Marktplatz", "Lieblingsspots & Widgets", "Open Banking (später)", "Skalierendes Ökosystem"],
            metric: "Loyalität",
          },
        ].map((s, i) => (
          <div key={i} style={{ background: s.bg, border: `1.5px solid ${s.color}30`, borderRadius: 20, padding: 18, marginBottom: 12, position: "relative" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: s.color, marginBottom: 2 }}>STUFE {s.stage}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: C.dark, letterSpacing: -0.3 }}>{s.title}</div>
                <div style={{ fontSize: 12, color: C.muted }}>{s.sub}</div>
              </div>
              <div style={{ background: s.color, borderRadius: 10, padding: "5px 12px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#fff" }}>{s.metric}</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
              {s.points.map((p, j) => (
                <div key={j} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: C.mid }}>{p}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Metrics */}
      <div style={{ padding: "16px 24px 0" }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: C.dark, marginBottom: 14, letterSpacing: -0.3 }}>Warum myspot?</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
          {[
            { n: "0", l: "App-Downloads nötig", sub: "für den Start" },
            { n: "1", l: "Backend", sub: "mehrere Touchpoints" },
            { n: "€79", l: "Starter-Abo/Monat", sub: "für Händler" },
            { n: "∞", l: "Skalierbarkeit", sub: "Städte · Länder" },
          ].map((m, i) => (
            <Card key={i} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: C.green, letterSpacing: -1 }}>{m.n}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.dark, marginTop: 2 }}>{m.l}</div>
              <div style={{ fontSize: 10, color: C.muted }}>{m.sub}</div>
            </Card>
          ))}
        </div>

        {/* Moat */}
        <Card style={{ background: C.dark, marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 10 }}>Der B2B2C-Moat</div>
          {[
            { arrow: "→", text: "Händler zahlen für Reichweite & Kampagnen" },
            { arrow: "→", text: "Gäste bekommen Rewards ohne Reibung" },
            { arrow: "→", text: "Wallet-Daten schaffen Retention ohne App" },
            { arrow: "→", text: "Netzwerkeffekt: mehr Spots → mehr Gäste" },
          ].map((m, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 8 }}>
              <span style={{ color: C.fresh, fontWeight: 700, flexShrink: 0 }}>{m.arrow}</span>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,.8)", lineHeight: 1.4 }}>{m.text}</span>
            </div>
          ))}
        </Card>

        <Btn onClick={() => goTo("home")} variant="secondary">← Zurück zur App</Btn>
        <div style={{ height: 32 }} />
      </div>
    </Screen>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MYSPOT CARD – Card-Linked Loyalty
// ═══════════════════════════════════════════════════════════════════
function CardLinkedScreen({ goTo }) {
  const [step, setStep]       = useState(0); // 0=intro, 1=setup, 2=live
  const [added, setAdded]     = useState(false);
  const [bankLinked, setBankLinked] = useState(false);
  const [simPay, setSimPay]   = useState(false);
  const [notif, setNotif]     = useState(false);

  const simulatePayment = () => {
    setSimPay(true);
    setTimeout(() => setNotif(true), 1400);
  };

  // ── INTRO ────────────────────────────────────────────────────────
  if (step === 0) return (
    <Screen bg={C.white} pad={false}>
      {/* Hero Card */}
      <div style={{ background: "linear-gradient(160deg, #0a0a1a 0%, #1a1035 50%, #0f2d1a 100%)", padding: "40px 24px 36px", position: "relative", overflow: "hidden" }}>
        {/* Decorative circles */}
        <div style={{ position: "absolute", top: -60, right: -60, width: 220, height: 220, borderRadius: "50%", background: `${C.fresh}10` }} />
        <div style={{ position: "absolute", bottom: -40, left: -40, width: 180, height: 180, borderRadius: "50%", background: `${C.purple}10` }} />

        <div style={{ position: "relative" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
            <Logo size={22} />
            <button onClick={() => goTo("wallet")} style={{ background: "rgba(255,255,255,.1)", border: "none", borderRadius: 10, padding: "6px 12px", fontSize: 12, color: "rgba(255,255,255,.7)", cursor: "pointer" }}>← Wallet</button>
          </div>

          {/* The Card */}
          <div style={{ background: "linear-gradient(135deg, #1a7a3c 0%, #0d5c2e 40%, #1a3a5c 100%)", borderRadius: 20, padding: "22px 20px", marginBottom: 28, position: "relative", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,.5), 0 0 0 1px rgba(255,255,255,.1)" }}>
            {/* Card shine */}
            <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,.05)" }} />
            <div style={{ position: "absolute", bottom: -20, left: 20, width: 100, height: 100, borderRadius: "50%", background: "rgba(34,197,94,.08)" }} />

            <div style={{ position: "relative" }}>
              {/* Top row */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 32, height: 32, background: "linear-gradient(135deg, #22C55E, #0F8A4B)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>●</div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", letterSpacing: -0.5 }}>myspot</div>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,.5)", letterSpacing: 1 }}>LOYALTY CARD</div>
                  </div>
                </div>
                {/* Visa-style logo */}
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: "#fff", fontStyle: "italic", letterSpacing: -1, fontFamily: "serif" }}>VISA</div>
                  <div style={{ fontSize: 8, color: "rgba(255,255,255,.4)", letterSpacing: .5 }}>powered by myspot</div>
                </div>
              </div>

              {/* Chip */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <div style={{ width: 36, height: 28, borderRadius: 6, background: "linear-gradient(135deg, #d4af37, #f0d060)", border: "1px solid rgba(255,255,255,.2)", position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", inset: 0, display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr" }}>
                    {[0,1,2,3].map(i => <div key={i} style={{ border: "0.5px solid rgba(0,0,0,.15)" }} />)}
                  </div>
                </div>
                {/* NFC symbol */}
                <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
                  {[8,12,16].map((s,i) => (
                    <div key={i} style={{ width: s, height: s, borderRadius: "50%", border: "1.5px solid rgba(255,255,255,.4)", borderLeft: "none", borderBottom: "none" }} />
                  ))}
                </div>
              </div>

              {/* Card number */}
              <div style={{ fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,.9)", letterSpacing: 3, marginBottom: 14, fontFamily: "monospace" }}>
                •••• •••• •••• 4291
              </div>

              {/* Bottom row */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <div>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,.4)", marginBottom: 2, letterSpacing: 1 }}>KARTENINHABER</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", letterSpacing: 0.5 }}>LISA MÜLLER</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,.4)", marginBottom: 2, letterSpacing: 1 }}>GÜLTIG BIS</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>12/27</div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 8, letterSpacing: -0.5 }}>Einfach zahlen.<br />Automatisch Punkte.</div>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,.7)", lineHeight: 1.6 }}>Kein Scannen. Kein Eintippen.<br />myspot erkennt jeden Händler automatisch.</div>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div style={{ padding: "28px 24px 0" }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: C.dark, marginBottom: 16, letterSpacing: -0.3 }}>So funktioniert's</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {[
            { icon:"💳", color:"#6D5DF6", title:"Karte zu Apple/Google Wallet", sub:"Einmalig hinzufügen – wie eine Visa-Karte" },
            { icon:"🛍️", color:C.green,   title:"Normal bezahlen",             sub:"Bei jedem myspot-Partner – einfach tippen" },
            { icon:"⚡", color:C.orange,  title:"myspot erkennt den Händler",  sub:"Automatisch via Zahlungsnetzwerk (MCC-Code)" },
            { icon:"⭐", color:C.fresh,   title:"Punkt gutgeschrieben",         sub:"Direkt auf deine Stempelkarte – ohne Scan" },
            { icon:"🔔", color:"#F59E0B", title:"Push-Benachrichtigung",        sub:"\"+1 Punkt bei Café Central gesammelt!\"" },
          ].map((s, i, a) => (
            <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start", position: "relative", paddingBottom: i < a.length-1 ? 16 : 0 }}>
              {i < a.length-1 && <div style={{ position: "absolute", left: 19, top: 40, width: 2, height: "calc(100% - 24px)", background: C.border }} />}
                <div style={{ width: 40, height: 40, borderRadius: 14, border: `1.5px solid ${s.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0, zIndex: 1, background: C.white }}>
                {s.icon}
              </div>
              <div style={{ paddingTop: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>{s.title}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{s.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Comparison */}
        <div style={{ background: C.bg, borderRadius: 16, padding: 16, marginTop: 24, marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.dark, marginBottom: 12 }}>myspot Card vs. QR-Code</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              { title:"QR-Code", items:["Handy zücken","App öffnen","QR finden","Scannen"], color:C.muted, cross:true },
              { title:"myspot Card", items:["Einfach tippen","Fertig. ✓","",""], color:C.green, cross:false },
            ].map((col,i) => (
              <div key={i} style={{ background:C.white, borderRadius:12, padding:"12px 14px", border:`1.5px solid ${i===1?C.green:C.border}` }}>
                <div style={{ fontSize:12, fontWeight:700, color:i===1?C.green:C.muted, marginBottom:8 }}>{col.title}</div>
                {col.items.filter(Boolean).map((item,j) => (
                  <div key={j} style={{ display:"flex", gap:6, alignItems:"center", marginBottom:4 }}>
                    <span style={{ fontSize:10, color:i===1?C.green:C.red }}>{i===1?"✓":"✗"}</span>
                    <span style={{ fontSize:11, color:C.mid, textDecoration:i===0?"line-through":"none" }}>{item}</span>
                  </div>
                ))}
                {i===1 && <div style={{ fontSize:11, color:C.green, fontWeight:700, marginTop:4 }}>100% Conversion</div>}
              </div>
            ))}
          </div>
        </div>

        <button onClick={() => setStep(1)} style={{ width:"100%", background:`linear-gradient(135deg,${C.green},${C.fresh})`, color:"#fff", border:"none", borderRadius:14, padding:"15px 20px", fontSize:15, fontWeight:800, cursor:"pointer", boxShadow:`0 4px 20px ${C.green}40` }}>
          💳 myspot Card einrichten →
        </button>
        <div style={{ fontSize:11, color:C.muted, textAlign:"center", marginTop:10, marginBottom:32 }}>
          Powered by Visa · Gesichert durch myspot · DSGVO-konform
        </div>
      </div>
    </Screen>
  );

  // ── SETUP ────────────────────────────────────────────────────────
  if (step === 1) return (
    <Screen bg={C.bg} pad={false}>
      <div style={{ background:C.dark, padding:"20px 24px 20px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
          <button onClick={() => setStep(0)} style={{ background:"rgba(255,255,255,.1)", border:"none", borderRadius:10, width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#fff", fontSize:16 }}>←</button>
          <div style={{ fontSize:15, fontWeight:700, color:"#fff" }}>Karte einrichten</div>
        </div>
        {/* Setup steps */}
        <div style={{ display:"flex", gap:4, marginTop:14 }}>
          {["Wallet","Konto","Fertig!"].map((l,i) => (
            <div key={l} style={{ flex:1 }}>
              <div style={{ height:3, borderRadius:99, background: i === 0 ? C.fresh : i === 1 && bankLinked ? C.fresh : i === 2 && added && bankLinked ? C.fresh : "rgba(255,255,255,.15)", marginBottom:4 }}/>
              <div style={{ fontSize:8, color:"rgba(255,255,255,.5)" }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding:"20px 24px" }}>
        {/* Step A: Add to Wallet */}
        <div style={{ background:C.white, borderRadius:18, border:`1.5px solid ${added?C.green:C.border}`, padding:16, marginBottom:12 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <div style={{ fontSize:14, fontWeight:700, color:C.dark }}>1. Zu Wallet hinzufügen</div>
            {added && <div style={{ background:C.mint, color:C.green, borderRadius:99, padding:"3px 10px", fontSize:11, fontWeight:700 }}>✓ Erledigt</div>}
          </div>
          {/* Card preview small */}
          <div style={{ background:"linear-gradient(135deg,#1a7a3c,#0f3460)", borderRadius:14, padding:"14px 16px", marginBottom:12 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <div style={{ fontSize:13, fontWeight:800, color:"#fff" }}>myspot</div>
              <div style={{ fontSize:14, fontWeight:900, color:"#fff", fontStyle:"italic", fontFamily:"serif" }}>VISA</div>
            </div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,.7)", letterSpacing:2, fontFamily:"monospace" }}>•••• •••• •••• 4291</div>
          </div>
          {!added ? (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              <button onClick={() => setAdded(true)} style={{ background:"#000", color:"#fff", border:"none", borderRadius:12, padding:"13px", fontSize:14, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                🍎 Zu Apple Wallet hinzufügen
              </button>
              <button onClick={() => setAdded(true)} style={{ background:"#4285F4", color:"#fff", border:"none", borderRadius:12, padding:"13px", fontSize:14, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                🔵 Zu Google Wallet hinzufügen
              </button>
            </div>
          ) : (
            <div style={{ background:C.mint, borderRadius:10, padding:"10px 14px", textAlign:"center", fontSize:13, fontWeight:700, color:C.green }}>
              ✓ Karte im Wallet gespeichert
            </div>
          )}
        </div>

        {/* Step B: Link bank / payment */}
        <div style={{ background:C.white, borderRadius:18, border:`1.5px solid ${bankLinked?C.green:added?C.border:"#f0f0f0"}`, padding:16, marginBottom:12, opacity:added?1:.5 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <div style={{ fontSize:14, fontWeight:700, color:C.dark }}>2. Konto verknüpfen</div>
            {bankLinked && <div style={{ background:C.mint, color:C.green, borderRadius:99, padding:"3px 10px", fontSize:11, fontWeight:700 }}>✓ Verknüpft</div>}
          </div>
          <div style={{ fontSize:12, color:C.muted, marginBottom:12, lineHeight:1.5 }}>
            Verbinde dein Bankkonto via Open Banking (PSD2). myspot erkennt Zahlungen bei Partnerhändlern – automatisch.
          </div>
          {!bankLinked ? (
            <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
              {["🏦 Sparkasse", "🏦 Deutsche Bank", "🟦 N26", "🟢 ING"].map(b => (
                <button key={b} onClick={() => added && setBankLinked(true)} style={{ background:C.bg, color:C.dark, border:`1px solid ${C.border}`, borderRadius:10, padding:"10px 14px", fontSize:13, fontWeight:600, cursor:added?"pointer":"not-allowed", textAlign:"left" }}>
                  {b}
                </button>
              ))}
              <div style={{ fontSize:10, color:C.muted, textAlign:"center", marginTop:4 }}>
                🔒 DSGVO-konform · Lesezugriff · jederzeit widerrufbar
              </div>
            </div>
          ) : (
            <div style={{ background:C.mint, borderRadius:10, padding:"10px 14px", textAlign:"center", fontSize:13, fontWeight:700, color:C.green }}>
              ✓ Sparkasse verknüpft
            </div>
          )}
        </div>

        {/* Ready */}
        {added && bankLinked && (
          <button onClick={() => setStep(2)} style={{ width:"100%", background:`linear-gradient(135deg,${C.green},${C.fresh})`, color:"#fff", border:"none", borderRadius:14, padding:"14px", fontSize:14, fontWeight:800, cursor:"pointer", boxShadow:`0 4px 16px ${C.green}30` }}>
            🚀 Card-Linked Loyalty aktivieren →
          </button>
        )}
      </div>
    </Screen>
  );

  // ── LIVE VIEW ────────────────────────────────────────────────────
  return (
    <Screen bg={C.bg} pad={false}>
      {/* Header */}
      <div style={{ background:"linear-gradient(160deg,#0a0a1a,#0f2d1a)", padding:"24px 24px 20px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <button onClick={() => setStep(1)} style={{ background:"rgba(255,255,255,.1)", border:"none", borderRadius:10, width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#fff", fontSize:16 }}>←</button>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:14, fontWeight:700, color:"#fff" }}>myspot Card</div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,.5)" }}>Card-Linked Loyalty · Aktiv</div>
          </div>
          <div style={{ width:36, height:36, borderRadius:10, background:C.green, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>✓</div>
        </div>

        {/* Live card */}
        <div style={{ background:"linear-gradient(135deg,#1a7a3c,#0d5c2e,#1a3a5c)", borderRadius:20, padding:"18px 18px", position:"relative", overflow:"hidden", boxShadow:"0 12px 40px rgba(0,0,0,.4), 0 0 0 1px rgba(255,255,255,.1)" }}>
          <div style={{ position:"absolute", top:-20, right:-20, width:120, height:120, borderRadius:"50%", background:"rgba(34,197,94,.1)" }}/>
          <div style={{ position:"relative" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
              <div>
                <div style={{ fontSize:15, fontWeight:800, color:"#fff", letterSpacing:-0.5 }}>myspot</div>
                <div style={{ fontSize:8, color:"rgba(255,255,255,.4)", letterSpacing:1 }}>LOYALTY CARD</div>
              </div>
              <div style={{ background:`${C.fresh}20`, borderRadius:8, padding:"4px 8px", fontSize:11, fontWeight:700, color:C.fresh }}>● AKTIV</div>
            </div>
            {/* Chip + NFC */}
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
              <div style={{ width:32, height:24, borderRadius:5, background:"linear-gradient(135deg,#d4af37,#f0d060)", position:"relative", overflow:"hidden" }}>
                <div style={{ position:"absolute", inset:0, display:"grid", gridTemplateColumns:"1fr 1fr", gridTemplateRows:"1fr 1fr" }}>
                  {[0,1,2,3].map(i => <div key={i} style={{ border:"0.5px solid rgba(0,0,0,.12)" }}/>)}
                </div>
              </div>
              <div style={{ display:"flex", gap:1 }}>
                {[7,11,15].map((s,i) => <div key={i} style={{ width:s, height:s, borderRadius:"50%", border:"1.5px solid rgba(255,255,255,.35)", borderLeft:"none", borderBottom:"none" }}/>)}
              </div>
              <div style={{ fontSize:9, color:"rgba(255,255,255,.4)", fontFamily:"monospace" }}>•••• 4291</div>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ fontSize:12, fontWeight:600, color:"rgba(255,255,255,.8)" }}>LISA MÜLLER</div>
              <div style={{ fontSize:18, fontWeight:900, color:"#fff", fontStyle:"italic", fontFamily:"serif" }}>VISA</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding:"16px 24px" }}>

        {/* Active status */}
        <div style={{ background:C.mint, border:`1.5px solid ${C.green}30`, borderRadius:14, padding:"10px 14px", marginBottom:14, display:"flex", gap:8, alignItems:"center" }}>
          <div style={{ width:8, height:8, borderRadius:"50%", background:C.fresh, flexShrink:0, animation:"none" }}/>
          <div style={{ fontSize:13, fontWeight:600, color:C.green }}>Automatische Erkennung aktiv · Sparkasse verknüpft</div>
        </div>

        {/* Simulate payment */}
        <div style={{ background:C.white, borderRadius:18, border:`1px solid ${C.border}`, padding:16, marginBottom:12 }}>
          <div style={{ fontSize:14, fontWeight:700, color:C.dark, marginBottom:4 }}>Zahlung simulieren</div>
          <div style={{ fontSize:12, color:C.muted, marginBottom:14 }}>So erlebt es dein Gast bei Café Central:</div>

          {/* Payment flow visual */}
          <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:14 }}>
            {[
              { icon:"💳", label:"Gast tippt myspot Card ans Terminal", done:simPay },
              { icon:"⚡", label:"myspot erkennt: Café Central (MCC 5812)", done:simPay },
              { icon:"⭐", label:"+1 Punkt auf Stempelkarte gutgeschrieben", done:notif },
              { icon:"🔔", label:"Push: \"+1 Punkt bei Café Central! (6/10)\"", done:notif },
            ].map((item, i) => (
              <div key={i} style={{ display:"flex", gap:10, alignItems:"center", background: item.done ? C.mint : C.bg, borderRadius:10, padding:"8px 12px", transition:"background .3s" }}>
                <div style={{ width:30, height:30, borderRadius:8, background: item.done ? C.green : C.border, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0, transition:"background .3s" }}>
                  {item.done ? "✓" : item.icon}
                </div>
                <div style={{ fontSize:12, color: item.done ? C.green : C.mid, fontWeight: item.done ? 600 : 400 }}>{item.label}</div>
              </div>
            ))}
          </div>

          {!simPay ? (
            <button onClick={simulatePayment} style={{ width:"100%", background:C.dark, color:"#fff", border:"none", borderRadius:12, padding:"13px", fontSize:13, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
              <span style={{ fontSize:18 }}>💳</span> Zahlung simulieren (5€ bei Café Central)
            </button>
          ) : notif ? (
            <div style={{ background:"#111", borderRadius:14, padding:12 }}>
              <div style={{ fontSize:10, color:"rgba(255,255,255,.4)", marginBottom:8 }}>Push-Benachrichtigung</div>
              <div style={{ background:"rgba(255,255,255,.08)", borderRadius:10, padding:10, display:"flex", gap:10 }}>
                <div style={{ width:32, height:32, borderRadius:9, background:`linear-gradient(135deg,${C.green},${C.fresh})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>●</div>
                <div>
                  <div style={{ fontSize:11, fontWeight:700, color:"#fff" }}>myspot</div>
                  <div style={{ fontSize:12, color:"rgba(255,255,255,.8)", marginTop:2 }}>⭐ +1 Punkt bei Café Central! Du hast jetzt 6/10 Punkten.</div>
                  <div style={{ fontSize:9, color:"rgba(255,255,255,.4)", marginTop:3 }}>jetzt · Noch 4 bis: Gratis Kaffee ☕</div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ background:C.mint, borderRadius:10, padding:10, textAlign:"center", fontSize:12, color:C.green, fontWeight:600 }}>
              ⚡ Zahlung erkannt · Punkt wird gutgeschrieben…
            </div>
          )}

          {notif && (
            <button onClick={() => { setSimPay(false); setNotif(false); }} style={{ width:"100%", background:C.bg, color:C.muted, border:`1px solid ${C.border}`, borderRadius:10, padding:"9px", fontSize:12, cursor:"pointer", marginTop:10 }}>
              Nochmal simulieren
            </button>
          )}
        </div>

        {/* Recent transactions */}
        <div style={{ background:C.white, borderRadius:18, border:`1px solid ${C.border}`, padding:16, marginBottom:12 }}>
          <div style={{ fontSize:13, fontWeight:700, color:C.dark, marginBottom:12 }}>Letzte automatische Punkte</div>
          {[
            { emoji:"☕", name:"Café Central",   pts:"+1", time:"heute 09:14",    amount:"4.50€" },
            { emoji:"🍕", name:"Pizzeria Verde", pts:"+1", time:"gestern 13:22",  amount:"12.90€" },
            { emoji:"☕", name:"Café Central",   pts:"+1", time:"Mo 08:55",       amount:"3.80€" },
            { emoji:"🥐", name:"Bäckerei Katz",  pts:"+1", time:"Sa 08:30",       amount:"2.90€" },
          ].map((tx, i, a) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom: i < a.length-1 ? `1px solid ${C.border}` : "none" }}>
              <div style={{ width:36, height:36, borderRadius:10, background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>{tx.emoji}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:600, color:C.dark }}>{tx.name}</div>
                <div style={{ fontSize:11, color:C.muted }}>{tx.time} · {tx.amount}</div>
              </div>
              <div style={{ background:C.mint, color:C.green, borderRadius:99, padding:"3px 9px", fontSize:12, fontWeight:700 }}>{tx.pts} ⭐</div>
            </div>
          ))}
        </div>

        {/* Roadmap note */}
        <div style={{ background:"#F5F3FF", border:`1px solid ${C.purple}30`, borderRadius:14, padding:"12px 14px", marginBottom:24 }}>
          <div style={{ display:"flex", gap:8, alignItems:"flex-start" }}>
            <span style={{ fontSize:16 }}>🔮</span>
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:C.purple, marginBottom:3 }}>Phase 3 Feature · Coming Soon</div>
              <div style={{ fontSize:11, color:C.mid, lineHeight:1.5 }}>Card-Linked Loyalty via Visa/Mastercard API oder Open Banking (PSD2). Powered by Stripe Issuing oder Marqeta.</div>
            </div>
          </div>
        </div>

      </div>
    </Screen>
  );
}

// ═══════════════════════════════════════════════════════════════════
// NAVIGATION BAR
// ═══════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════
// ONBOARDING – Telefon + Username + Geburtstag
// ═══════════════════════════════════════════════════════════════════
const MONTHS_SHORT = ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];

function OnboardingGuest({ onDone }) {
  const [step, setStep] = useState(0);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [uname, setUname] = useState("");
  const [day, setDay] = useState("");
  const [mon, setMon] = useState("");
  const ok = uname.length >= 3 && day && mon;

  const steps = [
    // 0 – Telefon
    <div key="0" style={{ padding:"0 24px 24px" }}>
      <div style={{ textAlign:"center", marginBottom:24 }}>
        <div style={{ width:60, height:60, borderRadius:"50%", background:C.mint, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 12px", fontSize:28 }}>👋</div>
        <div style={{ fontSize:22, fontWeight:800, color:C.dark, marginBottom:4 }}>Willkommen bei myspot</div>
        <div style={{ fontSize:13, color:C.muted }}>In unter einer Minute startklar</div>
      </div>
      <div style={{ fontSize:12, fontWeight:700, color:C.mid, marginBottom:6 }}>Handynummer</div>
      <div style={{ display:"flex", gap:8, marginBottom:12 }}>
        <div style={{ background:C.bg, borderRadius:10, padding:"12px 10px", fontSize:13, fontWeight:700, color:C.dark, flexShrink:0, border:`1px solid ${C.border}` }}>🇩🇪 +49</div>
        <input value={phone} onChange={e=>setPhone(e.target.value.replace(/\D/g,""))} placeholder="171 234 5678" type="tel"
          style={{ flex:1, background:C.bg, border:`1px solid ${C.border}`, borderRadius:10, padding:"12px 14px", fontSize:14, color:C.dark, outline:"none" }}/>
      </div>
      <Btn onClick={()=>phone.length>=6&&setStep(1)} style={{opacity:phone.length>=6?1:.45}}>SMS-Code senden →</Btn>
      <div style={{ fontSize:11, color:C.muted, textAlign:"center", marginTop:10 }}>DSGVO-konform · Kein App-Download nötig</div>
    </div>,

    // 1 – Code
    <div key="1" style={{ padding:"0 24px 24px" }}>
      <div style={{ textAlign:"center", marginBottom:20 }}>
        <div style={{ width:60, height:60, borderRadius:"50%", background:C.mint, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 12px", fontSize:28 }}>📱</div>
        <div style={{ fontSize:20, fontWeight:800, color:C.dark, marginBottom:4 }}>Code eingeben</div>
        <div style={{ fontSize:13, color:C.muted }}>Gesendet an +49 {phone||"···"}</div>
      </div>
      <div style={{ display:"flex", gap:8, justifyContent:"center", marginBottom:20 }}>
        {[0,1,2,3].map(i=>(
          <div key={i} style={{ width:56, height:60, borderRadius:12, background:code.length>i?C.green:C.bg, border:`1.5px solid ${code.length===i?C.green:C.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, fontWeight:700, color:"#fff", transition:"all .2s" }}>
            {code.length>i?"•":""}
          </div>
        ))}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:14 }}>
        {[1,2,3,4,5,6,7,8,9,"","0","⌫"].map((n,i)=>(
          <div key={i} onClick={()=>{
            if(n==="⌫"){setCode(c=>c.slice(0,-1));return;}
            if(n==="")return;
            if(code.length<4){const nx=code+String(n);setCode(nx);if(nx.length===4)setTimeout(()=>setStep(2),300);}
          }} style={{ background:n===""?"transparent":C.bg, borderRadius:12, padding:"13px 0", textAlign:"center", fontSize:20, fontWeight:600, color:C.dark, cursor:n===""?"default":"pointer", border:n===""?"none":`1px solid ${C.border}` }}>{n}</div>
        ))}
      </div>
      <div style={{ fontSize:12, color:C.green, textAlign:"center", fontWeight:600, cursor:"pointer" }}>Code nochmal senden</div>
    </div>,

    // 2 – Profil
    <div key="2" style={{ padding:"0 24px 24px" }}>
      <div style={{ textAlign:"center", marginBottom:20 }}>
        <div style={{ width:60, height:60, borderRadius:"50%", background:C.mint, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 12px", fontSize:28 }}>😊</div>
        <div style={{ fontSize:20, fontWeight:800, color:C.dark, marginBottom:4 }}>Dein Profil</div>
        <div style={{ fontSize:13, color:C.muted }}>Wird nie an Händler weitergegeben</div>
      </div>
      <div style={{ fontSize:12, fontWeight:700, color:C.mid, marginBottom:5 }}>Benutzername</div>
      <div style={{ display:"flex", alignItems:"center", background:C.bg, border:`1.5px solid ${uname.length>=3?C.green:C.border}`, borderRadius:10, marginBottom:14 }}>
        <span style={{ padding:"12px 8px 12px 14px", fontSize:14, color:C.muted }}>@</span>
        <input value={uname} onChange={e=>setUname(e.target.value.replace(/\s/g,"").toLowerCase())} placeholder="lisa_stgt"
          style={{ flex:1, background:"transparent", border:"none", padding:"12px 8px", fontSize:14, color:C.dark, outline:"none" }}/>
        {uname.length>=3&&<span style={{ padding:"12px 14px", color:C.green, fontWeight:700 }}>✓</span>}
      </div>
      <div style={{ fontSize:12, fontWeight:700, color:C.mid, marginBottom:5 }}>Geburtstag</div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr 1fr", gap:6, marginBottom:12 }}>
        <input value={day} onChange={e=>setDay(e.target.value.replace(/\D/g,"").slice(0,2))} placeholder="TT" type="tel" maxLength={2}
          style={{ background:C.bg, border:`1.5px solid ${day?C.green:C.border}`, borderRadius:10, padding:"11px 10px", fontSize:14, textAlign:"center", color:C.dark, outline:"none" }}/>
        <select value={mon} onChange={e=>setMon(e.target.value)}
          style={{ background:C.bg, border:`1.5px solid ${mon?C.green:C.border}`, borderRadius:10, padding:"11px 8px", fontSize:13, color:mon?C.dark:C.muted, outline:"none" }}>
          <option value="">Monat</option>
          {MONTHS_SHORT.map((m,i)=><option key={m} value={i+1}>{m}</option>)}
        </select>
        <input placeholder="Jahr" type="tel" maxLength={4}
          style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:10, padding:"11px 6px", fontSize:13, textAlign:"center", color:C.dark, outline:"none" }}/>
      </div>
      <div style={{ background:C.mint, borderRadius:10, padding:"8px 12px", marginBottom:14, display:"flex", gap:8 }}>
        <span style={{ fontSize:14 }}>🎂</span>
        <div style={{ fontSize:11, color:C.green }}>Geburtstag wird <b>nie an Händler weitergegeben</b>. myspot sendet automatisch eine Überraschung.</div>
      </div>
      <Btn onClick={()=>ok&&setStep(3)} style={{opacity:ok?1:.45}}>Weiter →</Btn>
      <Btn variant="ghost" onClick={()=>setStep(3)} style={{ marginTop:8 }}>Später ausfüllen</Btn>
    </div>,

    // 3 – Fertig
    <div key="3" style={{ padding:"0 24px 32px" }}>
      <div style={{ textAlign:"center", marginBottom:20 }}>
        <div style={{ width:68, height:68, borderRadius:"50%", background:C.green, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 12px", fontSize:30, color:"#fff" }}>🎉</div>
        <div style={{ fontSize:22, fontWeight:800, color:C.dark, marginBottom:4 }}>Willkommen{uname?`, @${uname}`:""}!</div>
        <div style={{ fontSize:13, color:C.muted }}>Dein Konto ist bereit</div>
      </div>
      <Card style={{ marginBottom:16 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
          <div style={{ width:44, height:44, borderRadius:"50%", background:C.green, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, color:"#fff", fontWeight:700 }}>{uname?uname[0].toUpperCase():"?"}</div>
          <div><div style={{ fontSize:14, fontWeight:700, color:C.dark }}>@{uname||"dein_name"}</div><div style={{ fontSize:11, color:C.muted }}>+49 {phone||"···"}</div></div>
          <div style={{ marginLeft:"auto" }}><Tag>Neu</Tag></div>
        </div>
        <div style={{ display:"flex", gap:6 }}>
          {[["📱","Verifiziert"],["🎂",day&&mon?`${day}. ${MONTHS_SHORT[parseInt(mon)-1]}`:"offen"],["🔒","Privat"]].map(([ic,tx])=>(
            <div key={tx} style={{ flex:1, background:C.bg, borderRadius:8, padding:"7px 5px", textAlign:"center" }}>
              <div style={{ fontSize:14 }}>{ic}</div>
              <div style={{ fontSize:8, color:C.muted, marginTop:2 }}>{tx}</div>
            </div>
          ))}
        </div>
      </Card>
      {[["⬛","QR scannen","Punkte bei jedem Besuch"],["⭐","Rewards sammeln","Gratis-Kaffee & mehr"],["💳","Wallet speichern","Karte immer dabei"]].map(([ic,ti,su])=>(
        <div key={ti} style={{ display:"flex", gap:10, padding:"9px 0", borderBottom:`1px solid ${C.border}` }}>
          <div style={{ width:34, height:34, borderRadius:9, background:C.mint, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>{ic}</div>
          <div><div style={{ fontSize:13, fontWeight:700, color:C.dark }}>{ti}</div><div style={{ fontSize:11, color:C.muted }}>{su}</div></div>
        </div>
      ))}
      <Btn onClick={onDone} style={{ marginTop:20 }}>🚀 myspot entdecken</Btn>
    </div>,
  ];

  return (
    <Screen bg={C.white} pad={false}>
      <div style={{ background:C.darkGreen, padding:"20px 24px 16px" }}>
        <Logo size={24} light />
        <div style={{ display:"flex", gap:3, marginTop:14 }}>
          {[0,1,2,3].map(i=>(
            <div key={i} style={{ flex:1, height:3, borderRadius:99, background:i<=step?C.fresh:"rgba(255,255,255,.2)", transition:"background .3s" }}/>
          ))}
        </div>
        <div style={{ fontSize:10, color:"rgba(255,255,255,.5)", marginTop:4 }}>Schritt {step+1} von 4</div>
      </div>
      {steps[step]}
    </Screen>
  );
}

// ═══════════════════════════════════════════════════════════════════
// BENACHRICHTIGUNGEN
// ═══════════════════════════════════════════════════════════════════
const NOTIFS_DATA = [
  { id:0, unread:true,  icon:"⚡", spot:"Café Central",   color:"#8B5CF6", title:"Heute 2× Punkte auf alles!", body:"Nur bis 22 Uhr – komm vorbei und sammel doppelte Punkte.", time:"vor 5 Min.", type:"aktion",  cta:"Jetzt hingehen" },
  { id:1, unread:true,  icon:"🎂", spot:"Bar Roma",        color:"#EF4444", title:"Happy Hour startet gleich!", body:"16–19 Uhr: 2für1 Cocktails. Noch 30 Minuten.", time:"vor 14 Min.", type:"aktion",  cta:"Route anzeigen" },
  { id:2, unread:true,  icon:"🎁", spot:"Bäckerei Katz",   color:"#F59E0B", title:"Deine Gratis-Brezel wartet!", body:"Du hast 10 Stempel – dein Reward ist jetzt einlösbar.", time:"vor 1 Std.",  type:"reward",  cta:"Reward anzeigen" },
  { id:3, unread:false, icon:"🆕", spot:"Pizzeria Verde",  color:"#10B981", title:"Neu bei myspot!", body:"Pizzeria Verde ist jetzt dabei – folge ihnen und sichere dir den Willkommens-Stempel.", time:"vor 3 Std.", type:"neu", cta:"Jetzt folgen" },
  { id:4, unread:false, icon:"📸", spot:"Café Central",   color:"#8B5CF6", title:"Neue Karte ist da!", body:"Frische Sommer-Spezialitäten und vegane Specials – schau rein.", time:"gestern", type:"post", cta:"Profil ansehen" },
];

const NOTIF_STYLES = {
  aktion:  { bg:"#FFF7ED", color:C.orange,  label:"Aktion" },
  reward:  { bg:C.mint,    color:C.green,   label:"Reward" },
  neu:     { bg:"#EEF2FF", color:C.purple,  label:"Neu"    },
  post:    { bg:C.bg,      color:C.muted,   label:"Post"   },
};

function BenachrichtigungenScreen({ goTo }) {
  const [notifs, setNotifs] = useState(NOTIFS_DATA);
  const [filter, setFilter] = useState("Alle");
  const unread = notifs.filter(n=>n.unread).length;
  const filtered = filter==="Alle" ? notifs : notifs.filter(n=>n.type===filter.toLowerCase()||n.type.startsWith(filter.toLowerCase().slice(0,4)));

  return (
    <Screen bg={C.bg} pad={false}>
      <div style={{ background:C.darkGreen, padding:"20px 24px 16px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <BackBtn onClick={()=>goTo("home")} dark />
            <Logo size={22} light />
          </div>
          {unread>0&&<button onClick={()=>setNotifs(n=>n.map(x=>({...x,unread:false})))} style={{ background:"rgba(255,255,255,.15)", color:"#fff", border:"none", borderRadius:8, padding:"5px 10px", fontSize:11, fontWeight:600, cursor:"pointer" }}>Alle gelesen</button>}
        </div>
        <div style={{ fontSize:16, fontWeight:800, color:"#fff" }}>Benachrichtigungen</div>
        {unread>0&&<div style={{ fontSize:11, color:"rgba(255,255,255,.6)", marginTop:2 }}>{unread} neue Nachrichten</div>}
      </div>

      <div style={{ background:C.white, padding:"10px 16px", borderBottom:`1px solid ${C.border}`, display:"flex", gap:6, overflowX:"auto" }}>
        {["Alle","Aktionen","Rewards","Posts"].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{ background:filter===f?C.green:C.bg, color:filter===f?"#fff":C.muted, border:`1px solid ${filter===f?C.green:C.border}`, borderRadius:99, padding:"5px 12px", fontSize:11, fontWeight:600, cursor:"pointer", flexShrink:0, whiteSpace:"nowrap" }}>{f}</button>
        ))}
      </div>

      <div style={{ padding:"12px 16px" }}>
        {filtered.map((n,i)=>{
          const ts = NOTIF_STYLES[n.type]||NOTIF_STYLES.post;
          return (
            <div key={n.id} onClick={()=>setNotifs(ns=>ns.map(x=>x.id===n.id?{...x,unread:false}:x))} style={{ display:"flex", gap:10, padding:"11px 0", borderBottom:i<filtered.length-1?`1px solid ${C.border}`:"none", cursor:"pointer", opacity:n.unread?1:.65 }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background:n.unread?C.orange:"transparent", flexShrink:0, marginTop:14 }}/>
              <div style={{ position:"relative", flexShrink:0 }}>
                <div style={{ width:40, height:40, borderRadius:12, background:n.color+"22", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>{n.icon}</div>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:2 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:C.green }}>{n.spot}</div>
                  <div style={{ fontSize:9, color:C.muted, flexShrink:0 }}>{n.time}</div>
                </div>
                <div style={{ fontSize:13, fontWeight:n.unread?700:600, color:C.dark, marginBottom:3 }}>{n.title}</div>
                <div style={{ fontSize:11, color:C.muted, lineHeight:1.4, marginBottom:6 }}>{n.body}</div>
                <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                  <div style={{ background:ts.bg, color:ts.color, borderRadius:6, padding:"2px 8px", fontSize:9, fontWeight:700 }}>{ts.label}</div>
                  <button onClick={e=>{e.stopPropagation();goTo("discover");}} style={{ background:C.green, color:"#fff", border:"none", borderRadius:6, padding:"3px 9px", fontSize:9, fontWeight:700, cursor:"pointer" }}>{n.cta} →</button>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length===0&&(
          <div style={{ textAlign:"center", padding:"40px 0" }}>
            <div style={{ fontSize:36, marginBottom:8 }}>🔕</div>
            <div style={{ fontSize:14, fontWeight:700, color:C.dark }}>Keine Benachrichtigungen</div>
          </div>
        )}
      </div>
    </Screen>
  );
}

// ═══════════════════════════════════════════════════════════════════
// GRUPPENABSTIMMUNG
// ═══════════════════════════════════════════════════════════════════
function GruppenScreen({ goTo }) {
  const [step, setStep] = useState(0);
  const [tags, setTags] = useState(["☕ Café"]);
  const [budget, setBudget] = useState("15–25€");
  const [pax, setPax] = useState(4);
  const [myVote, setMyVote] = useState(0);
  const [votes, setVotes] = useState([3,1,0]);
  const [shared, setShared] = useState(false);
  const total = votes.reduce((a,b)=>a+b,0)||1;

  const voteSpots = [
    { name:"Café Central",   sub:"Café · 4.7★ · 450m",  badge:"2× Punkte",   color:"#8B5CF6", emoji:"☕" },
    { name:"Bar Roma",       sub:"Drinks · 4.5★ · 700m", badge:"Happy Hour",  color:"#EF4444", emoji:"🍹" },
    { name:"Bäckerei Katz",  sub:"Bäck. · 4.8★ · 1.1km", badge:"",           color:"#F59E0B", emoji:"🥐" },
  ];
  const castVote = i => {
    const nv=[...votes]; nv[myVote]=Math.max(0,nv[myVote]-1); nv[i]++; setVotes(nv); setMyVote(i);
  };
  const stepLabels = ["Kriterien","Teilen","Abstimmen","Ergebnis"];

  return (
    <Screen bg={C.bg} pad={false}>
      <div style={{ background:C.darkGreen, padding:"20px 24px 16px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
          <BackBtn onClick={()=>goTo("home")} dark />
          <Logo size={22} light />
        </div>
        <div style={{ fontSize:16, fontWeight:800, color:"#fff", marginBottom:12 }}>Gruppenabstimmung</div>
        <div style={{ display:"flex", gap:3 }}>
          {stepLabels.map((l,i)=>(
            <div key={l} onClick={()=>setStep(i)} style={{ flex:1, textAlign:"center", cursor:"pointer" }}>
              <div style={{ height:3, borderRadius:99, background:i<=step?C.fresh:"rgba(255,255,255,.2)", marginBottom:4, transition:"background .3s" }}/>
              <div style={{ fontSize:8, color:i===step?C.fresh:"rgba(255,255,255,.4)", fontWeight:i===step?700:400 }}>{i<step?"✓":l}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding:"16px 24px" }}>
        {/* Step 0 – Kriterien */}
        {step===0&&<>
          <div style={{ fontSize:14, fontWeight:700, color:C.dark, marginBottom:4 }}>Wo esst ihr heute?</div>
          <div style={{ fontSize:12, color:C.muted, marginBottom:14 }}>Kriterien wählen · Link teilen · fertig</div>
          <div style={{ fontSize:12, fontWeight:700, color:C.mid, marginBottom:8 }}>Was habt ihr Lust?</div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:14 }}>
            {["☕ Café","🍕 Pizza","🍔 Burger","🥗 Salat"].map(t=>(
              <button key={t} onClick={()=>setTags(p=>p.includes(t)?p.filter(x=>x!==t):[...p,t])} style={{ background:tags.includes(t)?C.green:C.bg, color:tags.includes(t)?"#fff":C.mid, border:`1.5px solid ${tags.includes(t)?C.green:C.border}`, borderRadius:99, padding:"7px 12px", fontSize:12, fontWeight:600, cursor:"pointer" }}>{t}</button>
            ))}
          </div>
          <div style={{ fontSize:12, fontWeight:700, color:C.mid, marginBottom:8 }}>Budget pro Person</div>
          <div style={{ display:"flex", gap:6, marginBottom:14 }}>
            {["unter 15€","15–25€","25€+"].map(b=>(
              <div key={b} onClick={()=>setBudget(b)} style={{ flex:1, textAlign:"center", background:budget===b?C.mint:C.bg, border:`1.5px solid ${budget===b?C.green:C.border}`, borderRadius:10, padding:"9px 4px", fontSize:11, cursor:"pointer", color:budget===b?C.green:C.dark, fontWeight:budget===b?700:400 }}>{b}</div>
            ))}
          </div>
          <div style={{ fontSize:12, fontWeight:700, color:C.mid, marginBottom:8 }}>Personen</div>
          <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:20 }}>
            <button onClick={()=>setPax(p=>Math.max(2,p-1))} style={{ width:38, height:38, borderRadius:"50%", border:`1px solid ${C.border}`, background:C.white, fontSize:20, cursor:"pointer", color:C.dark }}>−</button>
            <div style={{ fontSize:24, fontWeight:800, color:C.dark, minWidth:30, textAlign:"center" }}>{pax}</div>
            <button onClick={()=>setPax(p=>Math.min(12,p+1))} style={{ width:38, height:38, borderRadius:"50%", border:`1px solid ${C.border}`, background:C.white, fontSize:20, cursor:"pointer", color:C.dark }}>+</button>
            <div style={{ fontSize:12, color:C.muted }}>Personen</div>
          </div>
          <Btn onClick={()=>setStep(1)}>✨ Vorschläge anzeigen →</Btn>
        </>}

        {/* Step 1 – Teilen */}
        {step===1&&<>
          <div style={{ fontSize:14, fontWeight:700, color:C.dark, marginBottom:4 }}>Umfrage teilen</div>
          <div style={{ fontSize:12, color:C.muted, marginBottom:14 }}>Freunde stimmen ab – ohne App-Download</div>
          <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:14 }}>
            {voteSpots.map((s,i)=>(
              <div key={i} style={{ display:"flex", alignItems:"center", gap:10, background:C.white, border:`1px solid ${C.border}`, borderRadius:12, padding:"10px 12px" }}>
                <div style={{ width:36, height:36, borderRadius:10, background:s.color+"22", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>{s.emoji}</div>
                <div style={{ flex:1 }}><div style={{ fontSize:13, fontWeight:700, color:C.dark }}>{s.name}</div><div style={{ fontSize:11, color:C.muted }}>{s.sub}</div></div>
                {s.badge&&<Tag color={C.orange} bg="#FFF3E8">{s.badge}</Tag>}
              </div>
            ))}
          </div>
          <div style={{ background:"#075E54", borderRadius:14, padding:14, marginBottom:12 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8 }}>
              <div style={{ width:24, height:24, borderRadius:"50%", background:"#25D366", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13 }}>📱</div>
              <div style={{ fontSize:11, fontWeight:700, color:"#fff" }}>WhatsApp · Gruppe einladen</div>
            </div>
            <div style={{ background:"#fff", borderRadius:10, borderTopLeftRadius:2, padding:"9px 11px" }}>
              <div style={{ fontSize:11, fontWeight:700, color:"#075E54", marginBottom:2 }}>Lisa · myspot Abstimmung 🍕</div>
              <div style={{ fontSize:11, color:C.dark, marginBottom:6 }}>Wo essen wir heute? Stimmt ab!</div>
              <div style={{ background:C.mint, borderRadius:8, padding:"6px 9px" }}>
                <div style={{ fontSize:10, fontWeight:700, color:C.green }}>myspot.app/poll/xyz42</div>
                <div style={{ fontSize:9, color:C.muted, marginTop:1 }}>3 Spots · kein App-Download</div>
              </div>
            </div>
          </div>
          <button onClick={()=>{setShared(true);setStep(2);}} style={{ width:"100%", padding:13, background:"#25D366", color:"#fff", border:"none", borderRadius:10, fontSize:13, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
            <span>💬</span> In WhatsApp teilen
          </button>
          <Btn variant="ghost" onClick={()=>setStep(2)} style={{ marginTop:8 }}>Link kopieren</Btn>
        </>}

        {/* Step 2 – Abstimmen */}
        {step===2&&<>
          <div style={{ fontSize:14, fontWeight:700, color:C.dark, marginBottom:6 }}>Wo geht ihr hin?</div>
          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:14 }}>
            <div style={{ display:"flex" }}>
              {[{bg:"#e07a5f",l:"L"},{bg:"#3d405b",l:"M"},{bg:"#aaa",l:"?"},{bg:"#aaa",l:"?"}].map((f,i)=>(
                <div key={i} style={{ width:26, height:26, borderRadius:"50%", border:"2px solid #fff", background:f.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:700, color:"#fff", marginRight:-6, zIndex:4-i }}>{f.l}</div>
              ))}
            </div>
            <div style={{ fontSize:11, color:C.muted, marginLeft:10 }}><b style={{ color:C.dark }}>2 von {pax}</b> haben abgestimmt</div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:14 }}>
            {voteSpots.map((s,i)=>{
              const isMy=myVote===i;
              const pct=Math.round((votes[i]/total)*100);
              return (
                <div key={i} onClick={()=>castVote(i)} style={{ background:isMy?C.mint:C.white, border:`1.5px solid ${isMy?C.green:C.border}`, borderRadius:12, padding:"11px 14px", cursor:"pointer", position:"relative", transition:"all .15s" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:40, height:40, borderRadius:10, background:s.color+"22", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>{s.emoji}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:C.dark }}>{s.name}</div>
                      <div style={{ fontSize:10, color:C.muted, marginBottom:5 }}>{s.sub}</div>
                      <div style={{ background:C.border, borderRadius:99, height:5 }}>
                        <div style={{ background:isMy?C.green:"#aaa", height:5, borderRadius:99, width:`${pct}%`, transition:"width .4s" }}/>
                      </div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontSize:18, fontWeight:800, color:isMy?C.green:C.muted }}>{votes[i]}</div>
                      <div style={{ fontSize:8, color:C.muted }}>Stimmen</div>
                    </div>
                  </div>
                  {isMy&&<div style={{ position:"absolute", top:6, right:6, background:C.green, color:"#fff", borderRadius:5, padding:"2px 7px", fontSize:8, fontWeight:700 }}>Deine Wahl ✓</div>}
                </div>
              );
            })}
          </div>
          <Btn onClick={()=>setStep(3)}>⚡ Alle haben abgestimmt → Ergebnis</Btn>
        </>}

        {/* Step 3 – Ergebnis */}
        {step===3&&<>
          <div style={{ textAlign:"center", marginBottom:14 }}>
            <div style={{ fontSize:28, marginBottom:6 }}>🏆</div>
            <div style={{ fontSize:18, fontWeight:800, color:C.dark }}>Café Central gewinnt!</div>
            <div style={{ fontSize:12, color:C.muted, marginTop:3 }}>3 von {pax} Stimmen · Gruppe entschieden</div>
          </div>
          <div style={{ background:C.green, borderRadius:16, padding:16, marginBottom:12 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
              <div style={{ width:44, height:44, borderRadius:12, background:"#8B5CF622", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>☕</div>
              <div>
                <div style={{ fontSize:15, fontWeight:800, color:"#fff" }}>Café Central</div>
                <div style={{ fontSize:11, color:"rgba(255,255,255,.8)" }}>Café · Mitte · 4.7★</div>
              </div>
              <div style={{ marginLeft:"auto", background:"rgba(255,255,255,.2)", borderRadius:6, padding:"3px 9px", fontSize:10, color:"#fff", fontWeight:700 }}>2× Punkte!</div>
            </div>
            {[["Café Central",3,75,true],["Bar Roma",1,25,false],["Bäckerei",0,0,false]].map(([n,v,pct,win])=>(
              <div key={n} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5 }}>
                <div style={{ fontSize:10, color:win?"rgba(255,255,255,.9)":"rgba(255,255,255,.5)", width:70, flexShrink:0 }}>{n}</div>
                <div style={{ flex:1, background:"rgba(255,255,255,.15)", borderRadius:4, height:6 }}><div style={{ background:win?"#fff":"rgba(255,255,255,.3)", height:6, borderRadius:4, width:`${pct}%` }}/></div>
                <div style={{ fontSize:10, fontWeight:700, color:win?"#fff":"rgba(255,255,255,.5)", width:16, textAlign:"right" }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ display:"flex", gap:8, marginBottom:10 }}>
            <Btn onClick={()=>goTo("checkin")} style={{ flex:2 }}>⬛ QR scannen & Punkt sichern</Btn>
            <button style={{ flex:1, padding:12, background:C.bg, color:C.dark, border:`1px solid ${C.border}`, borderRadius:10, fontSize:12, fontWeight:700, cursor:"pointer" }}>📍 Route</button>
          </div>
          <div style={{ background:C.mint, borderRadius:12, padding:"10px 12px", display:"flex", gap:8, alignItems:"center" }}>
            <span style={{ fontSize:16 }}>⭐</span>
            <div style={{ fontSize:12, fontWeight:600, color:C.green }}>Heute 2× Punkte bei Café Central! QR-Code nach dem Essen scannen.</div>
          </div>
          <button onClick={()=>{setStep(0);setVotes([3,1,0]);setMyVote(0);}} style={{ width:"100%", padding:10, background:"transparent", color:C.green, border:`1px solid ${C.green}`, borderRadius:10, fontSize:12, fontWeight:700, cursor:"pointer", marginTop:10 }}>
            Neue Abstimmung starten
          </button>
        </>}
      </div>
    </Screen>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SCAN-FLOW – Bon + Reward + Bar/Karte/App
// ═══════════════════════════════════════════════════════════════════
function ScanFlowScreen({ goTo }) {
  const [view, setView] = useState("intro"); // intro|kellner|gast
  const [kStep, setKStep] = useState(0);
  const [gStep, setGStep] = useState(0);
  const [betrag, setBetrag] = useState("28.50");
  const [timer, setTimer] = useState(60);
  const [pay, setPay] = useState(null);
  const [rewardChoice, setRewardChoice] = useState(null);

  const startTimer = () => {
    setTimer(60);
    const t = setInterval(()=>setTimer(p=>{if(p<=1){clearInterval(t);return 0;}return p-1;}),1000);
  };

  if(view==="intro") return (
    <Screen bg={C.bg} pad={false}>
      <div style={{ background:C.darkGreen, padding:"20px 24px 20px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
          <BackBtn onClick={()=>goTo("checkin")} dark />
          <Logo size={22} light />
        </div>
        <div style={{ fontSize:16, fontWeight:800, color:"#fff" }}>QR Scan · Bezahl-Flow</div>
        <div style={{ fontSize:12, color:"rgba(255,255,255,.6)", marginTop:2 }}>Bon scannen · Reward einlösen · Bar, Karte oder App</div>
      </div>
      <div style={{ padding:"16px 24px" }}>
        <div style={{ fontSize:13, fontWeight:700, color:C.dark, marginBottom:12 }}>So läuft es ab</div>
        {[
          {n:"1",icon:"🧾",color:C.green,   t:"Bon-Barcode scannen",    s:"Betrag automatisch übernommen · kein doppeltes Eintippen"},
          {n:"2",icon:"⚡",color:"#0B6B8A", t:"Tisch aktivieren",        s:"1 Tippen · QR-Aufsteller wird 15 Min. aktiv"},
          {n:"3",icon:"📱",color:C.purple,  t:"Gast scannt Aufsteller",  s:"Reward wird erkannt · Zahlungsart wählen"},
          {n:"4",icon:"🎁",color:C.orange,  t:"Reward einlösen",         s:"Bar · Karte · App – jeder zahlt selbst"},
          {n:"5",icon:"✓", color:C.fresh,   t:"Stempel gutgeschrieben",  s:"Sammelkarte automatisch aktualisiert"},
        ].map((s,i,a)=>(
          <div key={i} style={{ display:"flex", gap:12, marginBottom:i<a.length-1?10:0 }}>
            <div style={{ width:28, height:28, borderRadius:"50%", background:s.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, color:"#fff", flexShrink:0 }}>{s.n}</div>
            <div style={{ background:C.white, borderRadius:10, padding:"9px 12px", flex:1, border:`1px solid ${C.border}` }}>
              <div style={{ fontSize:12, fontWeight:700, color:C.dark }}>{s.icon} {s.t}</div>
              <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{s.s}</div>
            </div>
          </div>
        ))}
        <div style={{ display:"flex", gap:8, marginTop:14 }}>
          <Btn onClick={()=>{setView("kellner");setKStep(0);}} style={{ flex:1 }}>👨‍🍳 Kellner</Btn>
          <Btn variant="secondary" onClick={()=>{setView("gast");setGStep(0);}} style={{ flex:1 }}>😊 Gast</Btn>
        </div>
      </div>
    </Screen>
  );

  if(view==="kellner") return (
    <Screen bg={C.white} pad={false}>
      <div style={{ background:C.darkGreen, padding:"20px 24px 16px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
          <BackBtn onClick={()=>setView("intro")} dark/>
          <Logo size={20} light/>
        </div>
        <div style={{ display:"flex", gap:3 }}>
          {["Betrag","QR","Reward?","Fertig"].map((l,i)=>(
            <div key={l} style={{ flex:1 }}>
              <div style={{ height:3, borderRadius:99, background:i<=kStep?C.fresh:"rgba(255,255,255,.2)", marginBottom:3 }}/>
              <div style={{ fontSize:7, color:i===kStep?C.fresh:"rgba(255,255,255,.4)" }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding:"16px 24px" }}>
        {kStep===0&&<>
          <div style={{ fontSize:14, fontWeight:700, color:C.dark, marginBottom:4 }}>Bon-Barcode scannen</div>
          <div style={{ fontSize:12, color:C.muted, marginBottom:14 }}>Kein manuelles Eintippen</div>
          <div style={{ background:C.bg, borderRadius:16, padding:20, textAlign:"center", marginBottom:14 }}>
            <div style={{ fontSize:36, marginBottom:6 }}>📷</div>
            <div style={{ fontSize:12, color:C.muted }}>Barcode-Scanner aktiv</div>
            <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:14, padding:14, marginTop:12 }}>
              <div style={{ fontSize:11, color:C.muted, marginBottom:6 }}>Café Central · Tisch 5</div>
              <svg width="100%" height="28" viewBox="0 0 130 28">
                {[2,4,5,7,9,10,12,14,15,17,19,20,22,24,25,27,29,31,32,34,36,37,39,41,42,44,46,47,49,51,52,54,56,57,59,61,62,64,66,67,69,71,72,74,76,77,79,81,82,84,86,87,89,91,92,94,96,97,99,101,102,104,106,107,109,111,112,114,116,118].map((x,i)=>(
                  <rect key={i} x={x} y="2" width={i%3===0?2:1} height="20" fill="#111"/>
                ))}
                <text x="65" y="27" textAnchor="middle" fontSize="5" fill="#888">28504719382</text>
              </svg>
            </div>
          </div>
          <Card style={{ marginBottom:14 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ fontSize:12, color:C.muted }}>Erkannter Betrag</div>
              <div style={{ fontSize:22, fontWeight:800, color:C.dark }}>€{betrag}</div>
            </div>
            <div style={{ fontSize:11, color:C.green, fontWeight:600, marginTop:4 }}>✓ Stempel berechtigt (mind. 10€)</div>
          </Card>
          <Btn onClick={()=>setKStep(1)}>QR-Code generieren →</Btn>
        </>}
        {kStep===1&&<>
          <div style={{ textAlign:"center", marginBottom:12 }}>
            <div style={{ fontSize:14, fontWeight:700, color:C.dark }}>QR-Code dem Gast zeigen</div>
            <div style={{ background:timer>20?C.mint:timer>10?"#FFF3E8":"#FEE2E2", borderRadius:99, padding:"4px 12px", fontSize:12, fontWeight:700, color:timer>20?C.green:timer>10?C.orange:C.red, display:"inline-block", marginTop:6 }}>⏱ {timer}s</div>
          </div>
          <div style={{ background:C.white, border:`2px solid ${C.green}`, borderRadius:16, padding:20, textAlign:"center", marginBottom:14, boxShadow:`0 4px 16px ${C.green}20` }}>
            <svg width="130" height="130" viewBox="0 0 140 140">
              <rect width="140" height="140" fill="#fff"/>
              <rect x="8" y="8" width="40" height="40" rx="6" fill={C.green}/><rect x="13" y="13" width="30" height="30" rx="4" fill="#fff"/><rect x="17" y="17" width="22" height="22" rx="2" fill={C.green}/>
              <rect x="92" y="8" width="40" height="40" rx="6" fill={C.green}/><rect x="97" y="13" width="30" height="30" rx="4" fill="#fff"/><rect x="101" y="17" width="22" height="22" rx="2" fill={C.green}/>
              <rect x="8" y="92" width="40" height="40" rx="6" fill={C.green}/><rect x="13" y="97" width="30" height="30" rx="4" fill="#fff"/><rect x="17" y="101" width="22" height="22" rx="2" fill={C.green}/>
              <rect x="56" y="8" width="8" height="8" fill={C.green}/><rect x="68" y="8" width="8" height="8" fill={C.green}/>
              <rect x="56" y="56" width="28" height="28" rx="4" fill={C.green}/><rect x="60" y="60" width="20" height="20" rx="2" fill="#fff"/><rect x="64" y="64" width="12" height="12" rx="1" fill={C.green}/>
              <rect x="92" y="56" width="8" height="8" fill={C.green}/><rect x="92" y="80" width="40" height="8" fill={C.green}/>
            </svg>
            <div style={{ fontSize:11, fontWeight:700, color:C.green, marginTop:8 }}>myspot · €{betrag} · Café Central</div>
          </div>
          <Btn onClick={()=>setKStep(2)}>📱 Gast hat gescannt (simulieren)</Btn>
        </>}
        {kStep===2&&<>
          <div style={{ background:"#FFF7ED", border:`2px solid ${C.orange}`, borderRadius:14, padding:14, marginBottom:14, textAlign:"center" }}>
            <div style={{ fontSize:24, marginBottom:6 }}>🎁</div>
            <div style={{ fontSize:14, fontWeight:800, color:C.dark }}>Gast löst Reward ein!</div>
            <div style={{ fontSize:12, color:C.muted, marginTop:4 }}>Gratis-Kaffee · Wert: 3.50€</div>
          </div>
          <Card style={{ marginBottom:14 }}>
            {[["Originalbetrag",`€${betrag}`,"#111"],["Gratis-Kaffee","− €3.50",C.red],["Neuer Betrag","€25.00",C.green]].map(([l,v,c],i,a)=>(
              <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:i<a.length-1?`1px solid ${C.border}`:"none" }}>
                <div style={{ fontSize:12, color:C.muted }}>{l}</div>
                <div style={{ fontSize:i===2?16:12, fontWeight:i===2?800:400, color:c }}>{v}</div>
              </div>
            ))}
          </Card>
          <div style={{ display:"flex", gap:8 }}>
            <Btn onClick={()=>setKStep(3)} style={{ flex:2 }}>✓ Bestätigen · €25.00</Btn>
            <button style={{ flex:1, padding:12, background:C.bg, color:C.red, border:`1px solid ${C.border}`, borderRadius:10, fontSize:12, fontWeight:700, cursor:"pointer" }}>✗</button>
          </div>
        </>}
        {kStep===3&&<>
          <div style={{ textAlign:"center", padding:"20px 0" }}>
            <div style={{ width:56, height:56, borderRadius:"50%", background:C.mint, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 10px", fontSize:24 }}>✓</div>
            <div style={{ fontSize:15, fontWeight:800, color:C.green }}>Reward bestätigt!</div>
            <div style={{ fontSize:12, color:C.muted, marginTop:4 }}>Stempel + Reward verbucht</div>
          </div>
          <Card style={{ marginBottom:14 }}>
            {[["Gast","@lisa_stgt"],["Reward","Gratis-Kaffee"],["Neuer Bon","€25.00"],["Stempel","+1"],["Zeit","19:42"]].map(([k,v],i,a)=>(
              <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:i<a.length-1?`1px solid ${C.border}`:"none" }}>
                <div style={{ fontSize:11, color:C.muted }}>{k}</div>
                <div style={{ fontSize:11, fontWeight:700, color:k==="Stempel"||k==="Neuer Bon"?C.green:C.dark }}>{v}</div>
              </div>
            ))}
          </Card>
          <Btn onClick={()=>{setKStep(0);setBetrag("28.50");}}>Nächsten Gast bedienen</Btn>
        </>}
      </div>
    </Screen>
  );

  // Gast-Seite
  return (
    <Screen bg={C.darkGreen} pad={false}>
      <div style={{ background:C.darkGreen, padding:"20px 24px 16px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
          <BackBtn onClick={()=>setView("intro")} dark/>
          <Logo size={20} light/>
        </div>
        <div style={{ display:"flex", gap:3 }}>
          {["Scannen","Reward","Zahlen","Fertig"].map((l,i)=>(
            <div key={l} style={{ flex:1 }}>
              <div style={{ height:3, borderRadius:99, background:i<=gStep?C.fresh:"rgba(255,255,255,.2)", marginBottom:3 }}/>
              <div style={{ fontSize:7, color:i===gStep?C.fresh:"rgba(255,255,255,.4)" }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding:"16px 24px", background:C.bg, minHeight:400 }}>
        {gStep===0&&<>
          <div style={{ textAlign:"center", marginBottom:14 }}>
            <div style={{ fontSize:14, fontWeight:700, color:C.dark }}>QR-Code scannen</div>
            <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>Halte die Kamera auf den Aufsteller am Tisch</div>
          </div>
          <div style={{ background:C.dark, borderRadius:16, padding:20, marginBottom:14 }}>
            <div style={{ width:150, height:150, border:`2px solid ${C.green}`, borderRadius:14, margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"center", position:"relative" }}>
              {["tl","tr","bl","br"].map(c=>(
                <div key={c} style={{ position:"absolute",[c.includes("t")?"top":"bottom"]:-2,[c.includes("l")?"left":"right"]:-2,width:16,height:16,borderTop:c.includes("t")?`2.5px solid ${C.green}`:"none",borderBottom:c.includes("b")?`2.5px solid ${C.green}`:"none",borderLeft:c.includes("l")?`2.5px solid ${C.green}`:"none",borderRight:c.includes("r")?`2.5px solid ${C.green}`:"none",borderRadius:c==="tl"?"4px 0 0 0":c==="tr"?"0 4px 0 0":c==="bl"?"0 0 0 4px":"0 0 4px 0"}}/>
              ))}
              <div style={{ textAlign:"center" }}><div style={{ fontSize:36 }}>📷</div><div style={{ fontSize:9, color:"rgba(255,255,255,.5)", marginTop:4 }}>Kamera aktiv</div></div>
            </div>
          </div>
          {pay===null&&<>
            <div style={{ background:"#FFF7ED", border:`1px solid ${C.orange}22`, borderRadius:10, padding:"9px 12px", marginBottom:12, display:"flex", gap:8 }}>
              <span style={{ fontSize:16 }}>🎁</span>
              <div style={{ fontSize:12, fontWeight:600, color:C.orange }}>Reward verfügbar! Gratis-Kaffee bereit zum Einlösen</div>
            </div>
          </>}
          <Btn onClick={()=>setGStep(1)}>📷 Code scannen (simulieren)</Btn>
        </>}
        {gStep===1&&<>
          <div style={{ textAlign:"center", marginBottom:14 }}>
            <div style={{ width:52, height:52, borderRadius:"50%", background:"#FFF7ED", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 8px", fontSize:24 }}>🎁</div>
            <div style={{ fontSize:15, fontWeight:800, color:C.dark }}>Reward erkannt!</div>
            <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>Café Central · €28.50 · Stempel 5</div>
          </div>
          <Card style={{ marginBottom:12 }}>
            {[["Dein Anteil","€28.50","#111"],["Gratis-Kaffee","− €3.50",C.orange],["Du zahlst","€25.00",C.green]].map(([l,v,col],i,a)=>(
              <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:i<a.length-1?`1px solid ${C.border}`:"none" }}>
                <div style={{ fontSize:12, color:C.muted }}>{l}</div>
                <div style={{ fontSize:i===2?16:12, fontWeight:i===2?800:400, color:col }}>{v}</div>
              </div>
            ))}
          </Card>
          <button onClick={()=>setGStep(2)} style={{ width:"100%", padding:13, background:C.orange, color:"#fff", border:"none", borderRadius:10, fontSize:13, fontWeight:700, cursor:"pointer", marginBottom:8 }}>
            🎁 Jetzt einlösen (Kaffee vom Bon abziehen)
          </button>
          <button onClick={()=>setGStep(2)} style={{ width:"100%", padding:11, background:C.bg, color:C.muted, border:`1px solid ${C.border}`, borderRadius:10, fontSize:12, cursor:"pointer" }}>
            Reward aufsparen · €28.50 zahlen
          </button>
        </>}
        {gStep===2&&<>
          <div style={{ fontSize:14, fontWeight:700, color:C.dark, marginBottom:4 }}>Wie zahlst du?</div>
          <div style={{ fontSize:12, color:C.muted, marginBottom:14 }}>Wähle deine Zahlungsart</div>
          {[{id:"bar",icon:"💶",label:"Bar",sub:"Beim Kellner · er kassiert €25.00"},{id:"karte",icon:"💳",label:"Karte",sub:"Kellner-Terminal · €25.00"},{id:"app",icon:"📱",label:"Apple/Google Pay",sub:"Direkt in der App · €25.00"}].map(o=>(
            <div key={o.id} onClick={()=>setPay(o.id)} style={{ display:"flex", gap:10, background:pay===o.id?C.mint:C.white, border:`1.5px solid ${pay===o.id?C.green:C.border}`, borderRadius:12, padding:"11px 14px", marginBottom:8, cursor:"pointer" }}>
              <span style={{ fontSize:20 }}>{o.icon}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:700, color:C.dark }}>{o.label}</div>
                <div style={{ fontSize:11, color:C.muted }}>{o.sub}</div>
              </div>
              {pay===o.id&&<span style={{ color:C.green, fontWeight:700 }}>✓</span>}
            </div>
          ))}
          {pay&&<Btn onClick={()=>setGStep(3)} style={{ marginTop:4 }}>Bestätigen →</Btn>}
        </>}
        {gStep===3&&<>
          <div style={{ background:C.green, borderRadius:16, padding:16, marginBottom:12, textAlign:"center" }}>
            <div style={{ fontSize:20, fontWeight:800, color:"#fff", marginBottom:8 }}>Alles erledigt! 🎉</div>
            <div style={{ display:"flex", justifyContent:"center", gap:10 }}>
              {[["€25.00","finaler Bon"],["+1","Stempel"],["🎁","Reward"]].map(([v,l],i,a)=>(
                <div key={l} style={{ textAlign:"center", paddingRight:i<a.length-1?10:0, borderRight:i<a.length-1?"1px solid rgba(255,255,255,.2)":"none" }}>
                  <div style={{ fontSize:15, fontWeight:800, color:l==="Reward"?C.gold:"#fff" }}>{v}</div>
                  <div style={{ fontSize:9, color:"rgba(255,255,255,.7)" }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
          <Card style={{ marginBottom:12 }}>
            <div style={{ fontSize:12, fontWeight:700, color:C.dark, marginBottom:8 }}>Sammelkarte aktualisiert</div>
            <div style={{ display:"flex", gap:3, marginBottom:5 }}>
              {Array.from({length:10}).map((_,i)=>(
                <div key={i} style={{ flex:1, height:8, borderRadius:3, background:i<6?C.green:C.border, position:"relative" }}>
                  {i===5&&<div style={{ position:"absolute", top:-4, right:-2, width:9, height:9, borderRadius:"50%", background:C.red, display:"flex", alignItems:"center", justifyContent:"center", fontSize:5, color:"#fff", fontWeight:700 }}>+1</div>}
                </div>
              ))}
            </div>
            <div style={{ fontSize:11, color:C.muted }}>6 von 10 · Noch 4 bis: Gratis-Kaffee ☕</div>
          </Card>
          <Btn onClick={()=>{setGStep(0);setView("intro");setPay(null);}}>Zurück zur Übersicht</Btn>
        </>}
      </div>
    </Screen>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ADMIN DASHBOARD
// ═══════════════════════════════════════════════════════════════════
const ADMIN_HAENDLER = [
  { id:0, name:"Café Central",    plan:"Pro",     mrr:249, scans:96,  follower:382, wiederkehrer:68, aktiv:true,  trend:"+18%" },
  { id:1, name:"Bar Roma",        plan:"Growth",  mrr:149, scans:71,  follower:248, wiederkehrer:54, aktiv:true,  trend:"+12%" },
  { id:2, name:"Bäckerei Katz",   plan:"Growth",  mrr:149, scans:58,  follower:156, wiederkehrer:61, aktiv:true,  trend:"+9%"  },
  { id:3, name:"Pizzeria Verde",  plan:"Starter", mrr:79,  scans:29,  follower:94,  wiederkehrer:41, aktiv:true,  trend:"+5%"  },
  { id:4, name:"Matcha House",    plan:"Starter", mrr:79,  scans:12,  follower:31,  wiederkehrer:28, aktiv:false, trend:"-2%"  },
];

function AdminDashboardScreen({ goTo }) {
  const { user, session } = useAuth();
  const { refresh } = useSpots();
  const isAdmin = isAppAdminAccess(user, session);
  const [tab, setTab] = useState("overview");
  const [sel, setSel] = useState(null);
  const [pendingSpots, setPendingSpots] = useState([]);
  const [pendingErr, setPendingErr] = useState(null);
  const [pendingBusy, setPendingBusy] = useState(false);

  const reloadPending = useCallback(async () => {
    if (!isAdmin) return;
    setPendingErr(null);
    try {
      setPendingSpots(await loadPendingSpotsForAdmin());
    } catch (e) {
      setPendingErr(e?.message ?? String(e));
    }
  }, [isAdmin]);

  useEffect(() => {
    if (tab === "freigaben" && isAdmin) reloadPending();
  }, [tab, isAdmin, reloadPending]);

  const setApproval = async (spotId, status) => {
    setPendingBusy(true);
    setPendingErr(null);
    try {
      await adminSetSpotApproval(spotId, status);
      await reloadPending();
      await refresh();
    } catch (e) {
      setPendingErr(e?.message ?? String(e));
    } finally {
      setPendingBusy(false);
    }
  };

  const adminTabs = isAdmin
    ? [
        ["overview", "Übersicht"],
        ["freigaben", "Freigaben"],
        ["haendler", "Händler"],
        ["finanzen", "Finanzen"],
      ]
    : [
        ["overview", "Übersicht"],
        ["haendler", "Händler"],
        ["finanzen", "Finanzen"],
      ];
  const totalMRR = ADMIN_HAENDLER.reduce((a,h)=>a+h.mrr,0);
  const active = ADMIN_HAENDLER.filter(h=>h.aktiv).length;
  const totalScans = ADMIN_HAENDLER.reduce((a,h)=>a+h.scans,0);

  return (
    <Screen bg={C.bg} pad={false}>
      <div style={{ background:C.darkGreen, padding:"20px 24px 16px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
          {goTo ? (
            <button type="button" onClick={() => goTo("home")} style={{ background:"rgba(255,255,255,.12)", border:"none", borderRadius:8, padding:"6px 10px", fontSize:11, fontWeight:600, color:"#fff", cursor:"pointer" }}>← App</button>
          ) : (
            <div style={{ width:56 }} />
          )}
          <Logo size={22} light />
          <div style={{ background:"rgba(255,255,255,.15)", borderRadius:7, padding:"4px 10px", fontSize:10, fontWeight:700, color:"#fff" }}>🔐 Admin</div>
        </div>
        <div style={{ fontSize:16, fontWeight:800, color:"#fff" }}>Admin-Dashboard</div>
        <div style={{ fontSize:11, color:"rgba(255,255,255,.6)", marginTop:2 }}>Stuttgart Pilot · Phase 1</div>
        <div style={{ display:"flex", gap:4, marginTop:12, flexWrap:"wrap" }}>
          {adminTabs.map(([id,lb])=>(
            <button key={id} onClick={()=>setTab(id)} style={{ background:tab===id?C.green:"rgba(255,255,255,.12)", color:"#fff", border:"none", borderRadius:99, padding:"5px 12px", fontSize:11, fontWeight:tab===id?700:400, cursor:"pointer" }}>{lb}</button>
          ))}
        </div>
      </div>

      <div style={{ padding:"14px 20px" }}>
        {/* SPOT-FREIGABEN */}
        {tab==="freigaben"&&<>
          {!isAdmin ? (
            <Card><div style={{ fontSize:13, color:C.muted }}>Kein Admin-Zugriff. In Supabase beim User <code style={{ fontSize:11 }}>user_metadata.is_admin</code> auf <code style={{ fontSize:11 }}>true</code> setzen, neu anmelden.</div></Card>
          ) : (
            <>
              {pendingErr && <div style={{ background:"#FEE2E2", color:"#991B1B", borderRadius:10, padding:"10px 12px", fontSize:12, marginBottom:10 }}>{pendingErr}</div>}
              <div style={{ fontSize:13, fontWeight:700, color:C.dark, marginBottom:10 }}>Ausstehende Spots ({pendingSpots.length})</div>
              {pendingSpots.length === 0 ? (
                <Card><div style={{ fontSize:12, color:C.muted }}>Keine Entwürfe zur Freigabe.</div></Card>
              ) : (
                pendingSpots.map((sp) => (
                  <Card key={sp.id} style={{ marginBottom:8 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:10 }}>
                      <div>
                        <div style={{ fontSize:14, fontWeight:700, color:C.dark }}>{sp.emoji} {sp.name}</div>
                        <div style={{ fontSize:11, color:C.muted, marginTop:4 }}>{sp.cat} · Owner {sp.ownerId?.slice(0, 8) ?? "?"}…</div>
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:8, marginTop:12 }}>
                      <button type="button" disabled={pendingBusy} onClick={() => setApproval(sp.id, "approved")} style={{ flex:1, padding:10, background:C.green, color:"#fff", border:"none", borderRadius:10, fontSize:12, fontWeight:700, cursor: pendingBusy ? "wait" : "pointer", opacity: pendingBusy ? 0.7 : 1 }}>Freigeben</button>
                      <button type="button" disabled={pendingBusy} onClick={() => setApproval(sp.id, "rejected")} style={{ flex:1, padding:10, background:C.bg, color:C.red, border:`1.5px solid ${C.border}`, borderRadius:10, fontSize:12, fontWeight:700, cursor: pendingBusy ? "wait" : "pointer" }}>Ablehnen</button>
                    </div>
                  </Card>
                ))
              )}
            </>
          )}
        </>}

        {/* OVERVIEW */}
        {tab==="overview"&&<>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12 }}>
            {[[`${totalMRR}€`,"MRR","💰"],[active,"Aktive Händler","🏪"],[totalScans,"QR-Scans","⬛"],["0%","Churn","📈"]].map(([n,l,ic])=>(
              <Card key={l} style={{ padding:12 }}>
                <div style={{ fontSize:16, marginBottom:4 }}>{ic}</div>
                <div style={{ fontSize:20, fontWeight:800, color:C.dark }}>{n}</div>
                <div style={{ fontSize:10, color:C.muted }}>{l}</div>
              </Card>
            ))}
          </div>
          <Card style={{ marginBottom:10, border:`1px solid ${C.green}22` }}>
            <div style={{ fontSize:12, fontWeight:700, color:C.dark, marginBottom:8 }}>💡 Handlungsbedarf</div>
            {[
              { type:"warn", icon:"📉", msg:"Matcha House · Scans −2% · seit 5 Tagen inaktiv", cta:"Kontaktieren" },
              { type:"info", icon:"🚀", msg:"Café Central · beste Performance · als Referenz nutzen", cta:"Case Study" },
              { type:"info", icon:"💡", msg:"Bar Roma · Upgrade auf Pro empfohlen · hohe Aktivität", cta:"Angebot" },
            ].map((a,i)=>(
              <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 0", borderBottom:i<2?`1px solid ${C.border}`:"none" }}>
                <div style={{ width:32, height:32, borderRadius:8, background:a.type==="warn"?"#FEE2E2":C.mint, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0 }}>{a.icon}</div>
                <div style={{ flex:1, fontSize:10, color:C.mid, lineHeight:1.4 }}>{a.msg}</div>
                <div style={{ background:a.type==="warn"?"#FEE2E2":C.mint, color:a.type==="warn"?C.red:C.green, borderRadius:6, padding:"2px 8px", fontSize:9, fontWeight:700, cursor:"pointer", flexShrink:0 }}>{a.cta}</div>
              </div>
            ))}
          </Card>
          {/* MRR Breakdown */}
          <Card>
            <div style={{ fontSize:12, fontWeight:700, color:C.dark, marginBottom:10 }}>MRR nach Plan</div>
            {[{plan:"Pro (249€)",count:1,mrr:249,pct:35,color:C.green},{plan:"Growth (149€)",count:2,mrr:298,pct:42,color:"#0B6B8A"},{plan:"Starter (79€)",count:2,mrr:158,pct:23,color:C.orange}].map(p=>(
              <div key={p.plan} style={{ marginBottom:8 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                  <div style={{ fontSize:11, color:C.muted }}>{p.plan} · {p.count} Händler</div>
                  <div style={{ fontSize:11, fontWeight:700, color:C.dark }}>{p.mrr}€</div>
                </div>
                <div style={{ background:C.bg, borderRadius:99, height:6 }}><div style={{ background:p.color, height:6, borderRadius:99, width:`${p.pct}%` }}/></div>
              </div>
            ))}
            <div style={{ background:C.mint, borderRadius:8, padding:"7px 10px", marginTop:8, display:"flex", justifyContent:"space-between" }}>
              <div style={{ fontSize:11, fontWeight:700, color:C.green }}>ARR Hochrechnung</div>
              <div style={{ fontSize:13, fontWeight:800, color:C.green }}>{totalMRR*12}€</div>
            </div>
          </Card>
        </>}

        {/* HÄNDLER */}
        {tab==="haendler"&&<>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <div style={{ fontSize:13, fontWeight:700, color:C.dark }}>{ADMIN_HAENDLER.length} Händler · Stuttgart</div>
            <Tag>+ Händler</Tag>
          </div>
          {ADMIN_HAENDLER.map(h=>(
            <Card key={h.id} style={{ marginBottom:8, border:`1px solid ${sel===h.id?C.green:C.border}` }} onClick={()=>setSel(sel===h.id?null:h.id)}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:sel===h.id?10:0 }}>
                <div style={{ width:36, height:36, borderRadius:10, background:h.aktiv?C.mint:C.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>
                  {h.name.includes("Café")?"☕":h.name.includes("Bar")?"🍹":h.name.includes("Bäck")?"🥐":h.name.includes("Pizza")?"🍕":"🍵"}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", justifyContent:"space-between" }}>
                    <div style={{ fontSize:13, fontWeight:700, color:C.dark }}>{h.name}</div>
                    <div style={{ fontSize:12, fontWeight:700, color:C.green }}>{h.mrr}€/Mo</div>
                  </div>
                  <div style={{ display:"flex", gap:5, marginTop:3 }}>
                    <Tag color={C.green} bg={C.mint}>{h.plan}</Tag>
                    <Tag color={h.aktiv?C.green:C.red} bg={h.aktiv?"#E8F5EE":"#FEE2E2"}>{h.aktiv?"Aktiv":"Inaktiv"}</Tag>
                    <div style={{ fontSize:10, color:h.trend.startsWith("+")?C.green:C.red, fontWeight:600, marginLeft:"auto" }}>{h.trend}</div>
                  </div>
                </div>
              </div>
              {sel===h.id&&(
                <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:10 }}>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:6, marginBottom:10 }}>
                    {[[h.scans,"Scans"],[h.follower,"Follower"],[`${h.wiederkehrer}%`,"Wiederkehrer"]].map(([v,l])=>(
                      <div key={l} style={{ background:C.bg, borderRadius:8, padding:"7px", textAlign:"center" }}>
                        <div style={{ fontSize:15, fontWeight:800, color:C.dark }}>{v}</div>
                        <div style={{ fontSize:9, color:C.muted }}>{l}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display:"flex", gap:6 }}>
                    <button style={{ flex:1, padding:8, background:C.green, color:"#fff", border:"none", borderRadius:8, fontSize:10, fontWeight:700, cursor:"pointer" }}>Nachricht</button>
                    <button style={{ flex:1, padding:8, background:C.bg, color:C.dark, border:`1px solid ${C.border}`, borderRadius:8, fontSize:10, fontWeight:700, cursor:"pointer" }}>Upgrade</button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </>}

        {/* FINANZEN */}
        {tab==="finanzen"&&<>
          <div style={{ background:C.darkGreen, borderRadius:14, padding:16, marginBottom:12, textAlign:"center" }}>
            <div style={{ fontSize:10, color:"rgba(255,255,255,.6)", marginBottom:4 }}>MRR · Februar 2025</div>
            <div style={{ fontSize:36, fontWeight:900, color:"#fff", letterSpacing:-1 }}>{totalMRR}€</div>
            <div style={{ fontSize:11, color:C.fresh, marginTop:4 }}>↑ +14% zum Vormonat</div>
            <div style={{ display:"flex", justifyContent:"center", gap:16, marginTop:12 }}>
              {[[`${totalMRR*12}€`,"ARR"],["0%","Churn"],[`${Math.round(totalMRR/active)}€`,"Ø ARPU"]].map(([v,l],i,a)=>(
                <div key={l} style={{ textAlign:"center", paddingRight:i<a.length-1?16:0, borderRight:i<a.length-1?"1px solid rgba(255,255,255,.15)":"none" }}>
                  <div style={{ fontSize:16, fontWeight:800, color:"#fff" }}>{v}</div>
                  <div style={{ fontSize:9, color:"rgba(255,255,255,.5)" }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
          {/* MRR bars */}
          <Card>
            <div style={{ fontSize:12, fontWeight:700, color:C.dark, marginBottom:10 }}>Umsatz pro Händler</div>
            {ADMIN_HAENDLER.map(h=>(
              <div key={h.id} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                <div style={{ fontSize:11, color:C.muted, width:90, flexShrink:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{h.name.split(" ")[0]}</div>
                <div style={{ flex:1, background:C.bg, borderRadius:4, height:7 }}><div style={{ background:h.aktiv?C.green:"#ccc", height:7, borderRadius:4, width:`${(h.mrr/249)*100}%` }}/></div>
                <div style={{ fontSize:11, fontWeight:700, color:h.aktiv?C.green:C.muted, width:42, textAlign:"right" }}>{h.mrr}€</div>
              </div>
            ))}
          </Card>
          {/* Roadmap */}
          <Card style={{ marginTop:10 }}>
            <div style={{ fontSize:12, fontWeight:700, color:C.dark, marginBottom:8 }}>Wachstums-Ziele</div>
            {[["Aktive Händler",active,20],["MRR",totalMRR,2000],["Follower gesamt",911,5000]].map(g=>(
              <div key={g[0]} style={{ marginBottom:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                  <div style={{ fontSize:11, color:C.muted }}>{g[0]}</div>
                  <div style={{ fontSize:11, color:C.dark }}><b style={{ color:C.green }}>{g[1]}</b> / {g[2]}</div>
                </div>
                <ProgressBar value={g[1]} max={g[2]} height={6}/>
                <div style={{ fontSize:9, color:C.muted, marginTop:2 }}>{Math.round((g[1]/g[2])*100)}% erreicht</div>
              </div>
            ))}
          </Card>
        </>}
      </div>
    </Screen>
  );
}

function NavBar({ screen, goTo }) {
  const items = [
    { id: "home",     icon: "🏠", label: "Home" },
    { id: "discover", icon: "🔍", label: "Spots" },
    { id: "wallet",   icon: "💳", label: "Karte" },
    { id: "profile",  icon: "🎁", label: "Rewards" },
    { id: "merchant", icon: "📊", label: "Händler" },
  ];
  const hideOn = ["checkin", "merchant", "onboarding", "campaign", "investor", "wallet", "spot", "card", "auth"];
  if (hideOn.includes(screen)) return null;
  const navActive = (id) => id === screen || (id === "profile" && screen === "settings");
  return (
    <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 390, background: "#fff", borderTop: `1.5px solid ${C.border}`, display: "flex", justifyContent: "space-around", padding: "6px 0 12px", zIndex: 100, boxShadow: "0 -3px 16px rgba(0,0,0,.07)" }}>
      {items.map(it => (
        <button key={it.id} onClick={() => goTo(it.id)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "3px 8px", minWidth: 44 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: navActive(it.id) ? C.mint : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "background .15s" }}>
            <span style={{ fontSize: 18 }}>{it.icon}</span>
          </div>
          <span style={{ fontSize: 9, fontWeight: navActive(it.id) ? 700 : 400, color: navActive(it.id) ? C.green : C.muted, letterSpacing: -0.1 }}>{it.label}</span>
        </button>
      ))}
    </div>
  );
}

/** Ohne Sitzung: Zugriff nur nach Login (wenn Supabase konfiguriert). */
const PROTECTED_SCREENS = new Set([
  "wallet",
  "profile",
  "settings",
  "checkin",
  "benachrichtigungen",
  "onboarding",
]);

// ═══════════════════════════════════════════════════════════════════
// LOGIN / REGISTRIERUNG (Supabase Auth)
// ═══════════════════════════════════════════════════════════════════
function GuestAuthScreen({ onSuccess, onCancel }) {
  const { signIn, signUp, needsAuth, loading: authLoading } = useAuth();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [busy, setBusy] = useState(false);

  if (needsAuth && authLoading) {
    return (
      <Screen bg={C.bg}>
        <div style={{ padding: 32, textAlign: "center", color: C.muted }}>Sitzung wird geladen …</div>
      </Screen>
    );
  }

  if (!needsAuth) {
    return (
      <Screen bg={C.bg} pad={false}>
        <div style={{ padding: 24 }}>
          <Logo size={28} />
          <p style={{ color: C.mid, marginTop: 16, lineHeight: 1.5 }}>
            Ohne <code style={{ fontSize: 12 }}>VITE_SUPABASE_URL</code> und Anon-Key läuft die App im reinen Demo-Modus – kein Login nötig.
          </p>
          <Btn onClick={onCancel} style={{ marginTop: 16 }}>Zur Startseite</Btn>
        </div>
      </Screen>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      if (mode === "login") {
        await signIn(email.trim(), password);
        setTimeout(() => onSuccess(), 0);
      } else {
        const { data } = await signUp(email.trim(), password);
        if (data?.session) setTimeout(() => onSuccess(), 0);
        else {
          setInfo(
            "Account angelegt. Bitte E-Mail bestätigen (falls in Supabase aktiviert) und danach anmelden."
          );
        }
      }
    } catch (err) {
      setError(err?.message ?? "Anmeldung fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen bg={C.bg} pad={false}>
      <div style={{ background: C.white, padding: "16px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 12 }}>
        <BackBtn onClick={onCancel} />
        <div style={{ fontSize: 17, fontWeight: 800, color: C.dark }}>{mode === "login" ? "Anmelden" : "Registrieren"}</div>
      </div>

      <div style={{ padding: "20px 24px" }}>
        <Logo size={26} />
        <p style={{ fontSize: 13, color: C.muted, marginTop: 12, lineHeight: 1.5 }}>
          Mit Supabase-Auth geschützte Bereiche: Wallet, Profil, Check-in, Benachrichtigungen, Konto – und Händler-Onboarding (Spot zur Freigabe anlegen).
        </p>

        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          {[
            ["login", "Anmelden"],
            ["register", "Registrieren"],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => { setMode(id); setError(null); setInfo(null); }}
              style={{
                flex: 1,
                padding: "10px 12px",
                borderRadius: 10,
                border: `1.5px solid ${mode === id ? C.green : C.border}`,
                background: mode === id ? C.mint : C.white,
                color: mode === id ? C.green : C.mid,
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={submit} style={{ marginTop: 18 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.mid, display: "block", marginBottom: 6 }}>E-Mail</label>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            required
            placeholder="du@beispiel.de"
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 10,
              border: `1.5px solid ${C.border}`,
              fontSize: 15,
              marginBottom: 14,
              boxSizing: "border-box",
            }}
          />
          <label style={{ fontSize: 12, fontWeight: 600, color: C.mid, display: "block", marginBottom: 6 }}>Passwort</label>
          <input
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
            required
            minLength={6}
            placeholder="min. 6 Zeichen"
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 10,
              border: `1.5px solid ${C.border}`,
              fontSize: 15,
              marginBottom: 14,
              boxSizing: "border-box",
            }}
          />

          {error && (
            <div style={{ background: "#FEE2E2", color: "#991B1B", borderRadius: 10, padding: "10px 12px", fontSize: 13, marginBottom: 12 }}>{error}</div>
          )}
          {info && (
            <div style={{ background: "#ECFDF5", color: C.dark, borderRadius: 10, padding: "10px 12px", fontSize: 13, marginBottom: 12, border: `1px solid ${C.border}` }}>{info}</div>
          )}

          <Btn type="submit" disabled={busy}>{busy ? "Bitte warten …" : mode === "login" ? "Anmelden" : "Konto anlegen"}</Btn>
        </form>
      </div>
    </Screen>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════
const SCREEN_LABELS = [
  { id: "home",      label: "Startseite" },
  { id: "checkin",   label: "Check-in" },
  { id: "wallet",    label: "Wallet" },
  { id: "discover",  label: "Entdecken" },
  { id: "profile",   label: "Meine Spots" },
  { id: "settings",  label: "Konto" },
  { id: "auth",      label: "Login" },
  { id: "merchant",  label: "Dashboard" },
  { id: "campaign",  label: "Kampagne" },
  { id: "onboarding",label: "Händler-Setup" },
  { id: "investor",  label: "📈 Investor" },
  { id: "card",      label: "💳 myspot Card" },
  { id: "onboarding-guest", label: "Anmeldung" },
  { id: "benachrichtigungen", label: "🔔 Nachrichten" },
  { id: "gruppe",    label: "Gruppe" },
  { id: "scanflow",  label: "Scan-Flow" },
  { id: "admin",     label: "🔐 Admin" },
];

export default function MySpot() {
  const [screen, setScreen] = useState("home");
  const [spotData, setSpotData] = useState(null);
  const { spots } = useSpots();
  const { user, loading: authLoading, needsAuth } = useAuth();
  const pendingNav = useRef({ screen: null, data: null });

  const resumeAfterAuth = useCallback(() => {
    const { screen: target, data } = pendingNav.current;
    pendingNav.current = { screen: null, data: null };
    setScreen(target ?? "home");
    if (data) setSpotData(data);
  }, []);

  const cancelAuth = useCallback(() => {
    pendingNav.current = { screen: null, data: null };
    setScreen("home");
  }, []);

  const goTo = useCallback(
    (s, data = null) => {
      if (s === "auth") {
        pendingNav.current = { screen: null, data: null };
        setScreen("auth");
        return;
      }
      if (needsAuth && !authLoading && !user && PROTECTED_SCREENS.has(s)) {
        pendingNav.current = { screen: s, data: data ?? null };
        setScreen("auth");
        return;
      }
      setScreen(s);
      if (data) setSpotData(data);
    },
    [needsAuth, authLoading, user]
  );

  useEffect(() => {
    if (!needsAuth || authLoading) return;
    if (user) return;
    if (screen === "auth") return;
    if (PROTECTED_SCREENS.has(screen)) setScreen("home");
  }, [user, authLoading, needsAuth, screen]);

  return (
    <div style={{ maxWidth: 390, margin: "0 auto", height: "100vh", overflow: "hidden", position: "relative", fontFamily: "'Inter', -apple-system, 'Helvetica Neue', sans-serif", background: C.bg }}>

      {/* Top nav – branded dark green */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 3, padding: "6px 8px", background: C.darkGreen, position: "sticky", top: 0, zIndex: 200 }}>
        {SCREEN_LABELS.map((s) => {
          const active = s.id === screen;
          return (
          <button key={s.id} onClick={() => goTo(s.id)} style={{ background: active ? C.green : "rgba(255,255,255,.1)", color: active ? "#fff" : "rgba(255,255,255,.7)", border: "none", borderRadius: 7, padding: "4px 9px", fontSize: 10, fontWeight: active ? 700 : 500, cursor: "pointer", transition: "all .15s" }}>{s.label}</button>
        );})}
      </div>

      {/* Content */}
      <div style={{ height: "calc(100% - 44px)", overflowY: "auto" }}>
        {screen === "home"       && <Landing goTo={goTo} />}
        {screen === "checkin"    && <CheckIn goTo={goTo} />}
        {screen === "wallet"     && <WalletScreen goTo={goTo} />}
        {screen === "discover"   && <Discover goTo={goTo} />}
        {screen === "spot"       && <SpotDetail spot={spotData || spots[0] || DEMO_SPOTS[0]} goTo={goTo} />}
        {screen === "profile"    && <Profile goTo={goTo} />}
        {screen === "settings"   && <GuestSettingsScreen goTo={goTo} />}
        {screen === "merchant"   && <MerchantDashboard goTo={goTo} />}
        {screen === "campaign"   && <CampaignScreen goTo={goTo} />}
        {screen === "onboarding" && <Onboarding goTo={goTo} />}
        {screen === "investor"   && <InvestorView goTo={goTo} />}
        {screen === "card"       && <CardLinkedScreen goTo={goTo} />}
        {screen === "onboarding-guest" && <OnboardingGuest onDone={()=>goTo("home")} />}
        {screen === "auth"        && <GuestAuthScreen onSuccess={resumeAfterAuth} onCancel={cancelAuth} />}
        {screen === "benachrichtigungen" && <BenachrichtigungenScreen goTo={goTo} />}
        {screen === "gruppe"     && <GruppenScreen goTo={goTo} />}
        {screen === "scanflow"   && <ScanFlowScreen goTo={goTo} />}
        {screen === "admin"      && <AdminDashboardScreen goTo={goTo} />}
      </div>

      <NavBar screen={screen} goTo={goTo} />
    </div>
  );
}