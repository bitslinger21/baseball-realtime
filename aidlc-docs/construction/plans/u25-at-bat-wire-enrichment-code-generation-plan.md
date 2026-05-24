# U25 — At-Bat Wire Enrichment: Code Generation Plan

## Unit Context
- **Branch**: `unit/25-at-bat-wire-enrichment`
- **Packages**: `api/` only
- **Dependencies**: None (Wave 1)
- **SDK note**: No REST API changes → `spec:check` is a no-op; WebSocket types are manually mirrored in `client/src/realtime/types.ts`

## Requirements Covered
- FR-G1 (all sub-items): 11 new optional fields on `PlayUpdateWire`
- FR-G4b (API side): batter game stats in wire payload

## New Fields Summary

| Field | Source in poller.service.ts | Note |
|---|---|---|
| `atBatIndex` | Already in `LiveUpdate`; not in `toPlayWire` | Groups pitches by at-bat |
| `playResult` | Already in `LiveUpdate`; not in `toPlayWire` | Non-null only on final pitch |
| `batterId` | `batterIdNum` (`number\|undefined`) already extracted | Needed by `useBatterInfo` |
| `pitchX` | `framePitch.pitchData.coordinates.pX` | NEW extraction |
| `pitchZ` | `framePitch.pitchData.coordinates.pZ` | NEW extraction |
| `strikeZoneTop` | `framePitch.pitchData.strikeZoneTop` | NEW extraction |
| `strikeZoneBottom` | `framePitch.pitchData.strikeZoneBottom` | NEW extraction |
| `batterGameAB` | `batterPlayer.stats.batting.atBats` | NEW extraction |
| `batterGameH` | `batterPlayer.stats.batting.hits` | NEW extraction |
| `batterGameR` | `batterPlayer.stats.batting.runs` | NEW extraction |
| `batterGameRBI` | `batterPlayer.stats.batting.rbi` | NEW extraction |

---

## Steps

- [x] **Step 1**: Add 11 new optional fields to `PlayUpdateWire` in `api/src/poller/poller.processor.ts`
  - Add after `pitchSpeedMph?: number`:
    ```
    atBatIndex?: number;
    playResult?: string;
    batterId?: number;
    pitchX?: number;
    pitchZ?: number;
    strikeZoneTop?: number;
    strikeZoneBottom?: number;
    batterGameAB?: number;
    batterGameH?: number;
    batterGameR?: number;
    batterGameRBI?: number;
    ```

- [x] **Step 2**: Add 4 pitch coordinate/zone fields to `LiveUpdate` type in `api/src/poller/poller.service.ts`
  - Add to the `LiveUpdate` type definition (after `pitchSpeedMph`):
    ```
    pitchX?: number;
    pitchZ?: number;
    strikeZoneTop?: number;
    strikeZoneBottom?: number;
    batterGameAB?: number;
    batterGameH?: number;
    batterGameR?: number;
    batterGameRBI?: number;
    ```

- [x] **Step 3**: Extract pitch coordinates, zone bounds, and batter game stats in `buildPlayUpdate()` in `api/src/poller/poller.service.ts`
  - After the `pitchSpeedMph` extraction block (around line 563), add:
    ```typescript
    const pitchX: number | undefined =
      typeof framePitch?.pitchData?.coordinates?.pX === 'number'
        ? framePitch.pitchData.coordinates.pX : undefined;
    const pitchZ: number | undefined =
      typeof framePitch?.pitchData?.coordinates?.pZ === 'number'
        ? framePitch.pitchData.coordinates.pZ : undefined;
    const strikeZoneTop: number | undefined =
      typeof framePitch?.pitchData?.strikeZoneTop === 'number'
        ? framePitch.pitchData.strikeZoneTop : undefined;
    const strikeZoneBottom: number | undefined =
      typeof framePitch?.pitchData?.strikeZoneBottom === 'number'
        ? framePitch.pitchData.strikeZoneBottom : undefined;
    ```
  - After `batterAvg` extraction (uses existing `batterPlayer`), add:
    ```typescript
    const batterGameStats = batterPlayer?.stats?.batting;
    const batterGameAB: number | undefined =
      typeof batterGameStats?.atBats === 'number' ? batterGameStats.atBats : undefined;
    const batterGameH: number | undefined =
      typeof batterGameStats?.hits === 'number' ? batterGameStats.hits : undefined;
    const batterGameR: number | undefined =
      typeof batterGameStats?.runs === 'number' ? batterGameStats.runs : undefined;
    const batterGameRBI: number | undefined =
      typeof batterGameStats?.rbi === 'number' ? batterGameStats.rbi : undefined;
    ```
  - Add all 8 new variables to the return object of `buildPlayUpdate()`

- [x] **Step 4**: Update `toPlayWire()` in `api/src/realtime/realtime.gateway.ts` to pass all 11 new fields
  - `atBatIndex: u.atBatIndex,`
  - `playResult: u.playResult,`
  - `batterId: u.batterId != null ? Number(u.batterId) : undefined,`
  - `pitchX: u.pitchX,`
  - `pitchZ: u.pitchZ,`
  - `strikeZoneTop: u.strikeZoneTop,`
  - `strikeZoneBottom: u.strikeZoneBottom,`
  - `batterGameAB: u.batterGameAB,`
  - `batterGameH: u.batterGameH,`
  - `batterGameR: u.batterGameR,`
  - `batterGameRBI: u.batterGameRBI,`

- [x] **Step 5**: Update `PlayUpdate` interface in `client/src/realtime/types.ts` to mirror the 11 new fields
  - Add after `pitchSpeedMph?: number`:
    ```typescript
    atBatIndex?: number;
    playResult?: string;
    batterId?: number;
    pitchX?: number;
    pitchZ?: number;
    strikeZoneTop?: number;
    strikeZoneBottom?: number;
    batterGameAB?: number;
    batterGameH?: number;
    batterGameR?: number;
    batterGameRBI?: number;
    ```

- [x] **Step 6**: Run `spec:check` — pre-existing REST endpoints (drilldown, pitching, leaders) caused spec staleness; regenerated spec, bumped version 1.0.23→1.0.24, published SDK, installed in client
  - `yarn spec:gen` ✓ | `just generate-client` ✓ | `node syncClientVersion.js` ✓ | `yarn npm publish` ✓ | client `yarn add @latest` ✓

- [x] **Step 7**: TypeScript build check — both packages compile cleanly
  - `cd api && yarn build` → exit 0 ✓
  - `cd client && tsc --noEmit` → exit 0 ✓
