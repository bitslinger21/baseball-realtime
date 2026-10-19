# Series drawer — "Enter game" on live and future games + "Open game" → "Enter game" app-wide

**Rev 1 · Oct 19, 2026.** Design SIGNED OFF. Ungated, no new API. Builds on the postseason bracket + series drawer (`handoff_postseason_bracket/`, rev 3).

Design reference: `holistic/series.jsx` (`EnterGame`, `SeriesGame`), shown in `Home - Postseason.html` (click any started series on the bracket).

## Change

In the series drawer (Home → bracket → click a series), **every live or future game row gets an `Enter game →` link**:

| Row | Before | Now |
|---|---|---|
| Final | Recap | Recap (unchanged, **no** Enter game) |
| Live | `Open game →` | **`Enter game →`** → live game view |
| Next scheduled (probables known) | no link | **`Enter game →`** → pregame view |
| Scheduled, probables not announced | no link | **`Enter game →`** → pregame view |
| If necessary | no link | **`Enter game →`** → pregame view (**kept on purpose**: MLB lists these with a gamePk; if the game turns out not to be needed it drops out of the series like any cancelled game) |

- **Label:** `Enter game →`, the same as the Games page and its widget. Rename the live row's `Open game →`.
- **Placement:** in the row's header line, right-aligned opposite `Game N · day · @ HOST` (where Recap sits on finals). Future rows' header becomes a flex row (`space-between`, `gap: 10`), and the status line (`If necessary` / probables / `Probables not announced`) stays underneath.
- **Style:** link, DM Sans 12px / 700, `white-space: nowrap`, default `a` colours (rust; darker rust on hover).
- **Target:** the game's `gamePk` route (the same one as the Games page). Opening it doesn't close the drawer first; normal navigation handles that.
- If a future game has no `gamePk` yet, render no link (not a disabled one).

## Copy sweep — one verb app-wide: `Enter game →`

"Open game" and "Enter game" did the same thing (go to the game page). Standardize on **`Enter game →`**, the established term (Games page cards, the live widget, Team page). Replace the remaining three:

| File | Line | Change |
|---|---|---|
| `client/src/pages/home/SeriesDrawer.tsx` | ~160 | `Open game →` → `Enter game →` (covered above) |
| `client/src/pages/HighlightsPage.tsx` | ~158 | `Open game →` → `Enter game →` |
| `client/src/components/alerts/alertTypes.ts` | ~32 | both `"Open game →"` → `"Enter game →"` (`▶ Watch clip` unchanged) |

After this, `grep -rn "Open game" client/src` returns nothing.

## Acceptance
- ALDS NYY–BOS: G1–G3 Recap only; G4 (next) and G5 (if necessary) show `Enter game →`.
- ALDS CLE–HOU: G3 (live) shows `Enter game →` (not "Open game"); G4/G5 (if necessary) show it too.
- A finished series (e.g. a Wild Card) shows no Enter game links.
- Each link lands on that game's live or pregame view.
- No "Open game" text anywhere in the app: Highlights rows and alert actions read `Enter game →`.
