# U6 — Bug Verification Checklist

Verified on: 2026-05-23

## HIGH Priority Bugs

| # | Description | Status | Evidence |
|---|---|---|---|
| 2 | `console.log` in `GamePage.tsx` timeline jump handler | ✅ Resolved | `grep console.log client/src/pages/GamePage.tsx` → no matches |
| 3 | `console.log` in `useRealtimeGame.ts` socket lifecycle | ✅ Resolved | `grep console.log client/src/realtime/useRealtimeGame.ts` → no matches |

## MEDIUM Priority Bugs

| # | Description | Status | Evidence |
|---|---|---|---|
| 4 | `console.log` in `GamesService.listByDate()` | ✅ Resolved (U1) | `grep console.log api/src/games/games.service.ts` → no matches |
| 5 | `TEAM_BRANDING_BY_ID` hardcoded 5-team map | ✅ Resolved (U2) | `grep TEAM_BRANDING_BY_ID api/src/` → no matches |

## LOW Priority Bugs (fixed opportunistically in U1)

| # | Description | Status | Evidence |
|---|---|---|---|
| 1 | `pnrimaryNumber` typo in `PlayerPage.tsx` | ✅ Resolved (U1) | `grep pnrimaryNumber` → no matches |
| 6 | `footerUiEnabled = false` dead code in `BoxScorePanel.tsx` | ✅ Resolved (U1) | `grep footerUiEnabled` → no matches |
| 8 | Identical ternary branches in `realtime.gateway.ts:129` | ✅ Resolved (U1) | Line 129 now a direct `new Date().toISOString()` expression |

## Remaining Known Issues (not in scope for this wave)

| # | Description | Planned Unit |
|---|---|---|
| 7 | `BatterOverviewPanel` always shows "No current game data" | U8 — Player Today |
| 9 | `any` types in `GamesService.upsertSnapshot()` | Backlog |
| 10 | `StatsService` counters reset on restart | Backlog |

## Notes

- `api/src/poller/poller.service.ts:588` contains a `console.log` that is explicitly gated behind `process.env.DEBUG_BASES === "1"` — intentional debug opt-in, not a production issue.
- `api/src/domains/config/redis.config.ts:40` contains an informational `console.log` for Redis connection confirmation — acceptable server-side startup logging.
