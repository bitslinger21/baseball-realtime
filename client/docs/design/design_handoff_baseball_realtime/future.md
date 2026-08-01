# Future — parked items

Things intentionally deferred. Not bugs, not active work — design/build we've chosen to do later.

---

## F-001 · Upcoming tab — "no/thin data" states (sparse rookie, TBD probable, no games)

**Parked:** Jun 6, 2026 · **Origin:** raised during PR 9.5b (Statcast tier) sign-off.

The Upcoming tab's design assumes every game has a fully-populated probable starter with a real Statcast track record. Real data won't always cooperate. Three states are **not yet designed** — when the live data hits them today, the dev improvises (dim cells / blank), which reads as accidentally broken rather than intentional:

1. **Sparse-Statcast rookie** *(the pinned one)* — a just-called-up pitcher has thrown too few MLB pitches to compute a meaningful arsenal / batter-vs-pitch-type cross. The "What he throws" and "Arsenal vs your bat" sections have little or nothing to show. *(This case is literally in the tab's own demo — Marco Salas, game 2, the rookie LHP with no mlbId — so a real rookie WILL hit this path once data flows.)* Wanted: a deliberate "Limited pitch data — N MLB pitches" treatment that shows whatever partial mix exists instead of empty cells.
2. **Probable TBD** — **✅ DONE, SIGNED OFF & SHIPPED as PR 9.6 (Jun 20, 2026) — no longer parked.** The rotation-projection feature replaced the dead "TBD" card: the tab projects the opponent's likely starter from recent rotation order + 5-man cadence, flagged `Projected` (vs `Confirmed`) with decaying confidence (High/Medium/Low). Built in `holistic/player-upcoming.jsx` (`StarterChip`, `ProjectionBanner`, dashed-ring, `ReadCard` reframe); wired from schedule + recent-starters-per-game (API confirmed to expose recent-game starters Jun 20). Handoff: `PROMPT_PR9.6_rotation_projection.md` / MIGRATION PR 9.6. A true `status:'tbd'` fallback remains for when even a projection can't be made (rotation in flux / no recent-starts data).
3. **No upcoming games** — off-day / end of season / postseason gap. Wanted: an empty-tab state.

**Already designed (for contrast, NOT parked):** the "first meeting" (batter never faced this pitcher) empty state, and the "Sample data · live feed pending" mock flag.

**Effort:** ~half a day of design — three empty/degraded states reusing existing atoms. **Trigger to unpark:** when the live Upcoming data starts surfacing these in the app, or when we do a mobile/empty-state pass.

---

## F-002 · Game view — replay transport + scrubber rail (Part 2)

**Parked:** Jun 7, 2026 · **Re-scoped:** Jun 12, 2026 · **Re-framed:** Jun 20, 2026 · **Origin:** raised while reviewing the game-view pitch-by-pitch open position; split into two parts during the Jun 12 design pass.

**Re-framed Jun 20, 2026:** the *transport* half of Part 2 — the Replay↔Scout play-head (Play/Pause toggle, feed/cell seek, past/future boundary) — graduated into a concrete, agreed v1 model: **F-007 · Scout mode (finals).** This entry is now the **scrub-rail tier only**: (a) the compact **at-bat rail** (clickable lane of AB dots — a nicety, since the pitch feed already covers game-wide seek in F-007) and (b) the **draggable / continuous timeline scrubber** (drag the head along a track → ultimately the win-prob arc rail, gated on the PR 3.5 data). Build F-007 first; this is the later tier.

**Part 1 graduated out of this entry.** The *live-feed* position behavior — open at the live PA, auto-follow while pinned, break-on-scroll, "Jump to live" pill — is now designed and written up as **handoff MIGRATION PR 11** (closes BUG-009). It ships with zero backend changes. **This F-002 entry is now Part 2 only: the replay transport + scrubber rail for a *user-driven* play-head.**

Part 2 is **designed and prototyped** (`Game Position — Live & Replay.html`, `holistic/game-position.jsx`, **Replay** mode) — parked here, not yet a handoff PR, pending sign-off and (for the win-prob rail) new data.

**What Part 2 is:** the same play-head model as PR 11, but the user drives the head instead of the game. A **position bar** below the feed with:
1. **Transport** — play / pause, speed (1× / 2× / 4×), step-by-PA (⏮ ⏭). On a final game, ▶ replays the game; the head drives every panel (score, inning, count, last pitch, win prob).
2. **A scrub rail** the head drags along — built in **two tiers** (the prototype toggles between them):
   - **At-bat timeline rail — SHIPS TODAY, no API change.** A lane of dots, one per plate appearance, colored by result (rust HR, green hit, navy walk, grey out), inning markers, key plays flagged. Uses the seekable play history already on the socket (`hydrate` + `playIndex` ordering) — confirm `MAX_REPLAY_PLAYS` (currently 250) covers extra-inning games.
   - **Win-probability arc rail — GATED on new data.** The same drag interaction painted as the win-prob curve. Needs the `winProbability` (and, for the leverage readout, `leverageIndex`) field **mapped through `MlbPlay → LiveUpdate → PlayUpdateWire`** — both already exist in the raw MLB `feed/live` JSON, just unmapped (confirmed by the Jun 2026 API investigation). ~3 backend changes each (type → mapper → wire field). This is the **re-scoped PR 3.5 data** — when it lands, the arc rail and the leverage card both light up.

**Suggested handoff shape when unparked:** one PR for **transport + at-bat rail** (ungated, ships now) and fold the **win-prob arc rail + leverage** into the re-scoped **PR 3.5** (gated on the two mapped fields). The at-bat rail is the fallback the win-prob arc upgrades into — same interaction, swap what's painted on the track.

**Open questions to settle at sign-off:** does "pause" on a *live* game freeze the whole view or just the feed (and how does it hand back to PR 11's auto-follow)? is step-by-PA enough or do we also want jump-to-inning / jump-to-scoring-play (the line-score scoring summary is the obvious anchor set)? does the at-bat rail belong only on finals, or on live games too (as a "scrub back" within the hydrated window)?

**Effort:** transport + at-bat rail is a contained build (the prototype is the spec); win-prob arc is gated on the backend mapping. **Trigger to unpark:** when we take up replay UX, or when the win-prob/leverage fields get mapped (re-scoped PR 3.5).

---

## F-006 · Scorebook cell — full traditional scorekeeping notation (FC, bunt, spray, fielder detail)

**Parked:** Jun 14, 2026 · **Origin:** raised at PR 13 sign-off — the question "how do you score a fielder's choice, F8-vs-F9, or a bunt single vs a clean single?" exposed where the cell's model ends.

PR 13 shipped the cell's first two dimensions: **bases advanced** (the bold PA / light baserunning path) and a **result code string** (`F8`, `6-3`, `OUT`…). Traditional scorekeeping encodes more, and three things the current `ScorebookCell` can't yet say:

1. **Fielder's choice** — breaks the single-cell model. An FC is *two events*: the batter is **safe at 1st but credited no hit**, and a **different runner is put out**. The cell can show the batter reaching 1st with `code: 'FC'`, but it needs (a) a **not-a-hit `kind`** so the bold "earned at the plate" stroke doesn't imply a hit, and (b) **cross-runner linkage** to show the out on the *forced* runner's record — which a per-PA cell has no way to reference. This is a data-model question, not a styling tweak.
2. **Hit type / location** — `1B to the outfield` vs a `bunt single` are identical diamonds today (both `reachedOnPA: 1`, `kind: 'hit'`). Distinguishing them needs **hit-type** (bunt/liner/fly) + **spray location**, plus a notation we haven't designed (a bunt tick; a spray/zone indicator).
3. **Fielder/position detail beyond the code string** — `F8` (CF) vs `F9` (RF) already works *if* the feed carries the fielder position (that's PR 13's F-005 gate). Anything richer (assist chains, error attribution `E6`, the standard 6-4-3 double-play notation) is more data + more notation.

**The frame:** the cell expresses **dimension 1 (bases) fully** and **dimension 2 (result code) as far as the data allows (F-005)**. This item is **dimension 3 — the deeper scorekeeping layer**: a not-a-hit `kind`, cross-runner linkage for FC/DP, hit-type + spray, and error/assist notation.

**Not built — capture only.** **Effort:** large — a data question (what the play feed exposes for hit-type, spray, fielder credits, and runner linkage) *before* any design. **Trigger to unpark:** a dedicated "real scorebook" pass, or when the play feed is confirmed to carry hit-type + fielder-credit + runner-linkage data.

---

## F-007 · Game view — Scout mode (finals): one play head, Replay ↔ Scout

**Agreed:** Jun 20, 2026 · **Origin:** feature idea (Jun 20), iterated to a settled v1 model. **Re-frames the transport half of F-002.** No new API — runs on the existing play-by-play feed + shared atoms (`StrikeZone`, `ScorebookCell`, count / last-pitch strip).

**Scope:** final games only (v1). Live games keep their own follow / Jump-to-live behavior (PR 11); Scout does NOT apply to live in v1.

**Core principle — ONE play head; the whole screen reflects it.** A position in the game = a specific pitch within a specific AB. Line score, count, last-pitch strip, scoring summary, batter card, and pitch feed all render whatever the head is on. "Expanding an AB," "clicking a feed PA," and "clicking a scorebook cell" are the SAME action: **seek the head to the end of that AB.** No inspect-without-moving surface (two positions would be incoherent).

**Two modes, one Play/Pause control:**
- **Replay** = playing — pitches auto-advance on the feed's timing (the existing interval replay).
- **Scout** = paused — head frozen; user analyzes.
- **Pause** freezes at the current head (→ Scout). **Play** resumes from that same head (→ Replay). **Nothing rewinds.**

**Entry:** opening a final → **Scout, paused, head at the start of the game.** Selecting another final re-enters Scout-at-start regardless of the prior game's state. *(Reconcile with PR 12 position-persistence at build: a freshly-selected final opens at start; an in-app RETURN to a final you were just viewing should restore per PR 12.)*

**The toggle control — action icon + mode tag:** icon = the action (▶ when paused / ⏸ when playing); a persistent tag names the mode ("Scout" when paused / "Replay" when playing). Carries both the play/pause affordance and the mode vocabulary; a bare ▶/⏸ loses "Scout," a bare "Replay/Scout" segmented control loses the motion affordance.

**Navigation (all seek the one head):**
- **Play** → sequential auto-advance.
- **Pitch feed PA (click)** → game-wide seek: scroll to any inning, click a PA → head jumps to that AB's end and the PA expands (reuses the feed's existing click-to-expand). This is the cross-batter / jump-anywhere navigator — **so NO at-bat rail is needed in v1.**
- **Batter-card scorebook cell (click)** → within-batter seek: jumps the head among the current batter's ABs; shows that AB (zone + pitch locations).
- Clicking a past AB **while in Replay** → seek **and pause** (enter Scout), so what you clicked doesn't run away. Clicking **while in Scout** → seek, stay in Scout.

**Past/future boundary (temporal coherence):** show ALL of a game's ABs (so you can click an inning-1 AB and jump back), but draw the head as a boundary — ABs/PAs **through the head** (played) get full weight + a subtle border; ABs/PAs **beyond the head** (future) are visually de-emphasized (reachable, marked not-yet-happened). Applies identically to the batter-card scorebook row AND the pitch feed.

**Deferred (NOT v1) — see F-002:** the at-bat rail (the feed already covers game-wide seek) and the draggable / continuous timeline scrubber.

**Open / to settle at build:**
- PR 12 reconciliation (fresh-select Scout-at-start vs in-app-return position restore).
- Replay speed — inherit the existing single interval, or expose 1× / 2× / 4× (per F-002's transport).
- Exact past/future visual treatment (border weight, opacity) for played vs future cells.

**Effort:** contained build, no API — the play-head, feed/cell seek, and past/future styling reuse existing atoms. **Trigger to build:** when we pick up game-view replay/scout work. This is the near-term, ungated piece; F-002's rail + scrubber are the later tier.

---

## F-008 · Pitching tab — the actual pitcher's own view

**Parked:** Jul 18, 2026 · **Origin:** raised while reviewing PR 6.5.

Every Pitching tab designed so far (the lean shipped version and the parked rich PR 6.5) is built from the **batter's** perspective — "how pitchers attack this batter." No design exists for what a **pitcher** sees on their own player-view Pitching tab: their own repertoire/arsenal, usage mix, results by pitch type, etc. Distinct screen, distinct data shape (a pitcher's own Statcast profile, not a batter-vs-pitch-type cross).

**Not designed at all — not even a first pass.** **Effort:** unscoped — needs its own design pass (content model, layout) before an estimate. **Trigger to unpark:** when player-view work resumes, or a pitcher's own profile becomes a priority.

---

## F-009 · Alerts tray — needs a new home

**Parked:** Aug 1, 2026 · **Origin:** raised while reworking the top nav (`PageNav`/`PageMenu`).

The alerts bell (with unread badge) lived in the old per-screen header bar. That bar is gone — nav collapsed into a single hamburger (`PageMenu`) placed inline next to each page title. The bell doesn't have an obvious home in the new layout and was removed rather than force-fit somewhere. Content sketch discussed: score alerts (favorited team scores / close-game swings), game-state alerts (first pitch soon, game going final), player alerts (followed player up in a key spot, milestones), lineup/roster changes — grouped Today/Earlier in a slide-in tray (reusing the `LineupsTray` shell: dim backdrop, ✕/Esc/backdrop close), with a "Mark all read" action and an empty state.

**Not designed — placement + trigger only.** **Trigger to unpark:** next nav-related design pass, once a sensible spot (or a persistent app shell) exists for it.

---

## How to use this file

When unparking an item, move it into active work (CLAUDE.md "What's still open" / a MIGRATION PR) and delete it here. Add new parked items with an `F-NNN` id, a parked date, and a clear trigger for when to revisit.
