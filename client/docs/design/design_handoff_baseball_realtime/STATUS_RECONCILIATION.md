# Status reconciliation — Jun 21, 2026

Paste the **Corrected statuses** block near the top of `client/CLAUDE.md` (the file Claude Code
auto-reads) under a dated heading. Most-recent block wins, so it overrides the stale lines below it.
Then mirror the same one-liners into the design-side `CLAUDE.md` / `bug-list.md` / `future.md` so all
docs agree, and run the verify-in-code checklist before trusting any prose status.

---

## Corrected statuses (supersede any earlier/conflicting notes)

- **BUG-008 — FIXED, not open.** Final games show no LIVE pill; the live-only machinery (pill,
  follow, Jump-to-live) is gated behind a single `isLive` flag (PR 11, Jun 14). Confirmed in the
  PR 11 C8 acceptance check.
- **F-003 — DONE, not gated.** Bold PA-result stroke vs. lighter later-baserunning stroke is built
  into the live `ScorebookCell` (shipped in the PR 13 design). Only F-006 (FC / spray / error
  attribution) remains parked.
- **PR 6.6 (Performance-by-pitch-type data, via the `pitchLog` stat type) — design SIGNED OFF
  Jun 20.** Design-side records say PORTED + VERIFIED IN-APP (different batters → different real
  pitch-type tables). ⚠️ **VERIFY IN REPO** — see checklist. If merged → mark PR 6.6 + the BUG-011
  lean tab DONE; if not → it's the active deliverable.
- **BUG-011 — decision is option 2 ("redesign down").** Lean Pitching tab (Performance by pitch
  type + By pitcher hand, both real per-`:mlbId`) design signed off Jun 20; rich five-card version
  parked as `PitchingTabFull` (handoff PR 6.5, Statcast-gated). Ship status tracks PR 6.6 above.
- **F-007 (Scout mode) — DESIGNED + prototyped, pending sign-off.** Runnable prototype
  `Game Scout Mode.html` (`holistic/game-scout.jsx`, built on game-v2), handoff `PROMPT_F007_scout_mode.md`.
  Pure client, finals only, no new API. Unpark from `future.md` once signed off + ported.
- **BUG-010 — duplicate id, renumber.** `BUG-010` = game-view position reset (🟢 FIXED, PR 12).
  The Stats-tab "HR row shows the XBH doubles/triples note (and `OT` vs `0T`)" item must get a NEW
  id (e.g. `BUG-012`, 🔴 open) so "BUG-010" stops being ambiguous.

## Verify-in-code checklist (ground truth — do this before reporting status)

- [ ] `PitchingTab` takes an `mlbId`/player arg and renders a **per-player** pitch-type table (no
      shared "Peña / 314 pitches seen" mock). → settles PR 6.6 + BUG-011.
- [ ] The `PageTitle` LIVE pill is gated on `isLive`; a **final** game renders no pill/follow. → BUG-008.
- [ ] `ScorebookCell` draws the bold PA stroke + lighter baserunning stroke (scored/stranded/out-on-base
      end-states). → F-003.

## Still genuinely open / gated (unchanged — Claude Code had these right)
BUG-001 (player↔active-game link), BUG-006 (History AVG running-average), the renumbered Stats-tab HR
note; PR 3.5 (gated on mapping `winProbability` + `leverageIndex` from the feed JSON); PR 6.5 + F-001 #1
(gated on Statcast/Savant ingest + ToS); mobile, empty/loading/error states, postgame game view,
pitcher's-own-arsenal tab, Alerts panel (all undesigned).

---

## How to apply

1. **Verify first.** Run the 3-item checklist against the actual code (git log / the components),
   not the docs. The PR 6.6 / BUG-011 line is the only real unknown — set it DONE or ACTIVE based on
   what you find.
2. **Update the repo grounding doc.** Paste the Corrected-statuses block into `client/CLAUDE.md` under
   a `## Status reconciliation — Jun 21, 2026` heading near the top. This is the file Claude Code reads
   to ground itself.
3. **Make the design-side docs agree.** Apply the same one-liners to `CLAUDE.md`, `bug-list.md`
   (flip BUG-008/F-003, set BUG-011 per step 1, renumber the duplicate BUG-010), and `future.md`
   (move F-007 to active once signed off).
4. **Re-ground Claude Code.** Start a fresh session, or tell it: *"re-read `client/CLAUDE.md` and
   `MIGRATION.md`; status changed — confirm each status against the code before reporting."* The drift
   is mostly stale context; a clean session on current docs fixes it.
