# Weather Card Implementation — Prompt

## Task
Integrate the Weather Card design into the live scoring widget. The card displays real-time game-day weather conditions: temperature, wind, and atmospheric data.

## Design Source
**File:** Weather Card.html  
**Dimensions:** 425×195 px  
**Location:** Widget carousel, positioned after Field Card

## Data Requirements
- Current temperature (°F)
- "Feels like" temperature
- Wind direction (0–359° or cardinal: N, NNE, NE, etc.)
- Wind speed (mph)
- Pressure (inHg)
- Humidity (%)
- Dew point (°F)
- Game time (HH:MM AM/PM format)

## Implementation Details

### Header
```html
<div style="padding: 12px 14px; border-bottom: 1px solid #e0dccd;">
  <div style="font-size: 16px; font-weight: 700; color: #15161a;">
    [Venue Name]
  </div>
  <div style="font-size: 13px; color: #6f685f; margin-top: 4px;">
    Game time [HH:MM AM/PM]
  </div>
</div>
```

### Body Layout
Main flex row: gap 60px
- **Left:** Wind rose (150×110 SVG)
- **Right:** Flex column with temperature + conditions

#### Temperature Section
```html
<div style="display: flex; flex-direction: column; gap: 8px;">
  <div style="display: flex; align-items: center; gap: 8px;">
    <span style="font-size: 35px;">🌡️</span>
    <div>
      <div style="font-size: 28px; font-weight: 700; color: #15161a;">
        [Temp]°
      </div>
      <div style="font-size: 11px; color: #6f685f;">
        Feels like [FeelsLike]°
      </div>
    </div>
  </div>
</div>
```

#### Conditions Section
```html
<div style="display: flex; flex-direction: column; gap: 3px; font-size: 12px;">
  <div>
    <span style="color: #6f685f;">Pressure</span>
    <span style="color: #15161a; font-family: JetBrains Mono;">
      [Pressure] inHg
    </span>
  </div>
  <div>
    <span style="color: #6f685f;">Humidity</span>
    <span style="color: #15161a; font-family: JetBrains Mono;">
      [Humidity]%
    </span>
  </div>
  <div>
    <span style="color: #6f685f;">Dew point</span>
    <span style="color: #15161a; font-family: JetBrains Mono;">
      [DewPoint]°
    </span>
  </div>
</div>
```

### Wind Rose Visualization
**SVG overlay on field silhouette (150×110)**

The wind rose is a centered field image with animated wavy lines that flow in the wind direction. Three lines per direction, evenly spaced vertically/horizontally depending on direction. Lines use cyan (#FAF59A) with small arrowheads at the end indicating flow.

#### Wind Direction Mapping
16 compass directions, three lines per direction, all centered on the field image center:

| Direction | Lines Flow | Wind Angle |
|-----------|-----------|-----------|
| N | Downward (S) | 180° |
| NNE | Down-right | 202.5° |
| NE | Right-down | 225° |
| ENE | Right-down | 247.5° |
| E | Rightward (W) | 270° |
| ESE | Right-up | 292.5° |
| SE | Up-right | 315° |
| SSE | Up-right | 337.5° |
| S | Upward (N) | 0° |
| SSW | Up-left | 22.5° |
| SW | Left-up | 45° |
| WSW | Left-up | 67.5° |
| W | Leftward (E) | 90° |
| WNW | Left-down | 112.5° |
| NW | Down-left | 135° |
| NNW | Down-left | 157.5° |

#### SVG Line Specifications
- **Quantity:** Always 3 wavy lines per direction
- **Spacing:** Evenly distributed (typically 20–25px apart)
- **Color:** #FAF59A (cyan)
- **Stroke width:** 1.5px
- **Arrowheads:** Small triangles (5–7px) at line end, pointing in direction of flow
- **Waveform:** Gentle sine/cosine curves, amplitude ~3–4px, frequency ~0.8–1 per line

#### Centering Rule
Wind lines SVG bounding box center must align with field image center. Use absolute positioning + transform to pin the SVG overlay.

## Notes for Dev
- Use existing wind direction enum from API (if available) or convert bearing angle to cardinal
- Temperature data likely from game-day weather API (MLB StatsAPI or similar)
- All numeric values use JetBrains Mono, tabular-nums
- Test with variety of wind directions to confirm line orientations are correct
- Wind lines should NOT overlap the field image or extend beyond the 150×110 container
