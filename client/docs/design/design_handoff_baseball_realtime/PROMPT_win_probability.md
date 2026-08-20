# Win Probability Card — Implementation Prompt

## Task
Add the Win Probability card to the scoring widget carousel. This card shows game win probability over time with a dual-team fill chart.

## Design file
`Win Probability Card.html` contains the complete visual design and all SVG markup.

## Key implementation details

### Header structure
```html
<div class="header">
  <div class="title">Win Probability</div>
  <div class="team-badge">
    <img src="team-logo-url" /> 
    <span>68%</span>
  </div>
</div>
```

### SVG chart anatomy
- **Y-axis labels:** "100" (top), "50" (middle), "100" (bottom)
- **X-axis labels:** "1" through "9" for innings, positioned below the 50% centerline
- **Centerline:** dashed line at 50%, separates above (home/rust) from below (away/navy)
- **Filled areas:** Gradient-filled regions above and below the centerline, clipped independently
- **Line stroke:** Dark line tracing probability across innings, circles on current point

### Data wiring
Map your game data to:
1. `homeTeamWinProb` — current win percentage (0–100)
2. `homeTeamId` — MLB team ID for logo from mlbstatic.com
3. `dataPoints` — array of `{ inning, prob }` where:
   - `inning` = 1.0, 1.5, 2.0, etc. (supports fractional innings)
   - `prob` = −100 to +100 (−100 = away team 100%, +100 = home team 100%)

### Responsive sizing
- Card is 495×195 px fixed
- SVG uses `viewBox="0 0 380 120"` and `preserveAspectRatio="none"` for stretching
- All text labels are absolute-positioned SVG elements; they scale with the viewBox

### Color tokens
- Rust (home/above 50%): `#b8421e`
- Navy (away/below 50%): `#2c4a78`
- Centerline: `#cfc8b4` (dashed)
- Axis lines: `#b4ae9b`
- Text: `#6f685f` or `#15161a` depending on context

### Testing checklist
- [ ] Chart renders with live game data
- [ ] Centerline at exactly 50% (middle of SVG height)
- [ ] Filled areas clip correctly above/below the 50% line
- [ ] Current data point (rightmost) shows a rust circle
- [ ] Inning labels (1–9) display below the centerline
- [ ] Team logo loads from mlbstatic.com or shows fallback
- [ ] Win % updates when new plays occur
- [ ] No horizontal scroll; chart fits within 495px

### References
- Design system tokens: see `window.T` in the main app
- Card styling patterns: see `Pitch Mix Card` or `Line Score Card` for header/padding precedents
- SVG clip-path syntax: https://developer.mozilla.org/en-US/docs/Web/SVG/Element/clipPath
