/* global React */
// ============================================================
// GAME — REVIEW (finals)  ·  F-007
// One play head; the whole game-v2 screen reflects it.
//   • PLAY    = playing — pitches auto-advance on the feed's timing.
//   • REVIEW  = paused   — head frozen; analyze.
// One Play/Pause control toggles the two. A final opens in REVIEW, paused,
// head at the START of the game. "Click a feed PA", "click a scorebook cell",
// and "expand an AB" are the SAME action: seek the one head to that AB's end.
// The head is a past/future boundary on BOTH the feed and the scorebook row.
//
// Built on the REAL game-v2 layout — line-score band, MatchupLeft + Matchup
// context (left), pitch feed (right), On-the-mound, win-prob + leverage — so
// Review is shown in context. The control docks into the gap under the
// feed (right column), keeping them above the fold.
//
// Reuses game-v2's WinProbTimeline + LeverageCard verbatim (window exports).
// ============================================================

const { T, TEAMS, Card, Eyebrow, Pill, StrikeZone, ScorebookCell, Headshot, TeamDot, Bases, Pips, OrderSpot } = window;

function pitchColorS(type) {
  return {
    'Four-Seam': '#dc2626', 'Sinker': '#ea580c', 'Slider': '#0891b2',
    'Curveball': '#3b82f6', 'Changeup': '#16a34a', 'Cutter': '#a3a3a3',
  }[type] || T.textMuted;
}
const OC_COLOR = { ball: T.accent, strike: T.ink, foul: T.highlight, inplay: T.positive, hbp: T.info };
const PITCH_FULL_NAME = { 'Four-Seam': 'Four-Seam Fastball', 'Sinker': 'Sinker' };
const pitchFullName = t => PITCH_FULL_NAME[t] || t;

// ---- batters ----
const BATTERS = {
  // CHC (home)
  happ:    { name: 'Ian Happ',            last: 'Happ',    mlb: 664023, pos: 'LF', bats: 'S', slash: '.243 / .341 / .448', team: 'CHC', order: 1 },
  suzuki:  { name: 'Seiya Suzuki',        last: 'Suzuki',  mlb: 673548, pos: 'RF', bats: 'R', slash: '.283 / .355 / .529', team: 'CHC', order: 2 },
  bregman: { name: 'Alex Bregman',        last: 'Bregman', mlb: 608324, pos: '3B', bats: 'R', slash: '.250 / .338 / .346', team: 'CHC', order: 3 },
  busch:   { name: 'Michael Busch',       last: 'Busch',   mlb: 683737, pos: '1B', bats: 'L', slash: '.270 / .350 / .490', team: 'CHC', order: 4 },
  pca:     { name: 'Pete Crow-Armstrong', last: 'Crow-Armstrong', mlb: 691718, pos: 'CF', bats: 'L', slash: '.262 / .305 / .468', team: 'CHC', order: 5 },
  swanson: { name: 'Dansby Swanson',      last: 'Swanson', mlb: 621020, pos: 'SS', bats: 'R', slash: '.244 / .318 / .415', team: 'CHC', order: 6 },
  hoerner: { name: 'Nico Hoerner',        last: 'Hoerner', mlb: 663538, pos: '2B', bats: 'R', slash: '.281 / .335 / .378', team: 'CHC', order: 7 },
  kelly:   { name: 'Carson Kelly',        last: 'Kelly',   mlb: 608348, pos: 'C',  bats: 'R', slash: '.235 / .315 / .402', team: 'CHC', order: 8 },
  // HOU (away)
  altuve:  { name: 'Jose Altuve',         last: 'Altuve',  mlb: 514888, pos: '2B', bats: 'R', slash: '.295 / .355 / .480', team: 'HOU', order: 1 },
  pena:    { name: 'Jeremy Peña',         last: 'Peña',    mlb: 665161, pos: 'SS', bats: 'R', slash: '.270 / .320 / .435', team: 'HOU', order: 2 },
  alvarez: { name: 'Yordan Álvarez',      last: 'Álvarez', mlb: 670541, pos: 'DH', bats: 'L', slash: '.305 / .405 / .580', team: 'HOU', order: 3 },
  tucker:  { name: 'Kyle Tucker',         last: 'Tucker',  mlb: 663656, pos: 'RF', bats: 'L', slash: '.290 / .390 / .550', team: 'HOU', order: 4 },
  walker:  { name: 'Christian Walker',    last: 'Walker',  mlb: 572233, pos: '1B', bats: 'R', slash: '.250 / .330 / .460', team: 'HOU', order: 5 },
  paredes: { name: 'Isaac Paredes',       last: 'Paredes', mlb: 670623, pos: '3B', bats: 'R', slash: '.255 / .345 / .470', team: 'HOU', order: 6 },
  meyers:  { name: 'Jake Meyers',         last: 'Meyers',  mlb: 676694, pos: 'CF', bats: 'R', slash: '.260 / .320 / .400', team: 'HOU', order: 7 },
  vazquez: { name: 'Christian Vázquez',   last: 'Vázquez', mlb: 543877, pos: 'C',  bats: 'R', slash: '.225 / .270 / .330', team: 'HOU', order: 8 },
  dubon:   { name: 'Mauricio Dubón',      last: 'Dubón',   mlb: 643289, pos: 'LF', bats: 'R', slash: '.275 / .310 / .400', team: 'HOU', order: 9 },
};
// pitcher on the mound for the team in the field
const PITCHERS = {
  HOU: { name: 'Framber Valdez', last: 'Valdez', mlb: 664285, hand: 'LHP', num: 59, today: '6 1/3 IP', todaySub: '5 H · 3 R · 7 K · 2 BB', pitches: '94', strikes: '61 strikes', era: '3.42', whip: '1.12' },
  CHC: { name: 'Shota Imanaga', last: 'Imanaga', mlb: 684007, hand: 'LHP', num: 18, today: '6 IP', todaySub: '7 H · 5 R · 6 K · 1 BB', pitches: '96', strikes: '63 strikes', era: '2.91', whip: '0.98' },
};

const ORD = n => `${n}${['st', 'nd', 'rd'][n - 1] || 'th'}`;
const AUTO = {
  '1B': 'Single', '2B': 'Double', '3B': 'Triple', 'HR': 'Home run', 'BB': 'Walk', 'K': 'Strikeout', 'HBP': 'Hit by pitch',
  'F7': 'Flyout to left', 'F8': 'Flyout to center', 'F9': 'Flyout to right',
  '4-3': 'Groundout', '5-3': 'Groundout to third', '6-3': 'Groundout to short', '3-1': 'Groundout',
};

// ---- the game, chronological. [bid, code, kind, opts] ----
const SCRIPT = [
  { inn: 1, half: 'top', abs: [['altuve', '4-3', 'out'], ['pena', '1B', 'hit', { r: 1, f: 1 }], ['alvarez', 'K', 'out', { t: 'Strikeout swinging' }]] },
  { inn: 1, half: 'bot', abs: [['happ', '1B', 'hit', { r: 1, f: 1 }], ['suzuki', 'F8', 'out'], ['bregman', '1B', 'hit', { r: 1, f: 2, t: 'Single to center' }]] },
  { inn: 2, half: 'top', abs: [['tucker', '2B', 'hit', { r: 2, f: 4, scored: true, t: 'Double to the gap' }], ['paredes', '1B', 'hit', { r: 1, f: 1, runs: 1, sc: 'HOU 1–0', t: 'RBI single to right', sum: 'Paredes RBI single' }], ['meyers', 'F8', 'out']] },
  { inn: 2, half: 'bot', abs: [['busch', '6-3', 'out'], ['pca', '1B', 'hit', { r: 1, f: 1 }], ['swanson', 'K', 'out']] },
  { inn: 3, half: 'top', abs: [['vazquez', 'K', 'out'], ['altuve', '1B', 'hit', { r: 1, f: 1 }], ['pena', 'F7', 'out']] },
  { inn: 3, half: 'bot', abs: [['happ', '6-3', 'out'], ['busch', '2B', 'hit', { r: 2, f: 4, scored: true, t: 'Double to right-center' }], ['hoerner', '1B', 'hit', { r: 1, f: 1, runs: 1, sc: '1–1', t: 'RBI single', sum: 'Hoerner RBI single' }]] },
  { inn: 4, half: 'top', abs: [['alvarez', '2B', 'hit', { r: 2, f: 2, stranded: true, t: 'Double to right' }], ['tucker', 'K', 'out'], ['paredes', '5-3', 'out']] },
  { inn: 4, half: 'bot', abs: [['suzuki', '2B', 'hit', { r: 2, f: 4, scored: true, t: 'Double down the line' }], ['pca', '1B', 'hit', { r: 1, f: 1, runs: 1, sc: 'CHC 2–1', t: 'RBI single', sum: 'Crow-Armstrong RBI single' }], ['busch', '1B', 'hit', { r: 1, f: 1, runs: 1, sc: 'CHC 3–1', t: 'RBI single to center', sum: 'Busch RBI single' }], ['bregman', 'K', 'out', { t: 'Strikeout swinging' }]] },
  { inn: 5, half: 'top', abs: [['altuve', '1B', 'hit', { r: 1, f: 4, scored: true, t: 'Single to left' }], ['alvarez', 'HR', 'hit', { r: 4, f: 4, scored: true, runs: 2, sc: '3–3', t: 'Two-run homer · 419 ft', sum: 'Álvarez 2-run homer' }], ['tucker', 'F9', 'out']] },
  { inn: 5, half: 'bot', abs: [['kelly', 'K', 'out'], ['happ', '4-3', 'out']] },
  { inn: 6, half: 'top', abs: [['paredes', '1B', 'hit', { r: 1, f: 1 }], ['meyers', '6-4-3', 'out', { t: 'Double play' }]] },
  { inn: 6, half: 'bot', abs: [['swanson', '2B', 'hit', { r: 2, f: 4, scored: true, t: 'Double to left' }], ['busch', '1B', 'hit', { r: 1, f: 1, runs: 1, sc: 'CHC 4–3', t: 'RBI single', sum: 'Busch RBI single' }], ['hoerner', 'F8', 'out']] },
  { inn: 7, half: 'top', abs: [['altuve', '2B', 'hit', { r: 2, f: 4, scored: true, t: 'Double to the gap' }], ['pena', '1B', 'hit', { r: 1, f: 1, runs: 1, sc: '4–4', t: 'RBI single', sum: 'Peña RBI single' }], ['alvarez', 'K', 'out']] },
  { inn: 7, half: 'bot', abs: [['suzuki', '2B', 'hit', { r: 2, f: 4, scored: true, t: 'Double to right' }], ['hoerner', '1B', 'hit', { r: 1, f: 1, runs: 1, sc: 'CHC 5–4', t: 'RBI single', sum: 'Hoerner RBI single' }], ['pca', 'K', 'out']] },
  { inn: 8, half: 'top', abs: [['meyers', '1B', 'hit', { r: 1, f: 4, scored: true, t: 'Single to left' }], ['tucker', 'BB', 'walk', { r: 1, f: 4, scored: true }], ['walker', '1B', 'hit', { r: 1, f: 4, scored: true, t: 'Single, bases loaded' }], ['paredes', 'HR', 'hit', { r: 4, f: 4, scored: true, runs: 4, sc: 'HOU 8–5', t: 'Grand slam to LF · 425 ft', sum: 'Paredes grand slam' }], ['dubon', 'F8', 'out']] },
  { inn: 8, half: 'bot', abs: [['swanson', '5-3', 'out'], ['pca', 'F9', 'out']] },
  { inn: 9, half: 'top', abs: [['dubon', 'K', 'out', { t: 'Strikeout looking' }], ['vazquez', '6-3', 'out'], ['meyers', 'F8', 'out']] },
  { inn: 9, half: 'bot', abs: [['suzuki', 'HBP', 'hbp', { r: 1, f: 1 }], ['happ', 'K', 'out', { t: 'Strikeout swinging' }], ['busch', '1B', 'hit', { r: 1, f: 1, t: 'Single to right' }], ['bregman', '6-3', 'out', { t: 'Game-ending groundout' }]] },
];

const GAME = [];
SCRIPT.forEach(g => g.abs.forEach(([bid, code, kind, opts = {}]) => {
  GAME.push({
    inn: g.inn, half: g.half,
    inning: `${g.half === 'top' ? 'TOP' : 'BOT'} ${g.inn}`,
    team: BATTERS[bid].team, bid,
    sb: {
      inn: ORD(g.inn), code, kind,
      reachedOnPA: opts.r, finalBase: opts.f, outAt: opts.out,
      scored: opts.scored, stranded: opts.stranded,
      reached: kind === 'out' ? 0 : undefined,
    },
    result: opts.t || AUTO[code] || code,
    runs: opts.runs || 0, scoreAfter: opts.sc, sum: opts.sum,
  });
}));

// ---- procedural pitch sequences (deterministic per AB) ----
function lcg(seed) { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function genPitches(ab, seed) {
  const rng = lcg(((seed + 1) * 2654435761) >>> 0);
  const types = ['Four-Seam', 'Slider', 'Sinker', 'Changeup', 'Curveball', 'Cutter'];
  const baseMph = { 'Four-Seam': 96.5, 'Slider': 86, 'Sinker': 93.8, 'Changeup': 88, 'Curveball': 80, 'Cutter': 90.5 };
  const coord = oc => {
    if (oc === 'ball') {
      if (rng() < 0.5) return [rng() < 0.5 ? 12 + rng() * 9 : 80 + rng() * 9, 24 + rng() * 40];
      return [34 + rng() * 32, rng() < 0.5 ? 72 + rng() * 12 : 4 + rng() * 8];
    }
    if (oc === 'hbp') return [rng() < 0.5 ? 4 + rng() * 8 : 88 + rng() * 8, 40 + rng() * 34];
    return [34 + rng() * 32, 20 + rng() * 38];
  };
  let balls = 0, strikes = 0; const out = [];
  const add = (oc, result) => {
    const type = types[Math.floor(rng() * types.length)];
    const mph = Math.round((baseMph[type] + (rng() * 2.6 - 0.8)) * 10) / 10;
    const [x, y] = coord(oc);
    out.push({ n: out.length + 1, type, mph, oc, result, x, y, color: OC_COLOR[oc], count: `${balls}-${strikes}` });
  };
  const code = ab.sb.code;
  if (code === 'BB') {
    let guard = 0;
    while (balls < 4 && guard++ < 9) {
      if (strikes < 2 && rng() < 0.3) { strikes++; add('strike', rng() < 0.5 ? 'Called strike' : 'Swinging strike'); }
      else if (strikes < 2 && rng() < 0.15) { strikes = Math.min(2, strikes + 1); add('foul', 'Foul'); }
      else { balls++; add('ball', balls === 4 ? 'Ball four, walk' : 'Ball'); }
    }
  } else if (code === 'K') {
    let guard = 0;
    while (strikes < 2 && guard++ < 7) {
      const r = rng();
      if (r < 0.38 && balls < 3) { balls++; add('ball', 'Ball'); }
      else if (r < 0.72) { strikes++; add('strike', rng() < 0.5 ? 'Called strike' : 'Swinging strike'); }
      else { strikes = Math.min(2, strikes + 1); add('foul', 'Foul'); }
    }
    strikes = 3; add('strike', ab.result.includes('looking') ? 'Called strike, strikeout' : 'Swinging strike, strikeout');
  } else if (code === 'HBP') {
    const pre = Math.floor(rng() * 3);
    let guard = 0;
    for (let i = 0; i < pre && guard++ < 5; i++) {
      const r = rng();
      if (r < 0.5 && balls < 3) { balls++; add('ball', 'Ball'); }
      else if (strikes < 2) { strikes++; add('strike', rng() < 0.5 ? 'Called strike' : 'Swinging strike'); }
      else { add('foul', 'Foul'); }
    }
    add('hbp', 'Hit by pitch');
  } else {
    const pre = 1 + Math.floor(rng() * 3);
    let guard = 0;
    for (let i = 0; i < pre && guard++ < 6; i++) {
      const r = rng();
      if (r < 0.4 && balls < 3) { balls++; add('ball', 'Ball'); }
      else if (r < 0.7 && strikes < 2) { strikes++; add('strike', rng() < 0.5 ? 'Called strike' : 'Swinging strike'); }
      else { strikes = Math.min(2, strikes + 1); add('foul', 'Foul'); }
    }
    add('inplay', ab.result);
  }
  out[out.length - 1].last = true;
  return out;
}

// ---- flatten to moments (one per pitch) ----
GAME.forEach((ab, ai) => { ab.idx = ai; ab.pitches = genPitches(ab, ai); });
const MOMENTS = [];
GAME.forEach(ab => {
  ab.first = MOMENTS.length;
  ab.pitches.forEach((p, pj) => MOMENTS.push({ ab, pj, pitch: p, lastOfAB: pj === ab.pitches.length - 1 }));
  ab.last = MOMENTS.length - 1;
});
const N = MOMENTS.length;
const RESULT_COLOR = sb => (sb.kind === 'walk' || sb.kind === 'hbp') ? T.info : sb.kind === 'hit' ? (sb.code === 'HR' ? T.accent : T.positive) : T.textFaint;

function abStatus(ab, H) {
  if (H > ab.last) return 'played';
  if (H >= ab.first) return 'current';
  return 'future';
}
function ordinal(n) { const s = ['th','st','nd','rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
const INNING_LABEL_SHORT = o => `${o.key.endsWith('top') ? '▲' : '▼'}${o.key.split('-')[0]}`;
const INNING_OPTIONS = (() => {
  const seen = new Set();
  const opts = [];
  GAME.forEach(ab => {
    const key = `${ab.inn}-${ab.half}`;
    if (seen.has(key)) return;
    seen.add(key);
    opts.push({ key, head: ab.first, label: `${ab.half === 'top' ? 'Top' : 'Bottom'} ${ordinal(ab.inn)}` });
  });
  return opts;
})();
const through = H => ab => ab.last <= H;

// ---- derived game state at the head ----
function teamRuns(team, H) { return GAME.filter(a => a.team === team && a.last <= H).reduce((s, a) => s + a.runs, 0); }
function teamHits(team, H) { return GAME.filter(a => a.team === team && a.sb.kind === 'hit' && a.last <= H).length; }

// batter's completed line through the head (AB count, hits, rbi)
function batterDay(bid, H, excludeCurrent) {
  const abs = GAME.filter(a => a.bid === bid && a.last <= H && !(excludeCurrent && a.last === H && a.idx === MOMENTS[H].ab.idx && H < a.last));
  const ab = abs.filter(a => a.sb.kind !== 'walk' && a.sb.kind !== 'hbp').length;
  const hits = abs.filter(a => a.sb.kind === 'hit').length;
  const hr = abs.filter(a => a.sb.code === 'HR').length;
  const rbi = abs.reduce((s, a) => s + a.runs, 0);
  return { ab, hits, hr, rbi };
}

// base state ENTERING the current at-bat (best-effort force/advance model)
function basesAt(H) {
  const cur = MOMENTS[H].ab;
  const order = GAME.filter(a => a.inn === cur.inn && a.half === cur.half);
  const b = [false, false, false]; // 1B, 2B, 3B
  for (const a of order) {
    if (a.idx >= cur.idx) break;
    const r = a.sb.reachedOnPA != null ? a.sb.reachedOnPA : 0;
    if (a.sb.kind === 'out') continue;
    if (r >= 4) { b[0] = b[1] = b[2] = false; continue; }
    if (a.sb.kind === 'walk' || a.sb.kind === 'hbp') {
      if (b[0]) { if (b[1]) { b[2] = true; } b[1] = true; }
      b[0] = true;
    } else if (r === 1) {
      b[2] = b[1]; b[1] = b[0]; b[0] = true;
    } else if (r === 2) {
      b[2] = b[0]; b[1] = true; b[0] = false;
    } else if (r === 3) {
      b[0] = false; b[1] = false; b[2] = true;
    }
  }
  return b;
}
function outsAt(H) {
  const cur = MOMENTS[H].ab;
  return Math.min(3, GAME.filter(a => a.inn === cur.inn && a.half === cur.half && a.sb.kind === 'out' && a.last <= H && a.idx < cur.idx).length);
}

// ============================================================
// Dark band — line score + scoring summary + game leaders (all reflect head)
// ============================================================
function ScoutBand({ H, curAB }) {
  const m = MOMENTS[H];
  const midAB = H < curAB.last;
  const reached = (inn, half) => GAME.some(a => a.inn === inn && a.half === half && a.first <= H);
  const inningRuns = (team, inn, half) => GAME.filter(a => a.team === team && a.inn === inn && a.half === half && a.last <= H).reduce((s, a) => s + a.runs, 0);
  const maxInn = curAB.inn;
  const innings = Array.from({ length: maxInn }, (_, i) => i + 1);

  const cell = (team, half) => inn => {
    const isCur = inn === curAB.inn && half === curAB.half;
    const show = reached(inn, half);
    return (
      <div key={inn} style={{ width: 26, textAlign: 'center', fontFamily: T.mono, fontSize: 13, fontVariantNumeric: 'tabular-nums', color: show ? '#fff' : '#52525b', background: isCur ? 'rgba(184,66,30,0.24)' : 'transparent', padding: '4px 0', borderRadius: 4 }}>{show ? inningRuns(team, inn, half) : '·'}</div>
    );
  };
  const rhe = (v, accent) => <div style={{ width: 30, textAlign: 'center', fontFamily: T.mono, fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: accent ? '#fff' : '#d4d4d8' }}>{v}</div>;
  const Row = ({ team, half, bold }) => (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <div style={{ width: 120, display: 'flex', alignItems: 'center', gap: 9, overflow: 'hidden' }}>
        <TeamDot team={TEAMS[team]} size={22} />
        <span style={{ fontFamily: T.sans, fontSize: 12, fontWeight: bold ? 700 : 600, color: '#fff', whiteSpace: 'nowrap' }}>{TEAMS[team].short}</span>
      </div>
      <div style={{ display: 'flex', gap: 1 }}>{innings.map(cell(team, half))}</div>
      <div style={{ display: 'flex', gap: 2, paddingLeft: 10, marginLeft: 8, borderLeft: '1px solid #3f3f46' }}>
        {rhe(teamRuns(team, H), true)}{rhe(teamHits(team, H))}{rhe(team === 'CHC' ? 1 : 0)}
      </div>
    </div>
  );

  const scoring = GAME.filter(a => a.runs > 0 && a.last <= H).map(a => ({ inn: a.sb.inn, txt: a.sum, score: a.scoreAfter }));
  const recent = scoring.slice(-3).reverse();
  const more = scoring.length - recent.length;

  // leaders — best day per team through head
  const leaderFor = team => {
    const ids = [...new Set(GAME.filter(a => a.team === team && a.last <= H).map(a => a.bid))];
    let best = null;
    ids.forEach(bid => { const d = batterDay(bid, H); if (d.ab + (d.hits > 0 ? 1 : 0) > 0 && (!best || d.hits > best.d.hits || (d.hits === best.d.hits && d.rbi > best.d.rbi))) best = { bid, d }; });
    return best;
  };
  const leaders = ['HOU', 'CHC'].map(leaderFor).filter(Boolean);
  const leaderLine = d => `${d.hits}-${d.ab}${d.hr ? ` · ${d.hr} HR` : ''}${d.rbi ? ` · ${d.rbi} RBI` : ''}`;

  const Head = ({ children }) => <div style={{ fontSize: 9, color: '#71717a', letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 12 }}>{children}</div>;

  return (
    <div style={{ background: T.ink, borderRadius: `${T.r.lg}px ${T.r.lg}px 0 0`, padding: '16px 22px', display: 'grid', gridTemplateColumns: '1fr 180px 460px' }}>
      {/* line score */}
      <div style={{ paddingRight: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ width: 120, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 9, color: '#a1a1aa', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700 }}>{curAB.inning}</span>
          </div>
          <div style={{ display: 'flex', gap: 1 }}>
            {innings.map(i => <div key={i} style={{ width: 26, textAlign: 'center', fontFamily: T.mono, fontSize: 10, color: i === curAB.inn ? T.accent : '#71717a', fontWeight: 700 }}>{i}</div>)}
          </div>
          <div style={{ display: 'flex', gap: 2, paddingLeft: 10, marginLeft: 8, borderLeft: '1px solid #3f3f46' }}>
            {['R', 'H', 'E'].map(x => <div key={x} style={{ width: 30, textAlign: 'center', fontFamily: T.sans, fontSize: 10, color: '#71717a', fontWeight: 700 }}>{x}</div>)}
          </div>
        </div>
        <Row team="HOU" half="top" bold={teamRuns('HOU', H) >= teamRuns('CHC', H)} />
        <div style={{ height: 1, background: '#27272a', margin: '6px 0' }} />
        <Row team="CHC" half="bot" bold={teamRuns('CHC', H) > teamRuns('HOU', H)} />
      </div>

      {/* game leaders */}
      <div style={{ padding: '0 20px', borderLeft: '1px solid #27272a' }}>
        <Head>Game leaders</Head>
        {leaders.length === 0 && <div style={{ fontFamily: T.sans, fontSize: 12, color: '#52525b' }}>—</div>}
        {leaders.map(({ bid, d }) => {
          const b = BATTERS[bid];
          return (
            <div key={bid} style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'center' }}>
              <TeamDot team={TEAMS[b.team]} size={22} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.name}</div>
                <div style={{ fontFamily: T.mono, fontSize: 11, color: '#a1a1aa' }}>{leaderLine(d)}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* last pitch — moved here from the batter-card headline strip, filling the
          dead space that used to sit right of Game leaders. Frees vertical space
          in MatchupLeft so MatchupContext (This matchup / Due up) slides up. */}
      <div style={{ padding: '0 0 0 20px', borderLeft: '1px solid #27272a', display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '150px 70px 190px', columnGap: 14, alignItems: 'center' }}>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 10, color: '#8b8b93', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {midAB ? `Last pitch · #${m.pj + 1} of at-bat` : 'Final pitch'}
            </div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#fff', marginTop: 4, letterSpacing: '-0.01em', lineHeight: 1.25 }}>
              {pitchFullName(m.pitch.type)}
            </div>
          </div>
          <div style={{ textAlign: 'right', borderLeft: '1px solid #3f3f46', borderRight: '1px solid #3f3f46', padding: '0 12px' }}>
            <div style={{ fontFamily: T.mono, fontSize: 30, fontWeight: 800, color: '#fff', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{Math.round(m.pitch.mph)}</div>
            <div style={{ fontSize: 9, color: '#8b8b93', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 3, fontWeight: 700 }}>MPH</div>
          </div>
          <div style={{ textAlign: 'left' }}>
            <span style={{ display: 'inline-block', background: T.bg, color: T.ink, fontWeight: 700, fontSize: 12, padding: '7px 12px', borderRadius: 999, lineHeight: 1.3, maxWidth: '100%' }}>
              {m.pitch.result}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MatchupLeft — the hero: play-state eyebrow + zone + batter card with the
// scorebook row + last-pitch headline. All head-driven.
// ============================================================
function MatchupLeft({ H, m, onSeek }) {
  const curAB = m.ab;
  const b = BATTERS[curAB.bid];
  const team = TEAMS[b.team];
  const day = GAME.filter(a => a.bid === curAB.bid);
  const midAB = H < curAB.last;
  const bases = basesAt(H);
  const outs = outsAt(H);
  const [balls, strikes] = m.pitch.count.split('-').map(Number);

  const d = batterDay(curAB.bid, H, true);
  const upto = midAB ? curAB.pitches.slice(0, m.pj + 1) : curAB.pitches;
  const dots = upto.map(p => ({ x: p.x, y: p.y, label: p.n, color: p.color }));
  const swatches = [['In play', T.positive], ['Ball', T.accent], ['Strike', T.ink], ['Foul', T.highlight]];

  return (
    <Card padless>
      {/* play-state eyebrow */}
      <div style={{ padding: '11px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${T.border}`, background: T.surfaceAlt }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <span style={{ fontFamily: T.mono, fontSize: 14, fontWeight: 700, color: T.text }}>{curAB.half === 'top' ? '▲' : '▼'} {curAB.sb.inn}</span>
          <Bases on={bases} size={26} fill={T.accent} empty={T.borderStrong} strokeWidth={2} />
          <div style={{ display: 'flex', gap: 18, alignItems: 'flex-end' }}>
            {[{ l: 'Balls', count: balls, total: 3, color: T.info }, { l: 'Strikes', count: strikes, total: 2, color: T.text }, { l: 'Outs', count: outs, total: 2, color: T.accent }].map(p => (
              <span key={p.l} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                <span style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: T.textMuted }}>{p.l}</span>
                <Pips count={p.count} total={p.total} size={9} gap={5} color={p.color} emptyColor={T.borderStrong} />
              </span>
            ))}
          </div>
        </div>
        <span style={{ fontFamily: T.sans, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.textMuted }}>{midAB ? `Pitch ${m.pj + 1}` : 'At-bat result'}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 0 }}>
        {/* zone */}
        <div style={{ padding: '12px 16px 14px', borderRight: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 26, padding: '0 4px' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: T.ink }} />
            <span style={{ fontFamily: T.sans, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {curAB.sb.inn} · {midAB ? 'in progress' : curAB.result}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <StrikeZone size={232} dots={dots} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', fontSize: 10, color: T.textMuted, fontFamily: T.sans }}>
              {swatches.map(([n, c]) => <span key={n} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />{n}</span>)}
            </div>
          </div>
        </div>

        {/* batter card */}
        <div style={{ padding: 18, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Eyebrow style={{ fontSize: 9 }}>{midAB ? 'At bat' : 'At the play head'} · {b.team}</Eyebrow>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <Headshot team={team} initials={b.last.slice(0, 2).toUpperCase()} mlbId={b.mlb} size={68} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <OrderSpot n={b.order} />
                <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em' }}>{b.name}</div>
              </div>
              <div style={{ fontFamily: T.mono, fontSize: 11, color: T.textMuted }}>{b.pos} · {b.bats === 'S' ? 'S' : b.bats + '/' + b.bats}</div>
              <div style={{ fontFamily: T.mono, fontSize: 14, fontWeight: 600, color: T.text, marginTop: 4, letterSpacing: '-0.01em' }}>{b.slash}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 6, marginTop: 4 }}>
            <div style={{ padding: '8px 10px', border: `1px solid ${T.border}`, borderRadius: T.r.sm, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontSize: 10, color: T.textMuted, fontFamily: T.sans, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Today · through head</span>
              <span style={{ fontFamily: T.mono, fontSize: 12, color: T.text, fontWeight: 600, whiteSpace: 'nowrap' }}>{d.hits}-for-{d.ab}</span>
            </div>
            {/* scorebook row — past/future boundary, click to seek */}
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 9, color: T.textMuted, fontFamily: T.sans, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>At-bats</span>
                <span style={{ fontSize: 9.5, color: T.textFaint, fontFamily: T.sans, fontWeight: 500, whiteSpace: 'nowrap' }}>tap to seek the head</span>
              </div>
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '3px 5px 6px', margin: '-3px -5px 0', minWidth: 0 }}>
                {day.map((a, i) => {
                  const st = abStatus(a, H);
                  const isCur = st === 'current';
                  return (
                    <button key={i} onClick={() => onSeek(a.last)} title={`${a.sb.inn} · ${a.result}`} style={{ flexShrink: 0, padding: 0, border: 'none', cursor: 'pointer', background: 'transparent', borderRadius: T.r.sm }}>
                      <ScorebookCell width={44} {...a.sb} live={false} state={isCur ? 'active' : 'muted'} />
                    </button>
                  );
                })}
              </div>
              <div style={{ marginTop: 5, fontSize: 9.5, color: T.textFaint, fontFamily: T.sans, display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 18, height: 1, background: T.borderStrong }} /> greyed = not at the play head
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ============================================================
// MatchupContext — This matchup (batter vs pitcher) + Due up. Head-driven.
// ============================================================
function MatchupContext({ H, onSeek }) {
  const curAB = MOMENTS[H].ab;
  const b = BATTERS[curAB.bid];
  const pitchTeam = curAB.team === 'HOU' ? 'CHC' : 'HOU';
  const pit = PITCHERS[pitchTeam];
  const d = batterDay(curAB.bid, H, true);
  const upcoming = GAME.filter(a => a.first > H).slice(0, 2);
  const labels = ['On deck', 'In the hole'];

  return (
    <Card padless>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
        {/* this matchup */}
        <div style={{ padding: '13px 16px 15px', borderRight: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: 11 }}>
          <Eyebrow>This matchup</Eyebrow>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: T.sans, fontSize: 13.5, fontWeight: 700, color: T.text, minWidth: 0 }}>
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.last}</span>
            <span style={{ color: T.textFaint, fontSize: 11, fontWeight: 600 }}>vs</span>
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pit.last}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontFamily: T.sans, fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.textFaint, width: 46, flexShrink: 0 }}>Today</span>
              <span style={{ fontFamily: T.mono, fontSize: 11.5, fontWeight: 600, color: T.text, fontVariantNumeric: 'tabular-nums' }}>{d.hits}-{d.ab}{d.hr ? ' · HR' : ''}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontFamily: T.sans, fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.textFaint, width: 46, flexShrink: 0 }}>Career</span>
              <span style={{ fontFamily: T.mono, fontSize: 11.5, fontWeight: 600, color: T.textMuted, fontVariantNumeric: 'tabular-nums' }}>4-12 <span style={{ color: T.textFaint, fontWeight: 500 }}>· .333</span></span>
            </div>
          </div>
        </div>
        {/* due up */}
        <div style={{ padding: '13px 16px 15px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Eyebrow>Due up · after the head</Eyebrow>
          {upcoming.length === 0 && <div style={{ fontFamily: T.sans, fontSize: 12, color: T.textMuted }}>End of game.</div>}
          {upcoming.map((a, i) => {
            const ub = BATTERS[a.bid];
            return (
              <button key={a.idx} onClick={() => onSeek(a.last)} title={`Seek to ${ub.name}'s ${a.sb.inn} at-bat`} style={{ display: 'flex', flexDirection: 'column', gap: 3, background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}>
                <span style={{ fontFamily: T.sans, fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.textFaint }}>{labels[i]}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                  <OrderSpot n={ub.order} />
                  <span style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 600, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ub.name}</span>
                  <span style={{ fontFamily: T.mono, fontSize: 11, color: T.textFaint, flexShrink: 0 }}>– {ub.pos}</span>
                  <span style={{ marginLeft: 'auto', fontFamily: T.mono, fontSize: 11, color: T.textMuted, flexShrink: 0 }}>{a.sb.inn}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

// ============================================================
// On the mound — head-aware pitcher card
// ============================================================
function MoundCard({ H }) {
  const curAB = MOMENTS[H].ab;
  const pitchTeam = curAB.team === 'HOU' ? 'CHC' : 'HOU';
  const p = PITCHERS[pitchTeam];
  return (
    <Card padless>
      <div style={{ padding: '10px 18px', borderBottom: `1px solid ${T.border}`, background: T.surfaceAlt }}><Eyebrow>On the mound</Eyebrow></div>
      <div style={{ padding: 20, display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 20, alignItems: 'center' }}>
        <Headshot team={TEAMS[pitchTeam]} initials={p.last.slice(0, 2).toUpperCase()} mlbId={p.mlb} size={80} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Eyebrow style={{ fontSize: 9 }}>Pitching · {pitchTeam}</Eyebrow>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em' }}>{p.name}</div>
          <div style={{ fontFamily: T.mono, fontSize: 12, color: T.textMuted }}>{p.hand} · #{p.num}</div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {[{ label: 'Today', value: p.today, sub: p.todaySub }, { label: 'Pitches', value: p.pitches, sub: p.strikes }, { label: 'ERA', value: p.era, sub: 'season' }, { label: 'WHIP', value: p.whip, sub: 'season' }].map(s => (
            <div key={s.label} style={{ padding: '10px 14px', border: `1px solid ${T.border}`, borderRadius: T.r.sm, minWidth: 110, display: 'flex', flexDirection: 'column', gap: 2, background: T.surface }}>
              <span style={{ fontSize: 9, color: T.textMuted, fontFamily: T.sans, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{s.label}</span>
              <span style={{ fontFamily: T.mono, fontSize: 18, fontWeight: 700, color: T.text, letterSpacing: '-0.01em' }}>{s.value}</span>
              <span style={{ fontFamily: T.mono, fontSize: 10, color: T.textFaint }}>{s.sub}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

// ============================================================
// Pitch feed — every AB; head is a past/future boundary; click to seek.
// ============================================================
function ScoutFeed({ H, onSeek, onStep, feedRef, rowRefs, playing, togglePlay, N, speed, setSpeed }) {
  const display = GAME.slice().reverse();
  const m = MOMENTS[H];
  const rootRef = React.useRef(null);
  const cooldown = React.useRef(false);

  // The play head defines the "current" AB — pinned as a canvas in the middle.
  const curAB = display.find(ab => abStatus(ab, H) === 'current');
  const upcoming = display.filter(ab => abStatus(ab, H) === 'future'); // last inning at top → next-up at bottom (adjacent to current)
  const earlier = display.filter(ab => abStatus(ab, H) === 'played');  // newest completed on top (adjacent to current)
  const shownPitches = curAB ? curAB.pitches.slice(0, (H < curAB.last ? m.pj + 1 : curAB.pitches.length)) : [];

  // Scroll-driven play head: the three zones are one chronological filmstrip.
  // Wheeling the feed advances/retreats the expanded (center) at-bat one step —
  // up = back (current collapses up into Upcoming, top-Earlier expands into center),
  // down = forward. The center pitch table scrolls internally until it hits an edge,
  // then the step takes over.
  React.useEffect(() => {
    const el = rootRef.current;
    if (!el || !onStep) return;
    const onWheel = (e) => {
      const down = e.deltaY > 0;
      const pt = feedRef.current;
      if (pt && pt.contains(e.target)) {
        const atTop = pt.scrollTop <= 0;
        const atBot = pt.scrollTop + pt.clientHeight >= pt.scrollHeight - 1;
        if ((!down && !atTop) || (down && !atBot)) return; // let the pitch table scroll first
      }
      e.preventDefault();
      if (cooldown.current || Math.abs(e.deltaY) < 6) return;
      onStep(down ? -1 : 1); // scroll down = content moves down = head steps back
      cooldown.current = true;
      setTimeout(() => { cooldown.current = false; }, 300);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [onStep, feedRef]);
  const curB = curAB ? BATTERS[curAB.bid] : null;

  // Keep the Upcoming region scrolled to the bottom so the NEXT-UP at-bat sits
  // right above the current canvas (later innings scroll up out of view).
  const upcomingRef = React.useRef(null);
  React.useEffect(() => {
    const el = upcomingRef.current;
    if (!el) return;
    const pin = () => { el.scrollTop = el.scrollHeight; };
    pin();
    const r = requestAnimationFrame(pin);
    return () => cancelAnimationFrame(r);
  }, [H, upcoming.length]);

  // Collapsed row for a non-current AB (played or upcoming) — click to seek.
  const CollapsedRow = ({ ab, last }) => {
    const future = abStatus(ab, H) === 'future';
    const b = BATTERS[ab.bid];
    return (
      <div ref={el => { rowRefs.current[ab.idx] = el; }} style={{
        borderBottom: last ? 'none' : `1px solid ${T.border}`,
        background: 'transparent',
        borderLeft: '3px solid transparent',
        opacity: future ? 0.45 : 1,
      }}>
        <div onClick={() => onSeek(ab.last)} style={{ display: 'grid', gridTemplateColumns: '74px 44px 1fr auto', gap: 12, alignItems: 'center', padding: '10px 16px', cursor: 'pointer' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
            <span style={{ fontFamily: T.mono, fontSize: 11, color: T.textMuted, fontWeight: 700, letterSpacing: '0.06em' }}>{ab.inning}</span>
            <TeamDot team={TEAMS[ab.team]} size={22} />
          </div>
          {future ? (
            <ScorebookCell inn="" kind="out" code="" reached={0} width={40} state="muted" />
          ) : (
            <ScorebookCell inn="" {...ab.sb} live={false} width={40} codeIn />
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <OrderSpot n={b.order} />
              <span><span>{b.name}</span> <span style={{ color: T.textMuted, fontWeight: 500 }}>· {ab.result}</span></span>
              {!future && ab.runs > 0 && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '2px 9px', borderRadius: T.r.pill, background: T.positiveSoft, border: `1px solid ${T.positive}33`, whiteSpace: 'nowrap' }}>
                  <span style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, color: T.positive }}>{ab.runs === 1 ? '1 run' : `${ab.runs} runs`}</span>
                  <span style={{ width: 1, height: 11, background: `${T.positive}40` }} />
                  <span style={{ fontFamily: T.mono, fontSize: 11, fontWeight: 600, color: T.text, fontVariantNumeric: 'tabular-nums' }}>{ab.scoreAfter}</span>
                </span>
              )}
            </div>
          </div>
          <span style={{ color: T.textFaint, fontSize: 14, paddingRight: 2 }}>{future ? '·' : '▸'}</span>
        </div>
      </div>
    );
  };

  return (
    <div ref={rootRef} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.r.lg, boxShadow: T.sh.sm, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <div style={{ padding: '8px 16px 10px', display: 'flex', flexDirection: 'column', gap: 6, borderBottom: `1px solid ${T.border}`, flexShrink: 0, minWidth: 0 }}>
        <span style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 700, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {curB ? `${INNING_LABEL_SHORT(INNING_OPTIONS.slice().reverse().find(o => o.head <= H) ?? INNING_OPTIONS[0])} · ${curB.name}` : ''}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
          <select
            value={INNING_OPTIONS.slice().reverse().find(o => o.head <= H)?.head ?? INNING_OPTIONS[0].head}
            onChange={e => onSeek(Number(e.target.value))}
            title="Jump to inning"
            style={{ flexShrink: 0, fontFamily: T.mono, fontSize: 11, fontWeight: 700, color: T.text, background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: T.r.pill, padding: '5px 4px', cursor: 'pointer', width: 46 }}
          >
            {INNING_OPTIONS.map(o => <option key={o.key} value={o.head}>{INNING_LABEL_SHORT(o)}</option>)}
          </select>
          <select
            value={speed}
            onChange={e => setSpeed(Number(e.target.value))}
            title="Playback speed"
            style={{ flexShrink: 0, fontFamily: T.mono, fontSize: 11, fontWeight: 700, color: T.text, background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: T.r.pill, padding: '5px 4px', cursor: 'pointer', width: 44 }}
          >
            {[0.5, 1, 2, 4].map(s => <option key={s} value={s}>{s}×</option>)}
          </select>
          <div style={{ width: 1, height: 20, background: T.border, margin: '0 2px', flexShrink: 0 }} />
          <button onClick={togglePlay} title={playing ? 'Review' : 'Play'} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, height: 28, padding: '0 12px', background: 'transparent', color: playing ? T.accent : T.text, border: `1.5px solid ${playing ? T.accent : T.borderStrong}`, borderRadius: T.r.pill, cursor: 'pointer', flexShrink: 0, fontSize: 11, fontFamily: T.sans, fontWeight: 700 }}><span style={{ fontSize: 10 }}>{playing ? '⏸' : '▶'}</span>{playing ? 'Review' : 'Play'}</button>
          <button onClick={() => onStep(-1)} title="Previous at-bat" style={{ ...stepBtn, width: 26, height: 26, flexShrink: 0, background: 'transparent' }}>⏮</button>
          <button onClick={() => onStep(1)} title="Next at-bat" style={{ ...stepBtn, width: 26, height: 26, flexShrink: 0, background: 'transparent' }}>⏭</button>
          <span style={{ fontFamily: T.mono, fontSize: 10, color: T.textFaint, whiteSpace: 'nowrap', flexShrink: 0 }}>{H + 1}/{N}</span>
        </div>
      </div>

      {/* Upcoming at-bats — anchored at the TOP, own scroll; last inning at top,
          next-up at the bottom (adjacent to current). Scrolled to bottom so the
          next 2 upcoming ABs show; scroll up for later innings. */}
      {upcoming.length > 0 && (
        <div ref={upcomingRef} style={{ flexShrink: 0, maxHeight: 85, overflowY: 'auto', borderBottom: `2px solid ${T.borderStrong}`, background: T.surface }}>
          <div style={{ position: 'sticky', top: 0, zIndex: 1, background: T.surfaceAlt, padding: '7px 16px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.textMuted }}>Upcoming</span>
            <span style={{ fontFamily: T.mono, fontSize: 11, color: T.textFaint }}>{upcoming.length}</span>
          </div>
          {upcoming.map((ab, i) => <CollapsedRow key={ab.idx} ab={ab} last={i === upcoming.length - 1} />)}
        </div>
      )}

      {/* Current-AB canvas — head AB pinned in the middle, pitches scroll below.
          As the head advances / drips pitches, they grow HERE only. */}
      {curAB && (
        <div key={curAB.idx} className="ab-canvas-enter" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: T.surfaceAlt + '55', borderLeft: `3px solid ${T.ink}` }}>
          <div ref={el => { rowRefs.current[curAB.idx] = el; }} className="ab-header-enter" style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: '74px 32px 1fr auto', gap: 12, alignItems: 'center', padding: '12px 16px', background: T.surfaceAlt + 'cc', borderBottom: `1px solid ${T.border}` }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
              <span style={{ fontFamily: T.mono, fontSize: 11, color: T.textMuted, fontWeight: 700, letterSpacing: '0.06em' }}>{curAB.inning}</span>
              <TeamDot team={TEAMS[curAB.team]} size={22} />
            </div>
            <span />{/* play-head circle removed per app polish pass Jul 11 2026 — kept as empty grid cell */}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <OrderSpot n={curB.order} />
                <span><span>{curB.name}</span> <span style={{ color: T.textMuted, fontWeight: 500 }}>· {H < curAB.last ? `at bat · ${m.pitch.count}` : curAB.result}</span></span>
                {curAB.runs > 0 && H >= curAB.last && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '2px 9px', borderRadius: T.r.pill, background: T.positiveSoft, border: `1px solid ${T.positive}33`, whiteSpace: 'nowrap' }}>
                    <span style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, color: T.positive }}>{curAB.runs === 1 ? '1 run' : `${curAB.runs} runs`}</span>
                    <span style={{ width: 1, height: 11, background: `${T.positive}40` }} />
                    <span style={{ fontFamily: T.mono, fontSize: 11, fontWeight: 600, color: T.text, fontVariantNumeric: 'tabular-nums' }}>{curAB.scoreAfter}</span>
                  </span>
                )}
              </div>
            </div>
            <span style={{ fontFamily: T.sans, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.textFaint, fontWeight: 700, paddingRight: 2 }}>At Bat</span>
          </div>
          <div ref={feedRef} style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '6px 16px 14px 74px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>{['#', 'Pitch', 'Velo', 'Result', 'Count'].map(h => (
                  <th key={h} style={{ textAlign: h === 'Pitch' || h === 'Result' || h === '#' ? 'left' : 'right', fontFamily: T.sans, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.textFaint, fontWeight: 700, padding: '3px 8px' }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {shownPitches.map((p, i) => (
                  <tr key={i} style={{ background: H < curAB.last && i === shownPitches.length - 1 ? T.surfaceAlt : 'transparent' }}>
                    <td style={{ fontFamily: T.mono, fontSize: 12, color: T.textFaint, padding: '3px 8px' }}>{p.n}</td>
                    <td style={{ fontFamily: T.sans, fontSize: 12.5, fontWeight: 600, padding: '3px 8px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: pitchColorS(p.type) }} />{p.type}</span>
                    </td>
                    <td style={{ fontFamily: T.mono, fontSize: 12, textAlign: 'right', padding: '3px 8px', fontVariantNumeric: 'tabular-nums' }}>{p.mph.toFixed(1)}</td>
                    <td style={{ fontFamily: T.sans, fontSize: 12.5, padding: '3px 8px', color: p.oc === 'inplay' ? T.positive : T.text, fontWeight: p.oc === 'inplay' ? 600 : 500 }}>{p.result}</td>
                    <td style={{ fontFamily: T.mono, fontSize: 12, textAlign: 'right', padding: '3px 8px', color: T.textMuted, fontVariantNumeric: 'tabular-nums' }}>{p.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Earlier at-bats — anchored at the bottom, own scroll; newest completed on
          top (adjacent to current). The current AB never shifts as pitches drip in. */}
      {earlier.length > 0 && (
        <div style={{ flexShrink: 0, maxHeight: 137, overflowY: 'auto', borderTop: `2px solid ${T.borderStrong}`, background: T.surface }}>
          <div style={{ position: 'sticky', top: 0, zIndex: 1, background: T.surfaceAlt, padding: '7px 16px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.textMuted }}>Earlier at-bats</span>
            <span style={{ fontFamily: T.mono, fontSize: 11, color: T.textFaint }}>{earlier.length}</span>
          </div>
          {earlier.map((ab, i) => <CollapsedRow key={ab.idx} ab={ab} last={i === earlier.length - 1} />)}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Scout controls — the single Play/Pause control, docked under the feed
// (above the fold, filling the right-column gap).
// ============================================================
// ============================================================
// Shell — the real game-v2 layout, head-driven.
// ============================================================
window.GameScoutPrototype = function GameScoutPrototype({ showIntro = true } = {}) {
  const [head, setHead] = React.useState(0);
  const [playing, setPlaying] = React.useState(false);
  const [speed, setSpeed] = React.useState(1);
  const feedRef = React.useRef(null);
  const rowRefs = React.useRef({});

  const m = MOMENTS[head];
  const curAB = m.ab;

  React.useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => { setHead(h => { if (h >= N - 1) { setPlaying(false); return h; } return h + 1; }); }, 750 / speed);
    return () => clearInterval(id);
  }, [playing, speed]);

  const mounted = React.useRef(false);
  React.useEffect(() => {
    // Current AB is pinned at the top; just reset its pitch-canvas scroll to the
    // first pitch whenever the head moves to a new at-bat.
    const run = () => {
      const el = feedRef.current;
      if (!el) return;
      el.scrollTo({ top: 0, behavior: mounted.current ? 'smooth' : 'auto' });
      mounted.current = true;
    };
    const t = setTimeout(run, 60);
    return () => clearTimeout(t);
  }, [curAB.idx]);

  const seek = idx => { setPlaying(false); setHead(Math.max(0, Math.min(N - 1, idx))); };
  const togglePlay = () => { if (!playing && head >= N - 1) setHead(0); setPlaying(p => !p); };
  const stepAB = dir => {
    let pi = curAB.idx + dir;
    pi = Math.max(0, Math.min(GAME.length - 1, pi));
    seek(GAME[pi].last);
  };

  return (
    <div style={{ maxWidth: 1340, margin: '0 auto', fontFamily: T.sans, color: T.text }}>
      {/* intro — prototype-only explainer. In production this space belongs to the
          app's own header (hamburger + contextual return); pass showIntro={false}
          there so Play/Review docks higher, above the fold. */}
      {showIntro && (
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <h1 style={{ margin: 0, fontSize: 25, fontWeight: 800, letterSpacing: '-0.02em' }}>Game review</h1>
          <Pill tone="soft" style={{ fontFamily: T.mono, fontSize: 10 }}>finals only</Pill>
        </div>
        <p style={{ margin: 0, fontSize: 14, color: T.textMuted, lineHeight: 1.5, maxWidth: 900 }}>
          The same game view — one <b style={{ color: T.text }}>play head</b> the whole screen reflects: line score, count, the matchup, the batter card and the feed all read from it.
          <b style={{ color: T.ink }}>Play</b> runs the final forward pitch-by-pitch; <b style={{ color: T.ink }}>Pause</b> freezes it for <b style={{ color: T.ink }}>Review</b>.
          Clicking any <b style={{ color: T.text }}>at-bat in the feed</b> or any <b style={{ color: T.text }}>diamond in the batter card</b> seeks the head there.
          The control docks under the feed.
        </p>
      </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <ScoutBand H={head} curAB={curAB} />
        {/* above-the-fold two-column row */}
        <div style={{ display: 'grid', gridTemplateColumns: '600px 1fr', gap: 16, alignItems: 'stretch' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
            <MatchupLeft H={head} m={m} onSeek={seek} />
            <MatchupContext H={head} onSeek={seek} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minHeight: 0, minWidth: 0 }}>
            <ScoutFeed H={head} onSeek={seek} onStep={stepAB} feedRef={feedRef} rowRefs={rowRefs} playing={playing} togglePlay={togglePlay} N={N} speed={speed} setSpeed={setSpeed} />
          </div>
        </div>

        {/* below the fold — mirrors game-v2 */}
        <MoundCard H={head} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'stretch' }}>
          {window.WinProbTimeline ? <window.WinProbTimeline /> : <div />}
          {window.LeverageCard ? <window.LeverageCard /> : <div />}
        </div>
      </div>
    </div>
  );
};

const stepBtn = {
  width: 38, height: 34, display: 'grid', placeItems: 'center',
  background: T.surface, color: T.text, border: `1px solid ${T.border}`,
  borderRadius: T.r.sm, cursor: 'pointer', fontSize: 13,
};
