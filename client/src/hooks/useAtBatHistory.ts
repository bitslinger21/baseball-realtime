import { useEffect, useRef, useState } from "react";
import type { PlayUpdate } from "../realtime/types";
import type { AtBatHistoryState, AtBatState, PitchEntry } from "../components/AtBatCard/atBatTypes";

// Accepts the full replayUpdates slice rather than the single latest play.
// Processes all new entries in one loop so callers can jump replayCount by
// any amount (including N→0→N on game switch) without losing intermediate plays.
export function useAtBatHistory(updates: readonly PlayUpdate[]): {
  currentAtBat: AtBatState | null;
  completedAtBats: AtBatState[];
} {
  const historyRef = useRef<AtBatHistoryState>({
    currentAtBat: null,
    completedAtBats: [],
    lastInningKey: null,
    overallPlayIndex: 0,
  });
  const processedCountRef = useRef(0);

  const [currentAtBat, setCurrentAtBat] = useState<AtBatState | null>(null);
  const [completedAtBats, setCompletedAtBats] = useState<AtBatState[]>([]);

  // Reset processing cursor on every mount. In React StrictMode, refs survive the
  // simulated unmount/remount while state resets — without this the second mount
  // sees processedCountRef === updates.length and skips all plays, leaving an empty feed.
  useEffect(() => {
    processedCountRef.current = 0;
    historyRef.current = { currentAtBat: null, completedAtBats: [], lastInningKey: null, overallPlayIndex: 0 };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Reset when the list shrinks (game switch / replayCount reset to 0)
    if (updates.length < processedCountRef.current) {
      historyRef.current = {
        currentAtBat: null,
        completedAtBats: [],
        lastInningKey: null,
        overallPlayIndex: 0,
      };
      processedCountRef.current = 0;
      setCurrentAtBat(null);
      setCompletedAtBats([]);
    }

    if (updates.length === 0 || updates.length <= processedCountRef.current) return;

    const newPlays = updates.slice(processedCountRef.current);
    processedCountRef.current = updates.length;

    const state = historyRef.current;

    for (const latestUpdate of newPlays) {
      const renderKey =
        latestUpdate.playKey ?? `${latestUpdate.ts ?? "na"}-${state.overallPlayIndex}`;
      state.overallPlayIndex += 1;

      const cur = state.currentAtBat;
      let isNewAtBat = false;

      if (cur == null) {
        isNewAtBat = true;
      } else if (
        latestUpdate.atBatIndex != null &&
        cur.atBatIndex !== latestUpdate.atBatIndex
      ) {
        isNewAtBat = true;
      } else if (
        latestUpdate.atBatIndex == null &&
        cur.atBatIndex === -1 &&
        latestUpdate.batterId != null &&
        latestUpdate.batterId !== cur.batterId
      ) {
        isNewAtBat = true;
      }

      if (isNewAtBat) {
        if (cur != null) {
          state.completedAtBats = [...state.completedAtBats, cur];
        }

        const currentInningKey = `${latestUpdate.inning}-${latestUpdate.half}`;
        const isFirstInInning = currentInningKey !== state.lastInningKey;
        state.lastInningKey = currentInningKey;

        state.currentAtBat = {
          atBatIndex: latestUpdate.atBatIndex ?? -1,
          batterId: latestUpdate.batterId ?? 0,
          batterName: latestUpdate.batterName ?? "",
          inning: latestUpdate.inning,
          half: latestUpdate.half,
          pitches: [],
          strikeZoneTop: latestUpdate.strikeZoneTop,
          strikeZoneBottom: latestUpdate.strikeZoneBottom,
          gameAB: latestUpdate.batterGameAB,
          gameH: latestUpdate.batterGameH,
          gameR: latestUpdate.batterGameR,
          gameRBI: latestUpdate.batterGameRBI,
          firstPitchRenderKey: renderKey,
          isFirstInInning,
          result: undefined,
          finalCount: undefined,
        };
      }

      const atBat = state.currentAtBat!;

      const isLastPitch = latestUpdate.playResult != null;
      const seq = atBat.pitches.length + 1;
      const pitchEntry: PitchEntry = {
        seq,
        pitchTypeCode: latestUpdate.pitchTypeCode ?? "UN",
        pitchTypeName: latestUpdate.pitchType ?? "Unknown",
        result: latestUpdate.description ?? "",
        speedMph: latestUpdate.pitchSpeedMph,
        count: `${latestUpdate.balls}-${latestUpdate.strikes}`,
        pitchX: latestUpdate.pitchX,
        pitchZ: latestUpdate.pitchZ,
        isLastPitch,
        renderKey,
      };

      atBat.pitches = [...atBat.pitches, pitchEntry];

      if (atBat.strikeZoneTop == null && latestUpdate.strikeZoneTop != null) {
        atBat.strikeZoneTop = latestUpdate.strikeZoneTop;
      }
      if (atBat.strikeZoneBottom == null && latestUpdate.strikeZoneBottom != null) {
        atBat.strikeZoneBottom = latestUpdate.strikeZoneBottom;
      }

      atBat.gameAB = latestUpdate.batterGameAB ?? atBat.gameAB;
      atBat.gameH = latestUpdate.batterGameH ?? atBat.gameH;
      atBat.gameR = latestUpdate.batterGameR ?? atBat.gameR;
      atBat.gameRBI = latestUpdate.batterGameRBI ?? atBat.gameRBI;

      if (isLastPitch) {
        atBat.result = latestUpdate.playResult;
        atBat.finalCount = pitchEntry.count;
      }
    }

    // One setState call after the full loop — one re-render regardless of batch size
    setCurrentAtBat(state.currentAtBat != null ? { ...state.currentAtBat } : null);
    setCompletedAtBats(state.completedAtBats);
  }, [updates]);

  return { currentAtBat, completedAtBats };
}
