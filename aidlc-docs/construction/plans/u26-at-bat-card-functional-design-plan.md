# U26 — AtBatCard + Feed Redesign: Functional Design Plan

## Unit Context
- **Branch**: `unit/26-at-bat-card`
- **Package**: `client/` only
- **Depends on**: U25 (merged ✅, SDK 1.0.24 installed)

---

## Steps

- [x] **Step 1**: Collect answers to clarifying questions below
- [x] **Step 2**: Generate functional design artifacts
  - `aidlc-docs/construction/u26-at-bat-card/functional-design/business-logic-model.md`
  - `aidlc-docs/construction/u26-at-bat-card/functional-design/business-rules.md`
  - `aidlc-docs/construction/u26-at-bat-card/functional-design/domain-entities.md`
  - `aidlc-docs/construction/u26-at-bat-card/functional-design/frontend-components.md`
- [ ] **Step 3**: Present for approval

---

## Clarifying Questions

### Q1 — `useAtBatHistory` input: incremental vs full array

The existing replay system in `GamePage` throttles all plays (including hydrated historical ones) through a timer — `replayCount` increments every `getReplayDelayMs()` ms, so even hydrated past at-bats are "replayed" one by one.

The plan specifies `useAtBatHistory(latestUpdate: PlayUpdate | null)` — one play at a time. This works naturally with the replay system but means past at-bats appear progressively rather than instantly.

Alternatively, the hook could accept `allUpdates: readonly PlayUpdate[]` and reconstruct all past at-bats instantly on hydration (bypassing the replay throttle for history).

**A** — Keep `useAtBatHistory(latestUpdate)` — incremental, works within the existing replay system. Past at-bats build up as replay fires. Simple.

**B** — Change to `useAtBatHistory(allUpdates: readonly PlayUpdate[])` — processes the full array; reconstructs all past at-bats instantly from hydration. Requires detecting new vs already-processed plays internally.

[Answer]: 

---

### Q2 — At-bat boundary detection: `atBatIndex` vs `batterId` change

We now have `atBatIndex` (an incrementing integer) in the wire payload, which is more authoritative than detecting a `batterId` change. The plan specified `batterId` change detection, but `atBatIndex` is cleaner.

Edge case that matters: same batter coming up twice in a row (e.g. leadoff batter in back-to-back innings). Using `batterId` alone would fail to detect the new at-bat; `atBatIndex` handles this correctly.

**A** — Use `atBatIndex` as the primary boundary signal: new at-bat when `atBatIndex` changes. Fall back to `batterId` change if `atBatIndex` is absent.

**B** — Use `batterId` change detection as designed. Accept the same-batter edge case as acceptable for now.

[Answer]: 

---

### Q3 — Pitch type code for `pitchColors.ts`

The `pitchType` field on `PlayUpdateWire` is currently the full description ("4-Seam Fastball", "Slider") extracted from `framePitch.details.type.description`. The `pitchColors.ts` design uses MLB pitch codes ("FF", "SL").

Two options:

**A** — Add a `pitchTypeCode` field to `PlayUpdateWire` (extracting `framePitch.details.type.code` in `poller.service.ts` alongside the existing `pitchType` description). This keeps `pitchColors.ts` clean with short codes. Requires a small API change — but no SDK bump (WebSocket types are a manual mirror in `client/src/realtime/types.ts`).

**B** — Make `pitchColors.ts` map from description strings instead of codes. More brittle (description strings can vary), but no API change needed.

[Answer]: 

---

### Q4 — `GameTimeline` compatibility

`GameTimeline` receives `updates={replayUpdates}` and generates inning jump-links. Each at-bat block rendered in the feed needs an `id` attribute for the timeline jump to work (e.g. `id="inn-5-top-2"`).

**A** — Keep `GameTimeline` unchanged. Give each `AtBatBlock` an `id` that matches the existing timeline target format.

**B** — Remove or hide `GameTimeline` in this unit — it's a nice-to-have; deal with compatibility later.

[Answer]: 

---

### Q5 — `PitchByPitchFeed` disposition

`PitchByPitchFeed` is currently the only consumer of the pitch row list in `GamePage`. After U26 it will be replaced by `AtBatBlock` rendering.

**A** — Delete `PitchByPitchFeed` and `PitchRow` components entirely in this unit (they'll be dead code).

**B** — Preserve them (commented out or unused) in case rollback is needed.

[Answer]: 

---

### Q6 — `useBatterInfo` call site

`useBatterInfo(batterId)` fetches the batter overview from `/players/:id/overview`. The hook needs a stable call site.

**A** — Call `useBatterInfo` once in `GamePage` keyed to the current active batter's ID. Pass `batterInfo` and `isLoading` down as props to `AtBatBlock`.

**B** — Call `useBatterInfo` inside each `AtBatBlock`. The session cache (`Map<number, BatterInfo>`) means each batter is only fetched once regardless of how many blocks call it.

[Answer]: 
