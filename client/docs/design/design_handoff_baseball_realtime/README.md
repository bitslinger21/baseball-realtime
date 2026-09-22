# Home page — layout pass · handoff

**Sep 21, 2026.** Supersedes `handoff_home/` (Sep 19). Re-sync from the files here.

Read **`PROMPT_home_layout.md`** — it is the work. This README is the index and the
short version.

## Three PRs

| PR | What | Gated? |
|---|---|---|
| **A** | Home layout + Races/Chases split + In-the-news host | No |
| **B** | `scrollBy({behavior:'smooth'})` silent no-op — app-wide fix | No |
| **C** | In the news — populate from a news API | **Yes** |

**Start with B.** It is three small edits, it is not a Home bug, and it is probably
live in the shipped app right now: the Leaders scroll chevrons and the line-score
innings scroller were ported from these files, so if the app's webview behaves like
ours, those controls are visible, pressable and inert. Verify on a device.

## Files

| File | Role |
|---|---|
| `PROMPT_home_layout.md` | The work |
| `holistic/home.jsx` | Home screen — rewritten this pass |
| `holistic/home-data.jsx` | Mock data + IQ panel + `FollowMark` — new file |
| `holistic/home-real.jsx` | Real Sep 21 league state — verification only, not for port |
| `holistic/shared.jsx` | **Reference only — no changes this pass.** Included so the pages run. |
| `assets/logo-wordmark-light.png` | The brand wordmark `BrandHeader` loads |
| `holistic/leaders.jsx` | PR B only |
| `holistic/game-v2.jsx` | PR B only |
| `Home.html` | Mock mount + states control |
| `Home - Six States.html` | Six edge states, reasoning under each |
| `Home - Today Real.html` | Driven by today's actual league state |
| `Home Layout A - Broadsheet.html` | The rejected exploration, kept as the record |

Nothing in `shared.jsx` needs porting — no atom edits this pass.

## How this layout was arrived at

The data was right and the layout was not (*"the information is good but the layout
sucks"*). Three complete candidates were built on identical data and one locked type
scale — broadsheet, rail, ledger. **The rail model won, with the broadsheet's
side-by-side board.** Only the broadsheet file is kept.

The type scale is locked to seven steps on `window.HS` (11 / 12 / 13 / 15 / 18 / 24 /
34). The first build had ~12 sizes with one-offs at 13.5 / 12.5 / 11.5 / 10.5 — tuned
per element rather than composed. **Do not add a step.**

## The five decisions most likely to be undone by accident

1. **Measure the two columns against each other; never declare it.** A percentage
   `max-height` is ignored while the grid sizes its row, so the rail's content would
   set the row height and strand the left column. Capping the rail to the *viewport*
   instead gave a 911px rail beside a 364px column — ~546px of dead space.
2. **Never put CSS `scroll-behavior: smooth` on a scroller whose buttons assign
   `scrollTop`.** It routes the assignment through the broken animation path and the
   assignment stops working too.
3. **`FollowRail` at module level.** Inside `HomeScreen` it becomes a new component
   type every render → remount → `scrollTop` resets.
4. **The rust diamond means "IQ has context here."** Not decoration, never greyed.
   No context → a plain dot.
5. **The day ahead is a shortlist of four with a count that links out.** It is not
   the slate; Home is not the Games page.

## Mock-data notes

`HOME_HOT`, `HOME_TODAY`, `HOME_FOLLOWING`, `HOME_FOLLOWING_MANY`, `HOME_SEPT_*`,
`HOME_RACES_MID`, `HOME_CHASES_*`, `HOME_NEWS` — all mock, all not for port.

`home-real.jsx` is different in kind: its hot items, races board, clinches and
headlines are **real facts** as of Sep 21, 2026. It exists to test the design against
reality, and it earned its keep — see the three findings at the end of the prompt.
Win–loss is omitted there rather than faked, and Chases are hidden, because no real
leader data was available; the `RaceCard` record column is optional for that reason.
