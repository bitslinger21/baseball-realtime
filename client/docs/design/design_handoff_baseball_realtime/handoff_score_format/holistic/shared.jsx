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
  // Completed to all 30 clubs (Sep 19, 2026): Home's follow search and the September
  // board reference the whole league, and a missing record crashed TeamDot on team.id.
  ARI: { abbr: 'ARI', id: 109, name: 'Arizona Diamondbacks', short: 'D-backs', primary: '#A71930', secondary: '#E3D4AD' },
  BOS: { abbr: 'BOS', id: 111, name: 'Boston Red Sox', short: 'Red Sox', primary: '#BD3039', secondary: '#0C2340' },
  CHW: { abbr: 'CHW', id: 145, name: 'Chicago White Sox', short: 'White Sox', primary: '#27251F', secondary: '#C4CED4' },
  CIN: { abbr: 'CIN', id: 113, name: 'Cincinnati Reds', short: 'Reds', primary: '#C6011F', secondary: '#000000' },
  COL: { abbr: 'COL', id: 115, name: 'Colorado Rockies', short: 'Rockies', primary: '#33006F', secondary: '#C4CED4' },
  KCR: { abbr: 'KCR', id: 118, name: 'Kansas City Royals', short: 'Royals', primary: '#004687', secondary: '#BD9B60' },
  LAA: { abbr: 'LAA', id: 108, name: 'Los Angeles Angels', short: 'Angels', primary: '#BA0021', secondary: '#003263' },
  MIA: { abbr: 'MIA', id: 146, name: 'Miami Marlins', short: 'Marlins', primary: '#00A3E0', secondary: '#EF3340' },
  MIL: { abbr: 'MIL', id: 158, name: 'Milwaukee Brewers', short: 'Brewers', primary: '#12284B', secondary: '#FFC52F' },
  MIN: { abbr: 'MIN', id: 142, name: 'Minnesota Twins', short: 'Twins', primary: '#002B5C', secondary: '#D31145' },
  NYM: { abbr: 'NYM', id: 121, name: 'New York Mets', short: 'Mets', primary: '#002D72', secondary: '#FF5910' },
  OAK: { abbr: 'OAK', id: 133, name: 'Athletics', short: 'Athletics', primary: '#003831', secondary: '#EFB21E' },
  SDP: { abbr: 'SDP', id: 135, name: 'San Diego Padres', short: 'Padres', primary: '#2F241D', secondary: '#FFC425' },
  SEA: { abbr: 'SEA', id: 136, name: 'Seattle Mariners', short: 'Mariners', primary: '#0C2C56', secondary: '#005C5C' },
  SFG: { abbr: 'SFG', id: 137, name: 'San Francisco Giants', short: 'Giants', primary: '#FD5A1E', secondary: '#27251F' },
  STL: { abbr: 'STL', id: 138, name: 'St. Louis Cardinals', short: 'Cardinals', primary: '#C41E3A', secondary: '#0C2340' },
  TEX: { abbr: 'TEX', id: 140, name: 'Texas Rangers', short: 'Rangers', primary: '#003278', secondary: '#C0111F' },
  WSN: { abbr: 'WSN', id: 120, name: 'Washington Nationals', short: 'Nationals', primary: '#AB0003', secondary: '#14225A' },
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
  // A missing TEAMS record must degrade, never crash the page (it used to throw on
  // team.id and unmount the whole tree).
  if (!team) team = { abbr: '?', primary: T.borderStrong, secondary: T.borderStrong };
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

// `runners` (optional): [first, second, third] of runner names (or null/'' when empty)
// → hovering the atom reveals a small card naming who is on. Deliberately ONE hover
// target for the whole diamond, not three: at the sizes this atom actually ships at
// (26px in the play-state eyebrow) each base is ~5.6px across — too small to hit.
// One card lists every occupied base, which is also the question being asked ("who is
// on?", not "who is on second?"). Bases with no `runners` prop behave exactly as before.
window.Bases = function Bases({ on = [false,false,false], size = 36, fill, empty, strokeWidth = 1.5, runners }) {
  fill = fill || T.ink;
  empty = empty || T.borderStrong;
  const [hov, setHov] = React.useState(false);
  const s = size / 4.6;
  const named = (runners || []).map((n, i) => (on[i] && n) ? { label: ['1st','2nd','3rd'][i], name: n } : null).filter(Boolean);
  const base = (filled) => (
    <div style={{
      width: s, height: s,
      background: filled ? fill : 'transparent',
      border: `${strokeWidth}px solid ${filled ? fill : empty}`,
      transform: 'rotate(45deg)',
    }} />
  );
  return (
    <div
      style={{ position: 'relative', width: size, height: size, flex: 'none', cursor: named.length ? 'default' : undefined }}
      onMouseEnter={named.length ? () => setHov(true) : undefined}
      onMouseLeave={named.length ? () => setHov(false) : undefined}
    >
      <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)' }}>{base(on[1])}</div>
      <div style={{ position: 'absolute', top: '50%', right: 0, transform: 'translateY(-50%)' }}>{base(on[0])}</div>
      <div style={{ position: 'absolute', top: '50%', left: 0, transform: 'translateY(-50%)' }}>{base(on[2])}</div>
      {/* Hit area padded past the diamond so the pointer doesn't fall through the gaps */}
      {!!named.length && <div style={{ position: 'absolute', inset: -6 }} />}
      {hov && !!named.length && (
        <div style={{
          position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: 8,
          background: T.surface, border: `1px solid ${T.borderStrong}`, boxShadow: T.sh.md,
          padding: '8px 11px', display: 'grid', gap: 4, whiteSpace: 'nowrap', zIndex: 40, pointerEvents: 'none',
        }}>
          {named.map(r => (
            <div key={r.label} style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontFamily: T.mono, fontSize: 11, fontWeight: 700, color: T.textMuted, width: 22 }}>{r.label}</span>
              <span style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 600, color: T.text }}>{r.name}</span>
            </div>
          ))}
        </div>
      )}
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
// The four global DESTINATIONS. Settings is deliberately NOT here — it is a utility, not a
// place in the league (option C, Sep 12 2026), and lives as a gear icon beside search. The
// NavDrawer appends it, because at a narrow width a list is the only affordance available.
window.NAV_ITEMS = [
  { key: 'home', label: 'Home' },
  { key: 'games', label: 'Games' },
  { key: 'teams', label: 'Teams' },
  { key: 'standings', label: 'Standings' },
  { key: 'leaders', label: 'Leaders' },
];

// NavDrawer — retained for NARROW viewports only. On a desktop width the five destinations
// are visible in BrandHeader (option 2, Sep 12 2026), so no screen passes `onMenu` and the
// hamburger does not render. Kept whole because a phone width still needs it.
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
  const items = window.NAV_ITEMS.concat([{ key: 'settings', label: 'Settings' }]);
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

// The brand glyph: plain outlined diamond with the home-plate square at the BOTTOM point
// only (the final mark — no squares at the other three corners). Promoted out of game-v2
// on Sep 19, 2026 because Home's What's Hot list uses it as a BULLET: its presence means
// "Baseball IQ has context for this item". One glyph, one meaning, one definition.
// Home plate is OUTLINED, not filled (Sep 19, 2026) — a solid block at the bottom point
// read as a weight/bug at bullet size. One glyph, one definition, so this applies to the
// dark-band diamond too.
window.IQDiamond = function IQDiamond({ size = 18, color = T.accent, dim = false, tail }) {
  // RULE (Sep 23): the tail follows the colour. Rust = Baseball IQ = tail; any other colour
  // (ink brand mark) = no tail. `tail` may still override explicitly, but never needs to.
  const showTail = tail ?? (color === T.accent);
  // BRAND vs IQ (Sep 25): a non-rust diamond is the BRAND mark and matches the wordmark
  // PNG exactly — a small rotated square nested in the bottom corner (sides parallel to the
  // base paths), not the IQ glyph's home-plate outline.
  const brand = color !== T.accent;
  return (
    // Q-TAIL (Sep 23, 2026 — option E, `IQ Glyph — Q Tail Options.html`). The IQ mark was the
    // logo's diamond verbatim and read as a second logo / home button in the header. Now:
    // (1) home plate is a TRUE plate (open outline, point down, flush inside the base paths —
    // it was a rectangle), and (2) a tail leaves the diamond's bottom tip and runs flat to the
    // right edge. The corner supplies the downward stroke, the tail breaks right: a Q without a
    // diagonal. The logo keeps the plain diamond, so the two marks are now distinct.
    <svg width={size} height={size} viewBox="0 0 24 24" overflow="visible" aria-hidden="true" style={{ flexShrink: 0, opacity: dim ? 0.75 : 1, display: 'block' }}>
      <path d="M12 2 L22 12 L12 22 L2 12 Z" fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      {brand
        ? <path d="M12 16.4 L14.3 18.7 L12 21 L9.7 18.7 Z" fill="none" stroke={color} strokeWidth="1.4" strokeLinejoin="miter" />
        : <path d="M9.8 15.8 L14.2 15.8 L14.2 18 L12 20.2 L9.8 18 Z" fill="none" stroke={color} strokeWidth="1.4" strokeLinejoin="miter" />}
      {showTail && <path d="M12 22 H22.5" stroke={color} strokeWidth="2" strokeLinecap="round" />}
    </svg>
  );
};

// FollowButton — the follow gesture, on a team page header and a player header. Following
// is a DASHBOARD of entities the user picked (Home's section 2), so it needs a control where
// the user decides they care: on the thing itself. A star icon was rejected — the word says
// what happens, and the followed state has to be readable at a glance, not decoded.
// State: unfollowed = quiet outline "+ Follow"; followed = rust-soft "Following", which
// swaps to "Unfollow" on hover so the destructive action is never a surprise click.
// Persistence is device-local for now (localStorage), an account record later.
window.FollowButton = function FollowButton({ initial = false, size = 'md' }) {
  const [on, setOn] = React.useState(initial);
  const [hov, setHov] = React.useState(false);
  const pad = size === 'sm' ? '6px 12px' : '8px 15px';
  const fs = size === 'sm' ? 12.5 : 13.5;
  return (
    <button
      onClick={() => setOn(v => !v)}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      aria-pressed={on}
      style={{
        padding: pad, borderRadius: T.r.pill, fontFamily: T.sans, fontSize: fs, fontWeight: 600,
        cursor: 'pointer', whiteSpace: 'nowrap', lineHeight: 1.2,
        background: on ? T.accentSoft : T.surface,
        color: on ? T.accent : T.text,
        border: `1px solid ${on ? T.accent : T.borderStrong}`,
      }}>
      {on ? (hov ? 'Unfollow' : 'Following') : '+ Follow'}
    </button>
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

// Branding header — line 1 of the common header. Wordmark left (NOT clickable — there is no
// home button by decision); the five global destinations as a HORIZONTAL nav in the middle;
// utilities right. The page title block (line 2) is owned by each page.
//
// OPTION 2, settled Sep 12 2026 — the contextual return is NOT here any more. Five
// destinations are few enough to show, and "← Games" next to a `Games` nav item says the
// same thing twice. The return moved into `PageTitle` (`returnTo`) and now renders ONLY
// when the screen you came from is an instance — a game, a team, a player — that no nav
// item can name. Reference: `Header Nav - Return Rule.html`.
//
// `active` lights the rust underline and is the SECTION, not the screen: a team page is
// always `teams`. A player page passes NOTHING — it is reachable from games, teams and
// leaders alike, so lighting one would assert a hierarchy that does not exist.
//
// OPTION C, settled Sep 12 2026 — wordmark left; the four DESTINATIONS right-justified
// (not centered — centering read as decoration); search + a Settings GEAR at the far right.
// Settings left the nav list because it is a utility, not a place in the league. One row,
// 62px: a second utility row was built (`Header Nav - Two Row.html`) and rejected — it paid
// 44px of framed chrome on every screen to hold two icons, and it took away the hairline
// the active underline sits on.
//
// TWO INTENTIONAL DIVERGENCES FROM THE SHIPPED APP (settled Aug 31, 2026 — don't "fix"):
//  1. The wordmark <img> is a mock stand-in. The app renders <LogoLockup variant="allcaps">
//     (inline SVG, same final mark) and that is correct — SVG scales, inherits colour, no
//     asset request. The PNG only exists because a static mock can't mount a component.
//  2. `onMenu` is now the NARROW-viewport hatch, not the desktop nav: pass it and the
//     hamburger appears (for a width where the horizontal nav can't fit). No desktop screen
//     passes it, so no screen shows both.
// ============================================================
// EdgeButton — ONE edge affordance for the whole app (Sep 19, 2026).
//
// There were three of these, all different: the live widget's slide arrows (40px, a
// gradient fading to transparent, glyph invisible until hover), the Leaders tables'
// scroll chevrons (60px, gradient, always visible when scrollable) and Following's tile
// cycler (a solid strip). They do the same job — "there is more this way, press here" —
// so they now look and behave the same. Following's treatment won: a SOLID strip reads as
// a button, where a gradient reads as a fade that happens to be clickable.
//
// Behaviour: HIDDEN AT REST, revealed on hover of the container (pass `show`). Absolutely
// positioned and flush to the edge, so appearing costs no reflow — reserve its thickness
// in the container's padding.
// `self` (Sep 26): the strip is always there but invisible until the pointer is ON IT — it
// reveals on its own hover, not the container's. Used by the rich Following cards, where a
// card carries two strips and container-hover lit both at once.
window.EdgeButton = function EdgeButton({ side = 'right', show = true, onClick, label, thickness = 30, ground, length, self = false }) {
  const [hov, setHov] = React.useState(false);
  const vertical = side === 'left' || side === 'right';
  const pts = { left: '8,1 2,7 8,13', right: '1,1 7,7 1,13', up: '1,8 7,2 13,8', down: '1,1 7,7 13,1' };
  const key = side === 'top' ? 'up' : side === 'bottom' ? 'down' : side;
  const inner = { left: 'borderRight', right: 'borderLeft', top: 'borderBottom', bottom: 'borderTop' }[side];
  if (!show) return null;
  return (
    <button type="button" onClick={e => { e.stopPropagation(); onClick && onClick(); }} aria-label={label}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        position: 'absolute', zIndex: 3, padding: 0, border: 'none', cursor: 'pointer',
        display: 'grid', placeItems: 'center',
        ...(self ? { opacity: hov ? 1 : 0, transition: 'opacity .12s ease' } : {}),
        // `length` constrains the cross-axis extent and centres the button on that edge;
        // without it the button spans the whole edge.
        ...(vertical
          ? (length
              ? { top: '50%', transform: 'translateY(-50%)', [side]: 0, width: thickness, height: length, borderRadius: side === 'left' ? `0 ${T.r.sm}px ${T.r.sm}px 0` : `${T.r.sm}px 0 0 ${T.r.sm}px` }
              : { top: 0, bottom: 0, [side]: 0, width: thickness })
          : (length
              ? { left: '50%', transform: 'translateX(-50%)', [side]: 0, height: thickness, width: length }
              : { left: 0, right: 0, [side]: 0, height: thickness })),
        background: hov ? T.accentSoft : (ground || T.surfaceAlt),
        ...(length ? { border: `1px solid ${T.border}` } : { [inner]: `1px solid ${T.border}` }),
        color: hov ? T.accent : T.textMuted,
      }}>
      <svg width={vertical ? 9 : 14} height={vertical ? 14 : 9} viewBox={vertical ? '0 0 9 14' : '0 0 14 9'} fill="none" aria-hidden="true">
        <polyline points={pts[key]} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
};

// ============================================================
// BASEBALL IQ — the global entry point (Sep 19, 2026).
//
// IQ used to be reachable only where an insight happened to exist: the game view's sticky
// band, and Home's hot-item bullets. That made the ASK a property of those two screens,
// when it is really a property of the app — a user on a player page, the standings or a
// team schedule has questions too.
//
// So the diamond now lives in BrandHeader, beside search, on every screen. This does NOT
// duplicate the contextual surfaces: those diamonds mean "there is something to tell you
// HERE" and carry content; this one is the permanent "ask" and is always available.
//
// CONTEXT IS THE PAGE. `iqContext` names what "this" means wherever you are, and it is
// shown in the panel so the scope of an answer is never a guess. Absent → league-wide.
//
// CONSEQUENCE FOR THE GAME VIEW (dev, deliberate): with a permanent ask in the header, the
// sticky band no longer has to carry "Ask Baseball IQ" as its silence state. The band can
// simply show an insight when one clears the bar and nothing when none does — the hole that
// the silence state existed to fill is now filled globally. See the band's own notes.
window.IQ_INK_ACCENT = '#e2703f';

// WIRING (Sep 25, 2026). The panel no longer fakes its own answer: it calls `onAsk(question,
// scope)` and renders whatever POST /api/iq/query returns — { ok, headline, unit?, sub, facts[] }.
// `scope` is the REQUEST object for the page ({kind:'game',gameId,updateIndex} | {kind:'player',
// playerId} | {kind:'team',teamId} | {kind:'league'}); `context` is only its display label.
// iqMockQuery is NOT FOR PORT — same shape as the server, 1400ms like the measured round trip;
// any question containing "fail" returns ok:false so the error state can be reviewed.
const iqMockQuery = question => new Promise(res => setTimeout(() => res(/fail/i.test(question)
  ? { ok: false, headline: 'N/A', sub: 'placeholder', facts: [] }
  : { ok: true, headline: '26', unit: 'games', sub: 'Sample answer — the server supplies the real one: a headline figure, a short plain-language read, and up to three supporting facts.', facts: [{ label: 'Since', value: '1901' }, { label: 'Record holder', value: 'Joe DiMaggio' }] }), 1400));

window.BaseballIQButton = function BaseballIQButton({ context, scope, suggested, onAsk = iqMockQuery }) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState('');
  // ONE phase value, never a set of booleans — the panel cannot show two states at once.
  const [phase, setPhase] = React.useState('idle'); // idle | thinking | answered | error
  const [res, setRes] = React.useState(null);
  const reqRef = React.useRef(0);
  const wrapRef = React.useRef(null);
  const label = context || 'Anywhere in baseball';
  const qs = (suggested || []).slice(0, 3);
  // Dismiss clears everything and orphans any in-flight request (reqRef bump), so a late
  // answer can never land in a panel the user already closed or re-asked from.
  const close = () => { reqRef.current++; setOpen(false); setQ(''); setPhase('idle'); setRes(null); };
  React.useEffect(() => {
    if (!open) return;
    const onKey = e => { if (e.key === 'Escape') close(); };
    const onDown = e => { if (wrapRef.current && !wrapRef.current.contains(e.target)) close(); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onDown);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('mousedown', onDown); };
  }, [open]);
  const ask = async text => {
    const id = ++reqRef.current;
    setQ(text); setPhase('thinking'); setRes(null);
    let r;
    try { r = await onAsk(text, scope || { kind: 'league' }); } catch (e) { r = { ok: false }; }
    if (id !== reqRef.current) return;
    setRes(r);
    // `ok` is the contract. Never sniff headline === 'N/A'; the server is 200 in every case.
    setPhase(r && r.ok ? 'answered' : 'error');
  };
  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button onClick={() => (open ? close() : setOpen(true))} aria-label="Ask Baseball IQ" aria-expanded={open}
        style={{ ...iconBtn, width: 38, height: 38, display: 'grid', placeItems: 'center', padding: 0, background: open ? T.accentSoft : undefined, borderColor: open ? T.accent : undefined }}>
        <window.IQDiamond size={19} />
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 10px)', right: 0, width: 460, zIndex: 80,
          background: T.surface, border: `1px solid ${T.border}`, borderTop: `2px solid ${T.accent}`,
          borderRadius: `0 0 ${T.r.md}px ${T.r.md}px`, boxShadow: T.sh.lg || T.sh.md }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '10px 14px', borderBottom: `1px solid ${T.border}` }}>
            <window.IQDiamond size={14} />
            <span style={{ fontFamily: T.sans, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: T.accent }}>Baseball IQ</span>
            {/* scope line: an answer is only trustworthy if you know what it is about */}
            <span style={{ fontFamily: T.sans, fontSize: 12, color: T.textMuted, marginLeft: 'auto', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 230 }}>{label}</span>
          </div>
          <div style={{ padding: '12px 14px 14px' }}>
            <input autoFocus value={q} disabled={phase === 'thinking'} onChange={e => { setQ(e.target.value); setPhase('idle'); setRes(null); }}
              onKeyDown={e => { if (e.key === 'Enter' && q.trim() && phase !== 'thinking') ask(q.trim()); }}
              placeholder="Ask about this page, or anything in baseball…"
              style={{ width: '100%', boxSizing: 'border-box', height: 36, padding: '0 12px', background: T.bg,
                border: `1px solid ${T.borderStrong}`, borderRadius: T.r.pill, fontFamily: T.sans, fontSize: 13.5, color: T.text, outline: 'none' }} />
            {/* No suggestions = field alone. The placeholder already invites; no filler line. */}
            {phase === 'idle' && qs.length > 0 && (
              <div style={{ display: 'grid', gap: 6, marginTop: 11 }}>
                {qs.map(x => (
                  <button key={x} onClick={() => ask(x)} style={{ fontFamily: T.sans, fontSize: 12.5, fontWeight: 500, color: T.text,
                    background: T.bg, border: `1px solid ${T.border}`, borderRadius: T.r.pill, padding: '7px 12px', cursor: 'pointer', textAlign: 'left' }}>{x}</button>
                ))}
              </div>
            )}
            {phase === 'thinking' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: 30, marginTop: 11 }}>
                <span style={{ display: 'inline-flex', animation: 'iqPulseG 1.1s ease-in-out infinite' }}><window.IQDiamond size={16} /></span>
                <span style={{ fontFamily: T.sans, fontSize: 13.5, color: T.textMuted }}>Reading the record…</span>
                <style>{'@keyframes iqPulseG{0%,100%{opacity:1}50%{opacity:.4}}'}</style>
              </div>
            )}
            {phase === 'answered' && res && (
              <div style={{ marginTop: 13 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 7 }}>
                  <span style={{ fontFamily: T.mono, fontSize: 28, fontWeight: 800, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{res.headline}</span>
                  {/* unit is OPTIONAL — no stray label when absent */}
                  {res.unit && <span style={{ fontFamily: T.sans, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: T.accent }}>{res.unit}</span>}
                </div>
                <p style={{ margin: 0, fontFamily: T.sans, fontSize: 13.5, lineHeight: 1.55, color: T.textMuted, textWrap: 'pretty' }}>{res.sub}</p>
                {(res.facts || []).length > 0 && (
                  <div style={{ display: 'flex', gap: 22, marginTop: 12, paddingTop: 11, borderTop: `1px solid ${T.border}` }}>
                    {res.facts.slice(0, 3).map(f => (
                      <div key={f.label} style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                        <span style={{ fontFamily: T.sans, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: T.textMuted }}>{f.label}</span>
                        {/* values arrive formatted with units — render verbatim */}
                        <span style={{ fontFamily: T.mono, fontSize: 14, fontWeight: 700, color: T.text, fontVariantNumeric: 'tabular-nums' }}>{f.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {/* Error is a CONTENT state: no alarm colour, no icon. Server placeholder text is
                ignored — this copy replaces it. */}
            {phase === 'error' && (
              <div style={{ marginTop: 13 }}>
                <div style={{ fontFamily: T.sans, fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 5 }}>Not right now</div>
                <p style={{ margin: '0 0 11px', fontFamily: T.sans, fontSize: 13.5, lineHeight: 1.55, color: T.textMuted, textWrap: 'pretty' }}>Baseball IQ could not answer that one. Everything else on this page is unaffected.</p>
                <button onClick={() => ask(q)} style={{ fontFamily: T.sans, fontSize: 12.5, fontWeight: 600, color: T.text, background: T.bg, border: `1px solid ${T.borderStrong}`, borderRadius: T.r.pill, padding: '6px 14px', cursor: 'pointer' }}>Try again</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

window.BrandHeader = function BrandHeader({ active, onMenu, onSettings, colStyle, iqContext, iqScope, iqSuggested, onIqAsk }) {
  return (
    <div style={{ borderBottom: `1px solid ${T.border}` }}>
    <div style={{ ...(colStyle || null), padding: '0 28px', minHeight: 62, display: 'flex', alignItems: 'stretch', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <img src="assets/logo-wordmark-light.png" alt="Scorebook" style={{ height: 27, width: 'auto', display: 'block' }} />
      </div>
      {/* everything else right-justified: nav, then utilities. Nav items are full-height so
          the rust underline lands ON the bar's hairline — the same idiom as the player tab
          strip and the team tabs. */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'stretch', gap: 22 }}>
        <div style={{ display: 'flex', alignItems: 'stretch', gap: 26 }}>
          {window.NAV_ITEMS.map(it => {
            const on = it.key === active;
            return (
              <span key={it.key} aria-current={on ? 'page' : undefined} style={{
                display: 'flex', alignItems: 'center', fontFamily: T.sans, fontSize: 14, fontWeight: 600,
                color: on ? T.text : T.textMuted, borderBottom: `2px solid ${on ? T.accent : 'transparent'}`,
                marginBottom: -1, cursor: on ? 'default' : 'pointer', whiteSpace: 'nowrap',
              }}>{it.label}</span>
            );
          })}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, alignSelf: 'center' }}>
          {/* IQ sits LEFT of search: it is the app's own voice, search is navigation. */}
          <window.BaseballIQButton context={iqContext} scope={iqScope} suggested={iqSuggested} onAsk={onIqAsk} />
          <window.SearchField />
          <button onClick={onSettings} aria-label="Settings" style={{ ...iconBtn, width: 38, height: 38, display: 'grid', placeItems: 'center', padding: 0 }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke={T.text} strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
              <circle cx="9" cy="9" r="2.6" />
              <path d="M9 1.6v2M9 14.4v2M2.8 2.8l1.4 1.4M13.8 13.8l1.4 1.4M1.6 9h2M14.4 9h2M2.8 15.2l1.4-1.4M13.8 4.2l1.4-1.4" />
            </svg>
          </button>
          <button onClick={onMenu} aria-label="Navigation menu" style={{ ...iconBtn, width: 38, height: 38, display: onMenu ? 'grid' : 'none', placeItems: 'center', padding: 0 }}>
            <svg width="21" height="16" viewBox="0 0 21 16" aria-hidden="true">
              <g stroke={T.text} strokeWidth="2.1" strokeLinecap="round"><path d="M1.5 2h18" /><path d="M1.5 8h18" /><path d="M1.5 14h18" /></g>
            </svg>
          </button>
        </div>
      </div>
    </div>
    </div>
  );
};

// Page title row. `returnTo={{ label, onClick }}` is the contextual return — see the rule
// above BrandHeader. Demoted to 15px muted: at BrandHeader's old 21px ink it would compete
// with the h1 directly beneath it. No space is reserved when absent — presence is fixed for
// the life of a visit, so nothing moves while the user is looking at it.
window.PageTitle = function PageTitle({ title, subtitle, subtitleRight, right, navMenu, flush, returnTo }) {
  const padX = flush ? '0' : '28px';
  return (
    <div style={{ padding: `${returnTo ? 16 : 22}px ${padX} 14px`, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {returnTo && (
        <span onClick={returnTo.onClick} style={{ alignSelf: 'flex-start', fontFamily: T.sans, fontSize: 15, fontWeight: 600, color: T.textMuted, cursor: 'pointer', marginBottom: 2 }}>← {returnTo.label}</span>
      )}
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

// One score format app-wide (Sep 30, 2026): a dash only ever means a SERIES record ("2–1").
// A game score pairs each team with its own runs: "HOU 8 CHC 5". Normalises legacy strings
// ("HOU 8 – 5 CHC", "HOU 8–5 CHC") so mock data can stay as written.
window.fmtScore = (s) => (typeof s === 'string' ? s.replace(/^([A-Z]{2,3}) (\d+) ?[\u2013-] ?(\d+) ([A-Z]{2,3})$/, '$1 $2 $4 $3') : s);
