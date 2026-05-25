# U26 — Business Rules

## At-Bat Boundary Detection

**BR-1 (Primary)**: A new at-bat begins when `latestUpdate.atBatIndex` is non-null AND differs from `currentAtBat.atBatIndex`.

**BR-2 (Fallback)**: If `atBatIndex` is absent on either the incoming update or the current at-bat, fall back to `batterId` change detection: new at-bat when `latestUpdate.batterId !== currentAtBat.batterId`.

**BR-3 (Initialization)**: If `currentAtBat` is null, the first non-null `latestUpdate` always initializes a new at-bat regardless of any comparisons.

**BR-4 (Edge case — same batter, new at-bat)**: BR-1 correctly handles a batter facing the same pitcher in back-to-back innings. `atBatIndex` increments even when `batterId` does not change. BR-2 (fallback) would incorrectly merge these; BR-1 is therefore required and preferred.

---

## Last Pitch Detection

**BR-5**: `isLastPitch = true` on a `PitchEntry` if and only if `latestUpdate.playResult` is non-null for that update. `playResult` is only set server-side on the final pitch of an at-bat (gated by `isFinalPitchOfAtBat` in `poller.service.ts`).

**BR-6**: When `isLastPitch = true`, also set `currentAtBat.result = latestUpdate.playResult` and `currentAtBat.finalCount = pitchEntry.count`. The at-bat is now "resolved" for display purposes.

**BR-7**: A resolved at-bat (`result != null`) displays a result chip in its collapsed header row. An unresolved at-bat (current) shows no result chip.

---

## Strike Zone Rendering

**BR-8 (Dynamic zone)**: `strikeZoneTop` and `strikeZoneBottom` are set from the **first pitch in the at-bat** that carries non-null values. They are not updated mid-at-bat once set.

**BR-9 (Static fallback)**: If no pitch in the at-bat carries zone bounds, fall back to `szTop = 3.5 ft`, `szBottom = 1.5 ft`.

**BR-10 (Missing coordinates)**: Pitches where `pitchX` or `pitchZ` is null/undefined are **omitted from the zone diagram** but still appear as rows in `PitchLogTable`. The dot sequence numbers remain contiguous in the zone (seq 1, 2, 3 even if pitch 2 is missing from the zone).

**BR-11 (Zone dimensions)**: Zone width is fixed at ±0.835 ft from center regardless of batter handedness.

---

## Pitch Color Mapping

**BR-12**: Color lookup uses `pitchTypeCode` (e.g. "FF"), not `pitchTypeName`. Codes are normalized to uppercase before lookup.

**BR-13 (Unknown code)**: Pitch type codes not in `PITCH_COLORS` map render with fallback gray (`#a0aec0`). This applies to any new pitch types not yet in the map.

**BR-14**: `ZoneDiagram` uses full saturation color for dot fill. `PitchLogTable` uses muted variant (15% opacity / hex8 alpha) for row backgrounds to maintain text readability.

---

## Collapse / Expand Behavior

**BR-15 (Active at-bat)**: The current (in-progress) at-bat is always expanded. No toggle is provided. `isActive = true` on the `AtBatBlock`.

**BR-16 (Completed at-bats)**: Past at-bats render collapsed (batter name row + result chip only) on initial load. User may click the header row to expand/collapse. Expansion state is local to `GamePage` in a `Set<number>` keyed by `atBatIndex`.

**BR-17 (Ordering)**: `completedAtBats` renders oldest-first (index 0 at top). The current at-bat is always appended at the bottom. This matches the existing feed direction.

---

## Game Stats Update Rule

**BR-18**: Today's game stats (`gameAB`, `gameH`, `gameR`, `gameRBI`) on `currentAtBat` are updated on **every incoming pitch**, not just at at-bat start. This ensures the stats shown in `BatterInfoPanel` reflect the latest boxscore snapshot.

---

## Batter Info Fetch

**BR-19**: `useBatterInfo` fetches at most once per `batterId` per page session. The module-level cache persists across at-bat transitions (e.g. if batter A is followed by batter B and then batter A again, A's info is not re-fetched).

**BR-20**: While `isLoading = true`, `BatterInfoPanel` renders a loading placeholder. Once resolved, `BatterInfo` is never null for that ID.

**BR-21**: If the fetch fails, `batterInfo` remains null. `BatterInfoPanel` renders a fallback (silhouette headshot, dashes for stats). No retry on the same session.

---

## Headshot Image

**BR-22**: Headshot URL pattern: `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_213,q_auto:best/v1/people/{mlbId}/headshot/67/current`

**BR-23**: On image load error (`onError`), replace `src` with the generic silhouette fallback URL to prevent broken image icons.

---

## Deleted Components

**BR-24**: `PitchByPitchFeed` and its CSS file are deleted. `pitchFeedModel.ts` and `playIds.ts` are **retained** — `GameTimeline` still uses `playIds.ts`, and the new feed uses `getBatterAnchorIdFromKey` / `getInningAnchorIdFromKey` from `playIds.ts`.

**BR-25**: `pitchFeedModel.ts` is retained (referenced via `playIds.ts` chain) but if after deletion of `PitchByPitchFeed` it becomes unused, it can be deleted too. Check at implementation time.
