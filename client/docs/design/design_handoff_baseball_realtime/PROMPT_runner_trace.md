# PROMPT: Runner Trace Implementation

## Objective
Build the Runner Trace detail panel, which reveals the complete inning journey of a clicked baserunner with timeline, play descriptions, and diamond visualization.

## Feature Flow
1. User clicks a baserunner notation in the scorebook (any inning, any base)
2. Detail panel slides in from the right with that runner's trace
3. Timeline shows each advancement event with play description
4. Diamond visualizes the runner's path in rust, with final destination highlighted
5. Hovering a timeline event highlights the related play in the scorebook

## Data Schema

```typescript
interface RunnerTrace {
  runner: {
    mlbId: string;
    name: string;
    headshotUrl: string;
    finalResult: 'scored' | 'stranded' | 'out';
  };
  inning: number;
  events: AdvancementEvent[];
}

interface AdvancementEvent {
  sequence: number;           // 1st advancement, 2nd, etc.
  fromBase: 0 | 1 | 2 | 3;  // 0 = at-bat, 1 = 1B, 2 = 2B, 3 = 3B
  toBase: 1 | 2 | 3 | 4;    // 4 = scored
  playDescription: string;   // e.g. "Single to Right Field"
  playDetail: string;        // e.g. "Altuve reaches base"
  playerId: string;          // who caused the advancement
  playerName: string;
  outCount: number;          // outs when play occurred
}
```

## UI Layout

**Panel** (350px wide, fixed right side)
- **Header bar**: "RUNNER TRACE" label + close button (✕)
- **Player section** (top):
  - Headshot (48×48, border-radius 6px)
  - Name (18px, bold)
  - Inning badge ("6th Inning", 12px)
  - Result badge ("Scored" / "Stranded" / "Out", 11px, colored)
- **Timeline** (scrollable):
  - Each event shows progression (1B → 2B → 3B → H)
  - Base badge (32px circle, rust border)
  - Play description (13px, bold)
  - Play detail (12px, secondary text)
  - Vertical connector line between events
- **Diamond** (120×120):
  - Field shape (#efeae0 bg, #cfc8b4 outline)
  - Four bases (circles, #fcfaf6)
  - Runner's path traced in rust (#b8421e), 2.5px stroke
  - Final base/home highlighted in green (#3f6b34) if scored
  - Base labels (1B, 2B, 3B, H) in rust
- **Divider** (1px #e0dccd)
- **Footer**: "View Full Inning Trace" link (optional, for future expansion)

## Interaction Rules

1. **Open**: Click any baserunner cell in scorebook → panel slides in (transform: translateX)
2. **Close**: Click ✕ button or click outside panel → slide out
3. **Sync**: Hover timeline event → highlight corresponding play cell in scorebook
4. **Mobile**: Panel takes full width on small screens

## Design Tokens

- **Background**: #fcfaf6
- **Border**: #e0dccd (light), #cfc8b4 (medium)
- **Text primary**: #15161a
- **Text secondary**: #75706a
- **Accent (rust)**: #b8421e
- **Accent (green/scored)**: #3f6b34
- **Font (UI)**: DM Sans
- **Font (numeric)**: JetBrains Mono

## Animation
- Panel slide-in: 300ms ease-out (`transform: translateX(-350px)` → `translateX(0)`)
- Timeline stagger: each event fades in with 60ms delay
- Hover highlight: 150ms transition on scorebook cell background

## Edge Cases

1. **Single-event trace** (e.g., runner scores on first play): Timeline shows one item, diamond shows direct path
2. **Stranded runner**: Path stops mid-diamond, final base badge shows secondary color (#75706a)
3. **Out on play**: Path terminates with "Out" badge, diamond path ends mid-base
4. **Missing headshot**: Render initials avatar fallback
5. **No play detail**: Show play description only

## Performance Notes
- Trace data pre-computed per inning from play-by-play feed
- Panel is a controlled React component; only render when open
- Diamond SVG is static (no animation loops)

## Future Enhancements (Out of Scope)
- "View Full Inning Trace" expands to show all runners at once
- Replay animation of runner's journey
- Comparison of runner vs. pitcher tendency on that play type
