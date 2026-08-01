# FIX: Head-to-head toggle missing from the real game page (not just the design mock)

## Root cause
The design source (`holistic/game-v2.jsx`) puts the "Preview/Head-to-head" (pregame) and
"Live/Head-to-head" (live) segmented toggle **inside `PageTitle`'s `right` slot**, right next
to the matchup title, on both `GameScreenV2Pregame` and `GameScreenV2`. Your port's `GamePage`
apparently built its OWN Pregame/Live switcher at the top of the page (a different, higher-
level control than ours) and never carried our toggle down into the title row of either state.
That's why it's not visible — it's not a rendering bug, it's a missing insertion.

## What to do
1. Open the game page component that renders the title/header row for BOTH the pregame and
   live states (wherever `PageTitle`/matchup title + subtitle currently render in your real
   `GamePage`).
2. Add a segmented control immediately to the right of the title, matching
   `holistic/game-v2.jsx`'s pattern exactly:
   - Pregame state: `['Preview', 'Head-to-head']`
   - Live state: `['Live', 'Head-to-head']`
3. Wire it to a `view` state (`'preview' | 'h2h'`) that swaps the BODY content below the line
   score:
   - `view === 'h2h'` → render `HeadToHeadScreen` (ported from `holistic/game-headtohead.jsx`),
     passing your real `lineups`/`probables` data.
   - otherwise → render whatever the page renders today (pregame preview or live matchup/
     pitch-by-pitch).
4. Live state default selection: initialize `HeadToHeadScreen`'s selected batter to the
   CURRENT live batter (the same batter driving your live at-bat card), not a fixed slot.
5. Confirm `TeamDot`/`TeamMark`'s `onDark` prop (white plate behind dark logos) is present in
   your ported `shared.jsx` and is applied on the dark line-score band's team marks — check
   with a dark-logo team (Twins/Royals) if in your roster.

## Verify before reporting done
Screenshot BOTH the pregame page and the live page, each showing the segmented toggle next to
the title, and click it to show the Head-to-head screen actually swapping in. A screenshot of
just the outer Pregame/Live switcher is NOT sufficient proof — that's a different control.

Reference files: `holistic/game-headtohead.jsx`, `holistic/game-v2.jsx`
(`GameScreenV2Pregame`/`GameScreenV2`), `holistic/shared.jsx` (`TeamDot`/`TeamMark` `onDark`).
