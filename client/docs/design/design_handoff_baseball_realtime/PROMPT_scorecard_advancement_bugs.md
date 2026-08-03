# Scorecard advancement bugs — Aug 3, 2026

Files: `client/src/pages/GamePage.tsx`, `client/src/pages/game/PitchByPitchV2.tsx`,
`api/src/poller/poller.service.ts`, `client/public/scorebook-cell.js`

---

## Terminology (established this session)

- **AB advancement lines** — the bold path drawn on a batter's own scorebook cell, starting
  at home plate, tracing the bases they reached on their own plate appearance.
- **Secondary advancement lines** — the lighter path drawn on that same cell showing
  advancement BEYOND their own PA result, driven by a later teammate's at-bat.

---

## Bug 1 — Secondary advancement appears immediately (not at end of source AB)

### Root cause (identified and fixed this session)

The MLB live feed is polled repeatedly. Each poll emits a `PlayUpdate` for every pitch seen
so far in each at-bat. With the OLD server logic (`isFinalPitchOfAtBat: i === pitchEvents.length - 1`),
EVERY update for an in-progress AB marked its last-seen pitch as final, so multiple updates for
the same AB could all carry `isFinalPitchOfAtBat=true` and a premature `playResult`.

`runnerFinalBaseByAtBat` processed these in sequence. The FIRST qualifying update correctly
placed the batter in `b2` (e.g. Trammell's double → `b2 = Trammell_idx`). The SECOND update for
the same AB then re-entered the `Double` branch, found `b2` already occupied, and treated the
batter as a PRIOR RUNNER — advancing them spuriously to 3B or home before the next AB had
even started.

### Fixes applied

**Server** (`api/src/poller/poller.service.ts` — committed in 93630c0, needs restart):
```ts
isFinalPitchOfAtBat: i === pitchEvents.length - 1 && about.isComplete === true,
```
Only the truly final pitch of a completed AB is marked final. Requires API server restart to take effect.

**Client** (`GamePage.tsx` `runnerFinalBaseByAtBat` — uncommitted):
Pre-deduplication pass keeps only the LAST qualifying update per `atBatIndex`:
```ts
const lastFinalUpdateByIdx = new Map<number, (typeof replayUpdates)[0]>();
for (const u of replayUpdates) {
  if (u.playResult != null && u.atBatIndex != null && u.isFinalPitchOfAtBat !== false) {
    lastFinalUpdateByIdx.set(u.atBatIndex, u);
  }
}
// In the loop, after the existing guards:
if (lastFinalUpdateByIdx.get(idx) !== u) continue;
```
This is belt-and-suspenders: it prevents double-processing even when hydrate data was produced
by the old server (before restart).

**Logging also added** (uncommitted): every AB processed by the useMemo prints to console,
and every `recordAdvance` call logs the runner, destination base, and which AB drove it.
Watch for `[scorecard] AB#N → 3B (driven by AB#M)` — this should NEVER appear in the console
at the same time as the `processing AB#N` line; AB#M's processing line must come first.

---

## Bug 2 — HBP scorebook cell annotation shows as `●` dot

### Root cause

`mapEventToPlayResult` (server) normalizes all hit-by-pitch events to the string `'HBP'`.
`playResultToCode` (client, `PitchByPitchV2.tsx`) had:
```ts
case 'HitByPitch': return 'HBP';
```
…which the server never sends. `'HBP'` fell to the `default` case → returned `scorebookCode ?? '●'`
→ scorebook code is undefined for HBP → the cell rendered a solid bullet dot `●`.

### Fix applied (`PitchByPitchV2.tsx` — uncommitted)

```ts
case 'HBP':
case 'HitByPitch': return 'HBP';
```

---

## State of uncommitted changes

Two files have changes not yet committed:

| File | Change |
|------|--------|
| `client/src/pages/GamePage.tsx` | `lastFinalUpdateByIdx` dedup + logging in `runnerFinalBaseByAtBat` |
| `client/src/pages/game/PitchByPitchV2.tsx` | `case 'HBP':` in `playResultToCode` |

---

## What still needs to happen

1. **Commit** the two client-side changes above.
2. **Restart the API server** so the `about.isComplete` guard is live. Until restarted, hydrate
   data may still contain stale multi-final-pitch updates; the client dedup handles those, but
   new live-pitch updates will still be wrong until the server is running new code.
3. **Verify** in the console: open game 824164, watch the bottom of the 2nd. You should see
   `[scorecard] processing AB#N result=Double ...` log for Trammell's AB, then NO secondary
   advancement logged until the next AB's processing line appears.

---

## Previously fixed (committed in 93630c0)

- `AboutLike.isComplete?: boolean` added to poller types
- `isFinalPitchOfAtBat && about.isComplete === true` guard on server
- `isFinalPitchOfAtBat?: boolean` added to `PlayUpdate` interface (`types.ts`)
- Client useMemo: `u.isFinalPitchOfAtBat === false` skip guard (first belt)
- `playResultToCellProps` in `PitchByPitchV2.tsx`: `case 'HBP':` for bold-path rendering
- `reachFirst` array in `scorebook-cell.js`: `'HBP'` added
- Advancement annotation positions confirmed: H→1B code at `[76,80]`, 2B annotation at `[72,36]`,
  3B annotation at `[32,32]`
