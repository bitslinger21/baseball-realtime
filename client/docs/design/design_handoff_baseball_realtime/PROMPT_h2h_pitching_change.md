# Head-to-head — follow the pitcher on the mound

**Rev 1 · Sep 25, 2026.** Design signed off Sep 25, 2026. Ungated: no new endpoint.
**Design source of truth:** `holistic/game-headtohead.jsx` + `holistic/game-v2.jsx` (copies in this folder).
In `Holistic.html`, open the live game view, then click **Head-to-head** in the page header.

---

## 1. The problem

The Head-to-head view (the `Live / Head-to-head` toggle in the game view's page header) always
shows the **starting pitchers**, and its deep-dive always compares each batter with the opposing
**starter**. After the first pitching change, the whole view describes someone who has left the
game. On top of that, **the live app shows no pitcher stats at all** in the pitchers card. It
renders name and headshot only.

## 2. What changes, in one line

Once the game has started, the pitchers card and the deep-dive both follow the **pitcher on the
mound**. A pitching change is recorded in one quiet line under the current pitcher's stats.

---

## 3. Spec

### 3a. Pitchers card (`StarterPair`)

**Pregame: no change, apart from porting the stats that are missing today.**
- Title `Starting pitchers`. Each side: `Starter · TEAM`, 64px `Headshot`, name, `hand · #num`,
  and a season stat row (Record / ERA / WHIP / K).
- ⚠️ **Port gap:** the app is missing that stat row. Port it: mono, tabular-nums, 11px uppercase
  labels above 14px bold values.

**Live (any state after first pitch):**
- Title → **`On the mound`**.
- Each side shows **only the pitcher currently in the game**, at full weight (same size and
  structure as the pregame block):
  - Eyebrow `Pitching · TEAM`
  - Meta line: `hand · #num · season record · ERA` (e.g. `RHP · #29 · 3.12 ERA`)
  - Stat row: **this game's line**: `IP / R / K / BB`. IP is formatted in thirds (`5 2/3`, and
    whole innings drop the fraction), the same formatter as the Lineups tray and the old PitcherCard.
- **Handoff line** under the stats, separated by a hairline, 12px `textMuted`, one line with ellipsis:
  - Starter still in → `Starter · still in`
  - 2nd pitcher → `Relieved **Valdez** · 6th · 5 2/3 IP, 3 R`
  - 3rd pitcher or later → `3rd pitcher · relieved **Pressly** · 8th · 1 2/3 IP, 0 R`
  - The replaced pitcher is shown by **surname** (bold, `text`). His line is mono.
  - Reserve the line's height (`min-height: 17px`) on **both** sides always, so the card never
    changes height when a change happens. This is the same height lock as the half-inning pass.
- **Rejected alternatives (don't build):**
  1. Pulled starter shown dimmed beside the reliever with an arrow. It hid the middle relievers,
     implied a direct handoff, and gave the one pitcher who no longer matters a full stat line.
  2. A "Today" pill. Redundant with the card title.

  The full chain of pitchers belongs to the Lineups tray, which already has the substitution tree.

### 3b. Batter mode: deep-dive

- The pitcher in the comparison = **the opposing team's pitcher on the mound**, not the starter.
- Rail title (live) → `Lineup vs {Pitcher Name}, on the mound`. Pregame keeps
  `Lineup vs the opposing starter`.

### 3c. Pitcher mode: chips

- Chip order (live, after a change): **`{Current} (pitching)`** → `{Starter} (starter, pulled)` →
  remaining bullpen.
- **Default selection = the current pitcher**, and switching teams resets to that side's current
  pitcher. If there has been no change, the starter is current, so the default is the starter, as today.
- Pitchers already used and out of the game (neither current nor starter) do not get chips. Same
  as the Lineups tray: once used, a reliever moves to Bench, not Bullpen.

---

## 4. Data

Everything needed is already in the live feed / boxscore that populates the Lineups tray:

| Need | Source (already in the app) |
|---|---|
| Current pitcher per side | the pitching team's active pitcher (same one the mound strip on `MatchupContext` uses) |
| This game's line (IP/R/K/BB) | boxscore pitching lines (the Lineups tray shows these for `P`) |
| Season record / ERA | player season stats (the pregame probables card) |
| Relieved whom, inning, their line, Nth pitcher | order of that team's pitchers in the boxscore: the entry just before the current one, and the current one's position in the list |

Design shape (mock, `PITCHING_LIVE` in `game-v2.jsx`, **not for port**):
```
{ away: { today: [[k,v]...], current?: { ...pitcher, today: [[k,v]...],
          relieved: { name, inning, line, order } } },
  home: { today: [...] } }                // no `current` = starter still in
```

---

## 5. Also in this pass: open question, NOT specced

**The rust "donut" in the pitch-by-pitch feed.** The live at-bat's header row shows a 32px solid
rust circle with a white centre dot, in the result-badge slot where finished at-bats show their
scorebook diamond. It is the loudest thing on the screen, and it breaks the rule that the live at-bat is
**neutral, not rust** (the batter card's At-bats row uses a neutral dashed cell). The header
already signals live three ways: rust border, LIVE pill, tint. Recommendation: replace it with an
empty dashed `ScorebookCell` that fills in when the at-bat resolves. **Not decided and not in
the design files. Don't change it in this PR.**

---

## 6. Acceptance

1. Pregame: both sides show season Record / ERA / WHIP / K (currently missing).
2. Live with no change: title `On the mound`, the starter with this game's IP/R/K/BB, handoff line `Starter · still in`.
3. After a change: that side shows the reliever. Handoff line names the replaced pitcher, the inning and his line.
4. After a second change on the same side: the line reads `3rd pitcher · relieved …`.
5. The card's height is identical before and after any change (measure it).
6. Batter-mode deep-dive and rail title name the current opposing pitcher.
7. Pitcher mode defaults to the current pitcher. The starter's chip reads `(starter, pulled)` after a change.
8. All numerals are mono + tabular-nums.
