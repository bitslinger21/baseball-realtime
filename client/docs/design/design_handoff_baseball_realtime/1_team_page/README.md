# Team page — build handoff

28 August 2026. Four PRs, none gated on new data.

This package covers the three decisions taken this session: **wire the em-dashed fields**, **build
the two missing cards**, and the **derived-sequence sweep**. It is the build half of the team-page
work — the bug half is `handoff_team_sync/` (BUG 1–4), and BUG 1 overlaps with §1 here.

---

## Files

| File | What it is |
|---|---|
| `PROMPT_team_build.md` | **Start here.** All four pieces of work, with data paths and a PR split |
| `PROMPT_team_page.md` | Design spec of record, updated — §3 hero, §5 form, §12 wiring are new/changed |
| `data-provenance.md` | Provenance inventory, with the new derived-sequence sweep section |
| `Team Page - Overview.html` | The design. Port from this markup, not from the prose |
| `Team Page - Today card states.html` | The Today card's four states |
| `Team Page - Schedule.html` | Schedule view — season picker, team switcher, unified rails |

---

## Design changes in this drop

Four changes to the design files since the sync package. All ungated.

**Form chips are bound to their games.** Each chip now carries date + opponent + score, and the
legend shows real dates instead of "10 games ago". This is the substantive part of PR A: a chip that
must name its game cannot be rendered from `lastTen` + `streak`, because neither string contains a
date. The defect becomes structurally impossible rather than a rule someone has to remember. Spec
§5 updated.

**Roster carries a full 13 position players**, up from 8 — six infield, five outfield, two catchers.
The stats are fabricated like the rest of the mock.

**Designated hitter is its own roster group.** A pure DH has no fielding position, so filing him
under Outfield was a fiction. Groups are roster roles, not lineup slots — a catcher DH-ing on Tuesday
still appears under Catcher. **If the group has no members it does not render**; an empty group row
reads as a loading failure, not as "no one holds this role".

**Schedule view has three tweak controls** — result emphasis (chips / ink / streaks), surface (card /
ruled / paper), home-and-road (tag / rail). Presentation exploration for review, not a spec change;
the shipped defaults are the first option of each.

---

## The four PRs

| PR | Contents | Notes |
|---|---|---|
| **A** | Recent form chips read the real game log; L-chip contrast fix | The one with a correctness deadline |
| **B** | Home/Away/1-Run splits; hero venue + founded year | type → mapper → wire, PR 3.5 shape |
| **C** | Roster table | Existing endpoints, no new API |
| **D** | Team leaders card | Needs a team-scoped leaderboard query, not a filter |

---

## Two things to get right

**PR A is a correctness fix, not a polish item.** `buildFormChips()` reconstructs ten chips from
`lastTen` + `streak`, so 8–2 with a W4 renders `W W W W L L W W W W` — and the row is captioned
"10 games ago → Most recent," asserting a chronology the data cannot supply. The fix is cheap:
`fetchSeasonSchedule(teamId, season)` is already called by `SchedulePage.tsx`. Take the last ten
completed in date order.

**PR D's shortcut is a trap.** Filtering the existing leaders payload by team looks like the whole
job. That payload is the MLB top 10, most teams' HR leader is not in it, and the result is an empty
card for most of the league that reads as "this team has no leaders." Scope the query.

---

## Decision closed

The three fields rendering `—` — Recent form's Home/Away/1-Run splits, the hero's founded year, the
hero's venue and city — are **wired**, not dropped. Same question as the player view's Contact
quality rows, same answer. `records.splitRecords` is already in the standings payload being parsed,
and `teams-meta.service.ts` already exists to serve venue and founded year. The earlier instruction
to feature-check the splits and leaders cards is withdrawn.

The em-dash *fallback* stays for values the API genuinely lacks. That instinct is right — it is
exactly what PR A's defect lacked.

---

## Sweep result

No third instance of the fabricated-sequence defect. Every other multi-point surface reads a real
log. Two latent traps — `Sparkline` and `Stat`'s `trend` prop — exist as atoms but appear only on the
review-only foundations page; name their data source whenever either is next used for real.

A standing rule was added to `data-provenance.md`: any element plotting more than one point gets a
provenance row naming its per-point source before it ships.
