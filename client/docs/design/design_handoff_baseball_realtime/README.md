# Weather Card — Widget Implementation

## Overview
The Weather Card displays current game-day weather conditions for the scoring widget. A compact 425×195 information panel with temperature, wind direction/speed, and atmospheric conditions.

## Files
- **Weather Card.html** — Standalone design reference showing the complete card with all data fields and wind visualization.
- **PROMPT_weather_card.md** — Implementation specification for wiring weather data and wind-direction rendering.

## Key Elements
- **Header** — Two-line title: venue name (16px) + game time label (13px)
- **Body** — Three-column layout:
  1. Wind rose visualization (150×110) with animated wavy lines showing direction
  2. Temperature section — icon + current temp (28px) + "feels like" (11px)
  3. Conditions section — pressure, humidity, dew point (12px base)
- **Wind Direction** — Centered wavy lines overlay on field silhouette, always three lines, centered per direction, cyan (#FAF59A) with arrowheads

## Styling Notes
- All numbers use JetBrains Mono with tabular-nums
- Colors: text #15161a, muted #6f685f, accent #b8421e
- Card: 425×195, border-radius 10px, border 1px #b4ae9b, bg #fcfaf6
- Header padding 12px 14px; body padding 12px 13px
- Wind lines: 16 compass directions (N, NNE, NE...NW), three per direction, spaced evenly

## Integration Notes
- Wind lines are SVG-based, directional per heading (0–359°)
- Wind direction → three wavy SVG paths + centered arrowheads
- Render conditions as flex-column stacked rows, each label 10px + value 13px
- Game time label matches header styling (13px, muted color)

## Next Steps
- Wire live weather data API
- Bind wind direction + speed to SVG generation
- Test with variety of wind directions (N, NE, S, SW, etc.)
