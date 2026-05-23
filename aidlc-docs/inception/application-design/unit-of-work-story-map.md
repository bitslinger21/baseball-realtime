# Unit of Work Story Map

Maps all functional requirements and bugs from `requirements.md` and `bug-priority-assessment.md` to their implementation unit.

---

## FR-ARCH: Architectural Improvements

| Requirement | Description | Unit | Status |
|---|---|---|---|
| FR-ARCH-1 | Team Branding Unification — remove `TEAM_BRANDING_BY_ID`, inject `TeamsMetaService` into `PollerService` | U2 | Planned |
| FR-ARCH-2 | `TeamsMetaService` resilience — startup error handling, 60s retry, daily cron refresh | U2 | Planned |
| FR-ARCH-3 | `PlayersService` caching — 24h bio TTL, 5min stats TTL | U3 | Planned |
| FR-ARCH-4 | `BoxScoreService` caching — 15s TTL by `providerGameId` | U3 | Planned |
| FR-ARCH-5 | `GameDto` type safety — add missing fields, remove unsafe casts | U5 | Planned |
| FR-ARCH-6 | WebSocket URL config — `VITE_SOCKET_URL` env var | U5 | Planned |
| FR-ARCH-7 | NestJS Configuration Module | — | **DEFERRED** (local dev only) |
| FR-ARCH-8 | BullMQ Queue Separation — dedicated `daily-poller` queue | U4 | Planned |
| FR-ARCH-9 | Health Endpoint | — | **DEFERRED** (local dev only) |
| FR-ARCH-10 | Daily Schedule Caching | — | **DEFERRED** (nice to have) |

---

## FR-FEAT: Feature Completions

| Requirement | Description | Unit | Status |
|---|---|---|---|
| FR-FEAT-1 | Standings Page — full AL/NL standings with branding, L10, STRK | U7 | Planned |
| FR-FEAT-2 | Player "Today" Performance — live game-day stat line | U8 | Planned |
| FR-FEAT-3 | Player Splits Tab — vs LHP/RHP, home/away, day/night | U9 | Planned |
| FR-FEAT-4 | Debug Tab Gating — hidden behind `import.meta.env.DEV` | U1 | Planned |
| FR-FEAT-5 | Consistent Replay Delay — shared `getReplayDelayMs()` utility | U1 | Planned |

---

## FR-QOL: Quality of Life

| Requirement | Description | Unit | Status |
|---|---|---|---|
| FR-QOL-1 | Alert History Panel — collapsible (slide-in drawer), lazy fetch | U10 | Planned |
| FR-QOL-2 | Game Page Back Navigation — "← Back" button | U1 | Planned |
| FR-QOL-3 | Date Change Clears Selected Game | U1 | Planned |
| FR-QOL-4 | `footerUiEnabled` Dead Code Removal | U1 | Planned |

---

## FR-BUGS: Bug Fixes

| Bug # | Priority | Description | Unit | Status |
|---|---|---|---|---|
| #1 | LOW | `pnrimaryNumber` typo in `PlayerPage.tsx` | U1 | Planned (opportunistic fix) |
| #2 | **HIGH** | `console.log` in `GamePage.tsx` timeline handler | U1 | Planned |
| #3 | **HIGH** | `console.log` in `useRealtimeGame.ts` socket lifecycle | U1 | Planned |
| #4 | MEDIUM | `console.log` in `GamesService.listByDate()` | U1 | Planned |
| #5 | MEDIUM | `TEAM_BRANDING_BY_ID` stale hardcoded map | U2 | Planned |
| #6 | LOW | `footerUiEnabled = false` dead code | U1 | Planned |
| #7 | MEDIUM | `BatterOverviewPanel` Today always shows stub | U8 | Planned |
| #8 | LOW | Identical ternary in `realtime.gateway.ts:129` | U1 | Planned |
| #9 | LOW | `upsertSnapshot()` `any` types | — | **BACKLOG** |
| #10 | LOW | `StatsService` in-memory counters reset on restart | — | **BACKLOG** |

**U6 verification scope**: Confirm bugs #2, #3 (HIGH) and #4, #5 (MEDIUM) are all resolved after their respective units merge.

---

## Coverage Summary

| Category | Total | Planned | Deferred/Backlog |
|---|---|---|---|
| FR-ARCH | 10 | 7 | 3 |
| FR-FEAT | 5 | 5 | 0 |
| FR-QOL | 4 | 4 | 0 |
| FR-BUGS | 10 | 8 | 2 |
| **Total** | **29** | **24** | **5** |

---

## Deferred / Backlog (Do Not Lose Sight Of)

| Item | Source | Trigger to revisit |
|---|---|---|
| Health endpoint | FR-ARCH-9 | When deployment target changes from local dev |
| NestJS Config Module | FR-ARCH-7 | When deployment target changes |
| Daily schedule caching | FR-ARCH-10 | When MLB API rate limits become a concern |
| `upsertSnapshot()` type safety | Bug #9 | Next time `GamesService` is touched |
| `StatsService` persistence | Bug #10 | When observability becomes important |
| Multi-game view on Game page | §4.2 F6 | After Wave 4 stable |
| Standings live WebSocket updates | Future | After U7 ships |
| Social features | PDF | Future major phase |
| At-Bat Card System | PDF | Future major phase |
| Advanced analytics | PDF | Future major phase |
