const hasUrl = Boolean(import.meta.env.VITE_SUPABASE_URL);
const hasKey = Boolean(
  import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

/** Ohne beide Variablen läuft die App im reinen Demo-Modus (kein Netzwerk zu Supabase). */
export const IS_LOCAL_MODE = !(hasUrl && hasKey);
