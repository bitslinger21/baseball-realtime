# U1 Code Generation Plan — Production Code Cleanup

**Branch**: `unit/1-code-cleanup`  
**Wave**: 1  
**Packages**: `api/`, `client/`

---

## Unit Context

**Stories implemented**: FR-FEAT-4 (partial — Debug tab in stash, handled in U8), FR-FEAT-5, FR-QOL-2, FR-QOL-3, FR-QOL-4, Bugs #2, #3, #4, #6, #8

**Scope adjustment from original plan**:  
The committed `PlayerPage.tsx` does not yet have tabs (Debug/Splits/Overview). The in-progress tab work is in the git stash, restored in U8. Therefore:
- `pnrimaryNumber` typo fix → **U8** (in stash)
- Debug tab gating → **U8** (in stash)

Everything else in the original U1 scope applies to the committed codebase.

**Dependencies**: None. Bases off `main`.

**Key files to modify**:
- `client/src/pages/GamePage.tsx`
- `client/src/pages/DailyGamesPage.tsx`
- `client/src/realtime/useRealtimeGame.ts`
- `client/src/pages/BoxScorePanel.tsx`
- `client/src/utils/replayDelay.ts` *(new)*
- `api/src/games/games.service.ts`
- `api/src/realtime/realtime.gateway.ts`

---

## Generation Steps

- [x] **Step 1 — Create branch**  
  `git checkout -b unit/1-code-cleanup`

- [x] **Step 2 — Extract `getReplayDelayMs()` to shared utility** *(FR-FEAT-5)*  
  Create `client/src/utils/replayDelay.ts`. Move the `getReplayDelayMs()` function that currently lives in `DailyGamesPage.tsx` (line 52) into this new file and export it. The function reads `localStorage.getItem('br-replay-delay-ms')`, parses it, and returns a number (ms). Remove the function definition from `DailyGamesPage.tsx` and import from the new util.

- [x] **Step 3 — Wire `getReplayDelayMs()` into `GamePage.tsx`** *(FR-FEAT-5)*  
  In `GamePage.tsx`, replace the hardcoded `2000` at line 219 (`window.setTimeout(..., 2000)`) with `getReplayDelayMs()`. Import from `../utils/replayDelay`.

- [x] **Step 4 — Remove `console.log` calls from `GamePage.tsx`** *(Bug #2)*  
  Remove the 4 `console.log` calls in the timeline jump handler:
  - Line 430: `console.log(\`Timeline jump to target...\`)`
  - Line 433: `console.log("Timeline jump aborted...")`
  - Line 447–465: `console.log("Timeline jump before scroll", {...})` block
  - Line 466–479: `console.log("Timeline jump after scroll", {...})` block  
  Preserve the surrounding handler logic; remove only the log statements.

- [x] **Step 5 — Add "← Back" button to `GamePage.tsx`** *(FR-QOL-2)*  
  Import `useNavigate` from `react-router-dom` and add a `navigate(-1)` back button at the top of the `GamePage` render output. Match the pattern used in `PlayerPage.tsx` (line 255): `<button className="back-link" onClick={() => navigate(-1)}>← Back</button>`.

- [x] **Step 6 — Remove `console.log` calls from `useRealtimeGame.ts`** *(Bug #3)*  
  Remove all 9 `console.log` calls (lines 97, 104, 112, 119, 125, 208, 217, 247, 255). Preserve all surrounding socket lifecycle logic.

- [x] **Step 7 — Clear selected game on date change in `DailyGamesPage.tsx`** *(FR-QOL-3)*  
  In `handleDateChange` (line 488), add `setSelectedProviderGameId(null)` after `setSelectedDate(value)`. This ensures the right panel does not hold a stale game when the date changes.

- [x] **Step 8 — Remove `footerUiEnabled` dead code from `BoxScorePanel.tsx`** *(FR-QOL-4 / Bug #6)*  
  Remove the `const footerUiEnabled = false` declaration (line 420) and both conditional blocks gated on it (lines 558–584 and 585–end-of-footer-block). The R/H/E summary is already shown in the header table; the footer section is redundant dead code.

- [x] **Step 9 — Remove `console.log` from `GamesService.ts`** *(Bug #4)*  
  Remove line 48: `console.log('[GamesService] listByDate CALLED', date)`.

- [x] **Step 10 — Fix identical ternary in `realtime.gateway.ts`** *(Bug #8)*  
  At line 129: `ts: typeof u.meta === "object" ? new Date().toISOString() : new Date().toISOString()` — both branches return the same value. Replace with `ts: new Date().toISOString()`.

- [x] **Step 11 — TypeScript check**  
  Run `cd client && npx tsc --noEmit` and `cd api && npx tsc --noEmit`. Resolve any type errors introduced by the changes.

- [x] **Step 12 — SDK spec check** *(run from `api/`)*  
  Run `yarn spec:check`. U1 makes no API surface changes, so this is expected to report no diff. If it reports changes, investigate before proceeding.

- [x] **Step 13 — Smoke test**  
  Start the dev server. Verify:
  - Browser console is silent during normal game page use (no timeline logs)
  - Replay delay is consistent between DailyGamesPage and GamePage
  - Back button appears on GamePage
  - Changing date in DailyGamesPage clears the right panel
  - No visible regressions on game list, live feed, box score

- [x] **Step 14 — Commit**  
  Stage all changed files and commit with message describing the cleanup.

---

## Story Traceability

| Story | Step(s) |
|---|---|
| FR-FEAT-5 Consistent replay delay | Steps 2, 3 |
| FR-QOL-2 Back button on GamePage | Step 5 |
| FR-QOL-3 Date change clears game | Step 7 |
| FR-QOL-4 footerUiEnabled cleanup | Step 8 |
| Bug #2 GamePage console.logs | Step 4 |
| Bug #3 useRealtimeGame console.logs | Step 6 |
| Bug #4 GamesService console.log | Step 9 |
| Bug #6 footerUiEnabled dead code | Step 8 |
| Bug #8 Identical ternary | Step 10 |

**SDK note**: Steps 12 (spec:check) is a verification only for U1. Units that require a full SDK publish cycle: U5 (GameDto fields), U7 (/standings endpoint), U9 (/players/:id/splits endpoint).

**Moved to U8** (in stash): Bug #1 (pnrimaryNumber typo), FR-FEAT-4 (Debug tab gating)
