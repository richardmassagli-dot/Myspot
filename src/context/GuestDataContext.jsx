import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "./AuthContext.jsx";
import { useSpots } from "./SpotsContext.jsx";
import {
  fetchFollowSpotIds,
  fetchProgressMap,
  incrementSpotStamp,
  setSpotFollow,
} from "../lib/guestSpotData.js";

const GuestDataContext = createContext(null);

export function GuestDataProvider({ children }) {
  const { user } = useAuth();
  const { spots, source } = useSpots();

  const persistGuestData = Boolean(user && source === "supabase");

  const [followIds, setFollowIds] = useState([]);
  const [progress, setProgress] = useState({});
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user || source !== "supabase") {
      setFollowIds([]);
      setProgress({});
      return;
    }
    setLoading(true);
    try {
      const [ids, pmap] = await Promise.all([
        fetchFollowSpotIds(user.id),
        fetchProgressMap(user.id),
      ]);
      setFollowIds(ids);
      setProgress(pmap);
    } catch {
      setFollowIds([]);
      setProgress({});
    } finally {
      setLoading(false);
    }
  }, [user?.id, source]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isFollowed = useCallback(
    (spotId) => followIds.includes(spotId),
    [followIds]
  );

  const toggleFollow = useCallback(
    async (spotId, follow) => {
      if (!user || !persistGuestData) return;
      await setSpotFollow(user.id, spotId, follow);
      await refresh();
    },
    [user, persistGuestData, refresh]
  );

  const addStamp = useCallback(
    async (spotId, maxStamps) => {
      if (!user || !persistGuestData) return;
      await incrementSpotStamp(user.id, spotId, maxStamps);
      await refresh();
    },
    [user, persistGuestData, refresh]
  );

  const spotWithUserPts = useCallback(
    (spot) => {
      if (!spot) return spot;
      if (!persistGuestData) return spot;
      const p = progress[spot.id];
      const pts = p === undefined ? 0 : Math.min(p, spot.max);
      return { ...spot, pts };
    },
    [persistGuestData, progress]
  );

  const mySpotCards = useMemo(() => {
    if (!persistGuestData) {
      return spots.slice(0, 5).map((s) => ({ ...s }));
    }
    return followIds
      .map((id) => {
        const s = spots.find((x) => x.id === id);
        if (!s) return null;
        const p = progress[id];
        const pts = p === undefined ? 0 : Math.min(p, s.max);
        return { ...s, pts };
      })
      .filter(Boolean);
  }, [persistGuestData, spots, followIds, progress]);

  const value = {
    persistGuestData,
    loading,
    followIds,
    progress,
    refresh,
    mySpotCards,
    isFollowed,
    toggleFollow,
    addStamp,
    spotWithUserPts,
  };

  return (
    <GuestDataContext.Provider value={value}>{children}</GuestDataContext.Provider>
  );
}

export function useGuestSpotData() {
  const ctx = useContext(GuestDataContext);
  if (!ctx) {
    throw new Error(
      "useGuestSpotData muss innerhalb von GuestDataProvider verwendet werden."
    );
  }
  return ctx;
}
