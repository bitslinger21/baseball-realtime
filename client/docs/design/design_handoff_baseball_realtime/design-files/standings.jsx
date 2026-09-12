// SNAPSHOT: copied from the live design workspace (holistic/standings.jsx) on Sep 10, 2026.
// This is a FROZEN COPY for handoff. If the date above is old, the live file may have
// moved on — check before treating this as current.
/* global React, T, TeamDot, Card, Eyebrow, Segmented, AppHeader, PageTitle, btn */

// ============================================================
// STANDINGS — restyled to the editorial-scorebook system.
// Teams grouped by division, one section (card) per division.
// MLB | AL | NL filter. exports window.StandingsScreen
// ============================================================

// team lookup: key → real MLB logo id + short name + primary color (lg/div come from the section).
const STEAMS = {
  TB:  { id: 139, name: 'Rays',        primary: '#092C5C' }, NYY: { id: 147, name: 'Yankees',   primary: '#0C2340' },
  TOR: { id: 141, name: 'Blue Jays',   primary: '#134A8E' }, BAL: { id: 110, name: 'Orioles',   primary: '#DF4601' },
  BOS: { id: 111, name: 'Red Sox',     primary: '#BD3039' },
  CWS: { id: 145, name: 'White Sox',   primary: '#27251F' }, CLE: { id: 114, name: 'Guardians', primary: '#00385D' },
  MIN: { id: 142, name: 'Twins',       primary: '#002B5C' }, DET: { id: 116, name: 'Tigers',    primary: '#0C2340' },
  KC:  { id: 118, name: 'Royals',      primary: '#004687' },
  SEA: { id: 136, name: 'Mariners',    primary: '#0C2C56' }, TEX: { id: 140, name: 'Rangers',   primary: '#003278' },
  HOU: { id: 117, name: 'Astros',      primary: '#002D62' }, ATH: { id: 133, name: 'Athletics', primary: '#003831' },
  LAA: { id: 108, name: 'Angels',      primary: '#BA0021' },
  ATL: { id: 144, name: 'Braves',      primary: '#13274F' }, PHI: { id: 143, name: 'Phillies',  primary: '#E81828' },
  MIA: { id: 146, name: 'Marlins',     primary: '#00A3E0' }, WSH: { id: 120, name: 'Nationals', primary: '#AB0003' },
  NYM: { id: 121, name: 'Mets',        primary: '#002D72' },
  CHC: { id: 112, name: 'Cubs',        primary: '#0E3386' }, MIL: { id: 158, name: 'Brewers',   primary: '#12284B' },
  STL: { id: 138, name: 'Cardinals',   primary: '#C41E3A' }, CIN: { id: 113, name: 'Reds',      primary: '#C6011F' },
  PIT: { id: 134, name: 'Pirates',     primary: '#27251F' },
  LAD: { id: 119, name: 'Dodgers',     primary: '#005A9C' }, SD:  { id: 135, name: 'Padres',    primary: '#2F241D' },
  SF:  { id: 137, name: 'Giants',      primary: '#FD5A1E' }, ARI: { id: 109, name: 'Diamondbacks', primary: '#A71930' },
  COL: { id: 115, name: 'Rockies',     primary: '#333366' },
};
const tm = k => STEAMS[k];

// t(key, W, L, 'L10', 'STRK')
const t = (k, w, l, l10, strk) => ({ k, w, l, l10, strk });

// Divisions — the whole league, grouped. Order within a division is by record;
// GB + PCT are derived in render, so we only store the raw W/L/L10/STRK.
const DIVISIONS = [
  { lg: 'AL', name: 'AL East', teams: [
    t('TB', 52, 35, '8-2', 'L2'), t('NYY', 49, 40, '1-9', 'L2'), t('TOR', 42, 48, '3-7', 'L2'),
    t('BAL', 42, 49, '4-6', 'L1'), t('BOS', 40, 48, '8-2', 'W3') ] },
  { lg: 'AL', name: 'AL Central', teams: [
    t('CWS', 47, 42, '6-4', 'W2'), t('CLE', 47, 44, '5-5', 'L2'), t('MIN', 44, 47, '6-4', 'W2'),
    t('DET', 40, 50, '6-4', 'W2'), t('KC', 37, 54, '3-7', 'W2') ] },
  { lg: 'AL', name: 'AL West', teams: [
    t('SEA', 47, 44, '6-4', 'W2'), t('TEX', 45, 45, '7-3', 'L2'), t('HOU', 45, 47, '6-4', 'W2'),
    t('ATH', 41, 49, '3-7', 'L3'), t('LAA', 36, 55, '3-7', 'L6') ] },
  { lg: 'NL', name: 'NL East', teams: [
    t('ATL', 52, 36, '4-6', 'L1'), t('PHI', 50, 41, '5-5', 'L2'), t('MIA', 49, 42, '7-3', 'W3'),
    t('WSH', 46, 45, '5-5', 'L2'), t('NYM', 37, 53, '3-7', 'W1') ] },
  { lg: 'NL', name: 'NL Central', teams: [
    t('CHC', 51, 38, '7-3', 'W1'), t('MIL', 48, 41, '6-4', 'W2'), t('STL', 45, 44, '4-6', 'L1'),
    t('CIN', 43, 47, '5-5', 'L2'), t('PIT', 38, 52, '4-6', 'L4') ] },
  { lg: 'NL', name: 'NL West', teams: [
    t('LAD', 55, 34, '8-2', 'W4'), t('SD', 49, 40, '6-4', 'L1'), t('SF', 46, 44, '5-5', 'W1'),
    t('ARI', 44, 46, '4-6', 'L2'), t('COL', 30, 60, '2-8', 'L5') ] },
];

const pct = (w, l) => {
  const p = w / (w + l);
  return p.toFixed(3).replace(/^0/, ''); // .598
};
const gamesBack = (lead, x) => {
  const g = ((lead.w - x.w) + (x.l - lead.l)) / 2;
  return g === 0 ? '–' : g.toFixed(1);
};

// column geometry shared by header + rows. Numeric widths follow the app's
// `.st-hd`/`.st-row` grid (30/30/44/40/44) so STRK can't clip; `tm().name` is
// already the short nickname ('Rockies'), never the full display name.
const COLS = '18px 22px minmax(72px,1fr) 30px 30px 44px 40px 44px 36px';

function Th({ children, right, light }) {
  return (
    <span style={{
      fontFamily: T.sans, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.07em',
      textTransform: 'uppercase', color: light ? T.textMuted : 'rgba(255,255,255,0.6)',
      textAlign: right ? 'right' : 'left',
    }}>{children}</span>
  );
}
function Td({ children, muted, strong, accent, right = true }) {
  return (
    <span style={{
      fontFamily: T.mono, fontSize: 13, fontWeight: strong ? 700 : 600,
      fontVariantNumeric: 'tabular-nums',
      color: accent ? T.accent : muted ? T.textFaint : T.text,
      textAlign: right ? 'right' : 'left',
    }}>{children}</span>
  );
}

const byPct = (a, b) => b.w / (b.w + b.l) - a.w / (a.w + a.l);

// Shared header band + column labels. Navy by default (matches the Leaders card
// system, used by the Wild Card card); `light` gives the app's division-card
// treatment — cream ground, muted uppercase label, bottom rule — which is what
// the rust scorebook-diamond flip button needs to read against.
function HeaderBand({ title, tag, gbLabel = 'GB', action, light }) {
  return (
    <div style={{ background: light ? 'transparent' : T.info, borderBottom: light ? `1px solid ${T.border}` : 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: light ? '12px 16px 10px' : '10px 14px 8px' }}>
        <span style={{
          fontFamily: T.sans, fontSize: light ? 12 : 13.5, fontWeight: 700, flex: 1,
          color: light ? T.textMuted : '#fff',
          letterSpacing: light ? '0.09em' : '-0.01em',
          textTransform: light ? 'uppercase' : 'none',
        }}>{title}</span>
        {action}
        <span style={{ fontFamily: T.mono, fontSize: 10.5, fontWeight: 600, color: light ? T.textFaint : 'rgba(255,255,255,0.62)', letterSpacing: '0.06em', marginLeft: 10 }}>{tag}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: COLS, gap: 6, alignItems: 'center', padding: '0 12px 8px' }}>
        <span /><span />
        <Th light={light}>Team</Th>
        <Th light={light} right>W</Th><Th light={light} right>L</Th><Th light={light} right>PCT</Th><Th light={light} right>{gbLabel}</Th><Th light={light} right>L10</Th><Th light={light} right>STRK</Th>
      </div>
    </div>
  );
}

// One team row. gb is a preformatted string; tint = highlighted (division/playoff);
// strong = bold + accent (division leaders / playoff seeds 1–3).
function TeamRow({ x, pos, gb, tint, strong, topBorder = true }) {
  const wStreak = x.strk[0] === 'W';
  return (
    // ONE destination (this team's page), so the WHOLE ROW is the target and the whole
    // row shades on hover — matching Teams, the team-page tables and the schedule.
    // It used to be the name only, while a comment claimed the row carried the affordance.
    <div onClick={() => window.openTeamPage && window.openTeamPage(x.k)} style={{
      display: 'grid', gridTemplateColumns: COLS, gap: 6, alignItems: 'center',
      padding: '8px 12px', cursor: 'pointer',
      borderTop: topBorder ? `1px solid ${T.border}` : 'none',
      background: tint ? 'rgba(184,66,30,0.055)' : 'transparent',
    }}
      onMouseEnter={e => { e.currentTarget.style.background = tint ? 'rgba(184,66,30,0.11)' : T.surfaceAlt; }}
      onMouseLeave={e => { e.currentTarget.style.background = tint ? 'rgba(184,66,30,0.055)' : 'transparent'; }}>
      <span style={{ fontFamily: T.mono, fontSize: 12, fontWeight: strong ? 700 : 500, color: strong ? T.accent : T.textFaint, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{pos}</span>
      <TeamDot team={tm(x.k)} size={20} />
      <span style={{
        fontFamily: T.sans, fontSize: 13.5, fontWeight: strong ? 700 : 500, color: T.text,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>{tm(x.k).name}</span>
      <Td strong={strong}>{x.w}</Td>
      <Td muted>{x.l}</Td>
      <Td strong={strong} accent={strong}>{pct(x.w, x.l)}</Td>
      <Td muted>{gb}</Td>
      <Td muted>{x.l10}</Td>
      <span style={{ fontFamily: T.mono, fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums', textAlign: 'right', color: wStreak ? T.positive : T.negative }}>{x.strk}</span>
    </div>
  );
}

const flipIconBtn = {
  width: 22, height: 22, borderRadius: 6, display: 'grid', placeItems: 'center', flexShrink: 0,
  background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.22)',
  color: 'rgba(255,255,255,0.75)', cursor: 'pointer', padding: 0,
};

// Flip trigger on the LIGHT division-card header — bare rust diamond, no chip.
const scorebookIconBtn = {
  width: 24, height: 24, borderRadius: 6, display: 'grid', placeItems: 'center', flexShrink: 0,
  background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
  transition: 'background 120ms',
};

function DivisionCard({ div }) {
  const teams = [...div.teams].sort(byPct);
  const lead = teams[0];
  const [flipped, setFlipped] = React.useState(false);
  return (
    <div style={{ position: 'relative', perspective: 1400 }}>
      <div style={{
        position: 'relative', width: '100%', transformStyle: 'preserve-3d',
        transition: 'transform 0.5s cubic-bezier(0.4,0.2,0.2,1)',
        transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
      }}>
        <Card padless style={{ overflow: 'hidden', alignSelf: 'stretch', width: '100%', backfaceVisibility: 'hidden' }}>
          <HeaderBand light title={div.name} tag={div.lg} action={
            <button aria-label="Show wins-over-time chart" onClick={() => setFlipped(true)} style={scorebookIconBtn}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(184,66,30,0.10)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
              {/* Scorebook diamond — the rebrand mark, same glyph as the app's
                  `pbpv2__flip-btn` and the game view's scorecard flip. */}
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <polygon points="7,1 13,7 7,13 1,7" fill="none" stroke={T.accent} strokeWidth="1.5" />
              </svg>
            </button>
          } />
          {teams.map((x, i) => (
            <TeamRow key={x.k} x={x} pos={i + 1} gb={gamesBack(lead, x)} tint={i === 0} strong={i === 0} topBorder={i !== 0} />
          ))}
        </Card>
        {/* Back face is mounted only while flipped. Kept unmounted otherwise:
            its opaque `surface` fill was painting over the front card (backface
            culling isn't reliable for an absolutely-positioned child inside a
            preserve-3d parent), which rendered every division card blank. */}
        {flipped && (
        <div style={{
          position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)',
          borderRadius: T.r.lg, overflow: 'hidden', background: T.surface, boxShadow: T.sh.md,
        }}>
          <DivisionMiniChart div={div} teams={teams} onBack={() => setFlipped(false)} />
        </div>
        )}
      </div>
    </div>
  );
}

function DivisionMiniChart({ div, teams, onBack }) {
  const [playDay, setPlayDay] = React.useState(null);
  const timerRef = React.useRef(null);
  const rafRef = React.useRef(null);
  const lastN = RH_DAYS.length - 1;

  const runFrom = (startVal) => {
    cancelAnimationFrame(rafRef.current);
    const start = performance.now();
    const step = (now) => {
      const dt = (now - start) / 1000;
      const d = Math.min(lastN, startVal + dt * 22);
      setPlayDay(d);
      if (d < lastN) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  };

  React.useEffect(() => {
    timerRef.current = setTimeout(() => runFrom(0), 1000);
    return () => { clearTimeout(timerRef.current); cancelAnimationFrame(rafRef.current); };
  }, []);

  const handleReplay = () => { clearTimeout(timerRef.current); runFrom(0); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ background: T.info, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', height: 40, flexShrink: 0, boxSizing: 'border-box' }}>
        <span style={{ fontFamily: T.sans, fontSize: 13.5, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>{div.name}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button aria-label="Replay" onClick={handleReplay} style={flipIconBtn}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}>↺</button>
          <button aria-label="Back to standings" onClick={onBack} style={flipIconBtn}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}>←</button>
        </div>
      </div>
      <div style={{ flex: 1, padding: '10px 12px 4px', overflow: 'hidden', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, minHeight: 0 }}>
          <RankHistoryChart teams={teams} playDay={playDay} minimal />
        </div>
        {/* Provenance flag. `buildWinsSeries` anchors only the FINAL point to the
            team's real W–L; every earlier day is a seeded shuffle. Until the
            backend sends a real per-day series this chart must say so — same
            disclosure pattern as the Upcoming tab's "sample" section labels. */}
        <div style={{ fontFamily: T.sans, fontSize: 11, color: T.textFaint, textAlign: 'center', padding: '2px 0 6px', flexShrink: 0 }}>
          Shape is sample data · final total is real
        </div>
      </div>
    </div>
  );
}

// Build the wild-card picture for one league: 3 division leaders (seeds 1–3),
// the next 3 by record (wild cards, seeds 4–6), then everyone else.
function buildWildCard(lg) {
  const divs = DIVISIONS.filter(d => d.lg === lg);
  const leaders = divs.map(d => [...d.teams].sort(byPct)[0]).sort(byPct);
  const leaderKeys = new Set(leaders.map(t => t.k));
  const rest = divs.flatMap(d => d.teams).filter(t => !leaderKeys.has(t.k)).sort(byPct);
  return { leaders, wildcard: rest.slice(0, 3), below: rest.slice(3), cutoff: rest[2] };
}

function WCDivider({ label }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '5px 14px',
      background: T.surfaceAlt, borderTop: `2px solid ${T.ink}`, borderBottom: `1px solid ${T.border}`,
    }}>
      <span style={{ fontFamily: T.sans, fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: T.textMuted }}>{label}</span>
    </div>
  );
}

function WildCardCard({ lg, title }) {
  const { leaders, wildcard, below, cutoff } = buildWildCard(lg);
  // Games back from the 3rd (last) wild-card spot — the cutoff line.
  const wcgb = (x) => {
    if (x.k === cutoff.k) return '–';
    const d = ((x.w - cutoff.w) + (cutoff.l - x.l)) / 2;
    return d > 0 ? '+' + d.toFixed(1) : d.toFixed(1).replace('-', '');
  };
  return (
    <Card padless style={{ overflow: 'hidden', alignSelf: 'stretch', width: '100%' }}>
      <HeaderBand title={title} tag={lg} gbLabel="WCGB" />
      {leaders.map((x, i) => (
        <TeamRow key={x.k} x={x} pos={i + 1} gb="–" tint strong topBorder={i !== 0} />
      ))}
      <WCDivider label="Wild Card" />
      {wildcard.map((x, i) => (
        <TeamRow key={x.k} x={x} pos={leaders.length + i + 1} gb={wcgb(x)} tint topBorder={i !== 0} />
      ))}
      <WCDivider label="Out" />
      {below.map((x, i) => (
        <TeamRow key={x.k} x={x} pos={leaders.length + wildcard.length + i + 1} gb={wcgb(x)} topBorder={i !== 0} />
      ))}
    </Card>
  );
}

// ============================================================
// RANK HISTORY — weekly rank-over-time line chart. One line per team in the
// selected scope (all MLB / a league / a division / a wild-card race), rank 1
// at the top. Real per-team records anchor the FINAL week exactly; earlier
// weeks are a deterministic, seeded "plausible season" so the lines settle
// into the real current standings rather than looking arbitrary.
// ============================================================

const ALL_TEAMS = DIVISIONS.flatMap(d => d.teams.map(x => ({ ...x, lg: d.lg, div: d.name })));

const RANK_SCOPES = [
  { id: 'ALL', label: 'All MLB · 30 teams' },
  { id: 'AL', label: 'American League · 15 teams' },
  { id: 'NL', label: 'National League · 15 teams' },
  ...DIVISIONS.map(d => ({ id: d.name, label: `${d.name} · 5 teams` })),
  { id: 'ALWC', label: 'AL Wild Card race · 12 teams' },
  { id: 'NLWC', label: 'NL Wild Card race · 12 teams' },
];

function teamsForScope(scopeId) {
  if (scopeId === 'ALL') return ALL_TEAMS;
  if (scopeId === 'AL' || scopeId === 'NL') return ALL_TEAMS.filter(x => x.lg === scopeId);
  if (scopeId === 'ALWC' || scopeId === 'NLWC') {
    const lg = scopeId.slice(0, 2);
    const leaderKeys = new Set(DIVISIONS.filter(d => d.lg === lg).map(d => [...d.teams].sort(byPct)[0].k));
    return ALL_TEAMS.filter(x => x.lg === lg && !leaderKeys.has(x.k));
  }
  return ALL_TEAMS.filter(x => x.div === scopeId);
}

// Seeded PRNG so the "history" is stable across renders instead of reshuffling.
function seedFromStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h >>> 0;
}
function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Daily checkpoints, Opening Day through today. Real Opening Day date to replace the
// hardcoded start when wiring real data.
function buildDays() {
  const start = new Date(2026, 2, 26); // Mar 26 — Opening Day
  const end = new Date(); // today
  const days = [];
  const d = new Date(start);
  while (d < end) { days.push(new Date(d)); d.setDate(d.getDate() + 1); }
  days.push(new Date(end));
  return days;
}
const RH_DAYS = buildDays();
const RH_WEEKS = RH_DAYS;
const RH_WEEK_LABELS = RH_DAYS.map(d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));

// A deterministic, seeded win/loss sequence per team that totals to their
// REAL final W/L (so the last day exactly matches current standings), spread
// across the season so cumulative wins climbs at a plausible pace.
function buildWinsSeries(teams) {
  const n = RH_WEEKS.length;
  const series = {};
  teams.forEach(x => {
    const total = x.w + x.l;
    const rnd = mulberry32(seedFromStr(x.k + '_wins'));
    const results = new Array(total).fill(0).map((_, i) => (i < x.w ? 1 : 0));
    for (let i = results.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      const tmp = results[i]; results[i] = results[j]; results[j] = tmp;
    }
    const cum = [];
    let acc = 0;
    for (let g = 0; g < total; g++) { acc += results[g]; cum.push(acc); }
    const daily = new Array(n);
    for (let d = 0; d < n; d++) {
      const gamesPlayed = total === 0 ? 0 : Math.round(total * d / (n - 1));
      daily[d] = gamesPlayed === 0 ? 0 : cum[gamesPlayed - 1];
    }
    series[x.k] = daily;
  });
  return series;
}

// Pick a "nice" gridline step (1/2/5/10/20/25/50...) so the win axis reads cleanly
// whether the scope is a 5-team division or all 30 teams.
function niceStep(max) {
  const target = Math.max(1, max) / 6;
  const steps = [1, 2, 5, 10, 15, 20, 25, 50, 100];
  return steps.find(s => s >= target) || 100;
}

// value of a team's series at a fractional day index, interpolating the tip.
function seriesAt(series, d) {
  const lo = Math.floor(d), hi = Math.min(series.length - 1, lo + 1);
  const frac = d - lo;
  return series[lo] + (series[hi] - series[lo]) * frac;
}

function RankHistoryChart({ teams, playDay = null, minimal = false }) {
  const weeksN = RH_WEEKS.length;
  const wins = React.useMemo(() => buildWinsSeries(teams), [teams]);
  const [hover, setHover] = React.useState(null); // { k, w }
  const svgRef = React.useRef(null);
  const isAnimating = playDay != null;
  const dayCap = isAnimating ? playDay : weeksN - 1;

  const yMax = Math.max(1, ...teams.map(x => wins[x.k][weeksN - 1]));
  const step = niceStep(yMax);
  const yTop = Math.ceil(yMax / step) * step;

  const VB_W = 1000, VB_H = 420;
  const left = minimal ? 8 : 30, right = minimal ? 8 : 30, top = 14, bottom = minimal ? 8 : 28;
  const plotW = VB_W - left - right;
  const plotH = VB_H - top - bottom;
  const xAt = w => left + (weeksN === 1 ? 0 : (w / (weeksN - 1)) * plotW);
  const yAt = v => top + (1 - v / yTop) * plotH;
  const showXEvery = Math.max(1, Math.ceil(weeksN / 11));
  const yTicks = [];
  for (let v = 0; v <= yTop; v += step) yTicks.push(v);
  const gridRight = minimal ? VB_W - right : VB_W - right + 14;

  const handleMove = (e) => {
    if (isAnimating) return;
    const rect = svgRef.current.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * VB_W;
    const py = ((e.clientY - rect.top) / rect.height) * VB_H;
    let w = Math.round((px - left) / (plotW / (weeksN - 1)));
    w = Math.max(0, Math.min(weeksN - 1, w));
    let best = null, bestD = Infinity;
    teams.forEach(x => {
      const d = Math.abs(yAt(wins[x.k][w]) - py);
      if (d < bestD) { bestD = d; best = x; }
    });
    if (best) setHover({ k: best.k, w });
  };

  const dotSize = minimal
    ? (teams.length <= 5 ? 26 : teams.length <= 12 ? 22 : teams.length <= 15 ? 20 : 18)
    : (teams.length > 15 ? 15 : 18);

  return (
    <div style={{ position: 'relative', height: minimal ? '100%' : 'auto' }} onMouseLeave={() => setHover(null)}>
      <svg ref={svgRef} viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio={minimal ? 'none' : 'xMidYMid meet'}
        style={{ width: '100%', height: minimal ? '100%' : 'auto', display: 'block' }}
        onMouseMove={handleMove}>
        {yTicks.map(v => (
          <g key={v}>
            <line x1={left} y1={yAt(v)} x2={gridRight} y2={yAt(v)} stroke={T.border} strokeWidth={1} />
            {!minimal && <text x={left - 8} y={yAt(v) + 3.2} textAnchor="end" fontFamily={T.mono} fontSize={9} fill={T.textFaint}>{v}</text>}
          </g>
        ))}
        {!minimal && RH_WEEK_LABELS.map((lab, w) => ((w % showXEvery === 0 || w === weeksN - 1) ? (
          <text key={w} x={xAt(w)} y={VB_H - bottom + 16} textAnchor="middle" fontFamily={T.mono} fontSize={8.5} fill={T.textFaint}>{lab}</text>
        ) : null))}
        {teams.map(x => {
          const wholeDays = Math.floor(dayCap);
          let pts = RH_WEEKS.slice(0, wholeDays + 1).map((_, w) => `${xAt(w)},${yAt(wins[x.k][w])}`).join(' ');
          if (isAnimating && wholeDays < weeksN - 1) {
            pts += ` ${xAt(dayCap)},${yAt(seriesAt(wins[x.k], dayCap))}`;
          }
          const isHover = hover && hover.k === x.k;
          return (
            <polyline key={x.k} points={pts} fill="none"
              stroke={tm(x.k).primary} strokeWidth={isHover ? 3.25 : 1.75}
              strokeLinecap="round" strokeLinejoin="round"
              opacity={hover && !isHover ? 0.16 : 1}
              style={{ transition: isAnimating ? 'none' : 'opacity 120ms, stroke-width 120ms' }} />
          );
        })}
      </svg>
      {/* end-of-line (or live-tip) logo markers — overlaid as HTML, percent-positioned to the viewBox */}
      {teams.map(x => {
        const v = seriesAt(wins[x.k], dayCap);
        const isHover = hover && hover.k === x.k;
        return (
          <div key={x.k} style={{
            position: 'absolute', left: `${(xAt(dayCap) / VB_W) * 100}%`, top: `${(yAt(v) / VB_H) * 100}%`,
            transform: 'translate(-50%,-50%)', opacity: (hover && !isHover) ? 0.3 : 1,
            transition: isAnimating ? 'none' : 'opacity 120ms', pointerEvents: 'none',
          }}>
            <TeamDot team={tm(x.k)} size={dotSize} />
          </div>
        );
      })}
      {hover && !isAnimating && (() => {
        const hx = xAt(hover.w), hy = yAt(wins[hover.k][hover.w]);
        return (
          <div style={{
            position: 'absolute', left: `${(hx / VB_W) * 100}%`, top: `${(hy / VB_H) * 100}%`,
            transform: hx / VB_W > 0.82 ? 'translate(calc(-100% - 12px), -50%)' : 'translate(12px, -50%)',
            pointerEvents: 'none', background: T.ink, color: '#fff', borderRadius: T.r.sm,
            padding: '6px 10px', fontFamily: T.sans, fontSize: 12, whiteSpace: 'nowrap',
            boxShadow: T.sh.lg, zIndex: 2,
          }}>
            <div style={{ fontWeight: 700 }}>{tm(hover.k).name}</div>
            <div style={{ fontFamily: T.mono, fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
              {wins[hover.k][hover.w]} W · {RH_WEEK_LABELS[hover.w]}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function RankHistoryCard() {
  const [scope, setScope] = React.useState('AL East');
  const teams = React.useMemo(() => teamsForScope(scope), [scope]);
  const [playDay, setPlayDay] = React.useState(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const rafRef = React.useRef(null);
  const lastDay = RH_DAYS.length - 1;
  const finished = playDay != null && playDay >= lastDay;

  const stop = () => { cancelAnimationFrame(rafRef.current); setIsPlaying(false); };

  const play = (fromZero) => {
    setIsPlaying(true);
    const startVal = fromZero ? 0 : (playDay || 0);
    const start = performance.now();
    const step = (now) => {
      const dt = (now - start) / 1000;
      const d = Math.min(lastDay, startVal + dt * 22);
      setPlayDay(d);
      if (d < lastDay) rafRef.current = requestAnimationFrame(step);
      else setIsPlaying(false);
    };
    rafRef.current = requestAnimationFrame(step);
  };

  const handlePlayClick = () => {
    if (isPlaying) { stop(); return; }
    if (finished) { setPlayDay(null); return; }
    play(true);
  };

  const handleScopeChange = (e) => {
    stop();
    setPlayDay(null);
    setScope(e.target.value);
  };

  const icon = isPlaying ? '⏸' : finished ? '↺' : '▶';

  return (
    <Card style={{ width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 18, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontFamily: T.sans, fontSize: 15, fontWeight: 700, color: T.text }}>Wins over time</div>
          <div style={{ fontFamily: T.mono, fontSize: 12, color: T.textMuted, marginTop: 2 }}>Cumulative wins · {RH_WEEK_LABELS[0]}–{RH_WEEK_LABELS[RH_WEEK_LABELS.length - 1]}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={handlePlayClick} aria-label="Play" style={{
            width: 34, height: 34, borderRadius: T.r.sm, display: 'grid', placeItems: 'center',
            background: isPlaying ? T.info : T.surfaceAlt, color: isPlaying ? '#fff' : T.text,
            border: `1px solid ${isPlaying ? T.info : T.border}`, cursor: 'pointer', fontSize: 13, padding: 0,
          }}>{icon}</button>
          <select value={scope} onChange={handleScopeChange} style={{
            fontFamily: T.sans, fontSize: 13, fontWeight: 600, color: T.text,
            background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: T.r.sm,
            padding: '8px 12px', cursor: 'pointer',
          }}>
            {RANK_SCOPES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
      </div>
      <RankHistoryChart teams={teams} playDay={playDay} />
    </Card>
  );
}

// ============================================================
// A–Z view — all 30 teams alphabetically in three columns. Reference-shaped:
// logo · nickname + city · W–L · PCT, no ranking or division context.
// ============================================================

// A–Z moved OFF this page (Aug 29, 2026) into the new top-level Teams page:
// Standings answers "who is winning", a directory answers "take me to a club".
// AZRow/AZView are kept unmounted for reference; teams.jsx has its own row.
function AZRow({ x }) {
  const t = tm(x.k);
  return (
    <div onClick={() => window.openTeamPage && window.openTeamPage(x.k)} style={{
      display: 'grid', gridTemplateColumns: '24px minmax(0,1fr) 62px 48px', gap: 9,
      alignItems: 'center', padding: '10px 4px', cursor: 'pointer',
      borderBottom: `1px solid ${T.border}`,
    }}
      onMouseEnter={e => { e.currentTarget.style.background = T.surfaceAlt; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
      <TeamDot team={t} size={24} />
      <span style={{ fontFamily: T.sans, fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</span>
      <span style={{ fontFamily: T.mono, fontSize: 13, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{x.w}–{x.l}</span>
      <span style={{ fontFamily: T.mono, fontSize: 13, textAlign: 'right', color: T.textMuted, fontVariantNumeric: 'tabular-nums' }}>{pct(x.w, x.l)}</span>
    </div>
  );
}

function AZView() {
  const rows = React.useMemo(
    () => DIVISIONS.flatMap(d => d.teams).sort((a, b) => tm(a.k).name.localeCompare(tm(b.k).name)),
    []);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: '0 26px' }}>
      {rows.map(x => <AZRow key={x.k} x={x} />)}
    </div>
  );
}

// Shared with holistic/teams.jsx — one definition of the league, one of each helper.
Object.assign(window, { STANDINGS_DIVISIONS: DIVISIONS, standingsTeam: tm, standingsPct: pct });

window.StandingsScreen = function StandingsScreen() {
  const [view, setView] = React.useState(0); // 0 Standing · 1 Wild Card

  const [navOpen, setNavOpen] = React.useState(false);
  const hint = view === 0 ? 'Division leader highlighted'
    : 'Playoff field if the season ended today';

  return (
    <div style={{ width: '100%', background: T.bg, color: T.text, fontFamily: T.sans, minHeight: 900, position: 'relative', overflow: 'hidden' }}>
      <window.BrandHeader back="Games" active="standings" onMenu={() => setNavOpen(true)} colStyle={{ maxWidth: 1240, margin: '0 auto' }} />
            <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <PageTitle
          title="Standings"
          subtitle={`2026 Season · through Jul 4 · ${hint}`}
          subtitleRight={
            <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
              <Eyebrow style={{ color: T.textFaint }}>Order</Eyebrow>
              <Segmented items={['Standing', 'Wild Card']} active={view} onClick={setView} />
            </div>
          }
        />

        {/* "Wild Card" is design-ahead — the app ships Standing / A–Z only.
            The "Every team links to its page" note was dropped Aug 29, 2026 — the row
            hover state carries the affordance; the sentence was scaffolding. */}

        {view === 2 ? (
        <div style={{ padding: '0 28px 44px', display: 'none' }}>
          <AZView />
        </div>
        ) : (
        <div style={{
          padding: '0 28px 44px',
          display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)',
          columnGap: 40, rowGap: 16, alignItems: 'start',
        }}>
          {view === 0 ? (
            ['AL', 'NL'].map(lg => (
              <div key={lg} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {DIVISIONS.filter(d => d.lg === lg).map(d => <DivisionCard key={d.name} div={d} />)}
              </div>
            ))
          ) : (
            [['AL', 'American League'], ['NL', 'National League']].map(([lg, title]) => (
              <div key={lg} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <WildCardCard lg={lg} title={title} />
              </div>
            ))
          )}
        </div>
        )}
      </div>
      <window.NavDrawer open={navOpen} onClose={() => setNavOpen(false)} active="standings" />
    </div>
  );
};
