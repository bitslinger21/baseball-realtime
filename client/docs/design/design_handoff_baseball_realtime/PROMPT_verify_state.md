# AUDIT — what already landed (read-only)

**Version:** rev 1 · written Sep 10, 2026
**Execution order: this is STEP 1 of 3. Run it before either port prompt.**

1. **`PROMPT_verify_state.md` ← you are here.** Read-only. Produces a report. Changes nothing.
2. `PROMPT_consistency_pass.md` — app-wide win/loss, chips, rows, tables, links. *Not yet written; scope depends on this report.*
3. `PROMPT_team_page.md` — the team page delta. Depends on 2 (it uses the shared chip and row rules).

---

## Why this exists

The design source and the shipped app have drifted before, in both directions: work
described here as "to do" turned out to be already shipped (Scout mode), and work
believed shipped turned out to be half-landed (the navigation pass). Two port prompts
are about to be written from the design files alone. **This audit sets their scope.**

Do not fix anything. Do not open a PR. Report only. A wrong "already done" is more
expensive than a redundant check.

## How to answer

For every numbered item below, answer with exactly one of:

- **LANDED** — present in the app, matches the spec. Cite file + line.
- **PARTIAL** — some of it is there. Say precisely which part is missing.
- **ABSENT** — not there.
- **DIVERGED** — the app does something different *and deliberate-looking*. Describe
  what it does. Do not assume the design wins; several past divergences were resolved
  in the app's favour.

And for anything shared, answer the second question too: **is it one implementation, or
several that happen to agree today?** A colour repeated in six files is not a landed
token — it is six chances to drift. That distinction is the main thing this audit buys.

---

## Section A — win/loss colour and the result chip

The design has consolidated four different win/loss treatments into one. Check what the
app currently does.

**A1. How many distinct win/loss treatments exist in the app today?** Search for W/L
rendering wherever a game result appears — at minimum: team page recent form, team page
schedule, player page last-5 and game history, standings streak column. List each one's
shape (filled square / filled circle / pill / bare letter) and its colours.

**A2. Is there a shared component?** Or does each surface hand-roll its own? Name it if
it exists.

**A3. Are the win/loss colours tokens** (one definition, imported) **or literals repeated
per file?** List every distinct hex used for a win and for a loss.

**A4. Target values, for comparison.** The design's settled chip is the Player → History
pattern: pale tinted background, coloured letter, 1px hairline border in the letter
colour at 20% opacity.

| role | value |
|---|---|
| win background | `#cce7a4` |
| win letter | `#3a6330` |
| loss background | `#f4bdb5` |
| loss letter | `#8a2721` |

Report the app's current equivalents next to these. **Do not change them.**

**A5. The trap.** In the design source these chip colours are *deliberately separate* from
the general positive/negative wash (`#e6efd9` / `#f4dedb`), which is used by the scored
diamond in the scorebook cell, the "N runs score" chip in the game feed, and several stat
pills. Collapsing the two is a bug — it turns those unrelated surfaces saturated green.
**Check whether the app shares one token between W/L chips and the positive/negative wash.**
If it does, that is a finding: the split has to happen before the chip colour changes.

## Section B — clickable rows

The rule: **when a row has exactly one destination, the whole row is the target and the
whole row shades on hover.** When a row holds two or more distinct destinations, only the
individual names are links and the row does not shade.

**B1.** For each table with clickable content — standings division rows, league leaders
rows, teams directory rows, team page roster, team page team leaders, team page next-5,
team page schedule — report: what is the click target (row or name), does the row shade on
hover, and how many destinations does the row actually contain?

**B2. Highlighted rows.** Division leaders and category leaders carry a rust tint. Do they
respond to hover *at all*? This is the specific defect found in the design source — the
tinted row was skipped to avoid fighting the tint, which killed hover on the most-clicked
row in every group.

**B3. One hover shade, or several?** List every hover background in use. The design's
value is `#efeae0`. A near-invisible 2%-black wash was found in the design source and
replaced; check whether the app has the same.

**B4. Keyboard and semantics.** For every whole-row target: is it a real link or anchor,
or a click handler on a `div`? Is it focusable, does it show a focus ring, does Enter
activate it? **This is the one place where the app is likely ahead of the design** — the
design mocks use click handlers, which are not accessible. If the app already does this
properly, say so clearly and the port prompt will adopt the app's pattern rather than
regress it.

## Section C — tables

**C1. Is there one shared table primitive**, or per-page table markup? If shared, name the
header and row components.

**C2. Header cells.** Report font size, weight, letter-spacing, colour, and **whether any
table has a filled header band.** The design's settled treatment is no fill — a hairline
under the header only. The schedule was the sole exception and has been corrected.

**C3. Small-label floor.** The project's stated floor is 11px for word labels. Report any
table header or label rendering below 11px. The shared header in the design source was
10px and has been raised.

**C4. Body text size** per table. The design uses 13px; the schedule was 13.5px and has
been corrected.

## Section D — links and page boilerplate

**D1.** Do all pages define `a` and `a:hover` colours? Report any page or route where an
anchor would fall through to browser-default blue. In the design source, League Leaders
had none.

**D2.** Report every distinct link colour and link-hover colour in use. The design's pair
is `#b8421e` resting, `#8f3317` hover. A one-digit variant (`#8f3417`) was found and
corrected in two design files — check for the same near-miss in the app.

**D3.** Rust is the correct colour for "Enter game" and equivalent in-context links.
Report anywhere those render in ink or another colour instead.

## Section E — team page

The design's team page is now **`Team Page - Overview v2.html`**; the previous
`Team Page - Overview.html` has been deleted from the design source.

**E1. Does a team page exist in the app at all,** and at what route? Which design version
does it correspond to — v1 or v2?

**E2. Which of these Overview cards exist:** Next game · Season pulse · Recent form ·
Roster · AL West (division standings) · Next 5 games · Team leaders · Bullpen status ·
Injuries & roster moves. For each, is it rendering real data or placeholder?

**E3. Next game card.** Does it have three states — upcoming, live, final? Report the
treatment of the start time, the LIVE pill, the FINAL pill, and the "Enter game" link in
each. In the design these were corrected: start time is not rust, the LIVE and FINAL pills
match their equivalents elsewhere in the app, and "Enter game" is rust.

**E4. Schedule page.** Does it exist? Report: does it tint whole rows by result (the design
does **not** — that was tried and rejected), does it have a home/away coloured left edge
(**removed** in the design), and does it have a right-hand link column duplicating the row
link (**removed**)?

**E5. Team page tab strip** — which tabs exist, and where does the strip sit relative to
the page header?

## Section F — data reality check

Three team-page cards are built on invented data in the design source. Before the port
prompt is written, establish what the API can actually supply.

**F1. Season pulse** — the percentile/trend rows. Is there any backing data?

**F2. Team leaders** — this needs a **team-scoped** leaders query. Filtering the league
top-10 down to one team yields empty cards for most teams. Does such an endpoint exist?

**F3. Bullpen status** — "available", "used yesterday", "back-to-back", "over 20 pitches in
the last 3 days". This needs per-appearance pitch counts and dates for every reliever,
plus a rule defining "available". Report whether the data exists and whether any such rule
is already implemented anywhere.

**F4.** Also note: the bullpen is referenced in **three** places on the Overview — this
card, a percentile row in Season pulse, and bullpen ERA in Recent form. Flag whether the
app has the same triplication. A design decision may follow; no action now.

---

## Output

A single markdown report, sections A–F, one answer per numbered item, with file paths and
line numbers for anything you claim is landed. End with:

1. **Already done** — items the port prompts should drop entirely.
2. **Real remaining work** — grouped by whether it is shared-layer or team-page-only.
3. **Divergences worth keeping** — where the app's approach is better and the design should
   be amended instead. Say so plainly; this has happened before and is a normal outcome.
4. **Anything you could not determine**, and what you would need to determine it. If you had
   no browser and are reporting from code alone, say which claims are code-confirmed rather
   than pixel-verified.
