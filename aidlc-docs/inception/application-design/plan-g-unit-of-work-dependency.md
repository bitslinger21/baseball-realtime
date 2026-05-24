# Plan G — Unit of Work Dependencies

## Dependency Matrix

| Unit | Depends On | Blocks |
|---|---|---|
| U25 — Wire Enrichment | None | U26 (SDK must be published and installed) |
| U26 — AtBatCard + Feed | U25 (SDK) | None |

## Dependency Detail

### U25 → U26: SDK Boundary

U26's client code imports `PlayUpdateWire` from the published SDK. The 11 new fields added in U25 must be present in the SDK type before U26 can safely use them.

**Gate**: U25 must be fully merged to `main` and SDK published before U26 branch is created.

```
main
 └── unit/25-at-bat-wire-enrichment
       └── [merge to main + SDK publish]
             └── unit/26-at-bat-card
                   └── [merge to main]
```

## Wave Structure

| Wave | Units | Can Parallelize? |
|---|---|---|
| Wave 1 | U25 | N/A (single unit) |
| Wave 2 | U26 | N/A (single unit) |

## Cross-Package Contract

```
api/ PlayUpdateWire (realtime.types.ts)
  ├── atBatIndex?: number
  ├── playResult?: string
  ├── batterId?: number
  ├── pitchX?: number
  ├── pitchZ?: number
  ├── strikeZoneTop?: number
  ├── strikeZoneBottom?: number
  ├── batterGameAB?: number
  ├── batterGameH?: number
  ├── batterGameR?: number
  └── batterGameRBI?: number
         │
         │  SDK publish (baseball-realtime-client)
         ▼
client/ useAtBatHistory, ZoneDiagram, BatterInfoPanel
  reads: atBatIndex (grouping), playResult (completion),
         batterId (useBatterInfo key), pitchX/pitchZ (zone dots),
         strikeZoneTop/Bottom (zone height), batterGame* (today stats)
```
