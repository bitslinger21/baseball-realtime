# Plan G — Application Design Summary

## Overview

The At-Bat Card System replaces the individual pitch/result rows in `GamePage`'s live feed with a structured at-bat block feed. Each block contains a collapsible header (batter name + result chip) and an `AtBatCard` — a Modified Landscape card showing the strike zone diagram (top-left), batter info panel (top-right), and pitch log table (full-width bottom).

---

## Component Tree

```
GamePage
  useRealtimeGame (existing WebSocket hook)
  useAtBatHistory (new — manages at-bat state from WebSocket events)
  │
  ├── AtBatBlock [× completed at-bats, collapsed]
  │     AtBatCard
  │       ZoneDiagram  ←── pitchColors.ts
  │       BatterInfoPanel
  │       PitchLogTable ←── pitchColors.ts
  │
  └── AtBatBlock [current, always expanded]
        AtBatCard
          ZoneDiagram
          BatterInfoPanel  ←── useBatterInfo → GET /players/:id/overview
          PitchLogTable
```

---

## Key Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Zone rendering | SVG | Precise (pX, pZ) coordinate placement with minimal dependencies |
| Component structure | Decomposed | `ZoneDiagram`, `BatterInfoPanel`, `PitchLogTable` in separate files for testability |
| At-bat history state | `useAtBatHistory` hook | Keeps GamePage clean; encapsulates boundary detection + accumulation |
| Today's game stats | `PlayUpdateWire` enrichment | Avoids extra REST call per pitch; poller has live boxscore access already |
| Pitch color mapping | `pitchColors.ts` shared utility | Both zone dots and table rows use same colors; single source of truth |
| Zone height | Dynamic from `strikeZoneTop`/`strikeZoneBottom` | Accurate per-batter rendering; falls back to static bounds if absent |

---

## Unit Breakdown

### U25 — API + SDK Enrichment
**Scope**: `api/` only + SDK publish
- Add 8 fields to `PlayUpdateWire` in `realtime.types.ts`
- Extract pitch coordinates and batter game stats in `poller.service.ts`
- Add `getBatterGameStats()` helper (internal, reads live boxscore)
- SDK: spec:check → spec:gen → client:build → client:publish → client install

### U26 — AtBatCard + GamePage Feed Redesign
**Scope**: `client/` only (depends on U25 SDK)
- New files: `AtBatBlock`, `AtBatCard`, `ZoneDiagram`, `BatterInfoPanel`, `PitchLogTable`, `atBatTypes.ts`
- New hooks: `useAtBatHistory`, `useBatterInfo`
- New utility: `pitchColors.ts`
- Modified: `GamePage.tsx` — replaces pitch row rendering with `AtBatBlock` list
- Functional Design executes before Code Generation for this unit

---

## Files Changed / Created

### API (U25)
- `api/src/realtime/realtime.types.ts` — 8 new optional fields on `PlayUpdateWire`
- `api/src/poller/poller.service.ts` — extract coords + batter game stats

### Client (U26)
- `client/src/components/AtBatCard/AtBatBlock.tsx` *(new)*
- `client/src/components/AtBatCard/AtBatCard.tsx` *(new)*
- `client/src/components/AtBatCard/ZoneDiagram.tsx` *(new)*
- `client/src/components/AtBatCard/BatterInfoPanel.tsx` *(new)*
- `client/src/components/AtBatCard/PitchLogTable.tsx` *(new)*
- `client/src/components/AtBatCard/atBatTypes.ts` *(new)*
- `client/src/hooks/useAtBatHistory.ts` *(new)*
- `client/src/hooks/useBatterInfo.ts` *(new)*
- `client/src/utils/pitchColors.ts` *(new)*
- `client/src/pages/GamePage.tsx` *(modified — feed restructure)*
