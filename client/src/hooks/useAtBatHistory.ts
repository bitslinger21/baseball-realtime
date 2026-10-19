import { useEffect, useRef, useState } from "react";
import type { PlayUpdate } from "../realtime/types";
import { playIdentity } from "../realtime/useRealtimeGame";
import type { AtBatHistoryState, AtBatState, PitchEntry } from "../components/AtBatCard/atBatTypes";

// Accepts the full replayUpdates slice rather than the single latest play.
// Processes all new entries in one loop so callers can jump replayCount by
// any amount (including N→0→N on game switch) without losing intermediate plays.
//
// Diffs `updates` by pitch IDENTITY (playIdentity — playKey when present, else
// a stable composite), not array length/position. useRealtimeGame's hydrate
// handler REPLACES the whole per-game play array (handlePlay only appends) —
// a position-based diff desyncs the moment a hydrate resolves to a
// differently-shaped array, re-processing already-seen pitches (duplicate
// rows) or jumping past real ones (skipped rows). Identity-based diffing is
// correct regardless of where a given pitch sits positionally after a replace.
// The fields the fold below reads from one pitch.
function pitchSig(u: PlayUpdate): string {
  return JSON.stringify([
    u.description,
    u.playResult,
    u.scorebookCode,
    u.scorebookSub,
    u.spray?.angle,
    u.spray?.dist,
    u.spray?.traj,
    u.hitKind,
    u.balls,
    u.strikes,
    u.pitchType,
    u.pitchTypeCode,
    u.pitchSpeedMph,
    u.pitchX,
    u.pitchZ,
  ]);
}

export function useAtBatHistory(updates: readonly PlayUpdate[]): {
  currentAtBat: AtBatState | null;
  completedAtBats: AtBatState[];
} {
  const historyRef = useRef<AtBatHistoryState>({
    currentAtBat: null,
    completedAtBats: [],
    lastInningKey: null,
  });
  const processedKeysRef = useRef<Set<string>>(new Set());
  // What each processed pitch looked like, to notice when one is resent with
  // new content (MLB adds an at-bat's result to its last pitch seconds later).
  const sigsRef = useRef<Map<string, string>>(new Map());

  const [currentAtBat, setCurrentAtBat] = useState<AtBatState | null>(null);
  const [completedAtBats, setCompletedAtBats] = useState<AtBatState[]>([]);

  useEffect(() => {
    // Matches the original's behavior on empty: no-op, don't touch whatever
    // is currently displayed. (An earlier version of this fix actively
    // cleared state here, which — if `updates` ever oscillates between empty
    // and non-empty upstream — turned into a setState-triggers-render-
    // triggers-setState loop that didn't exist before. Not needed for the
    // actual fix; removed.)
    if (updates.length === 0) return;

    const identities = updates.map(playIdentity);

    // Reset when this looks like a different game rather than a continuation
    // — none of the previously-processed pitches appear anywhere in the new
    // array.
    const isReset =
      processedKeysRef.current.size > 0 &&
      !identities.some((id) => processedKeysRef.current.has(id));

    // A pitch already folded in came back changed — typically the at-bat's
    // last pitch gaining its result. Rebuild from the whole array (a cheap
    // pass) so that at-bat closes, rather than keeping the stale copy.
    const sigs = updates.map(pitchSig);
    const changed = updates.some(
      (_u, i) => processedKeysRef.current.has(identities[i]) && sigsRef.current.get(identities[i]) !== sigs[i],
    );

    // Pitches already folded in are gone — the Scout head moved back. Rebuild
    // from what's left, or the view keeps showing the later position.
    const present = new Set(identities);
    let truncated = false;
    for (const id of processedKeysRef.current) {
      if (!present.has(id)) { truncated = true; break; }
    }

    if (isReset || changed || truncated) {
      historyRef.current = { currentAtBat: null, completedAtBats: [], lastInningKey: null };
      processedKeysRef.current = new Set();
    }
    identities.forEach((id, i) => sigsRef.current.set(id, sigs[i]));

    const newPlays = updates.filter((_u, i) => !processedKeysRef.current.has(identities[i]));
    if (newPlays.length === 0) return;

    const state = historyRef.current;

    for (const latestUpdate of newPlays) {
      const renderKey = playIdentity(latestUpdate);
      processedKeysRef.current.add(renderKey);

      // A pitch for the at-bat that just closed (out of order): reopen it
      // rather than starting a second copy; it re-closes on its final pitch.
      const lastDone = state.completedAtBats[state.completedAtBats.length - 1];
      if (state.currentAtBat == null && lastDone != null && latestUpdate.atBatIndex != null && lastDone.atBatIndex === latestUpdate.atBatIndex) {
        state.completedAtBats = state.completedAtBats.slice(0, -1);
        state.currentAtBat = lastDone;
      }

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
          // An at-bat that never got its final pitch. With a result (an older
          // feed without isFinalPitchOfAtBat) it closes here, as it always did;
          // without one it's a PA a runner out cut short (caught stealing for
          // the 3rd out) — dropped, and that batter leads off his team's next
          // half (PROMPT_oct19.md item 3, Part A / D).
          if (cur.result != null) {
            if (`${cur.inning}-${cur.half}` !== `${latestUpdate.inning}-${latestUpdate.half}`) cur.isHalfEnd = true;
            state.completedAtBats = [...state.completedAtBats, cur];
          }
        }
        // Backup half-end marker: the half changed and its last closed at-bat
        // isn't marked yet (a half ended by a runner out).
        const prev = state.completedAtBats[state.completedAtBats.length - 1];
        if (prev != null && !prev.isHalfEnd && `${prev.inning}-${prev.half}` !== `${latestUpdate.inning}-${latestUpdate.half}`) {
          state.completedAtBats = [...state.completedAtBats.slice(0, -1), { ...prev, isHalfEnd: true }];
        }

        const currentInningKey = `${latestUpdate.inning}-${latestUpdate.half}`;
        const isFirstInInning = currentInningKey !== state.lastInningKey;
        state.lastInningKey = currentInningKey;

        state.currentAtBat = {
          atBatIndex: latestUpdate.atBatIndex ?? -1,
          batterId: latestUpdate.batterId ?? 0,
          batterName: latestUpdate.batterName ?? "",
          pitcherName: latestUpdate.pitcherName,
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

      // A pinch hitter mid-at-bat: same atBatIndex, new batter. The at-bat
      // (count, pitches) carries on under him.
      if (!isNewAtBat && latestUpdate.batterId != null && latestUpdate.batterId !== atBat.batterId) {
        atBat.batterId = latestUpdate.batterId;
        atBat.batterName = latestUpdate.batterName ?? atBat.batterName;
      }

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
      atBat.pitcherName = latestUpdate.pitcherName ?? atBat.pitcherName;

      if (isLastPitch) {
        atBat.result = latestUpdate.playResult;
        atBat.scorebookCode = latestUpdate.scorebookCode;
        atBat.spray = latestUpdate.spray;
        atBat.scorebookSub = latestUpdate.scorebookSub;
        atBat.hitKind = latestUpdate.hitKind ?? atBat.hitKind;
        atBat.finalCount = pitchEntry.count;
      }

      // Close the at-bat on its final pitch (the server marks it), not when the
      // next batter's first pitch arrives — so a game's last at-bat closes, and
      // the live view can move on the moment a PA ends. A resend of this pitch
      // with its result rebuilds from scratch and closes it once (Part A).
      if (latestUpdate.isFinalPitchOfAtBat === true) {
        if (latestUpdate.outs === 3) atBat.isHalfEnd = true;
        state.completedAtBats = [...state.completedAtBats, atBat];
        state.currentAtBat = null;
      }
    }

    // One setState call after the full loop — one re-render regardless of batch size
    setCurrentAtBat(state.currentAtBat != null ? { ...state.currentAtBat } : null);
    setCompletedAtBats(state.completedAtBats);
  }, [updates]);

  return { currentAtBat, completedAtBats };
}
