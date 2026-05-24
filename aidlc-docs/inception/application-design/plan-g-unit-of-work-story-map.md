# Plan G — Unit of Work Story Map

## Requirement-to-Unit Mapping

| Requirement | Description | Unit |
|---|---|---|
| FR-G1 | WebSocket payload enrichment (11 new fields) | U25 |
| FR-G1a | `atBatIndex` + `playResult` added to `PlayUpdateWire` | U25 |
| FR-G1b | `batterId` (number) added to `PlayUpdateWire` | U25 |
| FR-G1c | `pitchX`, `pitchZ`, `strikeZoneTop`, `strikeZoneBottom` extracted from pitchData | U25 |
| FR-G1d | `batterGameAB/H/R/RBI` extracted from live boxscore | U25 |
| FR-G1e | SDK spec:check → gen → build → publish → client install | U25 |
| FR-G2a | `ZoneDiagram` — SVG zone, color-coded numbered dots, dynamic zone height | U26 |
| FR-G2b | `BatterInfoPanel` — headshot, slash line, today's stats | U26 |
| FR-G2c | `PitchLogTable` — color-coded pitch log table | U26 |
| FR-G2d | `AtBatCard` — Modified Landscape container | U26 |
| FR-G2e | `AtBatBlock` — collapsible batter row + card | U26 |
| FR-G3a | `useAtBatHistory` — hydration reconstruction + live accumulation | U26 |
| FR-G3b | `GamePage` feed restructure — replace pitch rows with at-bat blocks | U26 |
| FR-G3c | Past at-bats collapsed on load, expand/collapse on click | U26 |
| FR-G4a | `useBatterInfo` — lazy-fetch overview, session cache | U26 |
| FR-G4b | Today's game stats in `BatterInfoPanel` (from PlayUpdateWire) | U25 + U26 |
| FR-G5 | Real-time + replay compatibility | U26 |
| `pitchColors.ts` | Shared pitch type color utility | U26 |

## Summary

| Unit | Requirement Count | Complexity |
|---|---|---|
| U25 | FR-G1 (all sub-items) + FR-G4b (API side) | Small — field additions + SDK |
| U26 | FR-G2, FR-G3, FR-G4a, FR-G4b (client side), FR-G5 | Large — new component tree + feed redesign |
