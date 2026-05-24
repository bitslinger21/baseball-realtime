# Plan G — Unit of Work

## Configuration

| Setting | Value |
|---|---|
| Branch naming | `unit/<N>-<slug>` (established convention) |
| Parallelism | Sequential — U26 depends on U25 SDK output |
| Merge strategy | Merge commit (established convention) |
| First unit number | U25 (following U24) |

---

## Units

### Unit 25 — WebSocket Enrichment + SDK
**Branch**: `unit/25-at-bat-wire-enrichment`
**Wave**: 1
**Packages**: `api/`
**Estimated size**: Small (2–3 hrs)

**Scope**:

Add 11 new optional fields to `PlayUpdateWire` and pass them through `toPlayWire()` in `realtime.gateway.ts`:

*At-bat tracking (from `LiveUpdate`, already exist server-side but stripped by `toPlayWire`)*:
- `atBatIndex?: number` — increments per at-bat; used by client to group pitches
- `playResult?: string` — only set on the final pitch of an at-bat (`'Single' | 'Double' | 'Triple' | 'HomeRun' | 'Walk' | 'Strikeout' | 'Out' | 'HBP' | 'Error' | 'Other'`)
- `batterId?: number` — batter's MLB ID as number; needed by `useBatterInfo` to fetch overview

*Pitch coordinates (extracted from `framePitch.pitchData.coordinates` in `poller.service.ts`)*:
- `pitchX?: number` — pX coordinate (horizontal, catcher's perspective)
- `pitchZ?: number` — pZ coordinate (vertical, feet above home plate)
- `strikeZoneTop?: number` — batter's strike zone top (ft)
- `strikeZoneBottom?: number` — batter's strike zone bottom (ft)

*Batter game stats (extracted from `liveData.boxscore` in `poller.service.ts`)*:
- `batterGameAB?: number` — at-bats today
- `batterGameH?: number` — hits today
- `batterGameR?: number` — runs today
- `batterGameRBI?: number` — RBI today

**Key files changed**:
- `api/src/realtime/realtime.types.ts` — add 11 fields to `PlayUpdateWire`
- `api/src/realtime/realtime.gateway.ts` — update `toPlayWire()` to pass all new fields
- `api/src/poller/poller.service.ts` — extract coords, zone bounds, batter game stats; add `getBatterGameStats()` helper

**SDK cycle** (required — `PlayUpdateWire` is in the published client):
```
yarn spec:check → yarn spec:gen → yarn client:build → yarn client:publish
client: yarn add baseball-realtime-client@latest
```

**Completion criteria**:
- WebSocket `play-update` events carry all 11 new fields when available (undefined when MLB feed doesn't provide them)
- `hydrate` event plays also carry all new fields (same `toPlayWire` used for both)
- SDK client types updated and published
- No regression to existing fields or game functionality

---

### Unit 26 — AtBatCard + GamePage Feed Redesign
**Branch**: `unit/26-at-bat-card`
**Wave**: 2 (depends on U25 SDK)
**Packages**: `client/`
**Estimated size**: Large (6–9 hrs)
**Prerequisite**: U25 merged and SDK installed

**Scope**:

*New utility*:
- `client/src/utils/pitchColors.ts` — pitch type code → hex color map; `getPitchColor()` and `getPitchColorMuted()`

*New types*:
- `client/src/components/AtBatCard/atBatTypes.ts` — `PitchEntry`, `AtBatState`, `BatterInfo` interfaces

*New hooks*:
- `client/src/hooks/useAtBatHistory.ts` — consumes `GameHydratePayload` (on load, reconstructs all past at-bats from `atBatIndex` grouping) and live `play-update` events (builds current at-bat); returns `{ currentAtBat, completedAtBats }`
- `client/src/hooks/useBatterInfo.ts` — lazy-fetches `GET /players/:batterId/overview` per batter; session cache via `Map<number, BatterInfo>` ref

*New components* (under `client/src/components/AtBatCard/`):
- `ZoneDiagram.tsx` — SVG zone diagram; color-coded numbered pitch dots; dynamic zone height from `strikeZoneTop`/`strikeZoneBottom`
- `BatterInfoPanel.tsx` — headshot, name, number, position, slash line, today's stats
- `PitchLogTable.tsx` — pitch-by-pitch table; color-coded rows by pitch type
- `AtBatCard.tsx` — Modified Landscape container: zone top-left, batter info top-right, pitch log bottom
- `AtBatBlock.tsx` — collapsible wrapper: batter name header row + `AtBatCard`; active at-bat always expanded; past at-bats collapsed, toggle on click

*Modified*:
- `client/src/pages/GamePage.tsx` — replace pitch row rendering with `useAtBatHistory` + `AtBatBlock` list

**Completion criteria**:
- Active at-bat: zone diagram updates dot-by-dot as pitches arrive; pitch log appends rows live
- Past at-bats: batter name rows visible on page load (reconstructed from hydration); clicking expands full card
- Zone height scales from `strikeZoneTop`/`strikeZoneBottom`; falls back to static 1.5–3.5 ft if absent
- Pitch dots are color-coded by type with sequence number; table rows color-tinted to match
- Batter info panel shows headshot, slash line, and today's game stats
- No regression: box score, alerts, score header, replay mode all unaffected
