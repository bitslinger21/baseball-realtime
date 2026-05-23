# Bug Priority Assessment

Source: `design/system-analysis-2025-05.md` §6

---

## Priority Table

| # | Location | Issue | Priority | Rationale |
|---|---|---|---|---|
| 1 | `PlayerPage.tsx:287` | `p?.pnrimaryNumber` typo — dead read, never displayed | **LOW** | No functional impact. `view.number` correctly reads `primaryNumber` a few lines later. Confusing but harmless. |
| 2 | `GamePage.tsx:447–470` | Multiple `console.log` calls in timeline jump handler — logs DOM coordinates on every click | **HIGH** | Fires in production on normal user interaction. Verbose coordinate dumps (scrollTop, rects, scroll state) create noise and potentially expose internal layout details. |
| 3 | `useRealtimeGame.ts` (multiple sites) | `console.log` on every socket lifecycle event and every joinGame/leaveGame | **HIGH** | Runs in production during normal use. Logs socket IDs and game IDs on every connection event and every game toggle. Streams continuously during live use. |
| 4 | `GamesService.ts:49` | `console.log('[GamesService] listByDate CALLED', date)` on every game list request | **MEDIUM** | Server-side log. Noisy in server output but lower user-facing impact than client logs. |
| 5 | `poller.service.ts` | `TEAM_BRANDING_BY_ID` hardcoded 5-team map coexists with `TeamsMetaService` | **MEDIUM** | Functional inconsistency: 25 teams have no branding on WebSocket play updates. Not crashing but visibly incomplete and a maintenance liability. Addressed in FR-ARCH-1. |
| 6 | `BoxScorePanel.tsx:420` | `footerUiEnabled = false` permanently disables a complete UI section | **LOW** | Dead code. No functional regression. Addressed in FR-QOL-4. |
| 7 | `BatterOverviewPanel` | `today` section always shows "No current game data." | **MEDIUM** | Appears broken to users during live games. Classified as feature gap FR-FEAT-2, not a regression bug, but has bug-like user perception. |
| 8 | `realtime.gateway.ts:129` | Identical ternary branches: both arms return `new Date().toISOString()` | **LOW** | No functional impact. The condition is always redundant. Minor dead logic. |
| 9 | `GamesService.ts` `upsertSnapshot()` | `any` type for snapshot and meta parameters | **LOW** | Type safety issue only. No runtime impact. Acceptable technical debt for now. |
| 10 | `StatsService` | In-memory play/alert counters reset on every server restart | **LOW** | By design for current usage level. A feature gap (no persistence), not a regression. |

---

## Bugs to Fix (HIGH priority — Unit 4)

| Bug # | Fix |
|---|---|
| **#2** | Remove all `console.log` calls from `GamePage.tsx` timeline jump handler (lines 447–470). Keep the handler logic; remove the logging. |
| **#3** | Remove production `console.log` calls from `useRealtimeGame.ts`. Socket lifecycle events are not user-relevant information. Replace with no-ops or remove entirely. |

---

## Bugs to Fix (MEDIUM priority — included in relevant units)

| Bug # | Unit | Fix |
|---|---|---|
| **#4** | Unit 1 (Code Cleanup) | Remove `console.log` from `GamesService.listByDate()`. |
| **#5** | Unit 2 (Branding Unification) | Remove `TEAM_BRANDING_BY_ID` as part of FR-ARCH-1. |
| **#7** | Unit 7 (Player Today) | Wire live today data as part of FR-FEAT-2. |

---

## Bugs to Track (LOW priority — backlog)

| Bug # | Note |
|---|---|
| **#1** | Fix `pnrimaryNumber` typo when touching `PlayerPage.tsx` for another reason. |
| **#6** | Remove `footerUiEnabled` dead code as part of FR-QOL-4. |
| **#8** | Fix identical ternary in `realtime.gateway.ts` when touching that file. |
| **#9** | Tighten `upsertSnapshot()` types when touching `GamesService`. |
| **#10** | Add `StatsService` persistence in a future phase. |

---

*Please review this assessment. Reply with approval or any priority adjustments, and I will proceed to generate the full execution plan.*
