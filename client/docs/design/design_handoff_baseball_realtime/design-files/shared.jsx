// SNAPSHOT: copied from the live design workspace (holistic/shared.jsx) on Sep 10, 2026.
// This is a FROZEN COPY for handoff. If the date above is old, the live file may have
// moved on — check before treating this as current.
/* global React */
// ============================================================
// HOLISTIC — Shared tokens + atoms
// ============================================================

window.T = {
  // surface
  bg: '#f4f1ea',
  surface: '#fcfaf6',
  surfaceAlt: '#efeae0',
  border: '#cfc8b4',
  borderStrong: '#b4ae9b',
  ink: '#15161a',
  text: '#1a1612',
  textMuted: '#5c574f',
  textFaint: '#6f685f',
  // accent
  accent: '#b8421e',
  accentSoft: '#fbe9dd',
  positive: '#3a6330',
  positiveSoft: '#e6efd9',
  // A LOSS. Brick is deliberately deeper than the rust accent so a loss can never be
  // mistaken for the live/hot signal rust carries everywhere else. ONE loss colour app-wide.
  negative: '#8a2721',
  negativeSoft: '#f4dedb',
  // The W/L result chip has its own pair — used ONLY by the win/loss chip.
  winChipBg: '#cce7a4',
  lossChipBg: '#f4bdb5',
  info: '#2c4a78',
  infoSoft: '#dde6f1',
  highlight: '#c8941c',
  highlightText: '#7a5c0e',
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

// Team page — the app has live `/team/:abbr` and `/team/:abbr/schedule` routes,
// but the screen is NOT designed yet (see github.md). Standings rows, the game
// view's matchup title and the player hero all point here. Until there's an
// artboard to focus, say so out loud rather than swallowing the click: a silent
// no-op behind a `window.openTeamPage && …` guard looks identical to a working
// link. In the real app, replace call sites with <Link to={`/team/${abbr}`}>.
window.openTeamPage = function openTeamPage(abbr) {
  if (window.dcFocusArtboard && window.__teamArtboard) {
    window.dcFocusArtboard(window.__teamArtboard);
    return;
  }
  const id = '__team-page-notice';
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement('div');
    el.id = id;
    el.style.cssText = 'position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:9999;'
      + 'background:#15161a;color:#fff;font-family:"DM Sans",sans-serif;font-size:13px;font-weight:500;'
      + 'padding:10px 16px;border-radius:8px;box-shadow:0 6px 24px rgba(0,0,0,.28);pointer-events:none;'
      + 'transition:opacity 180ms;';
    document.body.appendChild(el);
  }
  el.textContent = `Team page (${abbr}) isn't designed yet`;
  el.style.opacity = '1';
  clearTimeout(window.__teamNoticeT);
  window.__teamNoticeT = setTimeout(() => { el.style.opacity = '0'; }, 1800);
};

window.TeamDot = function TeamDot({ team, size = 28, square = false, onDark = false }) {
  const [failed, setFailed] = React.useState(false);
  const url = window.teamLogoUrl(team);
  if (url && !failed) {
    // Dark-dominant marks (navy Twins, royal-blue Royals, etc.) disappear against the
    // ink dark band — give every on-dark logo a small light plate so it stays legible
    // regardless of the team's own colors.
    const img = <img src={url} alt={team.abbr} width={size} height={size}
        onError={() => setFailed(true)}
        style={{ width: size, height: size, objectFit: 'contain', flex: 'none', display: 'block' }} />;
    if (!onDark) return img;
    return (
      <div style={{
        width: size * 1.22, height: size * 1.22, borderRadius: square ? size * 0.2 : '50%',
        background: '#fff', display: 'grid', placeItems: 'center', flex: 'none', padding: size * 0.11,
      }}>{img}</div>
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

window.TeamMark = function TeamMark({ team, size = 56, onDark = false }) {
  const [failed, setFailed] = React.useState(false);
  const url = window.teamLogoUrl(team);
  if (url && !failed) {
    const img = <img src={url} alt={team.abbr} width={size} height={size}
        onError={() => setFailed(true)}
        style={{ width: size, height: size, objectFit: 'contain', flex: 'none', display: 'block' }} />;
    if (!onDark) return img;
    return (
      <div style={{
        width: size * 1.22, height: size * 1.22, borderRadius: '50%',
        background: '#fff', display: 'grid', placeItems: 'center', flex: 'none', padding: size * 0.11,
      }}>{img}</div>
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
  const s = size / 4.6;
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

// One plate appearance in scorebook (diamond) form. Ink-on-cream, true to the
// editorial-scorebook language. The diamond tells TWO stories with stroke weight:
//   • BOLD basepath  = what the batter did at the plate (his PA result — the bases
//     he earned off the bat). Dashed when he walked.
//   • LIGHT basepath = how far he then advanced as a baserunner on LATER events
//     (a teammate's hit, a steal). Subordinate to the bold PA segment.
// End-states: reaching home shades the diamond green (a run); a runner left on base
// gets a hollow ring at his final base (LOB); a runner thrown out on the bases gets
// an × at that base (distinct from a plate out, which is just an empty diamond).
// `live` is the in-progress PA — a neutral dashed frame, no color anchor.
//   inn          short label (inning) shown on top, e.g. '1st'
//   code         result code shown below — F-005: the real code ('1B' 'K' 'F8' '6-3'
//                'L4'…) when the feed carries it, else the honest catch-all 'OUT'
//   kind         'hit' | 'out' | 'walk' | 'hbp'  (drives the basepath/dot styling).
//                'walk' and 'hbp' both reach without a hit (hollow endpoint dot, non-
//                solid PA stroke): walk = dashed, hbp = dotted. code is 'BB' / 'HBP'.
//   reached      back-compat shorthand: 0=none 1=first 2=second 3=third 4=home.
//                Used as both reachedOnPA and finalBase when the split props are absent.
//   reachedOnPA  bases earned AT THE PLATE (the bold segment). Defaults to `reached`.
//   finalBase    where the runner ended up (the light segment). Defaults to reachedOnPA.
//   outAt        base (1–3) where thrown out on the bases → × marker
//   stranded     left on base — emphasis only; a final base < home already renders LOB
//   scored       force the run-shade (e.g. reachedOnPA:1, finalBase:4 — singled, scored)
//   live         in-progress at-bat
//   state        'default' | 'active' | 'muted' — drives the cell's emphasis when it
//   codeIn       false (default) = result code sits BELOW the diamond, with the inning
//                label above. true (compact) = code is centered INSIDE the diamond (with a
//                surface halo so it stays legible over a base-path) and the inning label +
//                below-label row are dropped — a shorter cell. Used by the game-view feed
//                badge (game-v2 PitchByPitchV2); the batter-card At-bats row stays code-below.
//                sits in a selectable row (replay seek / play-head). Set this on the CELL;
//                never fade the wrapper with opacity (that erases thin K/OUT diamonds while
//                leaving dense ones like HR readable — the inconsistency we fixed).
//                  active = selected / at the play head (most prominent)
//                  muted  = future / not yet reached (de-emphasized but fully legible)
//                  default= a resting, interactive past at-bat
window.ScorebookCell = function ScorebookCell({
  inn, code, kind = 'out', reached = 0,
  reachedOnPA, finalBase, outAt = null, stranded = false,
  live = false, scored = false, width = 50, state = 'default', codeIn = false,
  // advances: [{ base, label }] — one entry per LATER base this runner reached via a
  // teammate's play or a baserunning event (FC/SB/WP/PB/E1.../BK/SH, or the batter's own
  // jersey # for a hit that advanced him). Each gets a filled circle + text label at that base.
  advances = [],
}) {
  const pts = [[22, 41], [41, 22], [22, 3], [3, 22], [22, 41]]; // home · 1B · 2B · 3B · home
  // Annotation position for the segment ENDING at `base` (1=1st,2=2nd,3=3rd,4=home/scored):
  // placed at that segment's midpoint, shifted perpendicular into open field so it never
  // overlaps the drawn line. Angles measured clockwise from vertical (up=0°/right=90°/
  // down=180°/left=270°): 1st seg→135° (down-right), 2nd seg→45° (up-right),
  // 3rd seg→315° (up-left), home seg→225° (down-left).
  const BASE_THETA = { 1: 135, 2: 45, 3: 315, 4: 225 };
  const labelPosFor = (base) => {
    const from = pts[base - 1], to = pts[base % 4 === 0 ? 4 : base];
    const mid = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2];
    const theta = (BASE_THETA[base] * Math.PI) / 180;
    const dir = [Math.sin(theta), -Math.cos(theta)];
    const off = 7;
    return [mid[0] + dir[0] * off, mid[1] + dir[1] * off];
  };
  const onPA = reachedOnPA != null ? reachedOnPA : reached;     // bold endpoint
  const didScore = scored || (finalBase != null ? finalBase >= 4 : onPA >= 4);
  const fin = outAt != null ? outAt : (didScore ? 4 : (finalBase != null ? finalBase : onPA));
  const seg = (from, to) => {
    if (to <= from) return null;
    let dd = `M ${pts[from][0]} ${pts[from][1]}`;
    for (let i = from + 1; i <= to; i++) dd += ` L ${pts[i][0]} ${pts[i][1]}`;
    return dd;
  };
  const boldD = seg(0, Math.min(onPA, 4));   // PA result — what he did at the plate
  const lightD = seg(onPA, fin);             // later baserunning
  // End-state marker (only when he didn't score): out on the bases, left on base, or
  // the base he earned and held.
  let marker = null;
  if (!didScore) {
    if (outAt != null) marker = { idx: outAt, type: 'out' };
    else if (fin > onPA) marker = { idx: fin, type: 'lob' };
    else if (onPA > 0) marker = { idx: onPA, type: 'reach' };
  }
  const isOut = kind === 'out';
  const reachedNotHit = kind === 'walk' || kind === 'hbp'; // reached base, not credited a hit
  const active = state === 'active';
  const muted = state === 'muted';
  // Container emphasis. Border-box so the 2px active border never nudges layout.
  // Border style: 'active' (SELECTED — the AB currently shown in the zone) → rust DASHED;
  // 'live' but not selected → neutral dashed; otherwise solid. The batter-card At-bats row
  // selects the current/live AB by default, so the live cell reads rust-dashed until the
  // user taps a past AB (which moves the rust-dashed selection there).
  const cell = active
    ? { bg: T.surface,    bd: T.accent,       bw: 2, sh: T.sh.md }
    : muted
    ? { bg: T.surfaceAlt, bd: T.border,       bw: 1, sh: 'none' }
    : { bg: T.surface,    bd: T.border,       bw: 1, sh: 'none' };
  // Content colors. Muted stays LEGIBLE — we darken the diamond outline against the
  // flatter surface and only step the ink down, rather than fading the whole cell.
  const diaOutline  = muted ? T.borderStrong : T.border;
  const boldStroke  = muted ? T.textMuted    : T.ink;
  const lightStroke = muted ? T.textFaint    : T.textMuted;
  const markStroke  = muted ? T.textMuted    : T.ink;
  const dotFace     = active ? T.surface : (muted ? T.surfaceAlt : T.surface);
  const labelColor  = active ? T.accent : (live ? T.textMuted : T.textFaint);
  const codeColor   = live ? T.textMuted : muted ? T.textMuted : (isOut ? T.textMuted : T.text);
  return (
    <div style={{
      flexShrink: 0, width, boxSizing: 'border-box',
      border: `${cell.bw}px ${(active || live) ? 'dashed' : 'solid'} ${active ? T.accent : live ? T.borderStrong : cell.bd}`,
      borderRadius: T.r.sm,
      background: cell.bg,
      boxShadow: cell.sh,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: codeIn ? 0 : 3,
      padding: codeIn ? '4px 3px' : '6px 3px 5px',
      transition: 'border-color .12s, box-shadow .12s, background .12s',
    }}>
      {inn ? <span style={{ fontFamily: T.mono, fontSize: 9, fontWeight: active ? 700 : 600, whiteSpace: 'nowrap', color: labelColor }}>{inn}</span> : null}
      <svg width="36" height="36" viewBox="0 0 44 44" style={{ display: 'block' }}>
        {didScore && <polygon points="22,41 41,22 22,3 3,22" fill={T.positiveSoft} stroke="none" />}
        <polygon points="22,41 41,22 22,3 3,22" fill="none" stroke={diaOutline} strokeWidth="1.5" />
        {/* later baserunning — light, drawn first so the bold PA stroke sits on top at the junction */}
        {lightD && (
          <path d={lightD} fill="none" stroke={lightStroke} strokeWidth="4"
            strokeLinejoin="round" strokeLinecap="round" />
        )}
        {/* PA result — bold; dashed for a walk */}
        {boldD && (
          <path d={boldD} fill="none" stroke={boldStroke} strokeWidth="4"
            strokeLinejoin="round" strokeLinecap="round"
            strokeDasharray={kind === 'walk' ? '3 3' : kind === 'hbp' ? '0.5 3.4' : undefined} />
        )}
        {/* advancement markers — filled circle at the base + non-bold how-reached label at
            that segment's midpoint (the AB-result label above is bold; these are not) */}
        {advances.map((a, i) => {
          const [lx, ly] = labelPosFor(a.base);
          return (
            <g key={i}>
              <circle cx={pts[a.base][0]} cy={pts[a.base][1]} r="3" fill={lightStroke} stroke="none" />
              <text x={lx} y={ly} textAnchor="middle" dominantBaseline="central"
                fontFamily={T.mono} fontSize="7" fontWeight="400" fill={lightStroke}>{a.label}</text>
            </g>
          );
        })}
        {marker && marker.type === 'reach' && (
          <circle cx={pts[marker.idx][0]} cy={pts[marker.idx][1]} r="3.2"
            fill={reachedNotHit ? dotFace : markStroke} stroke={markStroke} strokeWidth="1.5" />
        )}
        {marker && marker.type === 'lob' && (
          <circle cx={pts[marker.idx][0]} cy={pts[marker.idx][1]} r="3.4"
            fill={dotFace} stroke={lightStroke} strokeWidth="1.5" />
        )}
        {marker && marker.type === 'out' && (
          <g stroke={markStroke} strokeWidth="1.6" strokeLinecap="round">
            <line x1={pts[marker.idx][0] - 3} y1={pts[marker.idx][1] - 3} x2={pts[marker.idx][0] + 3} y2={pts[marker.idx][1] + 3} />
            <line x1={pts[marker.idx][0] - 3} y1={pts[marker.idx][1] + 3} x2={pts[marker.idx][0] + 3} y2={pts[marker.idx][1] - 3} />
          </g>
        )}
        {codeIn && code ? (() => {
          // Bold AB-result label: on the segment the runner's OWN PA ended at (H→1st /
          // 1st→2nd / 2nd→3rd / 3rd→home), same midpoint+angle rule as advances. Outs (no
          // base reached) have no segment to sit on, so they stay centered in the diamond.
          const seg = Math.min(onPA, 4);
          const [cx, cy] = boldD && seg > 0 ? labelPosFor(seg) : [22, 23];
          return (
            <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
              fontFamily={T.mono}
              fontSize={String(code).length >= 3 ? 11 : 14}
              fontWeight="700" letterSpacing="-0.02em"
              fill={live ? T.textMuted : muted ? T.textMuted : T.ink}
              stroke={cell.bg} strokeWidth="2.6" paintOrder="stroke"
              style={{ fontVariantNumeric: 'tabular-nums' }}>{code}</text>
          );
        })() : null}
      </svg>
      {!codeIn && (
        <span style={{
          fontFamily: T.mono, fontSize: 11, fontWeight: 700, letterSpacing: '-0.01em', whiteSpace: 'nowrap',
          color: codeColor,
        }}>{code}</span>
      )}
    </div>
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
    // A LOSS is not a live event. Brick is deliberately deeper than the rust accent so a
    // loss can never be mistaken for the live/hot signal rust carries everywhere else.
    negative:{ bg: T.negativeSoft, fg: T.negative, bd: T.negative + '33' },
    // the shared W/L result chip (Player → History pattern), one style app-wide
    win:     { bg: T.winChipBg,  fg: T.positive, bd: T.positive + '33' },
    loss:    { bg: T.lossChipBg, fg: T.negative, bd: T.negative + '33' },
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
      fontFamily: T.sans, fontSize: 11, fontWeight: 700,
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

// PageMenu — hamburger placed inline next to the page title. Combines the contextual
// return (top item, divider below) with the fixed destination list, so there's exactly
// ONE nav affordance instead of a caret + separate back button — a hamburger reads as
// "other places to go" much more clearly than a ▾ does.
window.PageMenu = function PageMenu({ backLabel, active, showBack = true }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); window.removeEventListener('keydown', onKey); };
  }, [open]);
  // 'settings' kept in the array (plumbing) but filtered from render below — not surfaced yet.
  const items = [
    { key: 'games', label: "Today's games", icon: '📅' },
    { key: 'standings', label: 'Standings', icon: '📊' },
    { key: 'leaders', label: 'Leaders', icon: '🏆' },
    { key: 'settings', label: 'Settings', icon: '⚙', hidden: true },
  ];
  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>
      <button onClick={() => setOpen(o => !o)} aria-label="Navigation menu" style={{ ...iconBtn, background: open ? T.surfaceAlt : T.surface }}>☰</button>
      {open && (
        <div style={{
          position: 'absolute', top: 40, left: 0, zIndex: 60, minWidth: 200,
          background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.r.md,
          boxShadow: '0 8px 24px rgba(20,16,12,0.14)', padding: 6, display: 'flex', flexDirection: 'column', gap: 2,
        }}>
          {showBack && (
            <React.Fragment>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: T.r.sm, fontFamily: T.sans, fontSize: 13.5, fontWeight: 700, color: T.text, cursor: 'pointer' }}>
                <span style={{ fontSize: 14 }}>←</span>{backLabel}
              </div>
              <div style={{ height: 1, background: T.border, margin: '4px 6px' }} />
            </React.Fragment>
          )}
          {items.filter(it => !it.hidden).map(it => (
            <div key={it.key} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: T.r.sm,
              fontFamily: T.sans, fontSize: 13.5, fontWeight: 600,
              color: it.key === active ? T.accent : T.text,
              background: it.key === active ? T.accentSoft : 'transparent',
              cursor: it.key === active ? 'default' : 'pointer',
            }}>
              <span style={{ fontSize: 14 }}>{it.icon}</span>{it.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Alerts bell removed for now — see future.md F-009 (needs a new home + design).

// App header (top bar) — superseded by PageNav; kept for any file not yet migrated.
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
// Live-updating timer helpers. `mode:'countdown'` counts down to `target` (ms epoch),
// `mode:'countup'` counts up from `since`. Ticks once a second — trivial to port (the real
// app already has the game start timestamp from the feed).
window.useLiveTimer = function useLiveTimer({ mode, target, since }) {
  const [now, setNow] = React.useState(Date.now());
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (mode === 'countdown') {
    const diff = Math.max(0, target - now);
    const h = Math.floor(diff / 3600000), m = Math.floor((diff % 3600000) / 60000);
    if (diff <= 0) return 'First pitch any moment';
    if (h > 0) return `First pitch in ${h}h ${m}m`;
    return `First pitch in ${m}m`;
  }
  const diff = Math.max(0, now - since);
  const mm = Math.floor(diff / 60000), ss = Math.floor((diff % 60000) / 1000);
  return `${mm}:${String(ss).padStart(2, '0')} elapsed`;
};

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

// Page wrapper — sets the bg + width
window.Page = function Page({ children, width = 1400, style }) {
  return (
    <div style={{
      width,
      background: T.bg,
      color: T.text,
      fontFamily: T.sans,
      minHeight: 900,
      ...style,
    }}>{children}</div>
  );
};

// NavDrawer — right-side slide-in global nav. Contained to the screen it renders in
// (absolute, not fixed) so it works inside a canvas artboard. Closes on ✕ / Esc / backdrop.
window.NavDrawer = function NavDrawer({ open, onClose, active }) {
  const [shown, setShown] = React.useState(false);
  React.useEffect(() => {
    if (open) { const t = setTimeout(() => setShown(true), 10); return () => clearTimeout(t); }
    setShown(false);
  }, [open]);
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  const items = [
    { key: 'games', label: 'Games' },
    { key: 'teams', label: 'Teams' },
    { key: 'standings', label: 'Standings' },
    { key: 'leaders', label: 'Leaders' },
    { key: 'settings', label: 'Settings' },
  ];
  return (
    <React.Fragment>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 70, background: 'rgba(21,22,26,0.34)', opacity: shown ? 1 : 0, transition: 'opacity .22s ease' }} />
      <div style={{
        position: 'absolute', top: 0, right: 0, bottom: 0, zIndex: 71, width: 288,
        background: T.surface, borderLeft: `1px solid ${T.borderStrong}`,
        boxShadow: '-12px 0 34px rgba(21,22,26,0.16)', display: 'flex', flexDirection: 'column',
        transform: shown ? 'translateX(0)' : 'translateX(100%)', transition: 'transform .24s cubic-bezier(.22,.7,.3,1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 16px 15px 20px', borderBottom: `1px solid ${T.border}` }}>
          <window.Eyebrow style={{ fontSize: 11, color: T.textMuted }}>Go to</window.Eyebrow>
          <button onClick={onClose} aria-label="Close navigation" style={{ ...iconBtn, width: 30, height: 30, fontSize: 14 }}>✕</button>
        </div>
        <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {items.map(it => {
            const on = it.key === active;
            return (
              <div key={it.key} style={{
                display: 'flex', alignItems: 'center', gap: 11, padding: '12px 12px', borderRadius: T.r.sm,
                fontFamily: T.sans, fontSize: 14.5, fontWeight: on ? 700 : 600,
                color: on ? T.accent : T.text, background: on ? T.accentSoft : 'transparent',
                cursor: on ? 'default' : 'pointer',
              }}>
                <span style={{ width: 3, alignSelf: 'stretch', borderRadius: 2, background: on ? T.accent : 'transparent' }} />
                {it.label}
              </div>
            );
          })}
        </div>
      </div>
    </React.Fragment>
  );
};

// MatchupTitle — page-title matchup as two linked team units with a muted separator
// (mirrors .game-page__title-matchup in the app). Logos are 1em so they scale with the
// heading; names link to the team page and turn rust on hover.
window.MatchupTitle = function MatchupTitle({ away, home, sep = '@' }) {
  const [hover, setHover] = React.useState(null);
  const side = (t, key) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35em', minWidth: 0 }}>
      <img src={window.teamLogoUrl ? window.teamLogoUrl(t) : null} alt="" style={{ width: '1em', height: '1em', objectFit: 'contain', flexShrink: 0, display: 'block' }} />
      <span
        onMouseEnter={() => setHover(key)}
        onMouseLeave={() => setHover(null)}
        style={{ color: hover === key ? T.accent : 'inherit', cursor: 'pointer' }}
      >{t.name}</span>
    </span>
  );
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35em', minWidth: 0 }}>
      {side(away, 'away')}
      <span style={{ color: T.textMuted, fontWeight: 400, margin: '0 0.1em' }}>{sep}</span>
      {side(home, 'home')}
    </span>
  );
};

// ============================================================
// Search — the lookup path. A menu answers "what is there"; search answers
// "take me to X", which is the actual question when you already know the team
// or player you want. Scope is deliberately narrow: teams, player last name,
// and a date (which resolves to that date's games).
// Mock roster for the design. In the app this is a query, not a constant.
// ============================================================
window.SEARCH_PLAYERS = [
  { first: 'Jeremy', last: 'Peña', pos: 'SS', team: 'HOU' },
  { first: 'José', last: 'Altuve', pos: '2B', team: 'HOU' },
  { first: 'Yordan', last: 'Alvarez', pos: 'LF', team: 'HOU' },
  { first: 'Framber', last: 'Valdez', pos: 'LHP', team: 'HOU' },
  { first: 'Hunter', last: 'Brown', pos: 'RHP', team: 'HOU' },
  { first: 'Shota', last: 'Imanaga', pos: 'LHP', team: 'CHC' },
  { first: 'Nico', last: 'Hoerner', pos: '2B', team: 'CHC' },
  { first: 'Pete', last: 'Crow-Armstrong', pos: 'CF', team: 'CHC' },
  { first: 'Nate', last: 'Pearson', pos: 'RHP', team: 'CHC' },
  { first: 'Vladimir', last: 'Guerrero Jr.', pos: '1B', team: 'TOR' },
  { first: 'Bo', last: 'Bichette', pos: 'SS', team: 'TOR' },
  { first: 'Gunnar', last: 'Henderson', pos: 'SS', team: 'BAL' },
  { first: 'Aaron', last: 'Judge', pos: 'RF', team: 'NYY' },
  { first: 'Tarik', last: 'Skubal', pos: 'LHP', team: 'DET' },
  { first: 'Paul', last: 'Skenes', pos: 'RHP', team: 'PIT' },
];

const MOS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const WDS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MOFULL = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Date parsing is intentionally forgiving: "may 23", "5/23", "2026-05-23".
// A bare month with no day is NOT a date result — it would collide with team
// names and produce a result the user did not ask for.
function parseDateQuery(q) {
  const s = q.trim().toLowerCase();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  m = s.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  if (m) return new Date(m[3] ? (+m[3] < 100 ? 2000 + +m[3] : +m[3]) : 2026, +m[1] - 1, +m[2]);
  m = s.match(/^([a-z]{3,9})\.?\s+(\d{1,2})$/);
  if (m) {
    const mo = MOS.findIndex(x => m[1].startsWith(x));
    if (mo >= 0) return new Date(2026, mo, +m[2]);
  }
  return null;
}

window.SearchField = function SearchField() {
  const [open, setOpen] = React.useState(false);
  const [shown, setShown] = React.useState(false);
  const [q, setQ] = React.useState('');
  const inputRef = React.useRef(null);
  const wrapRef = React.useRef(null);

  React.useEffect(() => {
    if (open) {
      const t = setTimeout(() => { setShown(true); inputRef.current && inputRef.current.focus(); }, 10);
      return () => clearTimeout(t);
    }
    setShown(false);
  }, [open]);

  const close = React.useCallback(() => { setOpen(false); setQ(''); }, []);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    const onDown = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) close(); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onDown);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('mousedown', onDown); };
  }, [open, close]);

  const ql = q.trim().toLowerCase();
  const teams = ql ? Object.values(TEAMS).filter(t =>
    t.name.toLowerCase().includes(ql) || t.short.toLowerCase().includes(ql) || t.abbr.toLowerCase() === ql).slice(0, 5) : [];
  // Last name first: that is how people search for a player.
  const players = ql ? window.SEARCH_PLAYERS.filter(p =>
    p.last.toLowerCase().startsWith(ql) || p.first.toLowerCase().startsWith(ql)).slice(0, 6) : [];
  const d = ql ? parseDateQuery(q) : null;
  const dateRow = d && !isNaN(d) ? {
    label: `${WDS[d.getDay()]} ${MOFULL[d.getMonth()]} ${d.getDate()}`,
    // Mock count. In the app: the schedule count for that date.
    count: 12 + (d.getDate() % 4),
  } : null;
  const empty = ql && !teams.length && !players.length && !dateRow;

  const rowStyle = {
    display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px',
    textDecoration: 'none', color: T.text, fontFamily: T.sans, fontSize: 14, fontWeight: 600, cursor: 'pointer',
  };
  const hoverOn = e => { e.currentTarget.style.background = T.surfaceAlt; };
  const hoverOff = e => { e.currentTarget.style.background = 'transparent'; };
  const groupLabel = (txt) => (
    <div style={{ padding: '9px 14px 4px', fontFamily: T.sans, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: T.textFaint }}>{txt}</div>
  );

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: 40, height: 40, flexShrink: 0 }}>
      {!open && (
        <button onClick={() => setOpen(true)} aria-label="Search" style={{ ...window.iconBtn, width: 40, height: 40, display: 'grid', placeItems: 'center', padding: 0 }}>
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <circle cx="7.5" cy="7.5" r="5.4" fill="none" stroke={T.text} strokeWidth="2" />
            <path d="M11.6 11.6 16 16" stroke={T.text} strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      )}
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 0, transform: `translateX(${shown ? 0 : 16}px)`,
          width: shown ? 400 : 40, opacity: shown ? 1 : 0,
          transition: 'width .26s cubic-bezier(.22,.7,.3,1), opacity .18s ease, transform .26s cubic-bezier(.22,.7,.3,1)',
          zIndex: 60,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 9, padding: '0 12px', height: 40,
            background: T.surface, border: `1px solid ${T.borderStrong}`, borderRadius: T.r.pill,
            boxShadow: '0 6px 20px -14px rgba(21,22,26,.5)',
          }}>
            <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true" style={{ flexShrink: 0 }}>
              <circle cx="7.5" cy="7.5" r="5.4" fill="none" stroke={T.textMuted} strokeWidth="2" />
              <path d="M11.6 11.6 16 16" stroke={T.textMuted} strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)}
              placeholder="Team, player or date"
              style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'none', fontFamily: T.sans, fontSize: 14.5, fontWeight: 500, color: T.text }} />
            <button onClick={close} aria-label="Close search" style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontSize: 14, color: T.textMuted, flexShrink: 0 }}>✕</button>
          </div>

          {ql && (
            <div style={{
              marginTop: 6, background: T.surface, border: `1px solid ${T.borderStrong}`, borderRadius: T.r.md,
              boxShadow: '0 18px 40px -20px rgba(21,22,26,.42)', overflow: 'hidden', paddingBottom: 6,
            }}>
              {empty && (
                <div style={{ padding: '16px 14px', fontFamily: T.sans, fontSize: 13.5, color: T.textMuted }}>
                  No teams, players or dates match “{q.trim()}”
                </div>
              )}
              {!!teams.length && groupLabel('Teams')}
              {teams.map(t => (
                <a key={t.abbr} href="Team Page - Overview v2.html" style={rowStyle} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
                  <img src={window.teamLogoUrl ? window.teamLogoUrl(t) : null} alt="" style={{ width: 22, height: 22, objectFit: 'contain', flexShrink: 0 }} />
                  <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</span>
                  <span style={{ fontFamily: T.mono, fontSize: 11.5, color: T.textFaint }}>{t.abbr}</span>
                </a>
              ))}
              {!!players.length && groupLabel('Players')}
              {players.map(p => (
                <div key={p.last + p.first} style={rowStyle} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
                  <img src={window.teamLogoUrl ? window.teamLogoUrl(TEAMS[p.team]) : null} alt="" style={{ width: 22, height: 22, objectFit: 'contain', flexShrink: 0 }} />
                  <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {p.first} <strong style={{ fontWeight: 700 }}>{p.last}</strong>
                  </span>
                  <span style={{ fontFamily: T.sans, fontSize: 11.5, fontWeight: 600, color: T.textMuted, whiteSpace: 'nowrap', flexShrink: 0 }}>{p.pos} · {p.team}</span>
                </div>
              ))}
              {dateRow && groupLabel('Games')}
              {dateRow && (
                <div style={rowStyle} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
                  <span style={{ width: 22, display: 'grid', placeItems: 'center', flexShrink: 0, fontFamily: T.mono, fontSize: 13, color: T.accent }}>◆</span>
                  <span style={{ flex: 1, minWidth: 0 }}>Games · <span style={{ fontFamily: T.mono }}>{dateRow.label}</span></span>
                  <span style={{ fontFamily: T.mono, fontSize: 11.5, color: T.textFaint, whiteSpace: 'nowrap', flexShrink: 0 }}>{dateRow.count} games</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Branding header — line 1 of the common header. Logo left (NOT clickable — there is
// no home button by decision); contextual return + hamburger right. The page title
// block (line 2) is owned by each page, so it can vary freely without touching this row.
//
// TWO INTENTIONAL DIVERGENCES FROM THE SHIPPED APP (settled Aug 31, 2026 — don't "fix"):
//  1. The wordmark <img> is a mock stand-in. The app renders <LogoLockup variant="allcaps">
//     (inline SVG, same final mark) and that is correct — SVG scales, inherits colour, no
//     asset request. The PNG only exists because a static mock can't mount a component.
//  2. `onMenu` gating the hamburger is a design-only artifact. The app's hamburger is
//     unconditional with internally-owned drawer state, which is BETTER: a screen can't
//     lose its nav by forgetting a prop. Kept here only so canvas artboards can opt out.
window.BrandHeader = function BrandHeader({ back, onBack, active, onMenu, colStyle }) {
  return (
    <div style={{ borderBottom: `1px solid ${T.border}` }}>
    <div style={{ ...(colStyle || null), padding: colStyle ? '11px 28px' : '11px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <img src="assets/logo-wordmark-light.png" alt="Scorebook" style={{ height: 27, width: 'auto', display: 'block' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {back && (
          <span onClick={onBack} style={{ fontFamily: T.sans, fontSize: 21, fontWeight: 600, color: T.text, cursor: 'pointer' }}>← {back}</span>
        )}
        <window.SearchField />
        <button onClick={onMenu} aria-label="Navigation menu" style={{ ...iconBtn, width: 40, height: 40, display: onMenu ? 'grid' : 'none', placeItems: 'center', padding: 0 }}>
          <svg width="21" height="16" viewBox="0 0 21 16" aria-hidden="true">
            <g stroke={T.text} strokeWidth="2.1" strokeLinecap="round"><path d="M1.5 2h18" /><path d="M1.5 8h18" /><path d="M1.5 14h18" /></g>
          </svg>
        </button>
      </div>
    </div>
    </div>
  );
};

// Page title row
window.PageTitle = function PageTitle({ title, subtitle, subtitleRight, right, navMenu, flush }) {
  return (
    <div style={{ padding: flush ? '22px 0 14px' : '22px 28px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {navMenu}
          <h1 style={{ margin: 0, fontFamily: T.sans, fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', color: T.text }}>{title}</h1>
        </div>
        {right && <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>{right}</div>}
      </div>
      {(subtitle || subtitleRight) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18 }}>
          <Eyebrow style={{ fontSize: 11, color: T.textMuted }}>{subtitle}</Eyebrow>
          {subtitleRight && <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>{subtitleRight}</div>}
        </div>
      )}
    </div>
  );
};
