# Alerts: header bell, tray and pop-up (F-009)

**Rev 1 · Oct 3, 2026.** Direction **C · Scorebook**, with the arrival flow. **GATED on backend:** the app has no source of alert events today (see "Data" below). The client can be built and reviewed on a mock feed, but it must not ship on mock data.

Design reference: `holistic/alerts.jsx` (`AlBell` dir C, `TrayC`, `CardC`, `ToastC`, `AlProg`, `AlertsFlow`) and `Alerts - Directions.html`, which opens on the **Arrival (live)** view. Port layout and colour values verbatim. Ignore directions A and B, which were not chosen.

## Scope (decided)
- **Triggers, and only these:**
  1. **No-hitter / perfect game**, from the **7th inning**.
  2. **Cycle watch:** a batter has 3 of the 4 hits and is at bat or on deck.
  3. **Big single games:** a 3rd home run, or a 15th strikeout.
  4. **Milestones about to happen:** one away from a career round number and at bat or on deck.
- **League-wide.** Not tied to follows. **In-app only:** no browser push, no email.
- **Nothing is muted** for the game on your screen.
- **One surface:** the header bell + tray. No other screen changes.

## Pop-up vs tray-only
- **Pop-up** (`big: true`) only for: a no-hitter or perfect game, a cycle batter at the plate, and **round-number** milestones (500 / 600 / 700 HR, 3000 hits, 300 W, 3000 K).
- **Tray-only** for everything else: 3rd HR, 15 K, and smaller milestones like a 400th HR.
- The server decides `big`, so the client doesn't need its own rules.

## The arrival flow
1. A `big` alert arrives as the **pop-up**: bottom-right, 24px from the edges, 380px wide.
2. It **counts down about 8s**, shown by a 3px rust bar along its bottom edge. **Hovering pauses** the countdown.
3. At zero it **fades** (opacity plus 10px down, 450ms) and **lands in the tray**.
4. **Only when it lands** does the bell count go up, with **one pulse** (rust ring, two cycles of 0.9s).
5. **✕ or Later** land it immediately, the same as step 4.
6. **The tray never opens on its own.** It opens only when the bell is clicked.
7. A tray-only alert lands straight away: no pop-up, the bell updates and pulses.
8. If a second `big` alert arrives while a pop-up is showing, **queue it**. Show it after the current one lands. Never stack two pop-ups.

## Bell (`AlBell`, dir C)
- It sits in `BrandHeader` in the new **`alerts` slot, right of search**.
- 38px tall, `flexShrink: 0`. The label never wraps (`white-space: nowrap`).
- It shows **how many stories are live** (`3 live`, rust, mono), not an unread count. With nothing live it's the plain bell glyph and border.
- `aria-label="Alerts, N live"`, `aria-expanded`.

## Tray (`TrayC`)
- A dropdown under the bell, 520px wide, rust top border, max height 620px with its own scroll.
- **Esc and an outside click close it.**
- **Live stories (N):** one card each (`CardC`), containing:
  - headshot
  - a rust kind label (`Cycle watch`, `No-hitter`, `Milestone`, `Three-homer game`, …) and a mono time
  - the sentence (`**Witt Jr.** needs a triple for the cycle · At bat now`)
  - a **progress picture** (`AlProg`):
    - **No-hitter:** nine inning squares, filled through the current inning, plus `N to go`.
    - **Cycle:** four slots `1B 2B 3B HR`. The ones he has are filled ink; the ones he needs are rust dashed.
    - **Milestone:** `399 → 400 career HR`, with the target in rust.
  - the game (logos, `MIN 4 – 6 KC`, `● ▼8` in rust while live) and the action.
- A live story **updates in place** ("through 7" becomes "through 8"). It does not send a new alert.
- **Earlier tonight:** one line each (time · sentence · action).

## When a story ends
- It sends a **second alert**: "**Greene** lost the no-hitter in the 8th · Ohtani single to right".
- The original alert stays in Earlier tonight with its past-tense sentence ("had a no-hitter through 7").

## Tap / action
- While the moment is **live**: `Open game →` goes to that game page.
- Once it's **over**: `▶ Watch clip` plays the clip, if the play has one (use the existing clip mapping). Otherwise `Open game →`.
- Clicking anywhere on a card or row does the same as its action.

## Data (backend, the gate)
The client needs a stream of alert objects. Polling every 30s is fine; push isn't required. The shape:
```
{ id, storyId, kind, big, live, at, playerId, playerShort, teamAbbr,
  title, sub, gamePk, away, home, score:[a,h], half, clipId?,
  prog?: { type:'innings', done } | { type:'cycle', have:['1B','2B','HR'] }
       | { type:'count', from, to, unit } }
```
- **Updating a story:** re-sending the same `storyId` updates that story in place.
- **Ending a story:** the backend sends a new `id`, with `live:false`, the past-tense sentence, and `clipId` if there is one.
- **What the backend must detect:**
  - no-hitters and perfect games (from the 7th)
  - 3 of 4 cycle hits with the batter due up
  - a 3rd HR or a 15th K
  - one-away career milestones, from career totals plus the batter being due
- **Keep or reset:** the tray keeps tonight's alerts (resetting at about 4am ET). The live count is the stories with `live:true`.

## Not in scope
Settings or per-alert mute (parked, F-011), browser push, follow-based alerts, clutch / leverage, and race / clinch alerts.

## Acceptance
1. A `big` alert appears as the pop-up while the bell still shows the old count. After about 8s it fades, the count goes up and the bell pulses once. The tray stays closed.
2. Hovering the pop-up pauses the countdown; ✕ or Later lands it at once.
3. A tray-only alert never pops up; it only changes the bell.
4. Two `big` alerts arriving together show one after the other, never stacked.
5. An updated story changes in place in the tray. An ended story adds a second alert, and the first stays in the tray.
6. Live → `Open game →`; over with a clip → `▶ Watch clip`.
7. The bell label never wraps at narrow widths.
