# Plan G — Unit of Work Plan

## Conventions (carried forward from prior units)
- Branch naming: `unit/<N>-<slug>`
- Merge strategy: merge commit (preserves intra-unit history)
- Parallelism: N/A — U26 depends on U25 SDK output; sequential only
- Next unit number: U25 (following U24)

## Artifacts to Generate
- [ ] `plan-g-unit-of-work.md` — unit definitions
- [ ] `plan-g-unit-of-work-dependency.md` — dependency matrix
- [ ] `plan-g-unit-of-work-story-map.md` — requirement-to-unit mapping

---

## Planning Questions

### Question 1
The requirements doc marks "reconstruct past at-bats on initial page load for a game in progress" as out of scope. Please confirm.

A) Confirmed out of scope — on page load the feed starts fresh; only at-bats that happen while the user is watching get the full card treatment

B) Include it — when GamePage loads mid-game, fetch the game's play-by-play and reconstruct completed at-bat cards from prior innings (adds significant scope to U26)

C) Other (please describe after [Answer]: tag below)

[Answer]: The pas innings and batters should still be there. Clicking on a past batter loads that at bat card. This can be a lazy load or a lookup from cache when all loaded on startup

### Clarification 1a
The existing WebSocket already sends ALL historical plays to the client on connect via `GameHydratePayload` (the `hydrate` event). Once `atBatIndex` is added to `PlayUpdateWire` in U25, `useAtBatHistory` can reconstruct all past at-bat blocks directly from that hydration data — no extra API call or lazy fetch needed. Past batter cards would be fully populated immediately on page load; clicking a row just expands the already-loaded card.

Does this approach work, or do you need something different?

A) Yes — use the existing hydration payload to reconstruct past at-bats on load; no lazy fetch needed

B) Still prefer lazy fetch — show batter name rows on load but only populate card data when user clicks

C) Other (please describe after [Answer]: tag below)

[Answer]: A

---

### Question 2
How should at-bat completion be detected in `useAtBatHistory`?

A) batterId change only — when a new batter appears in `PlayUpdateWire`, the previous at-bat is closed; simple and reliable

B) Result event detection — close the at-bat when a terminal event is detected (Home Run, Strikeout, Walk, Hit, etc.) in the play description; more accurate but requires parsing event strings

C) Both — use result event for immediate close when detected; fall back to batterId change for edge cases

D) Other (please describe after [Answer]: tag below)

[Answer]: How did it do it previously?

### Research Finding — Q2
The existing system does NOT detect at-bat boundaries in the client at all — it renders each pitch as a plain row with no grouping. However, the server already does the work:

- `LiveUpdate.atBatIndex` — an integer that increments with each new at-bat (same index = same batter's at-bat). Set from `about.atBatIndex` in the MLB live feed.
- `LiveUpdate.playResult` — only populated on the FINAL pitch of an at-bat (gated by `isFinalPitchOfAtBat === true` in the poller). Values: `'Single' | 'Double' | 'Triple' | 'HomeRun' | 'Walk' | 'Strikeout' | 'Out' | 'HBP' | 'Error' | 'Other'`

Both fields exist but are currently **stripped by `toPlayWire()`** and never reach the client.

**Proposed approach**: Add `atBatIndex` and `playResult` to `PlayUpdateWire` in U25. `useAtBatHistory` then:
- Groups pitches by `atBatIndex` (clean, no batterId string parsing)
- Detects completion when `playResult` is non-null (already final-pitch-only on the server)
- No ambiguous edge cases

Please confirm this approach:

A) Confirmed — add `atBatIndex` + `playResult` to `PlayUpdateWire`; use them in `useAtBatHistory`

B) Other (please describe after [Answer]: tag below)

[Answer]: A
