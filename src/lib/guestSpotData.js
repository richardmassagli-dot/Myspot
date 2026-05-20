import { supabase } from "./supabase.js";

/** @typedef {{ spot_id: string }} FollowRow */
/** @typedef {{ spot_id: string, stamps: number }} ProgressRow */

export async function fetchFollowSpotIds(userId) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("user_spot_follows")
    .select("spot_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => r.spot_id);
}

/** @returns {Promise<Record<string, number>>} */
export async function fetchProgressMap(userId) {
  if (!supabase) return {};
  const { data, error } = await supabase
    .from("user_spot_progress")
    .select("spot_id, stamps")
    .eq("user_id", userId);
  if (error) throw error;
  const m = {};
  for (const row of data ?? []) {
    m[row.spot_id] = Number(row.stamps ?? 0);
  }
  return m;
}

export async function setSpotFollow(userId, spotId, follow) {
  if (!supabase) return;
  if (follow) {
    const { error } = await supabase
      .from("user_spot_follows")
      .upsert({ user_id: userId, spot_id: spotId }, { onConflict: "user_id,spot_id" });
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("user_spot_follows")
      .delete()
      .eq("user_id", userId)
      .eq("spot_id", spotId);
    if (error) throw error;
  }
}

/**
 * Erhöht Stempel um 1, höchstens maxStamps.
 */
export async function incrementSpotStamp(userId, spotId, maxStamps) {
  if (!supabase) return 0;
  const { data: row, error: readErr } = await supabase
    .from("user_spot_progress")
    .select("stamps")
    .eq("user_id", userId)
    .eq("spot_id", spotId)
    .maybeSingle();
  if (readErr) throw readErr;
  const cur = Number(row?.stamps ?? 0);
  const next = Math.min(cur + 1, maxStamps);

  const { error } = await supabase.from("user_spot_progress").upsert(
    {
      user_id: userId,
      spot_id: spotId,
      stamps: next,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,spot_id" }
  );
  if (error) throw error;
  return next;
}
