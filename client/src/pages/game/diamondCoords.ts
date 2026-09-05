// Diamond corner coordinates, field viewBox 0 0 100 100 — matches the geometry
// baked into public/scorebook-cell.js. That file is loaded as a plain <script>
// (not a module) so it can't import this; keep the two numerically in sync.
export const HOME: [number, number] = [50, 90];
export const FIRST: [number, number] = [81.82, 58.18];
export const SECOND: [number, number] = [50, 26.36];
export const THIRD: [number, number] = [18.18, 58.18];
export const DIAMOND_CORNERS: readonly [number, number][] = [HOME, FIRST, SECOND, THIRD, HOME];

// Path from one base to another, walking every intermediate corner — a runner
// going 1B -> 3B passes through 2B, never a diagonal shortcut.
export function diamondSegPath(fromBase: number, toBase: number): string {
  const pts: string[] = [];
  for (let b = fromBase + 1; b <= Math.min(toBase, 4); b++) {
    const [ax, ay] = DIAMOND_CORNERS[b - 1];
    const [bx, by] = DIAMOND_CORNERS[b];
    pts.push(`M${ax},${ay} L${bx},${by}`);
  }
  return pts.join(' ');
}

// Runner Trace positional leg colours (panel + scorecard trace overlay only —
// the scorecard's own permanent notation stays ink always). Fixed order: the
// batter's own on-base line is ink, then red/green/blue, cycling after the
// third advancement. Positional, not semantic — a stranded runner still gets
// ink then red.
export const TRACE_ORIGIN_COLOR = '#15161a';
export const TRACE_ADVANCE_COLORS = ['#b8421e', '#3f6b34', '#2c4a78'] as const;

export function traceLegColor(eventIdx: number): string {
  if (eventIdx <= 0) return TRACE_ORIGIN_COLOR;
  return TRACE_ADVANCE_COLORS[(eventIdx - 1) % TRACE_ADVANCE_COLORS.length];
}

// Base a runner reached on their own plate appearance (0 = didn't reach).
// Shared by the panel and the scorecard highlight effect so "where did this
// trace start" is computed identically in both places.
export function getInitialBase(result: string | undefined): number {
  if (!result) return 0;
  if (result === "HomeRun") return 4;
  if (result === "Triple") return 3;
  if (result === "Double") return 2;
  const FIRST = ["Single", "Walk", "IntentionalWalk", "HitByPitch", "HBP", "Error", "FieldersChoice", "SacBunt"];
  return FIRST.includes(result) ? 1 : 0;
}
