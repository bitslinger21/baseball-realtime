/* global React, T, TEAMS, TeamMark, Pips, Bases, Inning, Card, Eyebrow, Pill, LivePill, Segmented, Th, Td, Tr, StrikeZone, AppHeader, btn, iconBtn, Page, PageTitle, Headshot */

// ============================================================
// GAME VIEW v2 — Option A (revised)
// · Sticky left column: zone + batter card (top row), last-pitch headline (bottom)
// · Right column: pitch-by-pitch list with INTERNAL scroll
// · Below the fold: pitcher card + context strip
// · Lineup moved off-page into a drawer (button in header)
// ============================================================

// ---------- Dark band: line score + scoring summary + game leaders ----------

function LineScoreBand() {
  const innings = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const hou = [0, 1, 0, 0, 2, 0, 1, 4, 0];
  const chc = [0, 0, 1, 2, 0, 1, 1, 0, null];
  const cur = 9;

  const cell = (v, isCur) => (
    <div style={{
      width: 28, textAlign: 'center',
      fontFamily: T.mono, fontSize: 14, fontVariantNumeric: 'tabular-nums',
      color: v === null ? '#52525b' : '#fff',
      background: isCur ? 'rgba(184,66,30,0.22)' : 'transparent',
      padding: '5px 0', borderRadius: 4,
    }}>{v === null ? '–' : v}</div>
  );
  const rhe = (v, accent) => (
    <div style={{ width: 34, textAlign: 'center', fontFamily: T.mono, fontSize: 17, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: accent ? '#fff' : '#d4d4d8' }}>{v}</div>
  );
  const Row = ({ team, name, runs, r, h, e, bold }) => (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <div style={{ width: 132, display: 'flex', alignItems: 'center', gap: 9, overflow: 'hidden' }}>
        <TeamDot team={team} size={24} />
        <span style={{ fontFamily: T.sans, fontSize: 14, fontWeight: bold ? 700 : 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{name}</span>
      </div>
      <div style={{ display: 'flex', gap: 1 }}>{runs.map((v, i) => <React.Fragment key={i}>{cell(v, innings[i] === cur)}</React.Fragment>)}</div>
      <div style={{ display: 'flex', gap: 2, paddingLeft: 10, marginLeft: 8, borderLeft: '1px solid #3f3f46' }}>
        {rhe(r, true)}{rhe(h)}{rhe(e)}
      </div>
    </div>
  );

  const ZoneHead = ({ children }) => (
    <div style={{ fontSize: 12, color: '#b0b0b8', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 12 }}>{children}</div>
  );

  // Scoring reconstructed from the line score (HOU 0-1-0-0-2-0-1-4, CHC 0-0-1-2-0-1-1-0).
  // Players are on the team that scored; running score matches the line score. Showing the
  // 3 most recent of 8 total scoring plays.
  const scoring = [
    { inn: '7th', txt: 'Peña RBI single',    score: '4–4' },
    { inn: '7th', txt: 'Hoerner RBI single', score: 'CHC 5–4' },
    { inn: '8th', txt: 'Paredes grand slam',  score: 'HOU 8–5' },
  ];
  const leaders = [
    { team: TEAMS.HOU, name: 'Yordan Álvarez', line: '2-4 · HR · 2 RBI' },
    { team: TEAMS.CHC, name: 'Seiya Suzuki', line: '2-3 · 2B · BB' },
  ];

  return (
    <div style={{ background: T.ink, borderRadius: T.r.lg, padding: '16px 20px', display: 'grid', gridTemplateColumns: '660px 180px 464px' }}>
      {/* Zone 1 — line score */}
      <div style={{ paddingRight: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ width: 132, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 0 3px rgba(239,68,68,0.18)' }} />
            <span style={{ fontSize: 11, color: '#b0b0b8', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700 }}>Live · ▼9th</span>
          </div>
          <div style={{ display: 'flex', gap: 1 }}>
            {innings.map(i => <div key={i} style={{ width: 28, textAlign: 'center', fontFamily: T.mono, fontSize: 14, color: i === cur ? T.accent : '#b0b0b8', fontWeight: 700 }}>{i}</div>)}
          </div>
          <div style={{ display: 'flex', gap: 2, paddingLeft: 10, marginLeft: 8, borderLeft: '1px solid #3f3f46' }}>
            {['R', 'H', 'E'].map(x => <div key={x} style={{ width: 34, textAlign: 'center', fontFamily: T.sans, fontSize: 14, color: '#b0b0b8', fontWeight: 700 }}>{x}</div>)}
          </div>
        </div>
        <Row team={TEAMS.HOU} name={TEAMS.HOU.short} runs={hou} r={8} h={11} e={0} bold />
        <div style={{ height: 1, background: '#27272a', margin: '6px 0' }} />
        <Row team={TEAMS.CHC} name={TEAMS.CHC.short} runs={chc} r={5} h={9} e={1} />
      </div>

      {/* Zone 2 — scoring summary (hidden, per app polish pass Jul 11 2026; un-comment to restore) */}

      {/* Zone 3 — game leaders */}
      <div style={{ padding: '0 20px', borderLeft: '1px solid #27272a' }}>
        <ZoneHead>Game leaders</ZoneHead>
        {leaders.map((g, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'center' }}>
            <TeamDot team={g.team} size={22} />
            <div>
              <div onClick={() => window.openPlayerOverview()} style={{ fontFamily: T.sans, fontSize: 15, fontWeight: 600, color: '#fff', cursor: 'pointer', textDecoration: 'underline dotted', textDecorationColor: '#52525b', textUnderlineOffset: 2, width: 'fit-content' }}>{g.name}</div>
              <div style={{ fontFamily: T.mono, fontSize: 13, color: '#c4c4cc', marginTop: 3 }}>{g.line}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Zone 4 — last pitch. Moved here from MatchupLeft's full-width headline
          strip, filling the dead space that used to sit right of Game leaders.
          Frees vertical space in MatchupLeft so MatchupContext slides up.
          Static mock content mirrors the current live pitch (liveAB.last in
          MatchupLeft) — this band isn't wired to MatchupLeft's rewind state, same
          as the line score above; both are independent mock slices in this file. */}
      <div style={{ padding: '0 0 0 20px', borderLeft: '1px solid #27272a', display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '150px 70px 190px', columnGap: 14, alignItems: 'center' }}>
          <div style={{ textAlign: 'left' }}>
            <ZoneHead>Last pitch · #2 of at-bat</ZoneHead>
            <div style={{ fontFamily: T.sans, fontSize: 17, fontWeight: 800, color: '#fff', marginTop: -8, letterSpacing: '-0.01em', lineHeight: 1.25 }}>Four-Seam Fastball</div>
          </div>
          <div style={{ textAlign: 'right', borderLeft: '1px solid #3f3f46', borderRight: '1px solid #3f3f46', padding: '0 12px' }}>
            <div style={{ fontFamily: T.mono, fontSize: 30, fontWeight: 800, color: '#fff', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>100</div>
            <div style={{ fontSize: 9, color: '#8b8b93', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 3, fontWeight: 700 }}>MPH</div>
          </div>
          <div style={{ textAlign: 'left' }}>
            <span style={{ display: 'inline-block', background: T.bg, color: T.ink, fontWeight: 700, fontSize: 12, padding: '7px 12px', borderRadius: 999, lineHeight: 1.3, maxWidth: '100%' }}>Ball</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Headshot — now a shared atom (window.Headshot) in shared.jsx ----------
// Promoted out of this file so player photos use ONE non-clipping rule everywhere.

// ---------- Lineups popover ----------
// Three sections per team. Lineup never shrinks (it's the in-game history); a
// substitution renders the incoming player INDENTED beneath the player he
// replaced (that original is greyed here and also listed on the Bench). Bench =
// everyone out of the game (reserves + subbed-out players, incl. pulled
// pitchers). Bullpen = relievers still eligible to enter.

const LINEUPS = {
  HOU: {
    team: TEAMS.HOU,
    lineup: [
      { slot: 1, num: 27, name: 'Jose Altuve',       pos: '2B', line: '1-4', seq: '1B · 4-3 · K · 6-3' },
      { slot: 2, num: 3,  name: 'Jeremy Peña',       pos: 'SS', line: '2-4', seq: '2B · 1B · K · F8' },
      { slot: 3, num: 44, name: 'Yordan Álvarez',    pos: 'DH', line: '2-4', seq: 'HR · 2B · K · BB', hot: true },
      { slot: 4, num: 30, name: 'Kyle Tucker',       pos: 'RF', line: '1-3', seq: 'HR · BB · K · 6-3' },
      { slot: 5, num: 8,  name: 'Christian Walker',  pos: '1B', line: '0-3', seq: 'K · K · 4-3',
        subs: [
          { num: 0,  name: 'Bryce Matthews', pos: '1B', line: '0-0', seq: '', inning: '7th' },
          { num: 40, name: 'Reese Albert',   pos: '1B', line: '0-1', seq: 'F8', inning: '8th' },
        ] },
      { slot: 6, num: 6,  name: 'Isaac Paredes',     pos: '3B', line: '1-4', seq: '1B · K · 5-3 · F9' },
      { slot: 7, num: 28, name: 'Jake Meyers',       pos: 'CF', line: '0-3', seq: 'K · 4-3 · K' },
      { slot: 8, num: 9,  name: 'Christian Vázquez', pos: 'C',  line: '0-3', seq: 'BB · K · 6-3 · F7' },
      { slot: 9, num: 14, name: 'Mauricio Dubón',    pos: 'LF', line: '1-3', seq: '1B · K · 4-3' },
      { slot: 'P', num: 59, name: 'Framber Valdez',  pos: 'LHP', stat: '5 2/3 IP · 3 R · 6 K · 2 BB · 1 HBP', isPitcher: true,
        subs: [
          { num: 29, name: 'Nate Pearson', pos: 'RHP', stat: '3 1/3 IP · 0 R · 4 K · 1 BB', inning: '6th', isPitcher: true },
        ] },
    ],
    bench: [
      { num: 8,  name: 'Christian Walker', pos: '1B', out: '7th' },
      { num: 0,  name: 'Bryce Matthews',   pos: '1B', out: '8th' },
      { num: 59, name: 'Framber Valdez',   pos: 'LHP', out: '6th', wasPitcher: true },
      { num: 16, name: 'Cooper Hummel',    pos: 'C' },
      { num: 12, name: 'Shay Whitcomb',    pos: 'INF' },
    ],
    bullpen: [
      { num: 55, name: 'Ryan Pressly', hand: 'RHP', era: '2.95' },
      { num: 53, name: 'Bryan Abreu',  hand: 'RHP', era: '1.90' },
      { num: 46, name: 'Josh Hader',   hand: 'LHP', era: '2.10' },
      { num: 51, name: 'Tayler Scott', hand: 'RHP', era: '3.40' },
    ],
  },
  CHC: {
    team: TEAMS.CHC,
    lineup: [
      { slot: 1, num: 5,  name: 'Ian Happ',            pos: 'LF', line: '1-4', seq: '1B · K · F8 · 6-3' },
      { slot: 2, num: 27, name: 'Seiya Suzuki',        pos: 'RF', line: '2-3', seq: '2B · 1B · K · BB', hot: true },
      { slot: 3, num: 9,  name: 'Alex Bregman',        pos: '3B', line: '1-4', seq: '1B · K · F8 · BB', atBat: true },
      { slot: 4, num: 29, name: 'Michael Busch',       pos: '1B', line: '2-4', seq: '1B · 1B · K · 6-3', onDeck: true },
      { slot: 5, num: 11, name: 'Cam Smith',           pos: 'DH', line: '1-3', seq: '3B · K · 4-3' },
      { slot: 6, num: 4,  name: 'Pete Crow-Armstrong', pos: 'CF', line: '1-4', seq: '2B · K · F8 · 4-3' },
      { slot: 7, num: 7,  name: 'Dansby Swanson',      pos: 'SS', line: '0-3', seq: 'BB · K · 6-3 · F7' },
      { slot: 8, num: 2,  name: 'Nico Hoerner',        pos: '2B', line: '2-4', seq: '1B · 1B · 5-3 · K' },
      { slot: 9, num: 15, name: 'Carson Kelly',        pos: 'C',  line: '0-3', seq: 'K · K · 4-3' },
      { slot: 'P', num: 18, name: 'Shota Imanaga',     pos: 'LHP', stat: '6 IP · 3 R · 7 K · 1 BB', isPitcher: true },
    ],
    bench: [
      { num: 20, name: 'Miguel Amaya',    pos: 'C' },
      { num: 3,  name: 'Jon Berti',       pos: 'INF' },
      { num: 24, name: 'Kevin Alcántara', pos: 'OF' },
      { num: 33, name: 'Vidal Bruján',    pos: 'INF' },
    ],
    bullpen: [
      { num: 37, name: 'Porter Hodge',    hand: 'RHP', era: '2.44' },
      { num: 43, name: 'Drew Pomeranz',   hand: 'LHP', era: '3.10' },
      { num: 52, name: 'Pierce Johnson',  hand: 'RHP', era: '3.80' },
      { num: 32, name: 'Tyson Miller',    hand: 'RHP', era: '2.70' },
      { num: 46, name: 'Caleb Thielbar',  hand: 'LHP', era: '3.55' },
    ],
  },
};

const PlayerName = ({ children, muted, style }) => (
  <span onClick={() => window.openPlayerOverview()} style={{
    fontFamily: T.sans, fontSize: 13, fontWeight: 600,
    color: muted ? T.textMuted : T.text,
    textDecoration: 'underline dotted', textUnderlineOffset: 2, textDecorationColor: T.borderStrong,
    cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
    ...style,
  }}>{children}</span>
);

const JerseyNum = ({ children, color }) => (
  <span style={{ fontFamily: T.mono, fontSize: 11, fontWeight: 700, color: color || T.textFaint, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>#{children}</span>
);

// Batting-order spot (1–9) — a small squared mono chip that reads as the lineup
// position. Deliberately distinct from the jersey number (#27, inline, hatched)
// and the result-icon circle, so the three numbers never read as one thing.
const OrderSpot = ({ n }) => (
  <span title={`Batting ${n}${['st', 'nd', 'rd'][n - 1] || 'th'}`} style={{
    fontFamily: T.mono, fontSize: 11.5, fontWeight: 700,
    color: T.textMuted, fontVariantNumeric: 'tabular-nums', lineHeight: 1,
    width: 17, height: 17, borderRadius: 5, flexShrink: 0,
    border: `1px solid ${T.borderStrong}`, background: T.surfaceAlt,
    display: 'inline-grid', placeItems: 'center',
  }}>{n}</span>
);

function SectionLabel({ children, count }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', gap: 8,
      padding: '12px 16px 7px',
    }}>
      <span style={{ fontFamily: T.sans, fontSize: 11.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.textMuted }}>{children}</span>
      <span style={{ fontFamily: T.mono, fontSize: 11.5, color: T.textFaint }}>{count}</span>
    </div>
  );
}

// Measure rendered text width with the real fonts so the tray can size to
// content (mono stats are deterministic; sans names need real metrics).
function measureText(text, font) {
  const ctx = measureText._ctx || (measureText._ctx = document.createElement('canvas').getContext('2d'));
  ctx.font = font;
  return ctx.measureText(text).width;
}

// Derive the stat-column + overall tray width needed so NOTHING truncates for
// the currently shown team. Recomputes when the team toggles or fonts load.
function useTrayMetrics(d) {
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    let live = true;
    const f = document.fonts;
    if (f && f.load) {
      Promise.all([
        f.load('600 13px "DM Sans"'),
        f.load('500 11px "JetBrains Mono"'),
        f.load('600 11px "JetBrains Mono"'),
      ]).then(() => { if (live) setTick((n) => n + 1); }).catch(() => {});
    }
    return () => { live = false; };
  }, []);
  return React.useMemo(() => {
    const monoStat = '600 11px "JetBrains Mono", ui-monospace, monospace'; // col5 stat/seq
    const sansName = '600 13px "DM Sans", system-ui, sans-serif';          // player name
    const monoPos  = '500 11px "JetBrains Mono", ui-monospace, monospace'; // " – POS"
    let statW = 0, nameW = 0;
    const consider = (pl) => {
      statW = Math.max(statW, measureText(pl.isPitcher ? (pl.stat || '') : (pl.seq || ''), monoStat));
      nameW = Math.max(nameW, measureText(pl.name, sansName) + measureText(' – ' + (pl.pos || ''), monoPos));
    };
    d.lineup.forEach((p) => { consider(p); (p.subs || []).forEach(consider); });
    const statCol = Math.ceil(statW) + 20 /* col5 left pad */ + 6;
    // name slot must also clear the AT BAT pill / "In · 6th" indicators
    const nameNeeded = Math.ceil(nameW) + 7 /* gap */ + 104 /* badge allowance */;
    // subs row is the tighter constraint: cols 68+34+40 + 4 gaps(32) + 16 right pad
    const trayWidth = Math.min(900, Math.max(560, nameNeeded + 68 + 34 + 40 + 32 + 16 + statCol));
    return { statCol, trayWidth };
  }, [d, tick]);
}

function LineupEntry({ p, statCol = 200 }) {
  const subs = p.subs || [];
  const replaced = subs.length > 0; // starter was pulled if any sub exists
  return (
    <div>
      {/* the starter row */}
      <div style={{
        display: 'grid', gridTemplateColumns: `20px 34px 1fr 40px ${statCol}px`, gap: 8, alignItems: 'center',
        padding: '7px 16px',
        borderLeft: p.atBat ? `3px solid ${T.accent}` : '3px solid transparent',
        background: p.atBat ? T.accentSoft + '55' : 'transparent',
        paddingLeft: p.atBat ? 13 : 16,
      }}>
        <span style={{ fontFamily: T.mono, fontSize: 11, fontWeight: 700, color: p.atBat ? T.accent : T.textFaint, fontVariantNumeric: 'tabular-nums', textAlign: 'center' }}>{p.slot}</span>
        <JerseyNum color={p.atBat ? T.accent : undefined}>{p.num}</JerseyNum>
        <span style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
          <PlayerName muted={replaced}>{p.name}</PlayerName>
          <span style={{ fontFamily: T.mono, fontSize: 11, color: T.textFaint, flexShrink: 0 }}>– {p.pos}</span>
          {p.atBat && <Pill tone="live" style={{ fontSize: 8, padding: '1px 6px', letterSpacing: '0.08em' }}>AT BAT</Pill>}
          {p.onDeck && <span style={{ fontFamily: T.sans, fontSize: 8, fontWeight: 700, letterSpacing: '0.08em', color: T.textFaint, textTransform: 'uppercase' }}>On deck</span>}
        </span>
        {p.isPitcher ? (
          <span style={{ gridColumn: 5, fontFamily: T.mono, fontSize: 11, fontWeight: 600, color: replaced ? T.textFaint : T.textMuted, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', textAlign: 'left', paddingLeft: 20 }}>{p.stat}</span>
        ) : (
          <React.Fragment>
            <span style={{ fontFamily: T.mono, fontSize: 11, fontWeight: 700, color: p.hot ? T.accent : (replaced ? T.textFaint : T.text), fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', textAlign: 'right' }}>{p.line}</span>
            <span style={{ fontFamily: T.mono, fontSize: 11, fontWeight: 500, color: T.textFaint, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', textAlign: 'left', paddingLeft: 20 }}>{p.seq}</span>
          </React.Fragment>
        )}
      </div>

      {/* substitutes for this slot — all at ONE indent level, sharing a connector.
          Only the last is currently in the game; earlier subs are greyed (also on Bench). */}
      {replaced && subs.map((s, i) => {
        const active = i === subs.length - 1;
        return (
          <div key={s.num + s.name} style={{
            display: 'grid', gridTemplateColumns: `68px 34px 1fr 40px ${statCol}px`, gap: 8, alignItems: 'center',
            padding: '6px 16px 6px 0',
            position: 'relative',
          }}>
            {/* continuous vertical connector segment (per row, so the line never breaks) */}
            <span style={{ position: 'absolute', left: 50, top: i === 0 ? -6 : 0, bottom: active ? '50%' : 0, width: 1.5, background: T.borderStrong }} />
            {/* horizontal tick reaching toward the jersey/name */}
            <span style={{ position: 'absolute', left: 50, top: '50%', width: 22, height: 1.5, background: T.borderStrong }} />
            <span />
            <JerseyNum color={active ? T.text : T.textFaint}>{s.num}</JerseyNum>
            <span style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
              <PlayerName muted={!active}>{s.name}</PlayerName>
              <span style={{ fontFamily: T.mono, fontSize: 11, color: T.textFaint, flexShrink: 0 }}>– {s.pos}</span>
              {active ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.accent, boxShadow: `0 0 0 3px ${T.accentSoft}` }} />
                  <span style={{ fontFamily: T.sans, fontSize: 8, fontWeight: 700, letterSpacing: '0.06em', color: T.accent, textTransform: 'uppercase' }}>In · {s.inning}</span>
                </span>
              ) : (
                <span style={{ fontFamily: T.sans, fontSize: 8, fontWeight: 700, letterSpacing: '0.06em', color: T.textFaint, textTransform: 'uppercase', flexShrink: 0 }}>In {s.inning}</span>
              )}
            </span>
            {s.isPitcher ? (
              <span style={{ gridColumn: 5, fontFamily: T.mono, fontSize: 11, fontWeight: 600, color: active ? T.textMuted : T.textFaint, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', textAlign: 'left', paddingLeft: 20 }}>{s.stat}</span>
            ) : (
              <React.Fragment>
                <span style={{ fontFamily: T.mono, fontSize: 11, fontWeight: 700, color: active ? T.text : T.textFaint, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', textAlign: 'right' }}>{s.line}</span>
                <span style={{ fontFamily: T.mono, fontSize: 11, fontWeight: 500, color: T.textFaint, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', textAlign: 'left', paddingLeft: 20 }}>{s.seq}</span>
              </React.Fragment>
            )}
          </div>
        );
      })}
    </div>
  );
}

function BenchRow({ p }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 8, alignItems: 'center', padding: '6px 16px' }}>
      <JerseyNum>{p.num}</JerseyNum>
      <span style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
        <PlayerName>{p.name}</PlayerName>
        <span style={{ fontFamily: T.mono, fontSize: 11, color: T.textFaint, flexShrink: 0 }}>– {p.pos}</span>
      </span>
      {p.out ? (
        <span style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: T.textFaint, whiteSpace: 'nowrap' }}>
          Out · {p.out}{p.wasPitcher ? ' · P' : ''}
        </span>
      ) : (
        <span style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: T.textFaint }}>Avail</span>
      )}
    </div>
  );
}

function BullpenRow({ p }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 8, alignItems: 'center', padding: '6px 16px' }}>
      <JerseyNum>{p.num}</JerseyNum>
      <span style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
        <PlayerName>{p.name}</PlayerName>
        <span style={{ fontFamily: T.mono, fontSize: 11, color: T.textFaint, flexShrink: 0 }}>– {p.hand}</span>
      </span>
      <span style={{ fontFamily: T.mono, fontSize: 11, fontWeight: 600, color: T.textMuted, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', textAlign: 'right' }}>
        {p.era} <span style={{ color: T.textFaint, fontSize: 11 }}>ERA</span>
      </span>
    </div>
  );
}

function LineupsTray({ onClose, closing }) {
  const [side, setSide] = React.useState('CHC'); // default to the team at bat
  const d = LINEUPS[side];
  const { statCol, trayWidth } = useTrayMetrics(d);
  return (
    <div style={{
      position: 'absolute', top: 0, right: 0, bottom: 0, zIndex: 50,
      width: trayWidth,
      transition: 'width 0.22s cubic-bezier(0.22,0.61,0.36,1)',
      background: T.surface,
      borderLeft: `1px solid ${T.borderStrong}`,
      boxShadow: '-18px 0 48px -16px rgba(20,16,12,0.28)',
      display: 'flex', flexDirection: 'column',
      animation: closing ? 'lineupTrayOut 0.23s ease forwards' : 'lineupTrayIn 0.24s cubic-bezier(0.22,0.61,0.36,1)',
    }}>
      <style>{`@keyframes lineupTrayIn { from { transform: translateX(100%); } to { transform: translateX(0); } } @keyframes lineupTrayOut { from { transform: translateX(0); } to { transform: translateX(100%); } }`}</style>
      {/* header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px', borderBottom: `1px solid ${T.border}`, background: T.surfaceAlt, flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: T.sans, fontSize: 15, fontWeight: 700, color: T.text }}>Lineups</span>
          <Segmented items={['Astros', 'Cubs']} active={side === 'HOU' ? 0 : 1} size="sm" onClick={(i) => setSide(i === 0 ? 'HOU' : 'CHC')} />
        </div>
        <button onClick={onClose} style={{
          width: 28, height: 28, borderRadius: T.r.sm, border: `1px solid ${T.border}`,
          background: T.surface, color: T.textMuted, cursor: 'pointer', display: 'grid', placeItems: 'center', fontSize: 14,
        }}>✕</button>
      </div>

      {/* scrollable body */}
      <div style={{ overflowY: 'auto', minHeight: 0, flex: 1 }}>
        {/* team strip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '12px 16px', borderBottom: `1px solid ${T.border}` }}>
          <TeamDot team={d.team} size={24} />
          <span style={{ fontFamily: T.sans, fontSize: 14, fontWeight: 700, color: T.text }}>{d.team.name}</span>
          <span style={{ marginLeft: 'auto', fontFamily: T.sans, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: side === 'CHC' ? T.accent : T.textFaint }}>
            {side === 'CHC' ? 'At bat' : 'In field'}
          </span>
        </div>

        <SectionLabel count={d.lineup.length + d.lineup.reduce((n, p) => n + (p.subs ? p.subs.length : 0), 0)}>Lineup</SectionLabel>
        <div style={{ borderBottom: `1px solid ${T.border}`, paddingBottom: 4 }}>
          {d.lineup.map((p) => <LineupEntry key={p.num + p.name} p={p} statCol={statCol} />)}
        </div>

        <SectionLabel count={d.bench.length}>Bench</SectionLabel>
        <div style={{ borderBottom: `1px solid ${T.border}`, paddingBottom: 4 }}>
          {d.bench.map((p) => <BenchRow key={p.num + p.name} p={p} />)}
        </div>

        <SectionLabel count={d.bullpen.length}>Bullpen</SectionLabel>
        <div style={{ paddingBottom: 12 }}>
          {d.bullpen.map((p) => <BullpenRow key={p.num + p.name} p={p} />)}
        </div>
      </div>
    </div>
  );
}

// ---------- Sticky left column: zone + batter card + last-pitch ----------
// (ScorebookCell is a shared atom — window.ScorebookCell in shared.jsx)

function MatchupLeft({ lineupsOpen, onToggleLineups }) {
  // The hero zone can REWIND to any of the current batter's earlier at-bats
  // today. sel === null → the live at-bat; otherwise an index into `day`.
  // (Option A entry point — driven from the batter-card diamond row below.)
  const [sel, setSel] = React.useState(null);

  // Dot colors mirror the 4-way legend: In play / Ball / Strike / Foul.
  const C = { play: T.positive, ball: T.accent, strike: T.ink, foul: T.highlight };

  // Bregman's completed plate appearances today — scorebook fields (for the
  // diamond row) PLUS the pitch plot + final-pitch headline the hero zone shows
  // when that diamond is selected.
  const day = [
    { inn: '1st', code: '1B', kind: 'hit', reachedOnPA: 1, finalBase: 4, scored: true,
      result: 'Single to center',
      dots: [{ x: 50, y: 80, label: 1, color: C.ball }, { x: 61, y: 42, label: 2, color: C.strike }, { x: 53, y: 52, label: 3, color: C.play }],
      last: { type: 'Four-Seam Fastball', mph: 95.7, call: 'SINGLE', tone: 'positive', note: 'lined up the middle' } },
    { inn: '3rd', code: 'K', kind: 'out', reached: 0,
      result: 'Strikeout swinging',
      dots: [{ x: 50, y: 24, label: 1, color: C.strike }, { x: 18, y: 52, label: 2, color: C.ball }, { x: 44, y: 40, label: 3, color: C.foul }, { x: 78, y: 60, label: 4, color: C.strike }],
      last: { type: 'Slider', mph: 86.1, call: 'STRIKEOUT', tone: 'soft', note: 'chased it away' } },
    { inn: '6th', code: 'F8', kind: 'out', reached: 0,
      result: 'Flyout to center',
      dots: [{ x: 50, y: 38, label: 1, color: C.strike }, { x: 58, y: 47, label: 2, color: C.play }],
      last: { type: 'Four-Seam Fastball', mph: 95.0, call: 'FLYOUT', tone: 'soft', note: 'got under it' } },
    { inn: '8th', code: 'BB', kind: 'walk', reachedOnPA: 1, finalBase: 2, stranded: true,
      result: 'Walk',
      dots: [{ x: 79, y: 40, label: 1, color: C.ball }, { x: 50, y: 41, label: 2, color: C.strike }, { x: 50, y: 84, label: 3, color: C.ball }, { x: 20, y: 60, label: 4, color: C.ball }, { x: 82, y: 46, label: 5, color: C.ball }],
      last: { type: 'Slider', mph: 85.5, call: 'WALK', tone: 'info', note: 'just missed away' } },
  ];

  // The live at-bat (in progress) — the default hero view.
  const liveAB = {
    inn: '9th', code: '1-1', live: true,
    dots: [{ x: 48, y: 40, label: 1, color: C.play }, { x: 84, y: 34, label: 2, color: C.ball }],
    last: { type: 'Four-Seam Fastball', mph: 100, call: 'BALL', tone: 'live', note: 'missed away', seq: '#2 of at-bat' },
  };

  const isLive = sel == null;
  const viewing = isLive ? liveAB : day[sel];

  // Pitch-outcome swatches for the zone legend.
  const swatches = [
    { color: C.play,   name: 'In play' },
    { color: C.ball,   name: 'Ball' },
    { color: C.strike, name: 'Strike' },
    { color: C.foul,   name: 'Foul' },
  ];

  return (
    <Card padless>
      {/* Light play-state eyebrow — inning · bases · B/S/O pips · LIVE */}
      <div style={{
        padding: '11px 18px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: `1px solid ${T.border}`,
        background: T.surfaceAlt,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <span style={{ fontFamily: T.mono, fontSize: 14, fontWeight: 700, color: T.text }}>▼ 9th</span>
          <Bases on={[true, true, false]} size={26} fill={T.accent} empty={T.borderStrong} strokeWidth={2} />
          <div style={{ display: 'flex', gap: 18, alignItems: 'flex-end' }}>
            {[
              { l: 'Balls',   count: 1, total: 3, color: T.info },
              { l: 'Strikes', count: 1, total: 2, color: T.text },
              { l: 'Outs',    count: 2, total: 2, color: T.accent },
            ].map(p => (
              <span key={p.l} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                <span style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: T.textMuted }}>{p.l}</span>
                <Pips count={p.count} total={p.total} size={9} gap={5} color={p.color} emptyColor={T.borderStrong} />
              </span>
            ))}
          </div>
        </div>
        <button onClick={onToggleLineups} style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          padding: '6px 12px',
          background: lineupsOpen ? T.ink : T.surface,
          border: `1px solid ${lineupsOpen ? T.ink : T.borderStrong}`,
          borderRadius: T.r.pill,
          cursor: 'pointer',
          fontFamily: T.sans, fontSize: 12, fontWeight: 600, color: lineupsOpen ? '#fff' : T.text,
        }}>
          Lineups
          <span style={{ color: lineupsOpen ? '#d4d4d8' : T.textFaint, fontSize: 11 }}>{lineupsOpen ? '▸' : '▾'}</span>
        </button>
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '280px 1fr',
        gap: 0,
      }}>
        {/* Zone diagram — rewinds to the selected at-bat */}
        <div style={{
          padding: '12px 16px 14px',
          borderRight: `1px solid ${T.border}`,
          display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 12,
        }}>
          {/* Rewind context strip — stable height so the zone never jumps */}
          {isLive ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 30, padding: '0 4px' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: T.accent, boxShadow: `0 0 0 3px ${T.accentSoft}` }} />
              <span style={{ fontFamily: T.sans, fontSize: 11.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.textMuted }}>Live at-bat</span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, height: 30, padding: '0 4px 0 10px', background: T.accentSoft, border: `1px solid ${T.accent}33`, borderRadius: T.r.sm }}>
              <span style={{ minWidth: 0, fontFamily: T.sans, fontSize: 11, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <span style={{ fontFamily: T.mono, color: T.accent, fontWeight: 700, marginRight: 6 }}>{viewing.inn}</span>{viewing.result}
              </span>
              <button onClick={() => setSel(null)} title="Back to the live at-bat" style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 9px', background: T.accent, color: '#fff', border: 'none', borderRadius: T.r.pill, cursor: 'pointer', fontFamily: T.sans, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.04em' }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff' }} />Live
              </button>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <StrikeZone size={232} dots={viewing.dots} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', fontSize: 11.5, color: T.textMuted, fontFamily: T.sans }}>
              {swatches.map(s => (
                <span key={s.name} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
                  {s.name}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Batter card */}
        <div style={{ padding: 18, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Eyebrow style={{ fontSize: 11 }}>At bat · CHC</Eyebrow>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <Headshot team={TEAMS.CHC} initials="AB" mlbId={608324} size={68} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <OrderSpot n={3} />
                <div onClick={() => window.openPlayerOverview()} style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em', cursor: 'pointer', textDecoration: 'underline dotted', textDecorationColor: T.borderStrong, textUnderlineOffset: 3, width: 'fit-content' }}>Alex Bregman</div>
              </div>
              <div style={{ fontFamily: T.mono, fontSize: 11, color: T.textMuted }}>3B · R/R</div>
              <div style={{ fontFamily: T.mono, fontSize: 14, fontWeight: 600, color: T.text, marginTop: 4, letterSpacing: '-0.01em' }}>
                .250 <span style={{ color: T.textFaint }}>/</span> .338 <span style={{ color: T.textFaint }}>/</span> .346
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 6, marginTop: 4 }}>
            <div style={{
              padding: '8px 10px', border: `1px solid ${T.border}`, borderRadius: T.r.sm,
              display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8,
            }}>
              <span style={{ fontSize: 11.5, color: T.textMuted, fontFamily: T.sans, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Today</span>
              <span style={{ fontFamily: T.mono, fontSize: 12, color: T.text, fontWeight: 600, whiteSpace: 'nowrap' }}>
                1-for-4
              </span>
            </div>
            {/* Today's at-bats — tap a diamond to replay it in the zone above */}
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: T.textMuted, fontFamily: T.sans, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>At-bats</span>
                <span style={{ fontSize: 11, color: T.textFaint, fontFamily: T.sans, fontWeight: 500 }}>tap to replay in zone</span>
              </div>
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '3px 5px 6px', margin: '-3px -5px 0', minWidth: 0 }}>
                {day.map((p, i) => {
                  const on = sel === i;
                  return (
                    <button key={i} onClick={() => setSel(i)} title={`${p.inn} \u00b7 ${p.result}`} style={{
                      flexShrink: 0, padding: 0, border: 'none', background: 'transparent', cursor: 'pointer',
                      borderRadius: T.r.sm,
                    }}>
                      <ScorebookCell width={44} {...p} live={false} state={on ? 'active' : 'muted'} />
                    </button>
                  );
                })}
                <button onClick={() => setSel(null)} title="Live at-bat" style={{
                  flexShrink: 0, padding: 0, border: 'none', background: 'transparent', cursor: 'pointer',
                  borderRadius: T.r.sm,
                }}>
                  <ScorebookCell inn="9th" code="1-1" reached={0} live width={44} state={isLive ? 'active' : 'muted'} />
                </button>
              </div>
            </div>
            <div style={{
              padding: '8px 10px', border: `1px solid ${T.border}`, borderRadius: T.r.sm,
              display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8,
            }}>
              <span style={{ fontSize: 11.5, color: T.textMuted, fontFamily: T.sans, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>vs Pearson</span>
              <span style={{ fontFamily: T.mono, fontSize: 12, color: T.text, fontWeight: 600 }}>
                0-for-2 <span style={{ color: T.textFaint }}>· career</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ---------- Below the matchup: head-to-head + due-up (fills the left column) ----------

function MatchupContext() {
  const dueUp = [
    { label: 'On deck',     order: 4, num: 29, name: 'Michael Busch', pos: '1B', line: '2-4' },
    { label: 'In the hole', order: 5, num: 11, name: 'Cam Smith',     pos: 'DH', line: '1-3' },
  ];
  return (
    <Card padless>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
        {/* Head-to-head: batter vs the pitcher currently on the mound */}
        <div style={{ padding: '13px 16px 15px', borderRight: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: 11 }}>
          <Eyebrow>This matchup</Eyebrow>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: T.sans, fontSize: 13.5, fontWeight: 700, color: T.text, minWidth: 0 }}>
            <span onClick={() => window.openPlayerOverview()} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer', textDecoration: 'underline dotted', textDecorationColor: T.borderStrong, textUnderlineOffset: 3 }}>Bregman</span>
            <span style={{ color: T.textFaint, fontSize: 11, fontWeight: 600 }}>vs</span>
            <span onClick={() => window.openPlayerOverview()} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer', textDecoration: 'underline dotted', textDecorationColor: T.borderStrong, textUnderlineOffset: 3 }}>Pearson</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.textFaint, width: 46, flexShrink: 0 }}>Today</span>
              <span style={{ fontFamily: T.mono, fontSize: 11.5, fontWeight: 600, color: T.text, fontVariantNumeric: 'tabular-nums' }}>0-1 <span style={{ color: T.textFaint, fontWeight: 500 }}>· K</span></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.textFaint, width: 46, flexShrink: 0 }}>Career</span>
              <span style={{ fontFamily: T.mono, fontSize: 11.5, fontWeight: 600, color: T.textMuted, fontVariantNumeric: 'tabular-nums' }}>4-12 <span style={{ color: T.textFaint, fontWeight: 500 }}>· .333 · 1 HR</span></span>
            </div>
          </div>
        </div>

        {/* Due up */}
        <div style={{ padding: '13px 16px 15px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Eyebrow>Due up</Eyebrow>
          {dueUp.map((b) => (
            <div key={b.num} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.textFaint }}>{b.label}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                <OrderSpot n={b.order} />
                <JerseyNum>{b.num}</JerseyNum>
                <PlayerName>{b.name}</PlayerName>
                <span style={{ fontFamily: T.mono, fontSize: 11, color: T.textFaint, flexShrink: 0 }}>– {b.pos}</span>
                <span style={{ marginLeft: 'auto', fontFamily: T.mono, fontSize: 11, fontWeight: 600, color: T.textMuted, fontVariantNumeric: 'tabular-nums' }}>{b.line}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

// ---------- Right column: pitch-by-pitch with internal scroll ----------

// Outcome → dot color, matching the hero-zone legend (In play / Ball / Strike / Foul).
const OUTCOME_COLOR = { inplay: T.positive, ball: T.accent, strike: T.ink, foul: T.highlight };
// Terse pitch builder: n, type, mph, zone (1-9 or '\u2014'), x, y (zone-coords 0-100), outcome, result, count.
function pp(n, type, mph, zone, x, y, oc, result, count) {
  return { n, type, mph, zone, x, y, color: OUTCOME_COLOR[oc], oc, result, count };
}

// Per-player day of at-bats, keyed by the feed PA id. Each AB carries scorebook
// fields (for the diamond switcher) PLUS its pitch sequence (for the zone + table).
// `shown` = the AB this feed row represents (the default selection on expand).
const PLAYER_DAYS = {
  paredes: { abs: [
    { inn: '1st', code: '1B', kind: 'hit', reachedOnPA: 1, finalBase: 2, result: 'Single to center, advanced on the throw',
      pitches: [ pp(1,'Sinker',94.1,'\u2014',50,82,'ball','Ball','1-0'), pp(2,'Slider',86.4,6,68,39,'strike','Called strike','1-1'), pp(3,'Four-Seam',96.0,5,50,42,'inplay','In play, single','1-1') ] },
    { inn: '3rd', code: 'K', kind: 'out', reached: 0, result: 'Strikeout swinging',
      pitches: [ pp(1,'Four-Seam',96.2,2,50,21,'strike','Called strike','0-1'), pp(2,'Slider',85.9,'\u2014',16,52,'ball','Ball','1-1'), pp(3,'Changeup',88.0,5,50,39,'strike','Swinging strike','1-2'), pp(4,'Slider',86.1,'\u2014',76,64,'strike','Swinging strike','1-2') ] },
    { inn: '6th', code: '5-3', kind: 'out', reached: 0, result: 'Groundout to third',
      pitches: [ pp(1,'Sinker',93.8,7,32,57,'foul','Foul','0-1'), pp(2,'Cutter',90.2,4,32,39,'inplay','In play, out','0-1') ] },
    { inn: '8th', code: 'HR', kind: 'hit', reachedOnPA: 4, finalBase: 4, scored: true, shown: true, result: 'Grand slam to LF \u00b7 425 ft',
      pitches: [ pp(1,'Four-Seam',99.0,'\u2014',74,66,'ball','Ball','1-0'), pp(2,'Slider',86.5,5,50,39,'strike','Called strike','1-1'), pp(3,'Four-Seam',97.8,2,50,23,'inplay','In play, home run','1-1') ] },
  ] },
  busch: { abs: [
    { inn: '1st', code: 'F8', kind: 'out', reached: 0, result: 'Flyout to center',
      pitches: [ pp(1,'Curveball',79.4,8,50,57,'strike','Called strike','0-1'), pp(2,'Four-Seam',95.1,2,50,24,'inplay','In play, out','0-1') ] },
    { inn: '4th', code: '1B', kind: 'hit', reachedOnPA: 1, finalBase: 1, result: 'Single to right',
      pitches: [ pp(1,'Slider',87.0,'\u2014',74,46,'ball','Ball','1-0'), pp(2,'Four-Seam',96.4,5,50,40,'foul','Foul','1-1'), pp(3,'Sinker',94.0,9,68,57,'inplay','In play, single','1-1') ] },
    { inn: '9th', code: '1B', kind: 'hit', reachedOnPA: 1, finalBase: 1, shown: true, result: 'Single to LF \u00b7 sharp grounder',
      pitches: [ pp(1,'Four-Seam',97.2,1,32,21,'ball','Ball','1-0'), pp(2,'Changeup',88.6,5,50,39,'strike','Swinging strike','1-1'), pp(3,'Slider',86.0,'\u2014',24,58,'ball','Ball','2-1'), pp(4,'Four-Seam',96.8,6,68,40,'inplay','In play, single','2-2') ] },
  ] },
  happ: { abs: [
    { inn: '9th', code: 'K', kind: 'out', reached: 0, shown: true, result: 'Strikeout swinging',
      pitches: [ pp(1,'Four-Seam',97.0,5,50,39,'strike','Swinging strike','0-1'), pp(2,'Slider',86.3,'\u2014',16,50,'ball','Ball','1-1'), pp(3,'Four-Seam',97.5,3,68,21,'strike','Swinging strike','1-2') ] },
  ] },
  suzuki: { abs: [
    { inn: '9th', code: 'BB', kind: 'walk', reachedOnPA: 1, finalBase: 1, shown: true, result: 'Walk',
      pitches: [ pp(1,'Slider',85.0,'\u2014',78,40,'ball','Ball','1-0'), pp(2,'Four-Seam',96.0,5,50,39,'strike','Called strike','1-1'), pp(3,'Sinker',93.5,'\u2014',50,84,'ball','Ball','2-1'), pp(4,'Curveball',80.1,'\u2014',20,62,'ball','Ball','3-1'), pp(5,'Slider',86.2,'\u2014',80,48,'ball','Ball four, walk','3-1') ] },
  ] },
  meyers: { abs: [
    { inn: '9th', code: 'F8', kind: 'out', reached: 0, shown: true, result: 'Flyout to center',
      pitches: [ pp(1,'Four-Seam',95.8,2,50,22,'strike','Called strike','0-1'), pp(2,'Changeup',87.4,5,50,42,'inplay','In play, out','0-1') ] },
  ] },
  vazquez: { abs: [
    { inn: '9th', code: '6-3', kind: 'out', reached: 0, shown: true, result: 'Groundout to short',
      pitches: [ pp(1,'Slider',86.0,'\u2014',18,48,'ball','Ball','1-0'), pp(2,'Four-Seam',96.2,2,50,21,'strike','Called strike','1-1'), pp(3,'Sinker',93.9,4,32,40,'foul','Foul','1-2'), pp(4,'Cutter',90.5,6,68,40,'inplay','In play, out','1-2') ] },
  ] },
  dubon: { abs: [
    { inn: '9th', code: 'K', kind: 'out', reached: 0, shown: true, result: 'Strikeout looking',
      pitches: [ pp(1,'Four-Seam',96.5,2,50,22,'strike','Called strike','0-1'), pp(2,'Slider',86.4,5,50,39,'foul','Foul','0-2'), pp(3,'Curveball',80.0,7,32,56,'strike','Called strike','0-2') ] },
  ] },
  cma: { abs: [
    { inn: '8th', code: 'F9', kind: 'out', reached: 0, shown: true, result: 'Flyout to right',
      pitches: [ pp(1,'Sinker',94.2,8,50,56,'inplay','In play, out','0-0') ] },
  ] },
  swanson: { abs: [
    { inn: '8th', code: '5-3', kind: 'out', reached: 0, shown: true, result: 'Groundout to third',
      pitches: [ pp(1,'Four-Seam',95.5,5,50,39,'strike','Called strike','0-1'), pp(2,'Slider',85.8,7,32,57,'inplay','In play, out','0-1') ] },
  ] },
  tucker: { abs: [
    { inn: '8th', code: 'BB', kind: 'walk', reachedOnPA: 1, finalBase: 1, shown: true, result: 'Walk',
      pitches: [ pp(1,'Four-Seam',96.0,'\u2014',76,40,'ball','Ball','1-0'), pp(2,'Slider',86.0,5,50,39,'strike','Called strike','1-1'), pp(3,'Sinker',93.0,'\u2014',50,84,'ball','Ball','2-1'), pp(4,'Changeup',88.0,'\u2014',20,60,'ball','Ball','3-1'), pp(5,'Four-Seam',97.0,'\u2014',80,44,'ball','Ball four, walk','3-1') ] },
  ] },
  altuve: { abs: [
    { inn: '8th', code: '1B', kind: 'hit', reachedOnPA: 1, finalBase: 1, shown: true, result: 'Single to center',
      pitches: [ pp(1,'Slider',86.5,'\u2014',78,46,'ball','Ball','1-0'), pp(2,'Four-Seam',96.1,5,50,40,'strike','Called strike','1-1'), pp(3,'Sinker',93.7,6,68,42,'inplay','In play, single','1-1') ] },
  ] },
};

// Expanded past at-bat (Option A): this player's day as a diamond AB-switcher,
// then a mini strike zone + per-pitch table for the selected AB. The zone is a
// first-class co-equal of the table, not a thumbnail.
function ABInspector({ day, sel, onSelect }) {
  const ab = day.abs[sel];
  const dots = ab.pitches.map((p) => ({ x: p.x, y: p.y, label: p.n, color: p.color }));
  const multi = day.abs.length > 1;
  return (
    <div style={{ padding: '2px 16px 18px 74px' }}>
      {/* this player's whole day — click a diamond to switch ABs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.textMuted }}>
          {multi ? 'At-bats today \u00b7 pick one' : 'At-bat'}
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          {day.abs.map((a, i) => {
            const on = i === sel;
            return (
              <button key={i} onClick={(e) => { e.stopPropagation(); onSelect(i); }} title={`${a.inn} \u00b7 ${a.result}`} style={{
                padding: 0, border: 'none', background: 'transparent', cursor: 'pointer',
                borderRadius: T.r.sm, outline: on ? `2px solid ${T.accent}` : '2px solid transparent', outlineOffset: 1,
                opacity: on ? 1 : 0.6, transition: 'opacity .12s',
              }}>
                <ScorebookCell width={40} {...a} live={false} />
              </button>
            );
          })}
        </div>
      </div>

      {/* zone (co-equal) + per-pitch table */}
      <div style={{ display: 'grid', gridTemplateColumns: '162px 1fr', gap: 18, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, alignItems: 'center' }}>
          <StrikeZone size={150} dots={dots} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9, justifyContent: 'center', fontSize: 11, color: T.textMuted, fontFamily: T.sans }}>
            {[['In play', T.positive], ['Ball', T.accent], ['Strike', T.ink], ['Foul', T.highlight]].map(([n, c]) => (
              <span key={n} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: c }} />{n}
              </span>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontFamily: T.sans, fontSize: 12.5, fontWeight: 600, color: T.text, marginBottom: 8 }}>
            <span style={{ fontFamily: T.mono, color: T.textMuted, marginRight: 8 }}>{ab.inn}</span>{ab.result}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <Th align="left" style={{ paddingTop: 4, paddingBottom: 4 }}>#</Th>
                <Th align="left" style={{ paddingTop: 4, paddingBottom: 4 }}>Pitch</Th>
                <Th style={{ paddingTop: 4, paddingBottom: 4 }}>Velo</Th>
                <Th style={{ paddingTop: 4, paddingBottom: 4 }}>Zone</Th>
                <Th align="left" style={{ paddingTop: 4, paddingBottom: 4 }}>Result</Th>
                <Th style={{ paddingTop: 4, paddingBottom: 4 }}>Count</Th>
              </tr>
            </thead>
            <tbody>
              {ab.pitches.map((p, i) => (
                <tr key={i}>
                  <Td align="left" dim>{p.n}</Td>
                  <Td align="left" mono={false} style={{ fontWeight: 600 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: pitchColorV2(p.type) }} />
                      {p.type}
                    </span>
                  </Td>
                  <Td>{p.mph.toFixed(1)}</Td>
                  <Td>{p.zone === '\u2014' ? <span style={{ color: T.textFaint }}>{'\u2014'}</span> : <ZoneChipV2 n={p.zone} />}</Td>
                  <Td align="left" mono={false} hot={p.oc === 'inplay'} style={{ fontWeight: p.oc === 'inplay' ? 600 : 500 }}>{p.result}</Td>
                  <Td dim>{p.count}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Derive ScorebookCell props from a feed result code — same scorebook language as the
// batter-card row, so a completed at-bat's badge draws its outcome (base-path + code)
// instead of a flat colored circle. Feed carries the PA result only, so reachedOnPA ==
// finalBase (what he did at the plate); later baserunning isn't in the feed.
function sbFromCode(code) {
  const base = { '1B': 1, '2B': 2, '3B': 3, 'HR': 4 };
  if (code in base) return { code, kind: 'hit', reachedOnPA: base[code], finalBase: base[code], scored: code === 'HR' };
  if (code === 'BB' || code === 'IBB') return { code, kind: 'walk', reachedOnPA: 1, finalBase: 1 };
  if (code === 'HBP') return { code, kind: 'hbp', reachedOnPA: 1, finalBase: 1 };
  return { code, kind: 'out', reached: 0 };   // K, F8, 6-3, 5-3, OUT, …
}

// Inject the shared scorebook-cell field/marker CSS once (scorebook-cell.js sets window.SCOREBOOK_CELL_CSS/HTML).
if (typeof window !== 'undefined' && window.SCOREBOOK_CELL_CSS && !document.getElementById('__scorebook_cell_css')) {
  const st = document.createElement('style');
  st.id = '__scorebook_cell_css';
  // scorebook-cell.js draws with var(--ink)/var(--surface)/etc — Scorebook Page.html defines those
  // itself; here we map them onto the same design tokens so the shared builder renders identically.
  st.textContent = `:root{--bg:${T.bg};--surface:${T.surface};--ink:${T.ink};--accent:${T.accent};--border:${T.border};--borderStrong:${T.borderStrong};--textFaint:${T.textFaint};--textMuted:${T.textMuted}}` + window.SCOREBOOK_CELL_CSS;
  document.head.appendChild(st);
}
function parseInn(s) { return parseInt(s.split(' ')[1], 10); }

// Batting-line stat lines derived from the feed's result code — no separate box-score model.
// AB excludes walks/HBP; R/RBI are approximated from the feed's scored{} (HR credits the batter
// directly; other scoring PAs credit whoever the feed marked as scoring, which today is only HRs).
function paStatFlags(pa) {
  if (pa.live || !pa.icon) return { ab: 0, r: 0, h: 0, rbi: 0, k: 0, bb: 0 };
  const sb = sbFromCode(pa.icon);
  const isWalkOrHbp = sb.kind === 'walk' || sb.kind === 'hbp';
  const isHR = sb.kind === 'hit' && sb.code === 'HR';
  return {
    ab: isWalkOrHbp ? 0 : 1,
    r: isHR ? 1 : 0,
    h: sb.kind === 'hit' ? 1 : 0,
    rbi: pa.scored ? pa.scored.runs : (isHR ? 1 : 0),
    k: sb.code === 'K' ? 1 : 0,
    bb: (sb.kind === 'walk') ? 1 : 0,
  };
}

// Scorecard grid — a thin wrapper around window.buildScorebookGrid, the SAME designed builder
// shared with Scorebook Page.html (scorebook-cell.js). Derives its data from the same PAs feed
// driving pitch-by-pitch; cells fill in up to the live head, anything past it stays blank.
function ScorecardGrid({ pas, team }) {
  const ref = React.useRef(null);
  const teamPAs = pas.filter((p) => p.team === team);
  const oppTeam = team === TEAMS.CHC ? TEAMS.HOU : TEAMS.CHC;
  const oppPAs = pas.filter((p) => p.team === oppTeam);
  const roster = LINEUPS[team.abbr];
  const oppRoster = LINEUPS[oppTeam.abbr];

  // Batting lineup: order / number / name / position / (up to 2 sub slots) come from the real
  // roster (LINEUPS) — the same data source as the Lineups tray. AB/R/H/RBI + per-inning result
  // codes come from the PAs feed (same source as pitch-by-pitch).
  const lineup = Array.from({ length: 9 }, (_, i) => {
    const order = i + 1;
    const entry = roster.lineup.find((e) => e.slot === order) || {};
    const ownPAs = teamPAs.filter((p) => p.order === order);
    const stats = ownPAs.reduce((acc, pa) => {
      const f = paStatFlags(pa);
      return { ab: acc.ab + f.ab, r: acc.r + f.r, h: acc.h + f.h, rbi: acc.rbi + f.rbi };
    }, { ab: 0, r: 0, h: 0, rbi: 0 });
    const cellsByInn = {};
    ownPAs.forEach((pa) => { cellsByInn[parseInn(pa.inning)] = pa.live ? { live: true } : { code: pa.icon }; });
    return {
      order, no: entry.num, name: entry.name, pos: entry.pos,
      avg: stats.ab ? (stats.h / stats.ab).toFixed(3).replace(/^0/, '') : '—',
      subs: (entry.subs || []).map((s) => ({ no: s.num, name: s.name, pos: s.pos })),
      stats, cellsByInn,
    };
  });

  // Pitching chain: the team's own starter + any subs actually used (from LINEUPS), in order.
  // ERA comes from the bullpen list when a reliever's name matches (starters don't carry a season
  // ERA in this mock). Per-inning R/H/K/BB tallies are the OPPONENT's PAs during this team's half.
  const pitcherEntry = roster.lineup.find((e) => e.isPitcher);
  const pitcherChain = pitcherEntry ? [pitcherEntry, ...(pitcherEntry.subs || [])] : [];
  const pitchers = pitcherChain.slice(0, 4).map((p) => {
    const bullpenMatch = roster.bullpen.find((b) => b.name === p.name);
    return {
      no: p.num, name: p.name, era: bullpenMatch ? bullpenMatch.era : '—', hnd: (p.pos || '').slice(0, 2),
      cellsByInn: Array.from({ length: 9 }, (_, i) => i + 1).reduce((acc, inn) => {
        acc[inn] = oppPAs.filter((pa) => parseInn(pa.inning) === inn).reduce((a, pa) => {
          const f = paStatFlags(pa);
          return { r: a.r + f.r, h: a.h + f.h, k: a.k + f.k, bb: a.bb + f.bb };
        }, { r: 0, h: 0, k: 0, bb: 0 });
        return acc;
      }, {}),
    };
  });

  React.useEffect(() => {
    if (ref.current && window.buildScorebookGrid) {
      window.buildScorebookGrid(ref.current, {
        lineup, pitchers,
        teamAbbr: team.abbr, teamName: team.name, logoUrl: window.teamLogoUrl ? window.teamLogoUrl(team) : '',
        opponent: oppTeam.name, gameDate: 'Sun May 24', venue: 'Wrigley Field',
      });
    }
  });

  return <div ref={ref} />;
}

function PitchByPitchV2() {
  const [openId, setOpenId] = React.useState(null);        // which past PA is expanded
  const [selByPlayer, setSelByPlayer] = React.useState({}); // pa.id -> selected AB index
  const [flipped, setFlipped] = React.useState(false);      // scorecard flip reveal
  const [scorecardTeam, setScorecardTeam] = React.useState(null); // which team's card is showing
  const viewRef = React.useRef(null);
  const contentRef = React.useRef(null);
  const xf = React.useRef({ scale: 1, tx: 0, ty: 0 });
  const drag = React.useRef(null);

  const applyXf = () => {
    if (contentRef.current) contentRef.current.style.transform = `translate(${xf.current.tx}px, ${xf.current.ty}px) scale(${xf.current.scale})`;
  };
  const focusCurrent = () => {
    // Coordinates match Scorebook Page.html's own grid math exactly:
    // LEFT_W=[36,36,190,34,26] then 112px per inning, 32px header, 32px per sub-row.
    const LEFT_TOTAL = 36 + 36 + 190 + 34 + 26; // 322
    const INN_W = 112, ROW_H = 96, HEAD_H = 104; // 44 + 30 (wordmark/meta + team bands) + 30 (column header)
    const CUR_INN = parseInn(livePA.inning);
    const CUR_SLOT = livePA.order - 1; // 0-indexed batting slot
    const vw = viewRef.current ? viewRef.current.clientWidth : 600;
    const vh = viewRef.current ? viewRef.current.clientHeight : 400;
    const targetX = LEFT_TOTAL + (CUR_INN - 1) * INN_W;
    const targetY = HEAD_H + CUR_SLOT * ROW_H;
    xf.current.tx = -(targetX * xf.current.scale) + vw * 0.3;
    xf.current.ty = -(targetY * xf.current.scale) + vh * 0.26;
    applyXf();
  };
  const onFlipToBack = () => { setScorecardTeam((t) => t || livePA.team); setFlipped(true); setTimeout(focusCurrent, 60); };
  const zoomAt = (mx, my, scaleMul) => {
    const prev = xf.current.scale;
    xf.current.scale = Math.min(2.5, Math.max(0.5, prev * scaleMul));
    xf.current.tx = mx - (mx - xf.current.tx) * (xf.current.scale / prev);
    xf.current.ty = my - (my - xf.current.ty) * (xf.current.scale / prev);
    applyXf();
  };
  const onWheel = (e) => {
    e.preventDefault();
    const rect = viewRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    // Trackpad pinch is delivered as wheel events with ctrlKey set (Chrome/Safari) —
    // those deltas are tiny per-event, so give pinch a much steeper curve than a mouse wheel.
    const pinch = e.ctrlKey;
    const base = e.deltaY < 0 ? (pinch ? 1.08 : 1.03) : (pinch ? 0.93 : 0.97);
    const power = Math.min(Math.abs(e.deltaY) / (pinch ? 6 : 20), pinch ? 8 : 4);
    zoomAt(mx, my, Math.pow(base, power));
  };
  const pinchRef = React.useRef(null); // { dist, scale }
  const onTouchStart = (e) => {
    if (e.touches.length === 2) {
      const [a, b] = e.touches;
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      pinchRef.current = { dist, scale: xf.current.scale };
      drag.current = null;
    } else if (e.touches.length === 1) {
      drag.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };
  const onTouchMove = (e) => {
    const rect = viewRef.current.getBoundingClientRect();
    if (e.touches.length === 2 && pinchRef.current) {
      e.preventDefault();
      const [a, b] = e.touches;
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const mx = (a.clientX + b.clientX) / 2 - rect.left, my = (a.clientY + b.clientY) / 2 - rect.top;
      const targetScale = pinchRef.current.scale * (dist / pinchRef.current.dist);
      zoomAt(mx, my, targetScale / xf.current.scale);
    } else if (e.touches.length === 1 && drag.current) {
      e.preventDefault();
      const t = e.touches[0];
      xf.current.tx += t.clientX - drag.current.x;
      xf.current.ty += t.clientY - drag.current.y;
      drag.current = { x: t.clientX, y: t.clientY };
      applyXf();
    }
  };
  const onTouchEnd = (e) => { if (e.touches.length < 2) pinchRef.current = null; if (e.touches.length === 0) drag.current = null; };
  const onPointerDown = (e) => { e.preventDefault(); drag.current = { x: e.clientX, y: e.clientY }; e.currentTarget.setPointerCapture(e.pointerId); e.currentTarget.style.cursor = 'grabbing'; };
  const onPointerMove = (e) => {
    if (!drag.current) return;
    xf.current.tx += e.clientX - drag.current.x;
    xf.current.ty += e.clientY - drag.current.y;
    drag.current = { x: e.clientX, y: e.clientY };
    applyXf();
  };
  const onPointerUp = (e) => { drag.current = null; if (e.currentTarget) { e.currentTarget.style.cursor = 'grab'; try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (err) {} } };

  const SCORE_BATTERS = ['Altuve', 'Tucker', 'Alvarez', 'Bregman', 'Peña', 'Singleton', 'Díaz', 'McCormick', 'Meyers'];
  // Newest PA at top. Current PA expanded with pitches in CHRONOLOGICAL order.
  const PAs = [
    {
      id: 'current', order: 3, live: true, inning: 'BOT 9', team: TEAMS.CHC, batter: 'Alex Bregman',
      summary: 'At bat · 1-0',
      pitches: [
        { n: 1, type: 'Changeup',  mph: 93.5, zone: 5, result: 'In play, foul',   tone: 'positive', count: '0-0' },
        { n: 2, type: 'Four-Seam', mph: 100,  zone: 1, result: 'Ball',            tone: 'live',     count: '1-0' },
      ],
    },
    { id: 'busch',   order: 4, inning: 'BOT 9', team: TEAMS.CHC, batter: 'Michael Busch',   summary: 'Single to LF · 2-2',         icon: '1B', color: T.positive },
    { id: 'happ',    order: 1, inning: 'BOT 9', team: TEAMS.CHC, batter: 'Ian Happ',        summary: 'Strikeout swinging · 1-2',   icon: 'K',  color: T.textFaint },
    { id: 'suzuki',  order: 2, inning: 'BOT 9', team: TEAMS.CHC, batter: 'Seiya Suzuki',    summary: 'Walk · 3-1',                 icon: 'BB', color: T.info },
    { id: 'meyers',  order: 7, inning: 'TOP 9', team: TEAMS.HOU, batter: 'Jake Meyers',       summary: 'Flyout to center',           icon: 'F8',  color: T.textFaint },
    { id: 'vazquez', order: 8, inning: 'TOP 9', team: TEAMS.HOU, batter: 'Christian Vázquez', summary: 'Groundout to short · 1-2',    icon: '6-3', color: T.textFaint },
    { id: 'dubon',   order: 9, inning: 'TOP 9', team: TEAMS.HOU, batter: 'Mauricio Dubón',    summary: 'Strikeout looking · 0-2',     icon: 'K',   color: T.textFaint },
    { id: 'cma',     order: 6, inning: 'BOT 8', team: TEAMS.CHC, batter: 'Pete Crow-Armstrong', summary: 'Flyout to right',          icon: 'F9',  color: T.textFaint },
    { id: 'swanson', order: 7, inning: 'BOT 8', team: TEAMS.CHC, batter: 'Dansby Swanson',    summary: 'Groundout to third · 0-1',    icon: '5-3', color: T.textFaint },
    { id: 'paredes', order: 6, inning: 'TOP 8', team: TEAMS.HOU, batter: 'Isaac Paredes',     summary: 'Grand slam to LF · 425 ft',   icon: 'HR',  color: T.accent, scored: { runs: 4, score: 'HOU 8 – 5 CHC' } },
    { id: 'tucker',  order: 4, inning: 'TOP 8', team: TEAMS.HOU, batter: 'Kyle Tucker',       summary: 'Walk · 3-1',                  icon: 'BB',  color: T.info },
    { id: 'altuve',  order: 1, inning: 'TOP 8', team: TEAMS.HOU, batter: 'Jose Altuve',       summary: 'Single to center · 1-1',      icon: '1B',  color: T.positive },
  ];

  const livePA = PAs.find((p) => p.live);
  const pastPAs = PAs.filter((p) => !p.live);

  // Pitch table for the live AB (chronological). Lives in the anchored top canvas.
  const LivePitchTable = () => (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <Th align="left" style={{ paddingLeft: 12, paddingTop: 4, paddingBottom: 4 }}>#</Th>
          <Th align="left" style={{ paddingTop: 4, paddingBottom: 4 }}>Pitch</Th>
          <Th style={{ paddingTop: 4, paddingBottom: 4 }}>Velocity</Th>
          <Th style={{ paddingTop: 4, paddingBottom: 4 }}>Zone</Th>
          <Th align="left" style={{ paddingTop: 4, paddingBottom: 4 }}>Result</Th>
          <Th style={{ paddingTop: 4, paddingBottom: 4 }}>Count</Th>
        </tr>
      </thead>
      <tbody>
        {livePA.pitches.map((p, i) => (
          <tr key={i} style={{ background: p.tone === 'live' ? T.accentSoft : 'transparent' }}>
            <Td align="left" style={{ paddingLeft: 12 }} dim>{p.n}</Td>
            <Td align="left" mono={false} style={{ fontWeight: 600 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: pitchColorV2(p.type) }} />
                {p.type}
              </span>
            </Td>
            <Td>{p.mph.toFixed(1)}</Td>
            <Td><ZoneChipV2 n={p.zone} /></Td>
            <Td align="left" mono={false} hot={p.tone === 'positive' || p.tone === 'live'} style={{ fontWeight: p.tone ? 600 : 500 }}>{p.result}</Td>
            <Td dim>{p.count}</Td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div style={{ perspective: 2000 }}>
    <div style={{
      position: 'relative',
      height: 640,
      transformStyle: 'preserve-3d',
      transition: 'transform 0.7s cubic-bezier(.4,.1,.2,1)',
      transform: flipped ? 'rotateY(180deg)' : 'none',
    }}>
    <div style={{
      position: 'absolute', inset: 0,
      backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
      background: T.surface,
      border: `1px solid ${T.border}`,
      borderRadius: T.r.lg,
      boxShadow: T.sh.sm,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 18px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: `1px solid ${T.border}`,
        background: T.surface,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: T.sans, fontSize: 15, fontWeight: 700 }}>Pitch by pitch</span>
          <span style={{ fontFamily: T.mono, fontSize: 11, color: T.textMuted }}>· 24 at-bats</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Segmented items={['All', 'Runs', 'K', 'HR', 'BB']} active={0} size="sm" />
          <button onClick={onFlipToBack} title="Scorecard view" style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${T.border}`, background: T.surface, display: 'grid', placeItems: 'center', cursor: 'pointer', color: T.text, flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 14 14"><polygon points="7,1 13,7 7,13 1,7" fill="none" stroke="#b8421e" strokeWidth="1.5" /></svg>
          </button>
        </div>
      </div>

      {/* Current AB canvas — batter pinned at top, pitches scroll below.
          The live AB owns the main space; new pitches grow/scroll HERE only. */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: T.accentSoft + '22', borderLeft: `3px solid ${T.accent}` }}>
        <div style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: '74px 46px 1fr auto', gap: 12, alignItems: 'center', padding: '12px 16px', background: T.accentSoft + '66', borderBottom: `1px solid ${T.border}` }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
            <span style={{ fontFamily: T.mono, fontSize: 11.5, color: T.textMuted, fontWeight: 700, letterSpacing: '0.06em' }}>{livePA.inning}</span>
            <TeamDot team={livePA.team} size={22} />
          </div>
          <div style={{ justifySelf: 'center', width: 32, height: 32, borderRadius: '50%', background: T.accent, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700 }}>●</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              {livePA.order && <OrderSpot n={livePA.order} />}
              <span>
                <span onClick={() => window.openPlayerOverview()} style={{ textDecoration: 'underline dotted', textUnderlineOffset: 2, cursor: 'pointer' }}>{livePA.batter}</span>{' '}
                <span style={{ color: T.textMuted, fontWeight: 500 }}>· {livePA.summary}</span>
              </span>
              <Pill tone="live">LIVE</Pill>
            </div>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '8px 16px 14px 74px' }}>
          <LivePitchTable />
        </div>
      </div>

      {/* Earlier at-bats — anchored at the bottom with its own scroll, so new pitches
          arriving in the live AB never shift or crowd the finished at-bats. */}
      <div style={{ flexShrink: 0, maxHeight: 250, overflowY: 'auto', borderTop: `2px solid ${T.borderStrong}`, background: T.surface }}>
        <div style={{ position: 'sticky', top: 0, zIndex: 1, background: T.surfaceAlt, padding: '7px 16px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.textMuted }}>Earlier at-bats</span>
          <span style={{ fontFamily: T.mono, fontSize: 11, color: T.textFaint }}>{pastPAs.length}</span>
        </div>
        {pastPAs.map((pa, paI) => (
          <div key={pa.id} style={{
            borderBottom: paI === pastPAs.length - 1 ? 'none' : `1px solid ${T.border}`,
            background: 'transparent',
            borderLeft: '3px solid transparent',
          }}>
            {/* PA header */}
            <div onClick={() => { if (!pa.live) setOpenId(openId === pa.id ? null : pa.id); }} style={{
              display: 'grid',
              gridTemplateColumns: '74px 46px 1fr auto',
              gap: 12, alignItems: 'center',
              padding: '10px 16px',
              cursor: pa.live ? 'default' : 'pointer',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
                <span style={{ fontFamily: T.mono, fontSize: 11.5, color: T.textMuted, fontWeight: 700, letterSpacing: '0.06em' }}>{pa.inning}</span>
                <TeamDot team={pa.team} size={22} />
              </div>
              {pa.live ? (
                <div style={{ justifySelf: 'center', width: 32, height: 32, borderRadius: '50%', background: T.accent, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700 }}>●</div>
              ) : (
                <ScorebookCell inn="" {...sbFromCode(pa.icon)} width={44} codeIn />
              )}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  {pa.order && <OrderSpot n={pa.order} />}
                  <span>
                    <span onClick={() => window.openPlayerOverview()} style={{ textDecoration: 'underline dotted', textUnderlineOffset: 2, cursor: 'pointer' }}>{pa.batter}</span>{' '}
                    <span style={{ color: T.textMuted, fontWeight: 500 }}>· {pa.summary}</span>
                  </span>
                  {pa.live && <Pill tone="live">LIVE</Pill>}
                  {pa.scored && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '2px 9px', borderRadius: T.r.pill,
                      background: T.positiveSoft, border: `1px solid ${T.positive}33`,
                      whiteSpace: 'nowrap',
                    }}>
                      <span style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, color: T.positive, letterSpacing: '0.02em' }}>
                        {pa.scored.runs === 1 ? '1 run scores' : `${pa.scored.runs} runs score`}
                      </span>
                      <span style={{ width: 1, height: 11, background: `${T.positive}40` }} />
                      <span style={{ fontFamily: T.mono, fontSize: 11, fontWeight: 600, color: T.text, fontVariantNumeric: 'tabular-nums' }}>{pa.scored.score}</span>
                    </span>
                  )}
                </div>
              </div>
              <button onClick={(e) => { e.stopPropagation(); if (!pa.live) setOpenId(openId === pa.id ? null : pa.id); }} style={{ background: 'transparent', border: 'none', color: T.textMuted, fontSize: 14, cursor: 'pointer', padding: 4 }}>
                {pa.live ? '▾' : (openId === pa.id ? '▾' : '▸')}
              </button>
            </div>

            {/* Pitches table — only for the live PA, chronological order */}
            {pa.pitches && (
              <div style={{ padding: '0 16px 14px 74px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <Th align="left" style={{ paddingLeft: 12, paddingTop: 4, paddingBottom: 4 }}>#</Th>
                      <Th align="left" style={{ paddingTop: 4, paddingBottom: 4 }}>Pitch</Th>
                      <Th style={{ paddingTop: 4, paddingBottom: 4 }}>Velocity</Th>
                      <Th style={{ paddingTop: 4, paddingBottom: 4 }}>Zone</Th>
                      <Th align="left" style={{ paddingTop: 4, paddingBottom: 4 }}>Result</Th>
                      <Th style={{ paddingTop: 4, paddingBottom: 4 }}>Count</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {pa.pitches.map((p, i) => (
                      <tr key={i} style={{ background: p.tone === 'live' ? T.accentSoft : 'transparent' }}>
                        <Td align="left" style={{ paddingLeft: 12 }} dim>{p.n}</Td>
                        <Td align="left" mono={false} style={{ fontWeight: 600 }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: pitchColorV2(p.type) }} />
                            {p.type}
                          </span>
                        </Td>
                        <Td>{p.mph.toFixed(1)}</Td>
                        <Td><ZoneChipV2 n={p.zone} /></Td>
                        <Td align="left" mono={false} hot={p.tone === 'positive' || p.tone === 'live'} style={{ fontWeight: p.tone ? 600 : 500 }}>{p.result}</Td>
                        <Td dim>{p.count}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Expanded past AB \u2014 Option A: mini strike zone + per-pitch table,
                with this player's full day as a diamond AB-switcher. */}
            {!pa.live && openId === pa.id && PLAYER_DAYS[pa.id] && (() => {
              const day = PLAYER_DAYS[pa.id];
              const di = day.abs.findIndex((a) => a.shown);
              const def = di < 0 ? day.abs.length - 1 : di;
              const sel = selByPlayer[pa.id] != null ? selByPlayer[pa.id] : def;
              return (
                <ABInspector day={day} sel={sel} onSelect={(i) => setSelByPlayer((s) => ({ ...s, [pa.id]: i }))} />
              );
            })()}
          </div>
        ))}
      </div>
    </div>

    {/* Back face — scorecard flip reveal: pannable/zoomable viewport onto the lineup grid */}
    <div style={{
      position: 'absolute', inset: 0,
      backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
      transform: 'rotateY(180deg)',
      background: T.surface,
      border: `1px solid ${T.border}`,
      borderRadius: T.r.lg,
      boxShadow: T.sh.sm,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '14px 18px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: `1px solid ${T.border}`,
        background: T.surface,
        flexShrink: 0,
      }}>
        <div>
          <span style={{ fontFamily: T.sans, fontSize: 15, fontWeight: 700 }}>Scorecard</span>
          <div style={{ fontFamily: T.mono, fontSize: 10.5, color: T.textFaint, marginTop: 2 }}>Drag to pan · pinch or scroll to zoom</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Segmented items={[TEAMS.HOU.abbr, TEAMS.CHC.abbr]} active={scorecardTeam === TEAMS.CHC ? 1 : 0} size="sm" onClick={(i) => setScorecardTeam(i === 0 ? TEAMS.HOU : TEAMS.CHC)} />
          <button onClick={() => setFlipped(false)} title="Back to pitch by pitch" style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${T.border}`, background: T.surface, display: 'grid', placeItems: 'center', cursor: 'pointer', color: T.text, flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 16 16"><path d="M10 3 L5 8 L10 13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
      </div>
      {/* Game meta — teams, date/start time, venue. Sits under the panel title, above the grid. */}
      <div style={{
        padding: '8px 18px', display: 'flex', alignItems: 'center', gap: 16,
        borderBottom: `1px solid ${T.border}`, background: T.surfaceAlt, flexShrink: 0,
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: T.sans, fontSize: 12.5, fontWeight: 700, color: T.text }}>
          <TeamDot team={TEAMS.HOU} size={18} />Houston Astros @ <TeamDot team={TEAMS.CHC} size={18} />Chicago Cubs
        </span>
        <span style={{ fontFamily: T.mono, fontSize: 11, color: T.textMuted }}>Sun May 24 · 8:05p ET</span>
        <span style={{ fontFamily: T.mono, fontSize: 11, color: T.textMuted }}>Wrigley Field</span>
      </div>
      <div
        ref={viewRef}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden', cursor: 'grab', background: T.bg, touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
      >
        <div ref={contentRef} style={{ position: 'absolute', top: 0, left: 0, transformOrigin: '0 0', willChange: 'transform' }}>
          <ScorecardGrid pas={PAs} team={scorecardTeam || livePA.team} />
        </div>
      </div>
    </div>
    </div>
    </div>
  );
}

function pitchColorV2(type) {
  return {
    'Four-Seam': '#dc2626',
    'Sinker':    '#ea580c',
    'Slider':    '#0891b2',
    'Curveball': '#3b82f6',
    'Changeup':  '#16a34a',
    'Cutter':    '#a3a3a3',
    'Sweeper':   '#7c3aed',
  }[type] || T.textMuted;
}

function ZoneChipV2({ n }) {
  return (
    <div style={{
      display: 'inline-grid', gridTemplateColumns: 'repeat(3, 6px)', gridTemplateRows: 'repeat(3, 6px)',
      gap: 1, padding: 2, border: `1px solid ${T.borderStrong}`, borderRadius: 3,
    }}>
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} style={{ background: i + 1 === n ? T.accent : T.surfaceAlt }} />
      ))}
    </div>
  );
}

// ---------- Below the fold: pitcher card ----------

function PitcherCard() {
  return (
    <Card padless>
      <div style={{
        padding: '10px 18px',
        borderBottom: `1px solid ${T.border}`,
        background: T.surfaceAlt,
      }}>
        <Eyebrow>On the mound</Eyebrow>
      </div>
      <div style={{ padding: 20, display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 20, alignItems: 'center' }}>
        <Headshot team={TEAMS.HOU} initials="NP" mlbId={663554} size={80} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Eyebrow style={{ fontSize: 11 }}>Pitching · HOU</Eyebrow>
          <div onClick={() => window.openPlayerOverview()} style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em', cursor: 'pointer', textDecoration: 'underline dotted', textDecorationColor: T.borderStrong, textUnderlineOffset: 3, width: 'fit-content' }}>Nate Pearson</div>
          <div style={{ fontFamily: T.mono, fontSize: 12, color: T.textMuted }}>RHP · #29</div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {[
            { label: 'Today',   value: '3 1/3 IP', sub: '2 H · 0 R · 4 K · 1 BB' },
            { label: 'Pitches', value: '14',     sub: '10 strikes' },
            { label: 'ERA',     value: '0.00',   sub: 'season' },
            { label: 'WHIP',    value: '0.96',   sub: 'season' },
          ].map(s => (
            <div key={s.label} style={{
              padding: '10px 14px',
              border: `1px solid ${T.border}`,
              borderRadius: T.r.sm,
              minWidth: 110,
              display: 'flex', flexDirection: 'column', gap: 2,
              background: T.surface,
            }}>
              <span style={{ fontSize: 11, color: T.textMuted, fontFamily: T.sans, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{s.label}</span>
              <span style={{ fontFamily: T.mono, fontSize: 18, fontWeight: 700, color: T.text, letterSpacing: '-0.01em' }}>{s.value}</span>
              <span style={{ fontFamily: T.mono, fontSize: 11.5, color: T.textFaint }}>{s.sub}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

// ---------- Win probability timeline (half width) ----------

function WinProbTimeline() {
  // HOU win probability across the game. 100% top = HOU certain; 0% bottom = CHC certain.
  const pts = [
    [0.00, 50], [0.05, 51], [0.11, 48], [0.17, 44], [0.24, 38], [0.31, 41],
    [0.39, 46], [0.47, 62], [0.54, 58], [0.61, 60], [0.69, 65], [0.77, 70],
    [0.84, 88], [0.90, 86], [0.95, 85], [1.00, 84],
  ];
  const W = 620, H = 156;
  const pad = { l: 8, r: 44, t: 20, b: 24 };
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  // X-axis tracks the play head: the domain spans only the innings played so far
  // (the last data point), so a game replayed to the 6th fills the width with 1–6,
  // NOT a fixed 1–9 spread. For a completed final the last point is inning 9.
  const last = pts[pts.length - 1];
  const domainMax = last[0] || 1;
  const X = t => pad.l + (t / domainMax) * iw;
  const Y = p => pad.t + (1 - p / 100) * ih;
  const midY = Y(50);
  const line = pts.map((d, i) => `${i ? 'L' : 'M'}${X(d[0]).toFixed(1)} ${Y(d[1]).toFixed(1)}`).join(' ');
  const area = `${line} L${X(domainMax).toFixed(1)} ${midY.toFixed(1)} L${X(0).toFixed(1)} ${midY.toFixed(1)} Z`;
  // every inning, only through the inning the head has reached
  const innings = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(n => n / 9 <= domainMax + 1e-6);
  // Header always shows the currently-favored team
  const leader = last[1] >= 50
    ? { team: TEAMS.HOU, pct: last[1] }
    : { team: TEAMS.CHC, pct: 100 - last[1] };

  return (
    <Card padless>
      <div style={{
        padding: '14px 18px 10px',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        borderBottom: `1px solid ${T.border}`,
      }}>
        <Eyebrow>Win probability</Eyebrow>
        <div style={{ textAlign: 'right' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontFamily: T.mono, fontSize: 24, fontWeight: 700, color: T.text, letterSpacing: '-0.02em', lineHeight: 1 }}>{leader.pct}%</span>
            <span style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 700, color: leader.team.primary }}>{leader.team.abbr}</span>
          </div>
        </div>
      </div>

      <div style={{ padding: '12px 18px 4px' }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
          <defs>
            <clipPath id="wp-above"><rect x="0" y="0" width={W} height={midY} /></clipPath>
            <clipPath id="wp-below"><rect x="0" y={midY} width={W} height={H - midY} /></clipPath>
          </defs>
          {[100, 50, 0].map(v => (
            <g key={v}>
              <line x1={pad.l} y1={Y(v)} x2={W - pad.r} y2={Y(v)}
                stroke={v === 50 ? T.borderStrong : T.border} strokeWidth="1"
                strokeDasharray={v === 50 ? '4 4' : '0'} />
              {/* both ends read 100% (each anchored team's win prob); 50 = even */}
              <text x={W - pad.r + 7} y={Y(v) + 4} fontFamily={T.mono} fontSize="11" fill={T.textFaint}>{v >= 50 ? v : 100 - v}</text>
            </g>
          ))}
          {/* team anchors on the axis */}
          <text x={W - pad.r + 7} y={11} fontFamily={T.sans} fontSize="10" fontWeight="700" fill={TEAMS.HOU.primary}>HOU</text>
          <text x={W - pad.r + 7} y={H - 3} fontFamily={T.sans} fontSize="10" fontWeight="700" fill={TEAMS.CHC.primary}>CHC</text>
          <path d={area} fill={T.accentSoft} clipPath="url(#wp-above)" />
          <path d={area} fill={T.infoSoft} clipPath="url(#wp-below)" />
          <path d={line} fill="none" stroke={T.ink} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          <circle cx={X(last[0])} cy={Y(last[1])} r="5" fill={T.accent} stroke="#fff" strokeWidth="2" />
          {innings.map(n => (
            <text key={n} x={X(n / 9)} y={H - 5} fontFamily={T.mono} fontSize="10" fill={T.textFaint} textAnchor="middle">{n}</text>
          ))}
        </svg>
      </div>

      {/* How to read */}
      <div style={{ padding: '0 18px 16px', fontSize: 11, color: T.textMuted, lineHeight: 1.5 }}>
        <span style={{ fontWeight: 700, color: T.text }}>How to read:</span> the line shows which team is
        favored to win after each play. It starts even at 50% (a coin-flip) and rises toward{' '}
        <span style={{ color: TEAMS.HOU.primary, fontWeight: 700 }}>HOU</span> (top — 100% HOU) or falls toward{' '}
        <span style={{ color: TEAMS.CHC.primary, fontWeight: 700 }}>CHC</span> (bottom — 100% CHC); the shaded area marks
        the leader.
      </div>
    </Card>
  );
}

// ---------- Leverage (half width) ----------

function LeverageCard() {
  // Leverage scale: 0 → 3.5, marker at current 2.4, avg at 1.0
  const maxLev = 3.5, cur = 2.4, avg = 1.0, peak = 3.1;
  const pct = v => (v / maxLev) * 100;
  return (
    <Card padless>
      <div style={{ padding: '14px 18px 10px', borderBottom: `1px solid ${T.border}` }}>
        <Eyebrow>Leverage index</Eyebrow>
      </div>
      <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontFamily: T.mono, fontSize: 34, fontWeight: 700, color: T.accent, letterSpacing: '-0.02em', lineHeight: 1 }}>2.4×</span>
          <Pill tone="accent">HIGH</Pill>
        </div>
        <div style={{ fontSize: 12, color: T.textMuted, lineHeight: 1.5 }}>
          How much this moment can swing the outcome vs. an average play. Runners on 1st &amp; 2nd, 2 outs, tying run aboard.
        </div>

        {/* Leverage scale */}
        <div style={{ marginTop: 2 }}>
          <div style={{ position: 'relative', height: 8, borderRadius: 4, background: T.surfaceAlt, border: `1px solid ${T.border}` }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct(cur)}%`, background: T.accent, borderRadius: 4, opacity: 0.85 }} />
            {/* avg marker */}
            <div style={{ position: 'absolute', left: `${pct(avg)}%`, top: -3, bottom: -3, width: 2, background: T.ink }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontFamily: T.mono, fontSize: 11.5, color: T.textFaint }}>
            <span>0</span>
            <span style={{ color: T.text }}>avg 1.0</span>
            <span>peak today {peak}</span>
            <span>{maxLev}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ============================================================
// PREGAME STATE — the game view BEFORE first pitch.
// Same skeleton as the live screen, but every section is filled with
// the static info we already know (probables, lineups, leadoff matchup,
// top of the order, season form) instead of a blank "waiting" panel.
// The only literal "waiting" copy is the pitch-by-pitch empty state.
// ============================================================

const PROBABLES = {
  away: { team: TEAMS.HOU, num: 59, name: 'Framber Valdez', hand: 'LHP', mlbId: 664285,
    line: [['Record', '6–3'], ['ERA', '3.42'], ['WHIP', '1.12'], ['K', '78']] },
  home: { team: TEAMS.CHC, num: 18, name: 'Shota Imanaga', hand: 'LHP', mlbId: 684007,
    line: [['Record', '5–2'], ['ERA', '2.91'], ['WHIP', '0.98'], ['K', '71']] },
};

function PregameLineScoreBand() {
  const innings = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const dashCell = () => (
    <div style={{ width: 28, textAlign: 'center', fontFamily: T.mono, fontSize: 16, color: '#52525b', padding: '5px 0' }}>–</div>
  );
  const dashRHE = () => (
    <div style={{ width: 34, textAlign: 'center', fontFamily: T.mono, fontSize: 17, fontWeight: 700, color: '#52525b' }}>–</div>
  );
  const Row = ({ team, name, bold }) => (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <div style={{ width: 132, display: 'flex', alignItems: 'center', gap: 9, overflow: 'hidden' }}>
        <TeamDot team={team} size={24} />
        <span style={{ fontFamily: T.sans, fontSize: 14, fontWeight: bold ? 700 : 600, color: '#fff', whiteSpace: 'nowrap' }}>{name}</span>
      </div>
      <div style={{ display: 'flex', gap: 1 }}>{innings.map(i => <React.Fragment key={i}>{dashCell()}</React.Fragment>)}</div>
      <div style={{ display: 'flex', gap: 2, paddingLeft: 10, marginLeft: 8, borderLeft: '1px solid #3f3f46' }}>
        {dashRHE()}{dashRHE()}{dashRHE()}
      </div>
    </div>
  );
  const ZoneHead = ({ children }) => (
    <div style={{ fontSize: 12, color: '#b0b0b8', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 12 }}>{children}</div>
  );
  const Prob = ({ p, label }) => (
    <div style={{ display: 'flex', gap: 10, marginBottom: 13, alignItems: 'center' }}>
      <TeamDot team={p.team} size={22} />
      <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div onClick={() => window.openPlayerOverview()} style={{ fontFamily: T.sans, fontSize: 15, fontWeight: 600, color: '#fff', cursor: 'pointer', textDecoration: 'underline dotted', textDecorationColor: '#52525b', textUnderlineOffset: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.15 }}>{p.name}</div>
        <div style={{ fontFamily: T.mono, fontSize: 13, color: '#c4c4cc', lineHeight: 1.15, whiteSpace: 'nowrap' }}>{p.hand} · #{p.num} · {label}</div>
      </div>
      <div style={{ flexShrink: 0, fontFamily: T.mono, fontSize: 14, fontWeight: 700, color: '#d4d4d8', fontVariantNumeric: 'tabular-nums' }}>{p.line[1][1]} <span style={{ fontSize: 11, color: '#b0b0b8' }}>ERA</span></div>
    </div>
  );
  const form = [
    { team: TEAMS.HOU, rec: '30–18', l10: '7–3', strk: 'W2' },
    { team: TEAMS.CHC, rec: '27–21', l10: '6–4', strk: 'W1' },
  ];
  return (
    <div style={{ background: T.ink, borderRadius: T.r.lg, padding: '16px 20px', display: 'grid', gridTemplateColumns: '660px 1fr 1fr' }}>
      {/* Zone 1 — empty line score */}
      <div style={{ paddingRight: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ width: 132, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#71717a' }} />
            <span style={{ fontSize: 11, color: '#b0b0b8', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700 }}>Scheduled · 8:05p</span>
          </div>
          <div style={{ display: 'flex', gap: 1 }}>
            {innings.map(i => <div key={i} style={{ width: 28, textAlign: 'center', fontFamily: T.mono, fontSize: 14, color: '#b0b0b8', fontWeight: 700 }}>{i}</div>)}
          </div>
          <div style={{ display: 'flex', gap: 2, paddingLeft: 10, marginLeft: 8, borderLeft: '1px solid #3f3f46' }}>
            {['R', 'H', 'E'].map(x => <div key={x} style={{ width: 34, textAlign: 'center', fontFamily: T.sans, fontSize: 14, color: '#b0b0b8', fontWeight: 700 }}>{x}</div>)}
          </div>
        </div>
        <Row team={TEAMS.HOU} name={TEAMS.HOU.short} bold />
        <div style={{ height: 1, background: '#27272a', margin: '6px 0' }} />
        <Row team={TEAMS.CHC} name={TEAMS.CHC.short} />
      </div>

      {/* Zone 2 — probable pitchers */}
      <div style={{ padding: '0 20px', borderLeft: '1px solid #27272a' }}>
        <ZoneHead>Probable pitchers</ZoneHead>
        <Prob p={PROBABLES.away} label="Away" />
        <Prob p={PROBABLES.home} label="Home" />
      </div>

      {/* Zone 3 — coming in (season form) */}
      <div style={{ padding: '0 0 0 20px', borderLeft: '1px solid #27272a' }}>
        <ZoneHead>Coming in</ZoneHead>
        {form.map((f, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'center' }}>
            <TeamDot team={f.team} size={22} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: T.mono, fontSize: 13, fontWeight: 700, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{f.rec}</div>
              <div style={{ fontFamily: T.sans, fontSize: 11.5, color: '#a1a1aa' }}>L10 <span style={{ fontFamily: T.mono }}>{f.l10}</span> · Streak <span style={{ fontFamily: T.mono, color: f.strk[0] === 'W' ? '#86efac' : '#fca5a5' }}>{f.strk}</span></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PregameMatchupLeft({ lineupsOpen, onToggleLineups }) {
  return (
    <Card padless>
      {/* Play-state eyebrow — top of the 1st, empty bases, fresh count, Lineups */}
      <div style={{
        padding: '11px 18px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: `1px solid ${T.border}`,
        background: T.surfaceAlt,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <span style={{ fontFamily: T.mono, fontSize: 14, fontWeight: 700, color: T.textMuted }}>▲ 1st</span>
          <Bases on={[false, false, false]} size={26} fill={T.accent} empty={T.borderStrong} strokeWidth={2} />
          <div style={{ display: 'flex', gap: 18, alignItems: 'flex-end' }}>
            {[{ l: 'Balls', color: T.info }, { l: 'Strikes', color: T.text }, { l: 'Outs', color: T.accent }].map(p => (
              <span key={p.l} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                <span style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: T.textMuted }}>{p.l}</span>
                <Pips count={0} total={p.l === 'Balls' ? 3 : 2} size={9} gap={5} color={p.color} emptyColor={T.borderStrong} />
              </span>
            ))}
          </div>
        </div>
        <button onClick={onToggleLineups} style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          padding: '6px 12px',
          background: lineupsOpen ? T.ink : T.surface,
          border: `1px solid ${lineupsOpen ? T.ink : T.borderStrong}`,
          borderRadius: T.r.pill, cursor: 'pointer',
          fontFamily: T.sans, fontSize: 12, fontWeight: 600, color: lineupsOpen ? '#fff' : T.text,
        }}>
          Lineups
          <span style={{ color: lineupsOpen ? '#d4d4d8' : T.textFaint, fontSize: 11 }}>{lineupsOpen ? '▸' : '▾'}</span>
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 0 }}>
        {/* Empty zone — awaiting first pitch */}
        <div style={{ padding: '18px 16px 14px', borderRight: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <StrikeZone size={240} dots={[]} />
          <div style={{ fontFamily: T.sans, fontSize: 11, color: T.textMuted, textAlign: 'center' }}>
            Pitches plot here once the game starts
          </div>
        </div>

        {/* Leadoff batter — HOU bats first (top of the 1st) */}
        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Eyebrow style={{ fontSize: 11 }}>Leading off · HOU</Eyebrow>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <Headshot team={TEAMS.HOU} initials="JA" mlbId={514888} size={68} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
              <div onClick={() => window.openPlayerOverview()} style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em', cursor: 'pointer', textDecoration: 'underline dotted', textDecorationColor: T.borderStrong, textUnderlineOffset: 3, width: 'fit-content' }}>Jose Altuve</div>
              <div style={{ fontFamily: T.mono, fontSize: 11, color: T.textMuted }}>2B · R/R · bats 1st</div>
              <div style={{ fontFamily: T.mono, fontSize: 14, fontWeight: 600, color: T.text, marginTop: 4, letterSpacing: '-0.01em' }}>
                .295 <span style={{ color: T.textFaint }}>/</span> .358 <span style={{ color: T.textFaint }}>/</span> .470
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 6, marginTop: 4 }}>
            <div style={{ padding: '8px 10px', border: `1px solid ${T.border}`, borderRadius: T.r.sm, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontSize: 11.5, color: T.textMuted, fontFamily: T.sans, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Last 7</span>
              <span style={{ fontFamily: T.mono, fontSize: 12, color: T.text, fontWeight: 600 }}>.345 <span style={{ color: T.textFaint }}>· 10-for-29</span></span>
            </div>
            <div style={{ padding: '8px 10px', border: `1px solid ${T.border}`, borderRadius: T.r.sm, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontSize: 11.5, color: T.textMuted, fontFamily: T.sans, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>vs Imanaga</span>
              <span style={{ fontFamily: T.mono, fontSize: 12, color: T.text, fontWeight: 600 }}>3-for-8 <span style={{ color: T.textFaint }}>· career</span></span>
            </div>
          </div>
        </div>
      </div>

      {/* First-pitch headline (replaces the live "last pitch" strip) */}
      <div style={{ padding: '14px 18px 18px' }}>
        <div style={{ background: T.ink, color: '#fff', borderRadius: T.r.md, padding: '16px 18px', display: 'grid', gridTemplateColumns: '1fr auto auto', alignItems: 'center', gap: 18 }}>
          <div>
            <div style={{ fontSize: 11.5, color: '#a1a1aa', letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 700 }}>First pitch</div>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em', marginTop: 4 }}>Valdez vs Imanaga</div>
          </div>
          <div style={{ textAlign: 'center', borderLeft: '1px solid #27272a', borderRight: '1px solid #27272a', padding: '0 22px' }}>
            <div style={{ fontFamily: T.mono, fontSize: 30, fontWeight: 700, lineHeight: 1, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>8:05</div>
            <div style={{ fontSize: 11.5, color: '#a1a1aa', letterSpacing: '0.12em', textTransform: 'uppercase' }}>PM ET</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <Pill tone="soft" style={{ fontSize: 11, padding: '5px 12px' }}>Gates 6:05</Pill>
            <div style={{ fontFamily: T.mono, fontSize: 11, color: '#a1a1aa', marginTop: 6 }}>72° · clear</div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function PregameContext() {
  const order = [
    { spot: 1, num: 27, name: 'Jose Altuve',    pos: '2B', line: '.295' },
    { spot: 2, num: 3,  name: 'Jeremy Peña',     pos: 'SS', line: '.272' },
    { spot: 3, num: 44, name: 'Yordan Álvarez',  pos: 'DH', line: '.301' },
  ];
  return (
    <Card padless>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
        {/* Leadoff batter vs the starter on the mound (CHC pitches top 1st) */}
        <div style={{ padding: '13px 16px 15px', borderRight: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: 11, minWidth: 0 }}>
          <Eyebrow>First matchup</Eyebrow>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: T.sans, fontSize: 13.5, fontWeight: 700, color: T.text, minWidth: 0 }}>
            <span onClick={() => window.openPlayerOverview()} style={{ cursor: 'pointer', textDecoration: 'underline dotted', textDecorationColor: T.borderStrong, textUnderlineOffset: 3 }}>Altuve</span>
            <span style={{ color: T.textFaint, fontSize: 11, fontWeight: 600 }}>vs</span>
            <span onClick={() => window.openPlayerOverview()} style={{ cursor: 'pointer', textDecoration: 'underline dotted', textDecorationColor: T.borderStrong, textUnderlineOffset: 3 }}>Imanaga</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.textFaint, width: 46, flexShrink: 0 }}>Career</span>
              <span style={{ fontFamily: T.mono, fontSize: 11.5, fontWeight: 600, color: T.text, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>3-8 <span style={{ color: T.textFaint, fontWeight: 500 }}>· .375 · 1 2B</span></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.textFaint, width: 46, flexShrink: 0 }}>vs LHP</span>
              <span style={{ fontFamily: T.mono, fontSize: 11.5, fontWeight: 600, color: T.textMuted, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>.312 <span style={{ color: T.textFaint, fontWeight: 500 }}>· season</span></span>
            </div>
          </div>
        </div>

        {/* Top of the order */}
        <div style={{ padding: '13px 16px 15px', display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
          <Eyebrow>Top of the order · HOU</Eyebrow>
          {order.map((b) => (
            <div key={b.num} style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
              <span style={{ fontFamily: T.mono, fontSize: 11, fontWeight: 700, color: T.textFaint, width: 12, flexShrink: 0 }}>{b.spot}</span>
              <JerseyNum>{b.num}</JerseyNum>
              <span style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 7, overflow: 'hidden' }}>
                <PlayerName>{b.name}</PlayerName>
                <span style={{ fontFamily: T.mono, fontSize: 11, color: T.textFaint, flexShrink: 0 }}>– {b.pos}</span>
              </span>
              <span style={{ flexShrink: 0, fontFamily: T.mono, fontSize: 11, fontWeight: 600, color: T.textMuted, fontVariantNumeric: 'tabular-nums' }}>{b.line}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function PregamePitchByPitch() {
  return (
    <div style={{
      background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.r.lg,
      boxShadow: T.sh.sm, display: 'flex', flexDirection: 'column', height: 640, overflow: 'hidden',
    }}>
      <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: T.sans, fontSize: 15, fontWeight: 700 }}>Pitch by pitch</span>
          <span style={{ fontFamily: T.mono, fontSize: 11, color: T.textMuted }}>· 0 at-bats</span>
        </div>
        <Segmented items={['All', 'Runs', 'K', 'HR', 'BB']} active={0} size="sm" />
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 32, textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', border: `2px solid ${T.border}`, display: 'grid', placeItems: 'center', color: T.textFaint, fontSize: 22 }}>⚾</div>
        <div style={{ fontFamily: T.sans, fontSize: 16, fontWeight: 700, color: T.text }}>Waiting for the game to begin</div>
        <div style={{ fontFamily: T.sans, fontSize: 13, color: T.textMuted, maxWidth: 320, lineHeight: 1.5 }}>
          First pitch is scheduled for <span style={{ fontFamily: T.mono, fontWeight: 600, color: T.text }}>8:05p ET</span>. Every pitch and plate appearance will appear here, newest first, as soon as play starts.
        </div>
      </div>
    </div>
  );
}

function PregameStarters() {
  const Side = ({ p, label, border }) => (
    <div style={{ padding: 20, display: 'flex', gap: 16, alignItems: 'center', borderRight: border ? `1px solid ${T.border}` : 'none' }}>
      <Headshot team={p.team} initials={p.name.split(' ').map(w => w[0]).join('')} mlbId={p.mlbId} size={72} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <Eyebrow style={{ fontSize: 11 }}>{label} · {p.team.abbr}</Eyebrow>
        <div onClick={() => window.openPlayerOverview()} style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-0.01em', cursor: 'pointer', textDecoration: 'underline dotted', textDecorationColor: T.borderStrong, textUnderlineOffset: 3, width: 'fit-content', marginTop: 2 }}>{p.name}</div>
        <div style={{ fontFamily: T.mono, fontSize: 12, color: T.textMuted, marginBottom: 10 }}>{p.hand} · #{p.num}</div>
        <div style={{ display: 'flex', gap: 18 }}>
          {p.line.map(([k, v]) => (
            <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <span style={{ fontSize: 11, color: T.textMuted, fontFamily: T.sans, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{k}</span>
              <span style={{ fontFamily: T.mono, fontSize: 16, fontWeight: 700, color: T.text, fontVariantNumeric: 'tabular-nums' }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
  return (
    <Card padless>
      <div style={{ padding: '10px 18px', borderBottom: `1px solid ${T.border}`, background: T.surfaceAlt }}>
        <Eyebrow>Starting pitchers</Eyebrow>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
        <Side p={PROBABLES.away} label="Probable" border />
        <Side p={PROBABLES.home} label="Probable" />
      </div>
    </Card>
  );
}

function PregameOdds() {
  const hou = 53, chc = 47;
  return (
    <Card padless>
      <div style={{ padding: '14px 18px 10px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: `1px solid ${T.border}` }}>
        <Eyebrow>Pregame win probability</Eyebrow>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontFamily: T.mono, fontSize: 24, fontWeight: 700, color: T.text, letterSpacing: '-0.02em', lineHeight: 1 }}>{hou}%</span>
          <span style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 700, color: TEAMS.HOU.primary }}>HOU</span>
        </div>
      </div>
      <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', height: 34, borderRadius: T.r.sm, overflow: 'hidden', border: `1px solid ${T.border}` }}>
          <div style={{ width: `${hou}%`, background: TEAMS.HOU.primary, display: 'flex', alignItems: 'center', gap: 6, padding: '0 10px' }}>
            <span style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, color: '#fff' }}>HOU</span>
            <span style={{ fontFamily: T.mono, fontSize: 12, fontWeight: 700, color: '#fff', marginLeft: 'auto' }}>{hou}%</span>
          </div>
          <div style={{ width: `${chc}%`, background: TEAMS.CHC.primary, display: 'flex', alignItems: 'center', gap: 6, padding: '0 10px' }}>
            <span style={{ fontFamily: T.mono, fontSize: 12, fontWeight: 700, color: '#fff' }}>{chc}%</span>
            <span style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, color: '#fff', marginLeft: 'auto' }}>CHC</span>
          </div>
        </div>
        <div style={{ fontSize: 11, color: T.textMuted, lineHeight: 1.5 }}>
          <span style={{ fontWeight: 700, color: T.text }}>How to read:</span> a model estimate from the probable starters, projected lineups, and home-field — before any pitch is thrown. It updates live once the game starts.
        </div>
      </div>
    </Card>
  );
}

function PregameSeries() {
  const games = [
    { d: 'May 22', away: TEAMS.HOU, as: 5, home: TEAMS.CHC, hs: 2, w: 'HOU' },
    { d: 'May 23', away: TEAMS.HOU, as: 3, home: TEAMS.CHC, hs: 4, w: 'CHC' },
  ];
  return (
    <Card padless>
      <div style={{ padding: '14px 18px 10px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <Eyebrow>Season series</Eyebrow>
        <span style={{ fontFamily: T.mono, fontSize: 12, fontWeight: 700, color: T.text }}>1 <span style={{ color: T.textFaint }}>–</span> 1</span>
      </div>
      <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 12, color: T.textMuted, lineHeight: 1.5 }}>
          Third of a four-game set at Wrigley. The first two were split.
        </div>
        {games.map((g, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: `1px solid ${T.border}` }}>
            <span style={{ fontFamily: T.sans, fontSize: 11.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: T.textFaint, width: 52, flexShrink: 0 }}>{g.d}</span>
            <TeamDot team={g.away} size={20} />
            <span style={{ fontFamily: T.mono, fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: g.w === g.away.abbr ? T.text : T.textFaint }}>{g.as}</span>
            <span style={{ color: T.textFaint, fontSize: 11 }}>@</span>
            <TeamDot team={g.home} size={20} />
            <span style={{ fontFamily: T.mono, fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: g.w === g.home.abbr ? T.text : T.textFaint }}>{g.hs}</span>
            <span style={{ marginLeft: 'auto', fontFamily: T.sans, fontSize: 11.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.positive }}>{g.w} W</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

window.GameScreenV2Pregame = function GameScreenV2Pregame() {
  const [lineupsOpen, setLineupsOpen] = React.useState(false);
  const [lineupsClosing, setLineupsClosing] = React.useState(false);
  const closeLineups = React.useCallback(() => {
    setLineupsClosing(true);
    setTimeout(() => { setLineupsOpen(false); setLineupsClosing(false); }, 230);
  }, []);
  const toggleLineups = () => { lineupsOpen ? closeLineups() : setLineupsOpen(true); };
  React.useEffect(() => {
    if (!lineupsOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') closeLineups(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lineupsOpen, closeLineups]);

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
    <Page>
      <AppHeader right={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button style={btn}>🔔 <span style={{ display: 'inline-grid', placeItems: 'center', minWidth: 16, height: 16, borderRadius: 999, background: T.accent, color: '#fff', fontSize: 11.5, fontWeight: 700, padding: '0 4px' }}>3</span></button>
          <button style={btn}>← Back to games</button>
        </div>
      } />

      <PageTitle
        title="Houston Astros @ Chicago Cubs"
        subtitle="Wrigley Field · Sun May 24 · 8:05p ET"
        right={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Pill tone="info" style={{ fontWeight: 700, letterSpacing: '0.1em' }}>SCHEDULED</Pill>
            <Pill tone="soft" style={{ fontFamily: T.mono }}>First pitch 8:05p</Pill>
          </div>
        }
      />

      <div style={{ padding: '0 28px 36px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <PregameLineScoreBand />

        <div style={{ display: 'grid', gridTemplateColumns: '600px 1fr', gap: 16, alignItems: 'start' }}>
          <div style={{ position: 'sticky', top: 16, alignSelf: 'start', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <PregameMatchupLeft lineupsOpen={lineupsOpen && !lineupsClosing} onToggleLineups={toggleLineups} />
            <PregameContext />
          </div>
          <PregamePitchByPitch />
        </div>

        <PregameStarters />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'stretch' }}>
          <PregameOdds />
          <PregameSeries />
        </div>
      </div>
    </Page>
    {lineupsOpen && (
      <React.Fragment>
        <div onClick={closeLineups} style={{ position: 'absolute', inset: 0, zIndex: 45, background: 'rgba(20,16,12,0.28)', animation: lineupsClosing ? 'lineupFadeOut 0.22s ease forwards' : 'lineupFadeIn 0.24s ease' }} />
        <style>{`@keyframes lineupFadeIn { from { opacity: 0; } to { opacity: 1; } } @keyframes lineupFadeOut { from { opacity: 1; } to { opacity: 0; } }`}</style>
        <LineupsTray closing={lineupsClosing} onClose={closeLineups} />
      </React.Fragment>
    )}
    </div>
  );
};

// ---------- Assembly ----------

// Expose pieces the postgame state reuses (win-prob arc + leverage are complete-game
// views and read correctly post-final; the tray is shared chrome).
Object.assign(window, { WinProbTimeline, LeverageCard, LineupsTray });

window.GameScreenV2 = function GameScreenV2() {
  const [lineupsOpen, setLineupsOpen] = React.useState(false);
  const [lineupsClosing, setLineupsClosing] = React.useState(false);
  const closeLineups = React.useCallback(() => {
    setLineupsClosing(true);
    setTimeout(() => { setLineupsOpen(false); setLineupsClosing(false); }, 230);
  }, []);
  const toggleLineups = () => { lineupsOpen ? closeLineups() : setLineupsOpen(true); };
  React.useEffect(() => {
    if (!lineupsOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') closeLineups(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lineupsOpen, closeLineups]);

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
    <Page>
      <AppHeader right={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button style={btn}>🔔 <span style={{ display: 'inline-grid', placeItems: 'center', minWidth: 16, height: 16, borderRadius: 999, background: T.accent, color: '#fff', fontSize: 11.5, fontWeight: 700, padding: '0 4px' }}>3</span></button>
          <button style={btn}>← Back to games</button>
        </div>
      } />

      <PageTitle
        title="Houston Astros @ Chicago Cubs"
        subtitle="Wrigley Field · Sun May 24 · ▼ 9th"
        right={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <LivePill />
            <Pill tone="soft" style={{ fontFamily: T.mono }}>2:47 elapsed</Pill>
          </div>
        }
      />

      <div style={{ padding: '0 28px 36px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <LineScoreBand />

        {/* Above-the-fold two-column row */}
        <div style={{ display: 'grid', gridTemplateColumns: '600px 1fr', gap: 16, alignItems: 'start' }}>
          <div style={{ position: 'sticky', top: 16, alignSelf: 'start', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <MatchupLeft lineupsOpen={lineupsOpen && !lineupsClosing} onToggleLineups={toggleLineups} />
            <MatchupContext />
          </div>
          <PitchByPitchV2 />
        </div>

        {/* Below the fold */}
        <PitcherCard />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'stretch' }}>
          <WinProbTimeline />
          <LeverageCard />
        </div>
      </div>
    </Page>
    {lineupsOpen && (
      <React.Fragment>
        <div onClick={closeLineups} style={{ position: 'absolute', inset: 0, zIndex: 45, background: 'rgba(20,16,12,0.28)', animation: lineupsClosing ? 'lineupFadeOut 0.22s ease forwards' : 'lineupFadeIn 0.24s ease' }} />
        <style>{`@keyframes lineupFadeIn { from { opacity: 0; } to { opacity: 1; } } @keyframes lineupFadeOut { from { opacity: 1; } to { opacity: 0; } }`}</style>
        <LineupsTray closing={lineupsClosing} onClose={closeLineups} />
      </React.Fragment>
    )}
    </div>
  );
};
