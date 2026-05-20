import { supabase } from "./supabase.js";

/**
 * Mappt eine Zeile aus `public.spots` auf das UI-Format in MySpot.jsx.
 * @param {Record<string, unknown>} row
 */
export function mapSpotRow(row) {
  return {
    id: row.id,
    name: row.name ?? "",
    cat: row.category ?? row.cat ?? "",
    area: row.area ?? "",
    pts: Number(row.pts ?? 0),
    max: Number(row.max_stamps ?? row.max ?? 10),
    reward: row.reward ?? "",
    color: row.color ?? "#0B7A3E",
    emoji: row.emoji ?? "📍",
    img: row.img ?? "#E8F5EE",
    action: row.action ?? "",
    followers: Number(row.followers ?? 0),
    ownerId: row.owner_id ?? null,
    approvalStatus: row.approval_status ?? "approved",
  };
}

/** Lädt Spots aus Supabase. Leeres Array wenn Client fehlt. */
export async function loadSpotsFromSupabase() {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("spots")
    .select("*")
    .eq("approval_status", "approved")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []).map(mapSpotRow);
}
