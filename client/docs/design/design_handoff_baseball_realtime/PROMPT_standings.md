# Standings — restyle + team directory

**Design:** `Standings.html` (design source of record) · Aug 25, 2026
**Status:** design signed off pending your review · **ungated** (standings data already exists)

## What this is

Standings was previously out of scope for the redesign, so it still runs the old
styling. This restyles it in the Scorebook language **and promotes it to the app's
team directory** — the answer to "how do I get to the Pirates' page without
hunting for a Pirates game."

**Decision:** we deliberately did NOT build a separate teams-index page. A teams
index and standings show the same 30 teams in the same six division blocks; the
only real difference is ordering. So standings absorbs the job via an ordering
toggle.

## Route

- Existing route `/standings` — no new route.
- Every team row links to `/team/:teamId`.

## Structure

1. **App bar** — SC◆REBOOK mark + contextual return `← Today's games`.
2. **Page head** — eyebrow `2026 season · through {date}`, title `Standings`,
   and a right-aligned one-liner: "Every team links to its page — record,
   schedule and roster".
3. **Control bar** — `Order:` label + segmented toggle **`Standing` / `A–Z`**
   (Standing default), and a right-side count `30 teams · 6 divisions`.
4. **Standing view** — two columns: `American League` left, `National League`
   right; three division cards each (East, Central, West). Rows are sorted by
   run differential/record with rank in a leading gutter.
   Columns: rank · team (logo + nickname) · **W · L · PCT · GB · L10 · STRK**
   (all mono, right-aligned). GB is `—` for the division leader.
5. **A–Z view** — flat list of all 30 teams in three columns, sorted by the
   **visible nickname** (Pirates under P, not Pittsburgh under P by accident —
   sort the same string the user reads). Each row: 24px logo · **nickname** bold
   + city muted beside it · `W–L` · PCT.

## Details

- **Followed/user team** gets a subtle `surfaceAlt` fill and bold name in the
  standing view (Astros in the mock). If the app has no notion of a followed
  team yet, drop the treatment — don't hard-code Houston.
- Row hover: `#efeae0` fill, team name turns rust — signals the row is a link.
- Both views render at once and toggle by class; no refetch, no route change.
  Persist the choice if you like (session-scoped, consistent with the rest of the app).
- Division-card grid is tight (`16px minmax(72px,1fr) 30px 30px 44px 40px 44px 34px`)
  so two leagues fit side by side at 1180px. Below ~980px the two columns should
  stack to one — **not designed; your call, or ask.**

## Data needed

W, L, PCT, GB, L10, streak, division and league — all already on the standings
payload. Nothing new, nothing gated.

## Related change

`Team Page - Overview.html` and `Team Page - Schedule.html` are the destinations.
See `PROMPT_schedule_page.md` for the schedule route.

**Also agreed but not yet specced as a PR:** make every logo+name pair in the app
a link to the team page — landing game cards, game-view line-score band,
schedule opponents, standings rows. Cheap, no new data, and it's the other half
of the navigation fix. Say the word and I'll write it up separately.

## Files

- `Standings.html` — the design (new)
