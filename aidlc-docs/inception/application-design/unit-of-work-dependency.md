# Unit of Work Dependencies

---

## Dependency Matrix

| Unit | Depends On | Nature of Dependency |
|---|---|---|
| U1 | — | No dependencies; bases off `main` |
| U2 | — | No dependencies; bases off `main` |
| U3 | — | No dependencies; bases off `main` |
| U4 | — | No dependencies; bases off `main` |
| U5 | Wave 1 (soft) | No hard code dependency; recommended after Wave 1 merges for a clean, typed baseline |
| U6 | U1 | Verifies HIGH bugs from U1; must open after U1 merges |
| U7 | Wave 1 (soft) | Uses `TeamsMetaService` (stable after U2); recommended after Wave 1 merges |
| U8 | — | No code dependency; stash restore is local only |
| U9 | — | No code dependency on any other unit |
| U10 | — | Uses existing `GET /alerts` endpoint; no code dependency |

**Hard dependencies** (branch must not open until prerequisite merges): U6 → U1  
**Soft dependencies** (recommended sequencing for a cleaner baseline, not blocking): U5 after Wave 1; U7 after Wave 1

---

## Wave Sequencing

```
main
 │
 ├─── Wave 1 (parallel-capable) ──────────────────────────────────────────┐
 │     unit/1-code-cleanup          ──► merge to main                     │
 │     unit/2-branding-unification  ──► merge to main                     │
 │     unit/3-api-caching           ──► merge to main                     │
 │     unit/4-queue-separation      ──► merge to main                     │
 │                                                                         │
 ├─── Wave 2 (after Wave 1 preferred) ────────────────────────────────────┤
 │     unit/5-gameDtoTypeSafety     ──► merge to main                     │
 │                                                                         │
 ├─── Wave 3 (after U1 merges — hard) ────────────────────────────────────┤
 │     unit/6-bug-verification      ──► merge to main                     │
 │                                                                         │
 ├─── Wave 4 (parallel-capable; after Wave 1 preferred) ──────────────────┤
 │     unit/7-standings-page        ──► merge to main                     │
 │     unit/8-player-today          ──► merge to main  (restore stash)    │
 │     unit/9-player-splits         ──► merge to main                     │
 │                                                                         │
 └─── Wave 5 ──────────────────────────────────────────────────────────────┘
       unit/10-alert-history        ──► merge to main
```

---

## Branch Base Strategy

All branches base off `main`. When parallel branches within a wave both modify the same file (e.g. `players.service.ts` is touched by both U8 and U9), the second branch to merge will require a conflict resolution. Known cross-unit file touches:

| File | Units That Touch It | Resolution |
|---|---|---|
| `api/src/players/players.service.ts` | U3, U8, U9 | U3 merges first (caching); U8 and U9 add to the cached version |
| `api/src/mlb/mlb.service.ts` | U7, U9 | Each adds distinct methods; merge conflict unlikely but review needed |
| `client/src/pages/PlayerPage.tsx` | U1, U9, (U8 via stash) | U1 merges first (cleanup + typo fix); U9 adds splits; U8 stash applied on top |
| `client/src/api/baseballApiClient.ts` | U7, U9, U10 | Each adds distinct methods; merge conflict unlikely |

---

## Stash Note — Unit 8

Before opening `unit/8-player-today`, restore the stash containing in-progress `BatterOverviewPanel` work:

```bash
git stash list          # confirm stash is present
git stash pop           # restore to working tree
```

The stash contains: `client/src/pages/PlayerPage.tsx`, `client/src/pages/player/BatterOverviewPanel.css`, `client/src/pages/player/BatterOverviewPanel.tsx`.
