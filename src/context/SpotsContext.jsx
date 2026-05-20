import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { DEMO_SPOTS } from "../data/demoSpots.js";
import { IS_LOCAL_MODE } from "../lib/config.js";
import { loadSpotsFromSupabase } from "../lib/loadSpots.js";

const SpotsContext = createContext(null);

export function SpotsProvider({ children }) {
  const [spots, setSpots] = useState(DEMO_SPOTS);
  const [loading, setLoading] = useState(!IS_LOCAL_MODE);
  const [error, setError] = useState(null);
  /** "demo" | "supabase" | "demo-fallback" */
  const [source, setSource] = useState(IS_LOCAL_MODE ? "demo" : "loading");

  const refresh = useCallback(async () => {
    if (IS_LOCAL_MODE) {
      setSpots(DEMO_SPOTS);
      setSource("demo");
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const fromDb = await loadSpotsFromSupabase();
      if (fromDb.length > 0) {
        setSpots(fromDb);
        setSource("supabase");
      } else {
        setSpots(DEMO_SPOTS);
        setSource("demo-fallback");
      }
    } catch (e) {
      const msg = e?.message ?? String(e);
      setError(msg);
      setSpots(DEMO_SPOTS);
      setSource("demo-fallback");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <SpotsContext.Provider value={{ spots, loading, error, source, refresh }}>
      {children}
    </SpotsContext.Provider>
  );
}

export function useSpots() {
  const ctx = useContext(SpotsContext);
  if (!ctx) throw new Error("useSpots muss innerhalb von SpotsProvider verwendet werden.");
  return ctx;
}
