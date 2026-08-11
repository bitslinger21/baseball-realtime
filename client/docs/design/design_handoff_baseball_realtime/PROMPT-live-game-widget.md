# PROMPT: Scorebook Widget Integration

## Overview
Integrate the new Scoring Widget into the Daily Games landing page to display live at-bat state for in-progress games.

## Files

**scoring-widget.jsx** — React component displaying pitcher/batter stats, inning, bases, count, and team scores.

Props (all required):
- away, home: { id, abbr }
- awayScore, homeScore: number
- inning: string ("2nd", "5th", etc)
- half: "top" | "bottom"
- count: [balls, strikes, outs]
- bases: { first, second, third }
- pitcher: { name, era, pc }
- batter: { name, avg, ab }

**landing.jsx** — Updated Daily Games page layout:
- Section "2 in progress" now shows ScoringWidget instances in a responsive grid
- Grid uses `repeat(auto-fit, minmax(540px, 1fr))` so widgets wrap naturally
- Each widget maintains fixed width via `display: inline-block` wrapper
- Widgets center with proper cushioning between them

## Changes from Previous Design

1. **Live game cards replaced** — Multi-section cards removed; replaced with compact ScoringWidget
2. **Responsive grid** — Two rows of widgets adapt to viewport width
3. **Border styling** — Widget border uses T.borderStrong (consistent with final/upcoming cards)
4. **Border radius** — 10px corners

## Integration Checklist

- [ ] Copy scoring-widget.jsx into your components directory
- [ ] Import ScoringWidget into landing.jsx
- [ ] Update "2 in progress" section to use responsive grid + widget instances
- [ ] Verify grid wraps correctly at narrow viewports
- [ ] Wire real game data (team IDs, scores, inning, bases, count, pitcher/batter names)
- [ ] Confirm team logos load via MLB static API: https://www.mlbstatic.com/team-logos/{teamId}.svg
- [ ] Test with varying numbers of live games (2, 3, 4+)

## Styling Dependencies

All colors/tokens from window.T (shared.jsx):
- T.surface, T.border, T.borderStrong, T.ink, T.textMuted, T.accent, T.sh.sm

## Notes

- Widget width is fixed (~560px) and does NOT expand to fill parent grid cells
- Widget is self-contained; no external state management needed
- All numbers rendered in JetBrains Mono with tabular-nums
- Team logos fallback to placeholder if API fails (onerror handler)
