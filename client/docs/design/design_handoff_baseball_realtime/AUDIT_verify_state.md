# AUDIT REPORT — what already landed

**Read-only. Nothing in the app was changed to produce this.** Answers this document's own
Section header format (LANDED / PARTIAL / ABSENT / DIVERGED), with file+line citations.
Produced by three parallel code audits (no browser was used — see §4 at the end for what
that does and doesn't cover).

---

## Section A — win/loss colour and the result chip

**A1. Distinct W/L treatments: 10, not 1.**

| # | Surface | File:Line | Shape | Win | Loss |
|---|---|---|---|---|---|
| 1 | Team page Recent-form chips | `TeamPage.tsx:442`, `TeamPage.css:351-370` | filled square | bg `var(--color-positive)` `#3f6b34` | bg `var(--color-border-strong)` `#b4ae9b` (gray, not red) |
| 2 | Team page hero "Streak" stat | `TeamPage.tsx:875,946`, `TeamPage.css:116-122` | bare text | `#3f6b34` | `var(--color-text-muted)` `#5c574f` (gray) |
| 3 | Team page Today-card score dim | `TeamPage.tsx:279-280,333,363` | dim, no letter | full opacity | dimmed |
| 4 | Standings Streak column | `StandingsPage.tsx:458,541`, `StandingsPage.css:184-187` | bare text | **no color distinction at all** |
| 5 | Player page "Last 5" pill | `PlayerPage.tsx:719-728`, `Pill.css:39-43,57-61` | pill | tone `positive`: `#e6efd9`/`#3f6b34` | tone `live` (borrowed): literal `#fdecec`/`#a31621` |
| 6 | Player page History table pill | `PlayerPage.tsx:2182` | pill | same as #5 | same as #5 |
| 7 | Schedule result chip | `SchedulePage.tsx:174-181`, `SchedulePage.css:535-554` | filled square | **literal** `#3f6b34`/`#fcfaf6` | **literal** `#b4ae9b`/`#fcfaf6` |
| 8 | Schedule decision cell ("W: Pitcher") | `SchedulePage.tsx:193-198` | bare text | no color set | no color set |
| 9 | Pregame "Coming in" streak text | `PregameView.tsx:249-258`, `PregameView.css:251-257` | mono text | literal `#86efac` | literal `#fca5a5` — unrelated palette, not in `tokens.css` |
| 10 | Daily-games Final-card win badge | `GameCardFinal.tsx:48,58`, `GameCardFinal.css:48,79-84` | bare letter | `#3f6b34`, no bg | **no "L" rendered** — loser row just dims to 55% opacity |

**A2. Shared component? ABSENT.** No `ResultChip`/`WLChip`/`StreakBadge` exists. `Pill` (`components/primitives/Pill.tsx`) is reused in #5/#6 but has no win/loss tone — losses reuse the `'live'` tone (meant for the LIVE badge) as a stand-in for red. Everywhere else inlines its own `win ? … : …`. **Several implementations that happen to partially agree today, not one** — #1 and #7 render identically only because two people typed the same values in two files (and one of them used the token, the other a literal).

**A3. Tokens or literals? PARTIAL/DIVERGED.** No dedicated win/loss token exists — `tokens.css` has `--color-positive`/`--color-positive-soft`/`--color-danger` but **no `--color-negative`/`--color-loss`**. Win hex found: `#3f6b34` (token, 4 files) + `#3f6b34` (literal duplicate, `SchedulePage.css:549`) + `#e6efd9` + `#86efac` (unrelated). Loss hex found: `#b4ae9b` (token + literal duplicate) + `#5c574f` + `#fdecec`/`#a31621` (borrowed) + `#fca5a5` (unrelated). No file uses a color actually named/scoped for loss.

**A4. Vs. target values:**

| role | target | app's equivalent | verdict |
|---|---|---|---|
| win background | `#cce7a4` | `#3f6b34` (used as fill, not a pale bg) / `#e6efd9` | ABSENT — wrong hue family |
| win letter | `#3a6330` | `#3f6b34` | PARTIAL — close, but used as chip *background*, not a letter color |
| loss background | `#f4bdb5` | gray `#b4ae9b`, or pink `#fdecec`, or unrelated `#fca5a5` | ABSENT |
| loss letter | `#8a2721` | `#a31621` (borrowed from LIVE) | PARTIAL — same family, more saturated, not applied as a loss-specific color |

**A5. Shared token between W/L chips and the general positive/negative wash? DIVERGED — confirmed, the most consequential Section-A finding.** `--color-positive`/`--color-positive-soft` (`#3f6b34`/`#e6efd9`) back BOTH the win chip (`TeamPage.css:364`, `Pill.css:39-41`, `GameCardFinal.css:83`) AND the general wash: `Stat.css:44` (trend arrows), `PlayerPage.css:866` (stat deltas), `ScorebookCell.tsx:134` (scored-run trace), and — the exact example named in the source spec — the "N runs score" feed chip, `PitchByPitchV2.css:272-284`. A win chip and a "2 runs score" chip are driven by the identical variable today. No equivalent conflation exists on the loss side (losses don't consistently use `--color-danger` either, per A3).

---

## Section B — clickable rows

**B1.** Per surface — click target / row hover / destination count:

| Surface | Click target | Row hover | Destinations |
|---|---|---|---|
| Standings division + WC rows | whole row (`Link`) | yes | 1 |
| League leaders rows | name only (`button`) | **no** | 1 |
| Teams directory rows | whole row (`Link`) | yes | 1 |
| Team roster rows | name only | yes (mismatch — see below) | 1 |
| Team leaders card rows | name only | **no** | 1 |
| Team "Next up" rows | **nothing at all** | no | **0** |
| Team schedule rows | trailing link text only | yes (mismatch — see below) | 1 |
| Team mini-standings rows | whole row (`Link`) | yes | 1 |

Citations: `StandingsPage.tsx:447,530` + `.css:121-123`; `LeadersPage.tsx:189-207` (no hover rule anywhere in `LeadersPage.css`); `TeamsPage.tsx:46` + `.css:69-71`; `TeamPage.tsx:538,541` + `.css:631-633`; `TeamPage.tsx:676-684` (no hover rule); `TeamPage.tsx:644-649` (verified via grep: no `Link`/`onClick` in the file for this row); `SchedulePage.tsx:227-259` + `.css:447-449`; `TeamPage.tsx:595-609` + `.css:475-477`.

Verdicts: Standings/Teams-directory/mini-standings = **LANDED**, single destination, whole row is the link and shades — three independent hand-rolled implementations that agree, not one shared component. League leaders and team-leaders-card rows = **DIVERGED**, single destination but name-only click + zero row hover, under-serving the stated rule. Team roster and team schedule rows = **PARTIAL**, the *opposite* mismatch — the whole row visually shades on hover, but the actual click target is only the name or trailing link text, so hover promises a bigger hit area than the row delivers. Team "Next up" rows = **ABSENT** — no click target, no hover, despite each row being one game.

**B2. Tinted-row + hover interaction — the specific defect named in the source spec.**
- Standings division-leader rows: **ABSENT as a case to check** — there is no leader-tint class in `StandingsPage.tsx/css` at all (only a "faded/out" wild-card class exists), so there's no tint to conflict with hover in the first place.
- League leaders category-leader rows (`leaders-card__row--lead`, rust tint `rgba(184,66,30,0.055)`): no row `:hover` rule exists anywhere in the file — same *symptom* (leader row doesn't respond to hover) but the mechanism is "never wired," not "lost in the cascade."
- **Team-page mini-standings "my team" row is the real instance of the named defect, and it's worse than a specificity collision**: `.tp__st-row--me` (`TeamPage.css:480`) sets a resting tint, and `.tp__st-row--me:hover` (`TeamPage.css:488-490`) re-declares the **exact same value** — hovering your own team's row produces zero visible change because someone picked the identical color twice, not because of a cascade bug.
- Counter-example the codebase gets right: `SchedulePage.css:643-649` — the live-game row tint (`#faf0eb`) gets a **distinct** darker hover (`#f6e7e0`).

**B3. Hover values.** `var(--color-surface-alt)` (`#efeae0`) is the dominant hover across Standings/Teams-directory/mini-standings/Roster/Schedule/the shared `Table.tsx` primitive. One distinct alternate (`#f6e7e0`, Schedule live row). No near-invisible/low-opacity wash exists anywhere — the defect pattern found is "hover identical to resting tint" or "hover missing," never "hover too faint."

**B4. Keyboard/semantics — the one place the app is ahead of the design.** Every whole-row target found is a real `react-router-dom` `Link`, not a `div onClick` — confirmed for Standings, Teams directory, and mini-standings. No instance of a click-handler-on-a-div was found anywhere across the five audited surfaces or the shared `Table` primitive. Where only a name/link is clickable (leaders, roster, team-leaders-card), that element is still a real `Link`/`button`. **Say this plainly to the port prompt: adopt the app's real-anchor pattern, don't regress to the design mock's click handlers.**

---

## Section C — tables

**C1. One shared primitive, but PARTIAL adoption.** `components/primitives/Table.tsx` exports `Th`/`Td`/`Tr`, used by `PlayerPage.tsx`, `player/UpcomingTab.tsx`, `game/HeadToHeadScreen.tsx`, `game/PitchByPitchV2.tsx`. Every surface this audit was actually scoped to — Standings, Leaders, Teams directory, and all of Team Page (which alone hand-rolls **four** separate internal patterns: a real roster `<table>`, grid-div mini-standings, flex-div "Next up", flex-div team-leaders) — sits entirely outside it. This is a clean split, not partial agreement: player/game-side uses the primitive, list/directory-side does not, and disagrees with itself besides.

**C2. Header treatment.** Filled band: League Leaders (`#fff` on navy, `LeadersPage.css:66-81`) and Schedule (`var(--color-surface-alt)` fill, `SchedulePage.css:403-413`). Hairline-only, no fill: shared `Table.tsx` primitive, Standings, Teams directory, Team roster, Team mini-standings. **DIVERGED as a set** — two different header philosophies in active use, and since nothing here shares an implementation, it reads as accidental rather than a deliberate split.

**C3. Below the 11px floor — found in 5 places**, most consequentially in the *shared* primitive itself: `Table.css:3` (`.tbl__th { font-size: 10px }`, affects every consumer). Also: `StandingsPage.css:351` (10px wild-card divider), `TeamPage.css:184` (10.5px LIVE/date tag), `SchedulePage.css:168` (9.5px division-group header), `SchedulePage.css:576` (10px LIVE badge). Decorative-only exceptions not flagged (team-initial fallback badges at 8-9px).

**C4. Body text, and the specific 13.5px-vs-13px check — confirmed real, recurs in exactly 3 of 5 hand-rolled tables.** `.st-row` (Standings, `:111`), `.leaders-card__name`/`__value` (Leaders, `:180,204`), `.tms-row-name` (Teams directory, `:76`), and `.sp__td` base (Schedule, `:439`) all use **13.5px**. The shared `Table.tsx` primitive and Team-page's roster/mini-standings/next-up/leaders-card all use plain **13px**. Independent confirmation of C1: these are genuinely disagreeing implementations, not one system with a few overrides.

---

## Section D — links and page boilerplate

**D1. No literal browser-default blue anywhere — LANDED, with a hover caveat.** A global rule (`client/src/index.css:30-34`, loaded app-wide) sets every anchor to `var(--color-accent)` (`#b8421e`) unless overridden; no page falls through to default blue. But the *intended* global hover rule (`index.css:52-54`, `a:hover { color: #747bff }`) sits inside a commented-out block and **never executes** — there is no global hover treatment at all; every hover effect that exists is a local, per-component rule.

**D2. Every link/hover hex found — no `#8f3317` (correct) and no `#8f3417` (the named one-digit bug) exist anywhere; the darker rust hover is simply absent, not present in either form.** Resting rust (`#b8421e`) matches target everywhere it's used as a CTA color. But a **second, consistent house convention** exists across 5 independent files — muted/ink at rest, rust *on hover* (the reverse of target): `tp__card-a`, `tp__enter-btn`, `ph__team-name--link`, `game-page__title-team-link`, `st-row`/`st-tm-name`. And a third convention, `.player-link` (`App.css:26-36`), never uses rust at all — inherited color + dotted underline. Three coexisting, unreconciled link conventions.

**D3. "Enter game" — rust everywhere except one place.** Schedule action link, daily-games minimized-widget button, and both daily-games card variants (upcoming + final) all render rust at rest (`#b8421e`), matching target. **Team page's own Today-card "Enter game →" is the one outlier**: plain ink at rest, rust only on hover (`TeamPage.css:327-342`) — contradicting both the target spec and the other four instances in the same codebase.

---

## Section E — team page

**E1. Exists, at `/team/:teamAbbr` (`AppRoutes.tsx:112`), with a separate `/team/:teamAbbr/schedule` (`:113`).** `/teams` is the distinct `TeamsPage.tsx` directory, correctly not confused with it. **Important finding, not a code gap but a scoping problem for the next prompt**: the source spec's premise that a `Team Page - Overview v2.html` exists and `v1` was deleted **does not match the filesystem** — only `Team Page - Overview.html` (unversioned) exists, in two identical copies, and no v2 file exists anywhere in the design tree. The app matches the only design file that actually exists.

**E2. Overview cards** — real-data unless noted:
- **Next game** — LANDED, real (`TeamPage.tsx:257-406`, `standingsApi`/`gamesApi`).
- **Season pulse** — **ABSENT.** No component, no reference anywhere.
- **Recent form** — LANDED, real (`TeamPage.tsx:425-479`, `/api/games/season`); the interim loading state briefly falls back to a coarser summary field, visually flagged as such.
- **Roster** — LANDED, real (`/api/teams/{teamId}/roster` → `teams-roster.service.ts:35-110`).
- **Division standings** — LANDED, real (`standingsApi`).
- **"Next 5 games"** — the app's card (`NextUpCard`) fetches **3**, not 5 (`TeamPage.tsx:805`) — and the one located design source (`PROMPT_team_page.md` §9) also says 3. Could not find any design artifact anywhere specifying 5; flagging "Next 5" as possibly a stale label in the audit prompt itself rather than an app gap.
- **Team leaders** — LANDED, and correctly team-scoped server-side (see F2), not a client-side filter of a global list.
- **Bullpen status** — **ABSENT.**
- **Injuries & roster moves** — **ABSENT.** The only "Injury" reference anywhere in the client is a hardcoded mock row on an unrelated PlayerPage card (`PlayerPage.tsx:2069`).

**E3. Next-game card, three states — LANDED, with one real divergence.** Start time is neutral in both places it renders (`TeamPage.css:183-192`, `:294-299`) — not rust, matches the correction. LIVE pill is the actual shared `<LivePill/>` component, same one `GamePage.tsx:869` uses — one implementation, not a coincidence. **FINAL indicator is DIVERGED**: Team page hand-rolls its own `.tp__tag` span (`TeamPage.tsx:297`) rather than the shared `Pill` atom that `GameCardFinal.tsx:36-40` uses — they land close visually today but are two implementations, exactly the drift this audit exists to catch. **"Enter game" is the D3 finding again** — ink at rest here, rust everywhere else.

**E4. Team schedule.** All three checked anti-patterns are correctly **ABSENT**: no whole-row result tinting (only a small W/L badge in the Result cell, `SchedulePage.css:535-554`; the live-row tint that does exist is status-based, not result-based, so it doesn't trip this rule), no home/away colored left-edge, no duplicate right-hand link column (exactly one link per row). Matches design intent as stated.

**E5. No tab strip — ABSENT, but consistent with the only design source found.** No page-level `Tabs`/`Segmented` gates sections of the team page; the two `Segmented` instances present are inert sub-toggles inside individual cards (Roster batters/pitchers, Team-leaders bat/pitch), not page tabs. Schedule is a fully separate route, not a tab, reached via a "Full schedule →" link — matching `PROMPT_team_page.md`'s own description of these as two separate pages.

---

## Section F — data reality check

**F1. Season pulse (percentile backing data) — ABSENT for anything team-scoped.** The only percentile computation anywhere is `StatcastService.getLeagueContext()` (`statcast.service.ts:540-615`), and it's *player*-level (batter vs. batter population), with no rollup to a team anywhere in the codebase.

**F2. Team leaders — LANDED as a real server-side scoped query, not the anti-pattern.** `GET /api/leaders?teamId=<id>` (`leaders.controller.ts:11-32`) passes `teamId` straight to MLB's own API with `limit=3` (`leaders.service.ts:82-84`) — it is not fetching a global top-10 and filtering client-side. One caveat that's genuinely **undeterminable from code alone**: whether MLB's public endpoint actually *honors* `teamId` as a server-side scope, or silently ignores it and returns the same global top-3 for every team. Code-confirmed correct request shape; response behavior would need a live call against a small-market team to settle.

**F3. Bullpen status — ABSENT, both data and rule.** No source anywhere carries per-appearance pitch-count-by-date for a team's relievers as a set — the closest data (`GameLogRowDto`, per-player game logs) has no pitch-count field and is fetched one player at a time, not team-wide. No rest/back-to-back/pitch-count-window rule exists anywhere in client or API.

**F4. Triplication — not applicable yet.** None of the three bullpen-touching surfaces (a dedicated card, a Season-pulse percentile row, a Recent-form ERA stat) exist in the current `TeamPage.tsx` at all, so there's nothing to be either shared or duplicated.

**Note surfaced by this section, relevant to scoping:** the three "ambitious" cards this section was built to check (Season pulse, Bullpen status, Injuries & roster moves) appear **only** in this audit's own source prompt — no other file under `design_handoff_baseball_realtime/` describes them. The one team-page design spec that does exist (`PROMPT_team_page.md`) describes a different, already-mostly-built card set and explicitly lists pitcher/postseason states as out of scope, with no mention of these three at all. Treat F1/F3's ABSENT as "no such feature has been designed anywhere in this repo," not "a designed feature merely needs wiring."

---

## 1. Already done — drop from both port prompts

- Section B whole-row-link pattern for Standings, Teams directory, and Team mini-standings (real `Link`s, real hover) — already correct, already accessible.
- Section E3's LIVE pill (shared `<LivePill/>`, same component as GamePage) — one implementation, nothing to consolidate.
- Section E4 in full — schedule already avoids all three named anti-patterns (result tinting, home/away border, duplicate link column).
- Section D1 — no literal browser-blue risk anywhere; the global `a` rule already covers every page.
- Section E5 — the "missing" tab strip is consistent with the only team-page design source that actually exists; not a gap to fix.

## 2. Real remaining work

**Shared-layer (affects more than the team page — do this before or alongside the team-page prompt, not after):**
- **A2/A3/A5** — no win/loss component or token exists anywhere; 10 independent treatments, none matching target values, and the win side is currently *sharing* a token with the unrelated positive/negative wash (the specific bug the source spec warned about). This has to be resolved as one shared component + one dedicated token pair before any chip-color change, or the "N runs score" feed chip and scored-diamond trace go green along with it.
- **B1/B2** — the click-target/hover mismatches (leaders rows, team-leaders-card rows, roster rows, schedule rows, the "my team" hover-equals-rest bug) are spread across 5+ files with no shared row component; fixing the rule needs either a shared clickable-row primitive or a documented pattern applied per-file.
- **C1/C2/C4** — the shared `Table.tsx` primitive itself has a header font-size violation (10px, below the stated 11px floor) that propagates to every consumer; and 3 of 5 non-primitive tables use 13.5px body text against the primitive's 13px. Fix the primitive first — it's upstream of the body-text question everywhere it's actually used.
- **D2/D3** — three coexisting link conventions (rust-at-rest, muted-then-rust-on-hover, inherit-with-underline) and one outlier CTA (Team page's "Enter game"). No darker rust hover value exists anywhere to reuse — it needs to be introduced, not just found and reapplied.

**Team-page-only:**
- E3's FINAL-pill divergence (adopt the shared `Pill` atom instead of `.tp__tag`).
- E2's three genuinely-absent cards (Season pulse, Bullpen status, Injuries) — see §3 below before scoping a port prompt for these.
- "Next up" rows (B1) have zero click target — the single clearest, cheapest fix in this whole audit.

## 3. Divergences worth keeping — amend the design instead

- **B4**: the app's whole-row targets are real anchors; the design mocks use click handlers. Keep the app's pattern.
- **E1**: the design source's premise (v2 supersedes a deleted v1) doesn't match what's on disk. Whoever writes the next team-page prompt should confirm against the actual design files, not this audit prompt's description of them.
- **F1/F3 scope**: Season pulse, Bullpen status, and Injuries & roster moves have no design artifact anywhere in the repo beyond this audit prompt's own text. Before scoping a build for them, someone needs to either point to where they're actually designed, or treat writing that design as the first step — not something a port prompt can assume already exists.
- **"Next 5 games"**: both the app and the one real design source agree on 3. The "5" in this audit's own checklist looks like the stale value.

## 4. Could not determine / not pixel-verified

Everything in this report is **code-confirmed, not pixel-verified** — no browser was used for this audit (three parallel static-code investigations only). Specifically:
- **B2/B3** (hover behavior) and **C2** (header fill) are read from CSS source and selector specificity, not observed in a rendered page. The "my team row hover is a no-op" finding is a strong one (both rules literally contain the same value), but it was not visually confirmed.
- **F2's caveat** — whether MLB's upstream API actually honors `teamId` server-side — cannot be settled from code; needs a live request against a small-market team.
- **A4**'s "PARTIAL" verdicts (win letter, loss letter) are hex-distance judgments from source values, not a rendered side-by-side comparison.
- No mobile/responsive behavior was checked for any of the above — out of scope for this audit and not raised in the source prompt either.
