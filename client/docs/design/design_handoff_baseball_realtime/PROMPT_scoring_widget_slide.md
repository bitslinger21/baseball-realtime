# Scoring Widget — Slide Effect (Infinite Carousel)

## Overview
Replace the current click-to-flip behavior with a **horizontal swipe/slide carousel** that supports infinite navigation in both directions (left/right). Users can:
- Swipe left to advance to the next card (wraps: 3 → 1)
- Swipe right to go to the previous card (wraps: 1 → 3)
- Click directional buttons (‹ / ›) to navigate in either direction

## Interaction Model

### Swipe Gestures
- **Left swipe**: Next card (clockwise through: front → line score → pitch mix → front)
- **Right swipe**: Previous card (counter-clockwise)
- Swipe distance threshold: ~50px (typical gesture library default)
- Velocity-based: fast flick animates faster (optional enhancement)

### Button Navigation
- Two buttons: **‹** (previous) and **›** (next) — replacing the single › button
- Buttons visible on current slide, always accessible
- Spacing: placed symmetrically left/right in the slide header or card edge

### Carousel Logic
```
Index wrapping (3 cards, indices 0–2):
- currentIndex + 1 → (currentIndex + 1) % 3  // next: 2 → 0
- currentIndex - 1 → (currentIndex - 1 + 3) % 3  // prev: 0 → 2
```

## Animation & UX

### Transition
- **Duration**: 300–400ms (smooth but snappy)
- **Easing**: cubic-bezier(0.25, 0.46, 0.45, 0.94) or similar ease-out
- **Transform**: `translateX(offset%)` where offset = currentIndex × -33.333% (or -100% for single-width slides)

### Gesture Feedback
- **Swipe preview**: Optional — drag the card partway and release to animate to nearest snap point
- **Momentum scrolling**: NOT required; simple snap-to-grid is fine
- **Disabled state**: No interaction while animating (queue gestures, or ignore them)

## State & Logic

### React State
```javascript
const [currentIndex, setCurrentIndex] = useState(0);

const handleNext = () => setCurrentIndex(prev => (prev + 1) % cards.length);
const handlePrev = () => setCurrentIndex(prev => (prev - 1 + cards.length) % cards.length);

const handleSwipe = (direction) => {
  if (direction === 'left') handleNext();
  else if (direction === 'right') handlePrev();
};
```

### Gesture Detection
Use a simple pointer event approach (pointerdown → pointermove → pointerup) or integrate `react-swipe-events` / similar library:
- Track `startX` on pointerdown
- Calculate delta on pointerup
- Threshold: |deltaX| > 50px triggers navigation
- direction: deltaX < 0 ? 'left' : 'right'

## CSS

### Current Approach (Keep & Extend)
```css
.slide-container { 
  overflow: hidden; /* clips slides outside viewport */
  width: 320px; 
  height: 195px; 
}

.slide-content { 
  display: flex; 
  transform: translateX(offset%); /* animated */
  transition: transform 0.3s ease-out;
}

.slide { 
  flex: 0 0 33.333%; /* 3 equal slides */
  /* or: flex: 0 0 100% if each card takes full width */
}
```

## Design Details

### Button Placement
- Current: single › button in card header (top-right)
- New: two buttons (‹ and ›) flanking the title, or one on each edge (left/right side of card)
- Style: consistent with current 28px × 28px button (border, background, hover state)

### Focus / Accessibility
- Buttons must be keyboard-accessible (Tab, Enter/Space)
- Swipe should not interfere with text selection
- ARIA: `role="region"` on carousel container, `aria-label="[Card name]"`

## Implementation Notes

1. **No library requirement**: Use native `onPointerDown/Move/Up` or integrate a lightweight swipe lib
2. **Animate on navigation change**: CSS `transition` handles the smoothness; no JS animation loop needed
3. **Lock during animation**: Set a flag `isAnimating` during the 300ms transition to prevent gesture/button overlap
4. **Velocity/momentum**: Optional — standard snap-to-grid is sufficient for this use case
5. **Mobile-first**: Test on touch devices; swipe detection should prioritize touch events over mouse

## Testing Checklist

- [ ] Swipe left advances card (desktop mouse drag simulation + mobile touch)
- [ ] Swipe right goes to previous card
- [ ] Wrapping works: card 3 → left swipe → card 1
- [ ] Wrapping works: card 1 → right swipe → card 3
- [ ] Button clicks navigate in correct direction
- [ ] Buttons disabled (or no-op) during animation
- [ ] Touch on desktop (pointer events) works as expected
- [ ] Keyboard nav (Tab to buttons, Enter/Space to click) works

## Deliverable Location
- Reference implementation: `ScoringWidget` component in the live app
- Migration path: Update `GamePage` scoring widget mounting to use new gesture-enabled version
