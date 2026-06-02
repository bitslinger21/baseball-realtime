import { useEffect, useState } from "react";
import type { VsPlayerDto } from "@bitslinger21/baseball-realtime-client";
import { playersApi } from "../api/baseballApiClient";

const cache = new Map<string, VsPlayerDto>();

export function useMatchupStats(
  batterId: number | null | undefined,
  pitcherId: number | null | undefined,
): VsPlayerDto | null {
  const key = batterId != null && pitcherId != null ? `${batterId}:${pitcherId}` : null;
  const [data, setData] = useState<VsPlayerDto | null>(() =>
    key != null ? (cache.get(key) ?? null) : null,
  );

  useEffect(() => {
    if (key == null || batterId == null || pitcherId == null) {
      setData(null);
      return;
    }
    const cached = cache.get(key);
    if (cached != null) { setData(cached); return; }

    let cancelled = false;
    playersApi
      .playersGetVsPlayer(batterId, pitcherId)
      .then((resp) => {
        if (cancelled) return;
        cache.set(key, resp.data);
        setData(resp.data);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [key, batterId, pitcherId]);

  return data;
}
