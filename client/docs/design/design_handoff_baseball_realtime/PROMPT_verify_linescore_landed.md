# AUDIT (read-only) — did the line-score band work already land?

**Do not change any code while running this.** Every step is a read or a measurement. The output
is a report; fixes come after, as a separate pass, once we know what is actually there.

Context: the design side rebuilt the game view's dark line-score band as a 48px sticky bar plus an
overlay drawer (`PROMPT_linescore_band.md`, §0–§6), then aligned the pregame band and Scout mode to
it as thin wrappers (§7). Looking at the running app, the line scores **appear** already aligned.
That could mean any of four things, and they need different follow-ups:

1. The whole change landed, including the shared component.
2. The bar landed on the live view, and pregame/Scout were *separately* built to look similar —
   three implementations that agree today and will drift.
3. Something else was aligned (e.g. all three still on the OLD three-zone band, consistently) —
   "aligned" without being the new design at all.
4. It landed partially: the bar, but not the deletions, or not the one-scroller fix.

**Visual similarity is not evidence of a shared component.** Please distinguish these explicitly
rather than reporting "looks right".

---

## 1. Establish what exists

Search the client for the band and its callers:

- `LineScoreBand`, `PregameLineScoreBand`, `ScoutBand` (or whatever the app calls them) — list every
  file that **defines** a band, and every file that **renders** one.
- Report the count of distinct band *implementations*. One = case 1. Two or three = case 2.
- If there is one, list its props and say whether they cover `mode` (or equivalent pregame flag),
  caller-supplied `zones`/drawer content, caller-supplied `leaders`, and a trigger label override.

## 2. Measure the live bar

On a live (or in-progress) game, in the browser:

- Bar height. **Expected 48px.** If it is ~164px the new design did not land.
- `position: sticky` with the bar surviving a scroll to the feed. **Expected: yes** — it is the one
  piece of game chrome that stays.
- What the bar contains. **Expected: the score and the disclosure trigger, nothing else.**

## 3. The three deletions (§0) — the most likely partial

These were *deleted, not moved*, and a port can easily keep them. For each, report present/absent
**in the band**:

| Should be ABSENT from the band | Because it lives in |
|---|---|
| LIVE pill | the page header |
| Inning indicator | the play-state eyebrow, beside B/S/O |
| Last pitch type / velo / result | the pitch-by-pitch feed |

If any is still in the band, that is leftover chrome, not a feature — flag it. Note that the
last-pitch one shipped to production in July, so its removal is a **deletion the port must perform**,
not a no-op.

## 4. The drawer

- Opens from the bar's trigger. Report the trigger's label text.
- **Overlays** the content below — the feed must NOT be pushed down when it opens. Measure the
  y-position of the first card below the bar with the drawer closed and open: **expected identical**.
- Shrink-to-fit width (ends just past the leaders), not full-bleed with an empty half.
- Contains the inning grid and game leaders.

## 5. The one-scroller fix (§2) — the latent bug

This is the check most likely to be skipped, because it is invisible in a 9-inning game.

The old design used three horizontally-synced scrollers (inning header, away runs, home runs). The
new one is a single scroller holding all rows as one grid. The old model had a real bug: row
components declared *inside* the band meant every scroll-state update remounted them and reset
`scrollLeft` to 0 mid-scroll, so **inning numbers drifted off the runs beneath them**.

- Report whether the app's grid is ONE scroll container or several synced ones.
- If several: **find an extra-inning game** (10+ innings) so the row overflows, scroll it
  horizontally, and report whether the header stays aligned with the runs. The shipped app is
  suspected to still carry this.
- Also report whether row/cell components are declared inside the band component's body.

## 6. Pregame (§7b)

On a scheduled game, before first pitch:

- Bar height **48px** (not a tall block) — and confirm the game view does **not change shape**
  between pregame and live.
- Runs: **one dash per side, NO separator between them**. Three dashes in a row is the thing we
  deliberately avoided.
- **Neither side dimmed** (the live bar dims the trailing team; nobody trails yet).
- Trigger label mentions probables — expected **"Line score & probables"**.
- Drawer's right side: **probable pitchers + season form**, and **no empty Game leaders zone**.
- Innings count comes from a prop/schedule value, not a hardcoded 9 (7-inning doubleheader case).

## 7. Scout mode (§7c)

On a final, in Scout:

- Bar shows the score **as of the marker**, not the final score. Move the marker back a few innings
  and confirm the bar's score changes.
- Innings the marker has not reached render as **dashes**, not zeros.
- R/H/E and game leaders are computed **through the marker**.
- Drawer does not change height when a second leader appears (two slots always reserved).
- **Last-pitch zone absent** from the Scout band (same deletion as §3).

## 8. Report format

Please answer in this shape — short, and with the measured value, not a judgement:

```
Case (1/2/3/4):
Band implementations found:      N   (files: …)
Live bar height:                 __px      (expect 48)
Sticky:                          yes/no
Deletions — LIVE pill:           absent/present
             inning:             absent/present
             last pitch:         absent/present
Drawer overlays (no push):       yes/no     (card y: closed __ / open __)
Trigger label:                   "…"
Innings scroller:                one / N synced
Extra-inning alignment:          holds / drifts / not tested (no 10+ inning game available)
Pregame bar height:              __px
Pregame runs:                    dashes+separator? dimming?
Pregame drawer right zone:       …
Scout score as of marker:        yes/no
Scout last pitch:                absent/present
```

Then, in one short paragraph: **what remains to be done**, if anything. If everything above checks
out, say so plainly — a clean audit is a useful result and means we can close the handoff rather
than port it.

## 9. What NOT to do

- Do not "fix" anything you find, and do not refactor three implementations into one as part of the
  audit. Report first.
- Do not add the last-pitch zone, LIVE pill, or inning indicator back into the band because they
  look missing — they are missing on purpose.
- Do not treat the design files in this folder as the app's source. They are static mocks; where the
  app and the mock differ on plumbing (component structure, CSS approach), the app wins. The mocks
  are authoritative only on **layout, copy, sizes and what is present or absent**.
