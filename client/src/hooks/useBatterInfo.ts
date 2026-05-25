import { useEffect, useState } from "react";
import type { BatterOverviewDto } from "@bitslinger21/baseball-realtime-client";
import { playersApi } from "../api/baseballApiClient";
import type { BatterInfo } from "../components/AtBatCard/atBatTypes";

const batterInfoCache = new Map<number, BatterInfo>();

function mapDtoToBatterInfo(batterId: number, dto: BatterOverviewDto): BatterInfo {
  return {
    mlbId: batterId,
    avg: dto.headline.battingAverage,
    obp: dto.headline.onBasePercentage,
    slg: dto.headline.sluggingPercentage,
  };
}

export function useBatterInfo(batterId: number | null): {
  batterInfo: BatterInfo | null;
  isLoading: boolean;
} {
  const [batterInfo, setBatterInfo] = useState<BatterInfo | null>(() =>
    batterId != null ? (batterInfoCache.get(batterId) ?? null) : null,
  );
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (batterId == null) {
      setBatterInfo(null);
      return;
    }

    const cached = batterInfoCache.get(batterId);
    if (cached != null) {
      setBatterInfo(cached);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    playersApi
      .playersGetBatterOverview(batterId)
      .then((resp) => {
        if (cancelled) return;
        const info = mapDtoToBatterInfo(batterId, resp.data);
        batterInfoCache.set(batterId, info);
        setBatterInfo(info);
      })
      .catch(() => {
        // leave batterInfo null — BatterInfoPanel renders fallback
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [batterId]);

  return { batterInfo, isLoading };
}
