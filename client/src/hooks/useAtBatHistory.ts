import { useEffect, useRef, useState } from "react";
import type { PlayUpdate } from "../realtime/types";
import type { AtBatHistoryState, AtBatState, PitchEntry } from "../components/AtBatCard/atBatTypes";

export function useAtBatHistory(latestUpdate: PlayUpdate | null): {
  currentAtBat: AtBatState | null;
  completedAtBats: AtBatState[];
} {
  const historyRef = useRef<AtBatHistoryState>({
    currentAtBat: null,
    completedAtBats: [],
    lastInningKey: null,
    overallPlayIndex: 0,
  });

  const [currentAtBat, setCurrentAtBat] = useState<AtBatState | null>(null);
  const [completedAtBats, setCompletedAtBats] = useState<AtBatState[]>([]);

  useEffect(() => {
    if (latestUpdate == null) return;

    const state = historyRef.current;

    // Step 2: compute renderKey
    const renderKey =
      latestUpdate.playKey ?? `${latestUpdate.ts ?? "na"}-${state.overallPlayIndex}`;
    state.overallPlayIndex += 1;

    // Step 3: determine if this is a new at-bat
    const cur = state.currentAtBat;
    let isNewAtBat = false;

    if (cur == null) {
      // BR-3: first update always initializes a new at-bat
      isNewAtBat = true;
    } else if (
      latestUpdate.atBatIndex != null &&
      cur.atBatIndex !== latestUpdate.atBatIndex
    ) {
      // BR-1: atBatIndex changed
      isNewAtBat = true;
    } else if (
      latestUpdate.atBatIndex == null &&
      cur.atBatIndex === -1 &&
      latestUpdate.batterId != null &&
      latestUpdate.batterId !== cur.batterId
    ) {
      // BR-2: fallback — batterId changed and atBatIndex absent on both
      isNewAtBat = true;
    }

    // Step 4: handle new at-bat
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

    // Step 5: build PitchEntry
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

    // Step 6: append pitch
    atBat.pitches = [...atBat.pitches, pitchEntry];

    // Step 7: latch strike zone bounds (first pitch that carries them)
    if (atBat.strikeZoneTop == null && latestUpdate.strikeZoneTop != null) {
      atBat.strikeZoneTop = latestUpdate.strikeZoneTop;
    }
    if (atBat.strikeZoneBottom == null && latestUpdate.strikeZoneBottom != null) {
      atBat.strikeZoneBottom = latestUpdate.strikeZoneBottom;
    }

    // Step 8: always update game stats
    atBat.gameAB = latestUpdate.batterGameAB ?? atBat.gameAB;
    atBat.gameH = latestUpdate.batterGameH ?? atBat.gameH;
    atBat.gameR = latestUpdate.batterGameR ?? atBat.gameR;
    atBat.gameRBI = latestUpdate.batterGameRBI ?? atBat.gameRBI;

    // Step 9: resolve at-bat on last pitch
    if (isLastPitch) {
      atBat.result = latestUpdate.playResult;
      atBat.finalCount = pitchEntry.count;
    }

    setCurrentAtBat({ ...atBat });
    setCompletedAtBats(state.completedAtBats);
  }, [latestUpdate]);

  return { currentAtBat, completedAtBats };
}
