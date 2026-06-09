/* global React */
// ============================================================
// HOLISTIC — Shared tokens + atoms
// ============================================================

window.T = {
  // surface
  bg: '#f4f1ea',
  surface: '#fcfaf6',
  surfaceAlt: '#efeae0',
  border: '#e0dccd',
  borderStrong: '#c4bfae',
  ink: '#15161a',
  text: '#1a1612',
  textMuted: '#75706a',
  textFaint: '#a39d92',
  // accent
  accent: '#b8421e',
  accentSoft: '#fbe9dd',
  positive: '#4a7c3e',
  positiveSoft: '#e6efd9',
  info: '#2c4a78',
  infoSoft: '#dde6f1',
  highlight: '#c8941c',
  highlightSoft: '#fbf0d2',
  danger: '#a31621',
  // type
  sans: '"DM Sans", system-ui, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, monospace',
  // radius
  r: { sm: 6, md: 10, lg: 14, xl: 18, pill: 999 },
  // shadow
  sh: {
    sm: '0 1px 2px rgba(20,16,12,0.04)',
    md: '0 4px 14px -6px rgba(20,16,12,0.08)',
    lg: '0 12px 32px -10px rgba(20,16,12,0.18)',
  },
};

window.TEAMS = {
  HOU: { abbr: 'HOU', id: 117, name: 'Houston Astros',      short: 'Astros',     primary: '#002D62', secondary: '#EB6E1F' },
  CHC: { abbr: 'CHC', id: 112, name: 'Chicago Cubs',        short: 'Cubs',       primary: '#0E3386', secondary: '#CC3433' },
  PIT: { abbr: 'PIT', id: 134, name: 'Pittsburgh Pirates',  short: 'Pirates',    primary: '#27251F', secondary: '#FDB827' },
  TOR: { abbr: 'TOR', id: 141, name: 'Toronto Blue Jays',   short: 'Blue Jays',  primary: '#134A8E', secondary: '#1D2D5C' },
  DET: { abbr: 'DET', id: 116, name: 'Detroit Tigers',      short: 'Tigers',     primary: '#0C2340', secondary: '#FA4616' },
  BAL: { abbr: 'BAL', id: 110, name: 'Baltimore Orioles',   short: 'Orioles',    primary: '#DF4601', secondary: '#27251F' },
  CLE: { abbr: 'CLE', id: 114, name: 'Cleveland Guardians', short: 'Guardians',  primary: '#00385D', secondary: '#E50022' },
  PHI: { abbr: 'PHI', id: 143, name: 'Philadelphia Phillies', short: 'Phillies', primary: '#E81828', secondary: '#284898' },
  TBR: { abbr: 'TBR', id: 139, name: 'Tampa Bay Rays',      short: 'Rays',       primary: '#092C5C', secondary: '#8FBCE6' },
  NYY: { abbr: 'NYY', id: 147, name: 'New York Yankees',    short: 'Yankees',    primary: '#0C2340', secondary: '#C4CED4' },
  LAD: { abbr: 'LAD', id: 119, name: 'Los Angeles Dodgers', short: 'Dodgers',    primary: '#005A9C', secondary: '#EF3E42' },
  ATL: { abbr: 'ATL', id: 144, name: 'Atlanta Braves',      short: 'Braves',     primary: '#13274F', secondary: '#CE1141' },
};

const T = window.T;
const TEAMS = window.TEAMS;

// Global chrome: kill the browser's default (blue) focus ring on mouse click,
// keep an accessible accent ring for keyboard users only (:focus-visible).
// This is what removes the heavy blue box around the active tab after a click.
(function injectGlobalCSS() {
  if (typeof document === 'undefined' || document.getElementById('br-global-css')) return;
  const s = document.createElement('style');
  s.id = 'br-global-css';
  s.textContent = [
    'button{-webkit-tap-highlight-color:transparent}',
    'button:focus{outline:none}',
    'button:focus-visible{outline:2px solid ' + T.accent + ';outline-offset:2px;border-radius:5px}',
    'input:focus-visible{outline:2px solid ' + T.accent + ';outline-offset:1px}',
  ].join('');
  (document.head || document.documentElement).appendChild(s);
})();

// Lightweight analytics hook. Replace with the real event pipeline in the app;
// here it just logs so fake-door intent (e.g. Compare) is observable.
window.track = window.track || function track(event, props) {
  try { console.log('[track]', event, props || {}); } catch (e) {}
};

// ----- Atoms -----

// Real MLB team logo (SVG from MLB CDN) with a colored letter-mark fallback.
window.teamLogoUrl = function teamLogoUrl(team) {
  return team.id ? `https://www.mlbstatic.com/team-logos/${team.id}.svg` : null;
};

// Navigate to the Player Overview. In the design canvas this focuses the
// player-overview artboard; standalone it no-ops. In the real app, replace
// the call sites with <Link to={`/player/${mlbId}`}>.
window.openPlayerOverview = function openPlayerOverview() {
  if (window.dcFocusArtboard) window.dcFocusArtboard('player-overview/player-overview');
};

// Navigate to the live Game view. In the design canvas this focuses the
// game-v2 artboard; standalone it no-ops. In the real app, replace the
// call site with <Link to={`/game/${providerGameId}`}>.
window.openGameView = function openGameView() {
  if (window.dcFocusArtboard) window.dcFocusArtboard('game/game-v2');
};

window.TeamDot = function TeamDot({ team, size = 28, square = false }) {
  const [failed, setFailed] = React.useState(false);
  const url = window.teamLogoUrl(team);
  if (url && !failed) {
    return (
      <img src={url} alt={team.abbr} width={size} height={size}
        onError={() => setFailed(true)}
        style={{ width: size, height: size, objectFit: 'contain', flex: 'none', display: 'block' }} />
    );
  }
  return (
    <div style={{
      width: size, height: size,
      borderRadius: square ? size * 0.18 : '50%',
      background: team.primary,
      color: '#fff',
      display: 'inline-grid', placeItems: 'center',
      fontFamily: T.sans, fontWeight: 800,
      fontSize: size * 0.36, letterSpacing: '0.02em',
      flex: 'none',
      boxShadow: `inset 0 0 0 2px ${team.secondary}40`,
    }}>{team.abbr.charAt(0)}</div>
  );
};

window.TeamMark = function TeamMark({ team, size = 56 }) {
  const [failed, setFailed] = React.useState(false);
  const url = window.teamLogoUrl(team);
  if (url && !failed) {
    return (
      <img src={url} alt={team.abbr} width={size} height={size}
        onError={() => setFailed(true)}
        style={{ width: size, height: size, objectFit: 'contain', flex: 'none', display: 'block' }} />
    );
  }
  // Fallback: circular mark with a band of secondary color
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: team.primary, color: '#fff',
      display: 'grid', placeItems: 'center',
      fontFamily: T.sans, fontWeight: 800, fontSize: size * 0.28,
      letterSpacing: '0.04em', flex: 'none',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 30% 30%, transparent 55%, ${team.secondary}66 80%)` }} />
      <span style={{ position: 'relative' }}>{team.abbr}</span>
    </div>
  );
};

// Headshot — real MLB player photo with initials fallback.
// GLOBAL RULE: player photos are ALWAYS portrait (taller than wide) with
// object-position:center top, so the crop keeps the face and never clips the
// chin. A square crop on a head-and-shoulders photo cuts off at the mouth —
// do not use a 1:1 frame for a person. `ratio` is height/width.
// The MLB source photo is ~1.50 tall (height/width); the default box (1.40) keeps
// the full face + chin with margin. The team-color band is an ABSOLUTE overlay so
// it never steals height from the image (which is what was clipping the chin).
window.Headshot = function Headshot({ team, initials, mlbId, size = 64, ratio = 1.4 }) {
  const [failed, setFailed] = React.useState(false);
  const boxH = Math.round(size * ratio); // portrait — fits head + shoulders without clipping the face
  const url = mlbId
    ? `https://img.mlbstatic.com/mlb-photos/image/upload/w_${Math.round(size * 2)},q_auto:best/v1/people/${mlbId}/headshot/67/current`
    : null;
  return (
    <div style={{
      width: size, height: boxH,
      borderRadius: T.r.md,
      background: T.surfaceAlt,
      border: `1px solid ${T.border}`,
      overflow: 'hidden',
      flexShrink: 0,
      position: 'relative',
    }}>
      {url && !failed ? (
        <img src={url} alt={initials}
          onError={() => setFailed(true)}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', display: 'block' }} />
      ) : (
        <div style={{
          position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
          fontFamily: T.sans, fontSize: size * 0.34, fontWeight: 700,
          color: T.textFaint, letterSpacing: '-0.02em',
        }}>
          {initials}
        </div>
      )}
      {/* team-color band — absolute overlay, does not consume image height */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, background: team ? team.primary : T.accent, zIndex: 1 }} />
    </div>
  );
};

window.Pips = function Pips({ count, total, size = 9, gap = 4, color, emptyColor }) {
  color = color || T.ink;
  emptyColor = emptyColor || T.borderStrong;
  return (
    <div style={{ display: 'inline-flex', gap, alignItems: 'center' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          width: size, height: size, borderRadius: '50%',
          background: i < count ? color : 'transparent',
          border: `1.5px solid ${i < count ? color : emptyColor}`,
        }} />
      ))}
    </div>
  );
};

window.Bases = function Bases({ on = [false,false,false], size = 36, fill, empty, strokeWidth = 1.5 }) {
  fill = fill || T.ink;
  empty = empty || T.borderStrong;
  const s = size / 3.6;
  const base = (filled) => (
    <div style={{
      width: s, height: s,
      background: filled ? fill : 'transparent',
      border: `${strokeWidth}px solid ${filled ? fill : empty}`,
      transform: 'rotate(45deg)',
    }} />
  );
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: 'none' }}>
      <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)' }}>{base(on[1])}</div>
      <div style={{ position: 'absolute', top: '50%', right: 0, transform: 'translateY(-50%)' }}>{base(on[0])}</div>
      <div style={{ position: 'absolute', top: '50%', left: 0, transform: 'translateY(-50%)' }}>{base(on[2])}</div>
    </div>
  );
};

window.Inning = function Inning({ half = 'bottom', num = 9, size = 12, color }) {
  color = color || T.ink;
  const tri = half === 'top'
    ? { borderBottom: `${size * 0.7}px solid ${color}`, borderLeft: `${size * 0.4}px solid transparent`, borderRight: `${size * 0.4}px solid transparent`, width: 0, height: 0 }
    : { borderTop:    `${size * 0.7}px solid ${color}`, borderLeft: `${size * 0.4}px solid transparent`, borderRight: `${size * 0.4}px solid transparent`, width: 0, height: 0 };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: T.sans, fontWeight: 700, fontSize: size + 2, color }}>
      <span style={tri} />{num}
    </span>
  );
};

window.Card = function Card({ children, style, title, subtitle, action, padless }) {
  return (
    <div style={{
      background: T.surface,
      border: `1px solid ${T.border}`,
      borderRadius: T.r.lg,
      boxShadow: T.sh.sm,
      ...style,
    }}>
      {(title || action) && (
        <div style={{
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          padding: '14px 18px',
          borderBottom: `1px solid ${T.border}`,
        }}>
          <div>
            <div style={{ fontFamily: T.sans, fontSize: 14, fontWeight: 700, color: T.text, letterSpacing: '-0.01em' }}>{title}</div>
            {subtitle && <div style={{ fontFamily: T.sans, fontSize: 11, color: T.textMuted, marginTop: 2, letterSpacing: '0.04em' }}>{subtitle}</div>}
          </div>
          {action}
        </div>
      )}
      <div style={{ padding: padless ? 0 : 16 }}>{children}</div>
    </div>
  );
};

// Tiny uppercase label — used everywhere
window.Eyebrow = function Eyebrow({ children, color, style }) {
  return (
    <span style={{
      fontFamily: T.sans,
      fontSize: 10, fontWeight: 700,
      letterSpacing: '0.14em', textTransform: 'uppercase',
      color: color || T.textMuted,
      ...style,
    }}>{children}</span>
  );
};

// Stat card — the workhorse. Three sizes.
// size: 'hero' | 'md' | 'sm'
window.Stat = function Stat({ label, value, sub, size = 'md', accent, trend, align = 'left' }) {
  const sizes = {
    hero: { v: 56, l: 11, s: 12 },
    md:   { v: 30, l: 10, s: 11 },
    sm:   { v: 20, l: 9,  s: 10 },
  };
  const z = sizes[size];
  return (
    <div style={{ textAlign: align, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Eyebrow color={T.textMuted} style={{ fontSize: z.l }}>{label}</Eyebrow>
      <div style={{
        fontFamily: T.mono, fontWeight: 700,
        fontSize: z.v, lineHeight: 0.95,
        color: accent || T.text,
        fontVariantNumeric: 'tabular-nums',
        letterSpacing: '-0.02em',
      }}>{value}</div>
      {sub && (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, justifyContent: align === 'right' ? 'flex-end' : 'flex-start' }}>
          {trend !== undefined && (
            <span style={{
              fontFamily: T.mono, fontSize: z.s,
              color: trend > 0 ? T.positive : trend < 0 ? T.accent : T.textMuted,
              fontWeight: 600,
            }}>{trend > 0 ? '▲' : trend < 0 ? '▼' : '·'} {Math.abs(trend)}</span>
          )}
          <span style={{ fontFamily: T.sans, fontSize: z.s, color: T.textMuted }}>{sub}</span>
        </div>
      )}
    </div>
  );
};

// StatBlock — labeled stat in a bordered cell (for grids)
window.StatBlock = function StatBlock({ label, value, sub, accent, size }) {
  return (
    <div style={{
      background: T.surface,
      border: `1px solid ${T.border}`,
      borderRadius: T.r.md,
      padding: '12px 14px',
      minWidth: 0,
    }}>
      <Stat label={label} value={value} sub={sub} accent={accent} size={size || 'md'} />
    </div>
  );
};

// Pills
window.Pill = function Pill({ children, tone = 'neutral', style, ...rest }) {
  const tones = {
    neutral: { bg: T.surface, fg: T.text, bd: T.border },
    soft:    { bg: T.surfaceAlt, fg: T.text, bd: T.border },
    ink:     { bg: T.ink, fg: '#fff', bd: T.ink },
    accent:  { bg: T.accentSoft, fg: T.accent, bd: T.accent + '33' },
    positive:{ bg: T.positiveSoft, fg: T.positive, bd: T.positive + '33' },
    info:    { bg: T.infoSoft, fg: T.info, bd: T.info + '33' },
    highlight:{ bg: T.highlightSoft, fg: '#7a5c0e', bd: T.highlight + '44' },
    live:    { bg: '#fdecec', fg: '#a31621', bd: '#f3c5c5' },
  };
  const c = tones[tone] || tones.neutral;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 10px',
      borderRadius: T.r.pill,
      background: c.bg, color: c.fg,
      border: `1px solid ${c.bd}`,
      fontFamily: T.sans, fontSize: 11, fontWeight: 600,
      letterSpacing: '0.02em',
      whiteSpace: 'nowrap',
      ...style,
    }} {...rest}>{children}</span>
  );
};

window.LivePill = function LivePill({ label = 'LIVE' }) {
  return (
    <Pill tone="live">
      <span style={{
        width: 7, height: 7, borderRadius: '50%',
        background: '#dc2626', boxShadow: '0 0 0 3px rgba(220,38,38,0.18)',
      }} />
      <span style={{ fontWeight: 700, letterSpacing: '0.14em' }}>{label}</span>
    </Pill>
  );
};

// Tabs (underline style)
window.Tabs = function Tabs({ items, active = 0, onClick, style }) {
  return (
    <div style={{ display: 'flex', gap: 2, borderBottom: `1px solid ${T.border}`, ...style }}>
      {items.map((it, i) => (
        <button key={it}
          onClick={() => onClick && onClick(i)}
          style={{
            padding: '10px 16px',
            background: 'transparent', border: 'none',
            cursor: 'pointer',
            fontFamily: T.sans, fontSize: 13, fontWeight: 600,
            color: i === active ? T.text : T.textMuted,
            borderBottom: i === active ? `2px solid ${T.ink}` : '2px solid transparent',
            marginBottom: -1,
            letterSpacing: '-0.01em',
          }}>{it}</button>
      ))}
    </div>
  );
};

// Segmented (pill-rail) — for small toggles inside a card
window.Segmented = function Segmented({ items, active = 0, onClick, size = 'md' }) {
  const padding = size === 'sm' ? '4px 10px' : '6px 14px';
  const fontSize = size === 'sm' ? 11 : 12;
  return (
    <div style={{
      display: 'inline-flex',
      background: T.surfaceAlt,
      border: `1px solid ${T.border}`,
      borderRadius: T.r.pill,
      padding: 3,
      gap: 2,
    }}>
      {items.map((it, i) => (
        <button key={it} onClick={() => onClick && onClick(i)} style={{
          padding,
          borderRadius: T.r.pill,
          background: i === active ? T.surface : 'transparent',
          color: i === active ? T.text : T.textMuted,
          border: 'none',
          fontFamily: T.sans, fontSize, fontWeight: 600,
          cursor: 'pointer',
          boxShadow: i === active ? T.sh.sm : 'none',
        }}>{it}</button>
      ))}
    </div>
  );
};

// Table primitives — editorial style with no heavy header fill.
window.Th = function Th({ children, align = 'center', style }) {
  return (
    <th style={{
      fontFamily: T.sans, fontSize: 10, fontWeight: 700,
      letterSpacing: '0.1em', textTransform: 'uppercase',
      color: T.textMuted, padding: '10px 8px',
      textAlign: align, borderBottom: `1px solid ${T.border}`,
      whiteSpace: 'nowrap',
      ...style,
    }}>{children}</th>
  );
};

window.Td = function Td({ children, align = 'center', mono = true, dim = false, hot = false, style }) {
  return (
    <td style={{
      fontFamily: mono ? T.mono : T.sans,
      fontVariantNumeric: 'tabular-nums',
      fontSize: 13,
      padding: '10px 8px',
      textAlign: align,
      color: hot ? T.accent : dim ? T.textFaint : T.text,
      fontWeight: hot ? 700 : 500,
      borderBottom: `1px solid ${T.border}`,
      whiteSpace: 'nowrap',
      ...style,
    }}>{children}</td>
  );
};

window.Tr = function Tr({ children, hover = true, style }) {
  return <tr style={style} className={hover ? 'tr-hover' : undefined}>{children}</tr>;
};

// App header (top bar)
window.AppHeader = function AppHeader({ title = 'Baseball Realtime', right, left }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 28px',
      background: T.surface,
      borderBottom: `1px solid ${T.border}`,
      fontFamily: T.sans,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {left || <button style={iconBtn}>≡</button>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 24, height: 24, borderRadius: 6, background: T.ink, color: '#fff', display: 'inline-grid', placeItems: 'center', fontWeight: 800, fontSize: 11 }}>B</span>
        <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em' }}>{title}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {right}
      </div>
    </div>
  );
};

window.iconBtn = {
  width: 34, height: 34, borderRadius: T.r.sm,
  border: `1px solid ${T.border}`,
  background: T.surface,
  display: 'inline-grid', placeItems: 'center',
  fontSize: 15, color: T.text,
  cursor: 'pointer',
  fontFamily: T.sans,
};

window.btn = {
  padding: '8px 14px',
  borderRadius: T.r.sm,
  border: `1px solid ${T.border}`,
  background: T.surface,
  fontFamily: T.sans, fontSize: 13, fontWeight: 600, color: T.text,
  cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', gap: 6,
};

window.btnPrimary = {
  ...window.btn,
  background: T.ink, color: '#fff', borderColor: T.ink,
};

// Sparkline (svg)
window.Sparkline = function Sparkline({ values, width = 80, height = 22, color, fill }) {
  color = color || T.text;
  if (!values || !values.length) return null;
  const min = Math.min(...values), max = Math.max(...values), range = max - min || 1;
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 2) - 1;
    return [x, y];
  });
  const d = 'M ' + points.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' L ');
  const area = d + ` L ${width},${height} L 0,${height} Z`;
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      {fill && <path d={area} fill={fill} />}
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={points[points.length - 1][0]} cy={points[points.length - 1][1]} r="2.5" fill={color} />
    </svg>
  );
};

// Strike zone — pitch-dot mode (default) OR heat-map mode (`heat` = 9 values 0-1,
// reading order left→right, top→bottom). Heat mode fills the strike-zone box with
// a 3×3 colored grid (the "hot zone"), keeping the SAME tall frame + plate + perspective.
window.StrikeZone = function StrikeZone({ size = 160, dots = [{ x: 35, y: 55, label: 1, color: '#dc2626' }], heat = null }) {
  const h = size * 1.3;
  const dotSize = Math.max(16, size * 0.075);
  // Clamp so a dot's full circle always stays inside the frame (no clipping).
  const padX = (dotSize / 2 / size) * 100 + 1;
  const padY = (dotSize / 2 / h) * 100 + 1;
  const clamp = (v, p) => Math.max(p, Math.min(100 - p, v));
  return (
    <div style={{
      width: size, height: h,
      position: 'relative',
      background: T.surface,
      border: `1px solid ${T.border}`,
      borderRadius: T.r.sm,
      overflow: 'hidden',
    }}>
      {/* Batter's-box chalk lines (splayed for linear perspective) + home plate.
          viewBox y-range 0–130 keeps units square against the 1:1.3 frame. */}
      <svg viewBox="0 0 100 130" preserveAspectRatio="none"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
        {/* batter's box: inner chalk lines, converging toward the distance (top) — pushed out for clearance */}
        <line x1="17" y1="92" x2="3"  y2="129" stroke={T.border} strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
        <line x1="83" y1="92" x2="97" y2="129" stroke={T.border} strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
        {/* home plate — width matches the zone, drawn in the SAME perspective as the
            batter's-box lines (side edges converge to the shared vanishing point ~50,5):
            back/far edge narrower, near shoulders wider, point toward the viewer. */}
        <polygon points="26.4,98 73.6,98 76,107 50,119 24,107"
          fill={T.surfaceAlt} stroke={T.borderStrong} strokeWidth="1.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>

      {/* Strike zone box — realistic tall rectangle (~0.77:1). In heat mode it
          becomes a 3×3 colored grid; otherwise a faint gridline overlay for dots. */}
      <div style={{
        position: 'absolute', inset: '12% 23% 34% 23%',
        border: `2px solid ${T.ink}`,
        zIndex: 1,
        ...(heat ? {
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(3, 1fr)',
          overflow: 'hidden',
        } : {
          backgroundImage: `linear-gradient(${T.borderStrong} 1px, transparent 1px), linear-gradient(90deg, ${T.borderStrong} 1px, transparent 1px)`,
          backgroundSize: '33.33% 33.33%',
        }),
      }}>
        {heat && heat.map((v, i) => {
          const intensity = Math.round(v * 100);
          return (
            <div key={i} style={{
              background: `rgba(184, 66, 30, ${v})`,
              display: 'grid', placeItems: 'center',
              fontFamily: T.mono, fontSize: Math.max(9, size * 0.072), fontWeight: 700,
              color: v > 0.5 ? '#fff' : T.text,
              borderRight: i % 3 === 2 ? 'none' : `1px solid ${T.border}`,
              borderBottom: i >= 6 ? 'none' : `1px solid ${T.border}`,
            }}>.{intensity < 10 ? '0' + intensity : intensity}</div>
          );
        })}
      </div>

      {!heat && dots.map((d, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: `${clamp(d.x, padX)}%`, top: `${clamp(d.y, padY)}%`,
          width: dotSize, height: dotSize, borderRadius: '50%',
          background: d.color, color: '#fff',
          display: 'grid', placeItems: 'center',
          fontFamily: T.mono, fontSize: dotSize * 0.55, fontWeight: 700,
          transform: 'translate(-50%, -50%)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
          zIndex: 2,
        }}>{d.label}</div>
      ))}
    </div>
  );
};

// Scorebook diamond cell — one cell per plate appearance.
// Bases reached (0-4) draws colored legs around the diamond; live=true
// renders a neutral dashed outline for the in-progress PA.
window.ScorebookCell = function ScorebookCell({ resultCode = '●', basesReached = 0, scored = false, live = false, width = 44 }) {
  const svgH = width;
  const labelH = 14;
  const sw = 1.5;

  // Diamond corners in a 40×40 viewBox: 2B top, 1B right, Home bottom, 3B left
  const HOME   = [20, 38];
  const FIRST  = [38, 20];
  const SECOND = [20,  2];
  const THIRD  = [2,  20];
  const LEGS   = [[HOME, FIRST], [FIRST, SECOND], [SECOND, THIRD], [THIRD, HOME]];

  const hitColor = (function pathColor(code) {
    const r = (code || '').toUpperCase();
    if (r === 'HR' || r === '3B' || r === '2B' || r === '1B') return T.positive;
    if (r === 'BB' || r === 'IBB' || r === 'HBP')             return T.info;
    return T.borderStrong;
  }(resultCode));

  const activeLegCount = live ? 0 : Math.min(basesReached, 4);
  const showScore = !live && (scored || basesReached >= 4);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width, height: svgH + labelH }}>
      <svg width={width} height={svgH} viewBox="0 0 40 40" aria-hidden="true" style={{ display: 'block' }}>
        <polygon
          points={`${SECOND[0]},${SECOND[1]} ${FIRST[0]},${FIRST[1]} ${HOME[0]},${HOME[1]} ${THIRD[0]},${THIRD[1]}`}
          fill="none"
          stroke={live ? T.borderStrong : T.border}
          strokeWidth={sw}
          strokeDasharray={live ? '4 3' : undefined}
          vectorEffect="non-scaling-stroke"
        />
        {!live && LEGS.slice(0, activeLegCount).map(([from, to], i) => (
          <line key={i}
            x1={from[0]} y1={from[1]} x2={to[0]} y2={to[1]}
            stroke={hitColor} strokeWidth={sw + 0.5} strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {showScore && <circle cx={HOME[0]} cy={HOME[1] - 1} r={2.5} fill={hitColor} />}
      </svg>
      {!live && (
        <div style={{
          fontFamily: T.mono, fontSize: 10, fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          color: hitColor === T.borderStrong ? T.textFaint : hitColor,
          lineHeight: '14px', textAlign: 'center',
          width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{resultCode}</div>
      )}
    </div>
  );
};

// Page wrapper — sets the bg + width
window.Page = function Page({ children, width = 1400 }) {
  return (
    <div style={{
      width,
      background: T.bg,
      color: T.text,
      fontFamily: T.sans,
      minHeight: 900,
    }}>{children}</div>
  );
};

// Page title row
window.PageTitle = function PageTitle({ title, subtitle, right }) {
  return (
    <div style={{ padding: '22px 28px 14px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 18 }}>
      <div>
        {subtitle && <Eyebrow style={{ fontSize: 11, color: T.textMuted, marginBottom: 6, display: 'block' }}>{subtitle}</Eyebrow>}
        <h1 style={{ margin: 0, fontFamily: T.sans, fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', color: T.text }}>{title}</h1>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>{right}</div>
    </div>
  );
};
