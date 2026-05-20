import { supabase } from "./supabase.js";
import { mapSpotRow } from "./loadSpots.js";

/**
 * Neuer Händler-Spot (erscheint nach Admin-Freigabe in der Gäste-Liste).
 */
export async function createMerchantSpot({
  name,
  category,
  area = "",
  reward,
  maxStamps = 10,
  color = "#0B7A3E",
  emoji = "📍",
  img = "#E8F5EE",
  action = "",
}) {
  if (!supabase) throw new Error("Supabase ist nicht konfiguriert.");
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) throw new Error("Bitte zuerst anmelden.");
  const uid = auth.user.id;

  const { data, error } = await supabase
    .from("spots")
    .insert({
      name,
      category,
      area,
      reward,
      max_stamps: maxStamps,
      pts: 0,
      color,
      emoji,
      img,
      action,
      followers: 0,
      owner_id: uid,
      approval_status: "pending",
      sort_order: 100,
    })
    .select("*")
    .single();

  if (error) throw error;
  return mapSpotRow(data);
}

export async function loadMerchantSpotsForUser(userId) {
  if (!supabase || !userId) return [];
  const { data, error } = await supabase
    .from("spots")
    .select("*")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapSpotRow);
}

/** Alle ausstehenden Freigaben (nur mit Admin-JWT sichtbar). */
export async function loadPendingSpotsForAdmin() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("spots")
    .select("*")
    .eq("approval_status", "pending")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapSpotRow);
}

export async function adminSetSpotApproval(spotId, status) {
  if (!supabase) throw new Error("Supabase ist nicht konfiguriert.");
  if (!["pending", "approved", "rejected"].includes(status)) {
    throw new Error("Ungültiger Status.");
  }
  const { error } = await supabase.rpc("admin_set_spot_approval", {
    p_spot_id: spotId,
    p_status: status,
  });
  if (error) throw error;
}
