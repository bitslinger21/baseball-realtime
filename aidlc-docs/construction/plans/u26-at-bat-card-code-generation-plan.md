# U26 — AtBatCard + Feed Redesign: Code Generation Plan

## Unit Context
- **Branch**: `unit/26-at-bat-card` (create from main)
- **Packages**: `api/` (small amendment) + `client/` (main work)
- **Depends on**: U25 merged ✅, SDK 1.0.24 installed

---

## Steps

### Step 1 — Create branch
- [ ] `git checkout -b unit/26-at-bat-card`

---

### Step 2 — API amendment: add `pitchTypeCode` to wire pipeline
- [ ] **`api/src/poller/poller.processor.ts`** — Add `pitchTypeCode?: string` to `PlayUpdateWire` interface
- [ ] **`api/src/poller/poller.service.ts`** — Add `pitchTypeCode?: string` to `LiveUpdate` type; extract `framePitch?.details?.type?.code` in `buildPlayUpdate()` and include in return object
- [x] **`api/src/realtime/realtime.gateway.ts`** — Pass `pitchTypeCode: u.pitchTypeCode` in `toPlayWire()`
- [x] **`client/src/realtime/types.ts`** — Add `pitchTypeCode?: string` to `PlayUpdate` interface (manual mirror — no SDK bump needed)

---

### Step 3 — Create `pitchColors.ts` utility
- [x] **`client/src/utils/pitchColors.ts`** — `PITCH_COLORS` map (FF, SI, FC, SL, CU, KC, CH, FS, KN, EP), `FALLBACK_COLOR`, `getPitchColor(code)`, `getPitchColorMuted(code)` (hex8 alpha `26` suffix for 15% opacity)

---

### Step 4 — Create shared AtBat types
- [x] **`client/src/components/AtBatCard/atBatTypes.ts`** — Export `PitchEntry`, `AtBatState`, `BatterInfo`, `AtBatHistoryState` interfaces per `domain-entities.md`

---

### Step 5 — Create `useAtBatHistory` hook
- [x] **`client/src/hooks/useAtBatHistory.ts`** — State machine using `useRef` (mutable history) + `useState` (render trigger); processes one `PlayUpdate | null` at a time; returns `{ currentAtBat: AtBatState | null; completedAtBats: AtBatState[] }`; implements full algorithm from `business-logic-model.md` including `atBatIndex` boundary detection (BR-1), fallback `batterId` (BR-2), `isFirstInInning` tracking, `firstPitchRenderKey` assignment, `isLastPitch` detection, zone bounds latch, game stats always-update rule

---

### Step 6 — Create `useBatterInfo` hook
- [x] **`client/src/api/baseballApiClient.ts`** — Add `PlayersApi` export
- [x] **`client/src/hooks/useBatterInfo.ts`** — Module-level `batterInfoCache: Map<number, BatterInfo>`; `useState` for `batterInfo` + `isLoading`; effect fetches `playersApi.playersGetBatterOverview(batterId)` on cache miss; maps `BatterOverviewDto` → `BatterInfo` (avg/obp/slg only — bio fields not in DTO)

---

### Step 7 — Create `ZoneDiagram` component
- [x] **`client/src/components/AtBatCard/ZoneDiagram.tsx`** — SVG component; `toSvgX`/`toSvgY` coordinate transforms; renders: background rect, strike zone rect, 3×3 grid lines, home plate pentagon, pitch dots with seq numbers; dot stroke highlights last pitch; uses `getPitchColor` for dot fill
- [x] **`client/src/components/AtBatCard/ZoneDiagram.css`**

---

### Step 8 — Create `BatterInfoPanel` component
- [x] **`client/src/components/AtBatCard/BatterInfoPanel.tsx`** — Renders headshot (MLB CDN URL, `onError` fallback), batter name, season slash line (loading → `—/—/—`), today's game stats
- [x] **`client/src/components/AtBatCard/BatterInfoPanel.css`**

---

### Step 9 — Create `PitchLogTable` component
- [x] **`client/src/components/AtBatCard/PitchLogTable.tsx`** — `<table>` with columns: #, TYPE (dot + name), RESULT (bold badge on last pitch), MPH, COUNT; row background tinted via `getPitchColorMuted`; final pitch row has `pitch-log-row--final` class
- [x] **`client/src/components/AtBatCard/PitchLogTable.css`**

---

### Step 10 — Create `AtBatCard` component
- [x] **`client/src/components/AtBatCard/AtBatCard.tsx`** — Modified Landscape layout: `atbat-card-top` flex row (`ZoneDiagram` + `BatterInfoPanel` flex-grow), then `PitchLogTable` below
- [x] **`client/src/components/AtBatCard/AtBatCard.css`**

---

### Step 11 — Create `AtBatBlock` component
- [x] **`client/src/components/AtBatCard/AtBatBlock.tsx`** — `<li>` wrapper with anchor IDs for `GameTimeline`; collapse/expand toggle; calls `useBatterInfo` internally; renders `<AtBatCard>` when active or expanded
- [x] **`client/src/components/AtBatCard/AtBatBlock.css`**

---

### Step 12 — Modify `GamePage.tsx`
- [x] Add imports: `useAtBatHistory`, `AtBatBlock`
- [x] Add state: `expandedAtBats`
- [x] Add hook call: `useAtBatHistory(latest)`
- [x] Add `toggleAtBat` handler
- [x] Add `setExpandedAtBats(new Set())` to the gameId-change reset `useEffect`
- [x] Replace `<PitchByPitchFeed updates={replayUpdates} />` with `<ul className="live-feed-list">` + `AtBatBlock` rendering

---

### Step 13 — Delete obsolete components
- [x] Check `PitchByPitchFeed` consumers — `DailyGamesPage.tsx` still imports it; **kept** (not deleted)
- [x] Check `pitchFeedModel.ts` — still imported by `PitchByPitchFeed.tsx`; **kept**
- [x] `PitchByPitchFeed` removed from `GamePage.tsx` only (import + JSX both removed)

---

### Step 14 — TypeScript build checks
- [x] `api/ tsc --noEmit` — pre-existing errors only (axios in generated files, jest types); no new errors
- [x] `client/ tsc --noEmit` — clean ✅

---

### Step 15 — SDK spec:check (no-op verification)
- [x] `cd api && yarn spec:check` — **PASSED** ✅ (pitchTypeCode is WebSocket-only; no REST endpoint change)

---

## Files Created / Modified Summary

| Action | Path |
|--------|------|
| MODIFY | `api/src/poller/poller.processor.ts` |
| MODIFY | `api/src/poller/poller.service.ts` |
| MODIFY | `api/src/realtime/realtime.gateway.ts` |
| MODIFY | `client/src/realtime/types.ts` |
| CREATE | `client/src/utils/pitchColors.ts` |
| CREATE | `client/src/components/AtBatCard/atBatTypes.ts` |
| CREATE | `client/src/hooks/useAtBatHistory.ts` |
| MODIFY | `client/src/api/baseballApiClient.ts` |
| CREATE | `client/src/hooks/useBatterInfo.ts` |
| CREATE | `client/src/components/AtBatCard/ZoneDiagram.tsx` |
| CREATE | `client/src/components/AtBatCard/ZoneDiagram.css` |
| CREATE | `client/src/components/AtBatCard/BatterInfoPanel.tsx` |
| CREATE | `client/src/components/AtBatCard/BatterInfoPanel.css` |
| CREATE | `client/src/components/AtBatCard/PitchLogTable.tsx` |
| CREATE | `client/src/components/AtBatCard/PitchLogTable.css` |
| CREATE | `client/src/components/AtBatCard/AtBatCard.tsx` |
| CREATE | `client/src/components/AtBatCard/AtBatCard.css` |
| CREATE | `client/src/components/AtBatCard/AtBatBlock.tsx` |
| CREATE | `client/src/components/AtBatCard/AtBatBlock.css` |
| MODIFY | `client/src/pages/GamePage.tsx` |
| DELETE | `client/src/pages/PitchByPitchFeed.tsx` |
| DELETE | `client/src/pages/PitchByPitchFeed.css` |
| DELETE (conditional) | `client/src/realtime/pitchFeedModel.ts` |
