/**
 * Wendet 003_merchant_admin_spots.sql auf die Supabase-Postgres-Datenbank an.
 *
 * Voraussetzung: Verbindungs-URI mit Passwort (nicht der Anon-Key).
 * Supabase → Project Settings → Database → Connection string → URI
 *
 *   DATABASE_URL="postgresql://postgres.[ref]:[PASSWORD]@..." npm run db:apply-003
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

/** Lädt .env.local / .env ohne Extra-Dependency (überschreibt keine bereits gesetzten Variablen). */
function loadEnvFiles() {
  for (const name of [".env.local", ".env"]) {
    const p = path.join(root, name);
    if (!fs.existsSync(p)) continue;
    const text = fs.readFileSync(p, "utf8");
    for (const line of text.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq <= 0) continue;
      const k = t.slice(0, eq).trim();
      let v = t.slice(eq + 1).trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      if (process.env[k] === undefined) process.env[k] = v;
    }
  }
}

loadEnvFiles();

const url = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

if (!url) {
  console.error(
    "Bitte DATABASE_URL oder SUPABASE_DB_URL setzen (Supabase Dashboard → Database → Connection string → URI mit Passwort)."
  );
  process.exit(1);
}

const sqlPath = path.join(__dirname, "../supabase/migrations/003_merchant_admin_spots.sql");
const sql = fs.readFileSync(sqlPath, "utf8");

const client = new pg.Client({
  connectionString: url,
  ssl: url.includes("localhost") ? false : { rejectUnauthorized: false },
});

await client.connect();
try {
  await client.query(sql);
  console.log("OK: 003_merchant_admin_spots.sql angewendet.");
} finally {
  await client.end();
}
