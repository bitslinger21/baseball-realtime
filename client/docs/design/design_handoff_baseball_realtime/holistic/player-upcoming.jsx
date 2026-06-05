/* global React, T, TEAMS, TeamDot, Card, Eyebrow, Stat, StatBlock, Pill, Th, Td, Segmented, StrikeZone, Headshot */

// ============================================================
// PLAYER · UPCOMING  (tab 6)
// Forward-looking matchup tab. A rail of the next ~3 games selects a
// deep-dive: how THIS batter projects against the projected starter.
//
// Structure decision (no nested tabs): game rail picks a game → the
// deep-dive below swaps. Same "pick-one-then-detail" idiom as History
// sub-tabs / Splits rails.
//
// Because vs-one-pitcher history is tiny or zero, the screen leans on
// always-available signal — the pitcher's ARSENAL crossed with the
// batter's pitch-type performance, plus handedness/class splits — and
// treats raw head-to-head as a headline when it exists (clean "first
// meeting" empty state when it doesn't).
// ============================================================

const PENA = { name: 'Jeremy Peña', first: 'Peña', team: TEAMS.HOU, bats: 'R', mlbId: 665161 };

// Peña's 2026 performance by pitch type (consistent with the Pitching tab).
const PENA_VS_PITCH = {
  'Four-seam': { avg: '.250', slg: '.292', whiff: '17%', n: 0.58 },
  'Sinker':    { avg: '.286', slg: '.357', whiff: '9%',  n: 0.71 },
  'Cutter':    { avg: '.000', slg: '.000', whiff: '50%', n: 0.0 },
  'Slider':    { avg: '.143', slg: '.214', whiff: '38%', n: 0.43 },
  'Sweeper':   { avg: '.118', slg: '.176', whiff: '41%', n: 0.35 },
  'Curveball': { avg: '.200', slg: '.200', whiff: '24%', n: 0.40 },
  'Splitter':  { avg: '.190', slg: '.238', whiff: '33%', n: 0.48 },
  'Changeup':  { avg: '.333', slg: '.500', whiff: '14%', n: 1.0 },
};

// Peña's damage by location (SLG, normalized) — same array the Pitching tab uses.
const PENA_DAMAGE = [0.18, 0.42, 0.12, 0.28, 0.84, 0.58, 0.04, 0.21, 0.15];

// Handedness splits (from the Splits tab).
const PENA_VS_HAND = {
  R: { line: '.226 / .250 / .283', ops: '.533', delta: '−.044', hot: false },
  L: { line: '.286 / .375 / .357', ops: '.732', delta: '+.155', hot: true },
};

// Pitch-class splits (from the Splits tab).
const PENA_VS_CLASS = [
  { label: 'vs Fastball', line: '.289 / .368', ops: '.693', delta: '+.116', hot: true },
  { label: 'vs Breaking', line: '.143 / .190', ops: '.372', delta: '−.205', hot: false },
  { label: 'vs Offspeed', line: '.250 / .375', ops: '.625', delta: '+.048', hot: true },
];

const UPCOMING_GAMES = [
  {
    id: 'g1', date: 'Sat · Jun 6', time: '7:10p ET', home: true, opp: TEAMS.DET, venue: 'Daikin Park',
    pitcher: {
      name: 'Casey Mize', throws: 'R', num: 12, initials: 'CM', mlbId: 663554,
      record: '5–2', era: '3.18', whip: '1.09', k9: '8.4', ip: '76.1',
      arsenal: [
        { type: 'Four-seam', share: 32, velo: '95.6' },
        { type: 'Splitter',  share: 24, velo: '86.1' },
        { type: 'Slider',    share: 22, velo: '84.8' },
        { type: 'Sinker',    share: 15, velo: '94.2' },
        { type: 'Cutter',    share: 7,  velo: '89.0' },
      ],
      heat: [0.22, 0.30, 0.20, 0.45, 0.40, 0.55, 0.70, 0.62, 0.78],
      attack: 'Works the bottom third with the splitter–slider pair.',
    },
    h2h: {
      pa: 15, ab: 13, h: 4, hr: 1, rbi: 1, bb: 2, k: 5,
      avg: '.308', obp: '.400', slg: '.538', ops: '.938', lastFaced: 'Aug 2024',
      log: [
        { date: '2024-08-18', res: 'HR',      detail: 'Solo HR (407 ft) · 2 K · BB', tone: 'positive' },
        { date: '2024-05-02', res: '1-for-3', detail: 'Single · K · F8',             tone: 'neutral'  },
        { date: '2023-09-11', res: '2-for-4', detail: '2 singles · BB',              tone: 'positive' },
        { date: '2023-04-20', res: '0-for-3', detail: '2 K · G6',                    tone: 'negative' },
      ],
    },
    lean: 'batter',
    read: 'Peña owns a .938 OPS in 15 career PA, but Mize now leans on a splitter (24%) Peña whiffs on 33% of the time. History favors Peña — the splitter is the swing factor.',
  },
  {
    id: 'g2', date: 'Sun · Jun 7', time: '1:10p ET', home: true, opp: TEAMS.DET, venue: 'Daikin Park',
    pitcher: {
      name: 'Marco Salas', throws: 'L', num: 48, initials: 'MS', mlbId: null, rookie: true,
      record: '1–0', era: '2.45', whip: '1.12', k9: '9.1', ip: '22.0',
      arsenal: [
        { type: 'Sinker',    share: 38, velo: '93.1' },
        { type: 'Sweeper',   share: 29, velo: '81.4' },
        { type: 'Changeup',  share: 21, velo: '85.0' },
        { type: 'Four-seam', share: 12, velo: '93.8' },
      ],
      heat: [0.30, 0.28, 0.18, 0.58, 0.42, 0.30, 0.74, 0.55, 0.32],
      attack: 'Sinker–sweeper lefty who lives down-and-in to righties.',
    },
    h2h: null,
    lean: 'batter',
    read: 'First look at a rookie lefty — no book either way. Peña mashes lefties (.732 OPS vs LHP), but Salas\u2019s sweeper (29%) attacks Peña\u2019s coldest pitch (.118, 41% whiff). Platoon edge to Peña; the sweeper to watch.',
  },
  {
    id: 'g3', date: 'Tue · Jun 9', time: '6:40p ET', home: false, opp: TEAMS.TBR, venue: 'Tropicana Field',
    pitcher: {
      name: 'Taj Bradley', throws: 'R', num: 45, initials: 'TB', mlbId: 671737,
      record: '4–4', era: '4.02', whip: '1.21', k9: '9.8', ip: '69.0',
      arsenal: [
        { type: 'Four-seam', share: 41, velo: '96.3' },
        { type: 'Splitter',  share: 23, velo: '88.7' },
        { type: 'Cutter',    share: 19, velo: '90.5' },
        { type: 'Curveball', share: 17, velo: '82.1' },
      ],
      heat: [0.72, 0.80, 0.68, 0.45, 0.40, 0.50, 0.18, 0.22, 0.20],
      attack: 'Elevates a 96+ four-seam, then buries the splitter.',
    },
    h2h: {
      pa: 6, ab: 6, h: 1, hr: 0, rbi: 0, bb: 0, k: 3,
      avg: '.167', obp: '.167', slg: '.167', ops: '.333', lastFaced: 'Jun 2024',
      log: [
        { date: '2024-06-14', res: '1-for-3', detail: 'Single · 2 K',  tone: 'neutral'  },
        { date: '2024-04-07', res: '0-for-3', detail: 'K · F7 · G4',    tone: 'negative' },
      ],
    },
    lean: 'pitcher',
    read: 'Bradley has Peña\u2019s number — 1-for-6 with 3 K. A 96+ four-seam up plays into Peña\u2019s flat path, and 9.8 K/9 against a sub-.280 OBP bat tilts this one to the mound.',
  },
];

const LEAN = {
  batter:  { label: 'Edge: Peña',   tone: 'positive', fill: T.positive },
  pitcher: { label: 'Edge: pitcher', tone: 'accent',  fill: T.accent },
  even:    { label: 'Even matchup',  tone: 'soft',    fill: T.borderStrong },
};

// ---- small local bar (avoid colliding with player.jsx's VBar) ----
function UBar({ value, max = 1, color, width = 54 }) {
  const w = Math.min(100, (value / max) * 100);
  return (
    <div style={{ width, height: 5, background: T.surfaceAlt, borderRadius: 3, overflow: 'hidden', border: `1px solid ${T.border}` }}>
      <div style={{ width: `${w}%`, height: '100%', background: color || T.accent, borderRadius: 3 }} />
    </div>
  );
}

// ---- Game selector card (the rail) ----
function GameSelectCard({ g, active, onClick }) {
  const oppLabel = (g.home ? 'vs ' : '@ ') + g.opp.short;
  const verdict = g.h2h
    ? { text: `${g.h2h.ops} OPS · ${g.h2h.pa} PA`, tone: parseFloat(g.h2h.ops) >= 0.7 ? 'positive' : 'accent' }
    : { text: 'First meeting', tone: 'soft' };
  return (
    <button onClick={onClick} style={{
      textAlign: 'left', cursor: 'pointer', padding: 0,
      background: active ? T.surface : T.surfaceAlt,
      border: `1px solid ${active ? T.ink : T.border}`,
      boxShadow: active ? T.sh.md : 'none',
      borderRadius: T.r.lg, overflow: 'hidden',
      transition: 'border-color .12s, box-shadow .12s, background .12s',
      position: 'relative',
    }}>
      {active && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: T.ink }} />}
      <div style={{ padding: '12px 14px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, flex: 1, minWidth: 0 }}>
          <TeamDot team={g.opp} size={26} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontFamily: T.sans, fontSize: 14, fontWeight: 700, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{oppLabel}</div>
            <div style={{ fontFamily: T.sans, fontSize: 11, color: T.textMuted, whiteSpace: 'nowrap' }}>{g.date}</div>
          </div>
        </div>
        <div style={{ fontFamily: T.mono, fontSize: 12, fontWeight: 700, color: active ? T.text : T.textMuted, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{g.time}</div>
      </div>
      <div style={{ padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Headshot team={g.opp} initials={g.pitcher.initials} mlbId={g.pitcher.mlbId} size={36} ratio={1.5} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <span style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 700, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{g.pitcher.name}</span>
            <span style={{ fontFamily: T.mono, fontSize: 10, color: T.textMuted, flexShrink: 0 }}>{g.pitcher.throws}HP</span>
            {g.pitcher.rookie && <Pill tone="info" style={{ padding: '0 6px', fontSize: 9 }}>ROOKIE</Pill>}
          </div>
          <div style={{ fontFamily: T.mono, fontSize: 11, color: T.textMuted, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>{g.pitcher.record} · {g.pitcher.era} ERA</div>
        </div>
      </div>
      <div style={{ padding: '0 14px 12px' }}>
        <Pill tone={verdict.tone} style={{ width: '100%', justifyContent: 'center', fontFamily: T.mono, fontWeight: 700 }}>{verdict.text}</Pill>
      </div>
    </button>
  );
}

// ---- Head-to-head headline card ----
function H2HCard({ g }) {
  const p = g.pitcher;
  if (!g.h2h) {
    return (
      <Card title="Head-to-head" subtitle="Career vs this pitcher">
        <div style={{ textAlign: 'center', padding: '26px 10px 22px' }}>
          <div style={{ width: 46, height: 46, borderRadius: '50%', margin: '0 auto 14px', background: T.surfaceAlt, border: `1px solid ${T.border}`, display: 'grid', placeItems: 'center', fontSize: 20 }}>⚾</div>
          <div style={{ fontFamily: T.sans, fontSize: 15, fontWeight: 700, color: T.text }}>{PENA.name} has never faced this pitcher</div>
          <div style={{ fontSize: 12.5, color: T.textMuted, marginTop: 7, lineHeight: 1.5, maxWidth: 300, marginLeft: 'auto', marginRight: 'auto' }}>
            No prior plate appearances against {p.name}. The projection below leans on handedness, his arsenal, and Peña’s pitch-type history.
          </div>
          <div style={{ marginTop: 14 }}>
            <Pill tone="info" style={{ fontFamily: T.mono, fontWeight: 700 }}>Projection-only matchup</Pill>
          </div>
        </div>
      </Card>
    );
  }
  const h = g.h2h;
  return (
    <Card title="Head-to-head" subtitle={`Career vs ${p.name} · last faced ${h.lastFaced}`}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
        <div>
          <Eyebrow style={{ display: 'block', marginBottom: 5 }}>Slash line</Eyebrow>
          <div style={{ fontFamily: T.mono, fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', color: T.text }}>{h.avg} / {h.obp} / {h.slg}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <Eyebrow style={{ display: 'block', marginBottom: 5 }}>OPS</Eyebrow>
          <div style={{ fontFamily: T.mono, fontSize: 24, fontWeight: 700, color: parseFloat(h.ops) >= 0.7 ? T.positive : T.accent, letterSpacing: '-0.02em' }}>{h.ops}</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', borderTop: `1px solid ${T.border}`, paddingTop: 12 }}>
        {[['PA', h.pa], ['H', h.h], ['HR', h.hr], ['RBI', h.rbi], ['BB', h.bb], ['K', h.k]].map(([l, v]) => (
          <div key={l} style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: T.mono, fontSize: 19, fontWeight: 700, color: T.text, fontVariantNumeric: 'tabular-nums' }}>{v}</div>
            <Eyebrow style={{ fontSize: 9 }}>{l}</Eyebrow>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ---- Pitcher snapshot ("what he throws") ----
function PitcherSnapshot({ g }) {
  const p = g.pitcher;
  const maxShare = Math.max(...p.arsenal.map(a => a.share));
  return (
    <Card title="What he throws" subtitle={`${p.name} · ${p.throws}HP`}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 14 }}>
        <Headshot team={g.opp} initials={p.initials} mlbId={p.mlbId} size={56} ratio={1.5} />
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {[['W–L', p.record], ['ERA', p.era], ['WHIP', p.whip], ['K/9', p.k9]].map(([l, v]) => (
            <div key={l}>
              <Eyebrow style={{ fontSize: 9 }}>{l}</Eyebrow>
              <div style={{ fontFamily: T.mono, fontSize: 15, fontWeight: 700, color: T.text, fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
      <Eyebrow style={{ display: 'block', marginBottom: 8 }}>Arsenal · usage</Eyebrow>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {p.arsenal.map(a => (
          <div key={a.type} style={{ display: 'grid', gridTemplateColumns: '92px 1fr 38px 44px', gap: 10, alignItems: 'center' }}>
            <span style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 600, color: T.text }}>{a.type}</span>
            <UBar value={a.share} max={maxShare} color={T.ink} width={'100%'} />
            <span style={{ fontFamily: T.mono, fontSize: 12, fontWeight: 700, color: T.text, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{a.share}%</span>
            <span style={{ fontFamily: T.mono, fontSize: 11, color: T.textMuted, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{a.velo}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${T.border}`, fontSize: 11.5, color: T.textMuted, lineHeight: 1.5 }}>{p.attack}</div>
    </Card>
  );
}

// ---- The read (verdict) ----
function ReadCard({ g }) {
  const lean = LEAN[g.lean];
  return (
    <Card title="The read" subtitle="Pre-game projection">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: lean.fill }} />
        <span style={{ fontFamily: T.sans, fontSize: 16, fontWeight: 700, color: T.text }}>{lean.label}</span>
      </div>
      {/* simple advantage meter */}
      <div style={{ height: 8, borderRadius: 4, background: T.surfaceAlt, border: `1px solid ${T.border}`, overflow: 'hidden', display: 'flex', marginBottom: 6 }}>
        <div style={{ flex: g.lean === 'batter' ? 1 : g.lean === 'even' ? 0.5 : 0.28, background: T.positive }} />
        <div style={{ width: 2, background: T.surface }} />
        <div style={{ flex: g.lean === 'pitcher' ? 1 : g.lean === 'even' ? 0.5 : 0.28, background: T.accent }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: T.mono, fontSize: 9, color: T.textMuted, letterSpacing: '0.06em', marginBottom: 14 }}>
        <span>BATTER</span><span>PITCHER</span>
      </div>
      <p style={{ margin: 0, fontSize: 13, color: T.text, lineHeight: 1.6, textWrap: 'pretty' }}>{g.read}</p>
    </Card>
  );
}

// ---- Arsenal × your bat (the star table) ----
function ArsenalCross({ g }) {
  const p = g.pitcher;
  // join arsenal → Peña's pitch-type performance; flag the pitcher's most-used
  // pitch that is also a Peña weakness (low SLG / high whiff).
  const rows = p.arsenal.map(a => ({ ...a, pena: PENA_VS_PITCH[a.type] || null }));
  const threat = rows
    .filter(r => r.pena && parseFloat(r.pena.slg.replace('.', '0.')) < 0.25)
    .sort((x, y) => y.share - x.share)[0];
  return (
    <Card title="Arsenal vs your bat" subtitle="What he throws × how Peña hits it · 2026" padless>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <Th align="left" style={{ paddingLeft: 18 }}>Pitch</Th>
            <Th>He throws</Th>
            <Th>Velo</Th>
            <Th>Peña AVG</Th>
            <Th>Peña SLG</Th>
            <Th style={{ paddingRight: 18 }}>Whiff</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => {
            const isThreat = threat && r.type === threat.type;
            const slgN = r.pena ? parseFloat(r.pena.slg.replace('.', '0.')) : 0;
            const hot = slgN >= 0.35;
            return (
              <tr key={r.type} style={isThreat ? { background: T.accentSoft } : undefined}>
                <Td align="left" mono={false} style={{ paddingLeft: 18, fontWeight: 600 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    {r.type}
                    {isThreat && <Pill tone="accent" style={{ padding: '0 7px', fontSize: 9 }}>KEY THREAT</Pill>}
                  </span>
                </Td>
                <Td style={{ fontWeight: 700 }}>{r.share}%</Td>
                <Td dim>{r.velo}</Td>
                <Td>{r.pena ? r.pena.avg : '—'}</Td>
                <Td hot={hot} dim={!hot && slgN < 0.2}>{r.pena ? r.pena.slg : '—'}</Td>
                <Td style={{ paddingRight: 18 }} hot={r.pena && parseInt(r.pena.whiff) >= 35}>{r.pena ? r.pena.whiff : '—'}</Td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div style={{ padding: '11px 18px', borderTop: `1px solid ${T.border}`, fontSize: 11.5, color: T.textMuted, lineHeight: 1.5 }}>
        {threat
          ? <>His most-used put-away pitch Peña struggles with is the <strong style={{ color: T.text }}>{threat.type.toLowerCase()}</strong> — <span style={{ fontFamily: T.mono, color: T.accent, fontWeight: 700 }}>{threat.pena.slg} SLG</span>, <span style={{ fontFamily: T.mono, color: T.text, fontWeight: 600 }}>{threat.pena.whiff}</span> whiff. Expect to see it in two-strike counts.</>
          : <>Peña handles this mix well — no single offering projects as a clear put-away weapon.</>}
      </div>
    </Card>
  );
}

// ---- Matchup splits (always-available "stats and splits") ----
function MatchupSplits({ g }) {
  const hand = PENA_VS_HAND[g.pitcher.throws];
  const Row = ({ label, line, ops, delta, hot }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center', padding: '11px 0', borderTop: `1px solid ${T.border}` }}>
      <div>
        <div style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 600, color: T.text }}>{label}</div>
        <div style={{ fontFamily: T.mono, fontSize: 11, color: T.textMuted, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>{line}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontFamily: T.mono, fontSize: 16, fontWeight: 700, color: hot ? T.positive : T.text, fontVariantNumeric: 'tabular-nums' }}>{ops}</span>
        <span style={{ fontFamily: T.mono, fontSize: 11, fontWeight: 600, color: hot ? T.positive : T.accent, minWidth: 44, textAlign: 'right' }}>{delta}</span>
      </div>
    </div>
  );
  return (
    <Card title="Matchup splits" subtitle={`How Peña does against ${g.pitcher.throws === 'R' ? 'right' : 'left'}-handers & his pitch classes · OPS · vs Lg`}>
      <div style={{ marginTop: -2 }}>
        <Row label={`vs ${g.pitcher.throws}HP`} line={hand.line} ops={hand.ops} delta={hand.delta} hot={hand.hot} />
        {PENA_VS_CLASS.map(c => <Row key={c.label} {...c} />)}
      </div>
      <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${T.border}`, fontSize: 11.5, color: T.textMuted, lineHeight: 1.5 }}>
        {g.pitcher.throws === 'L'
          ? <>The platoon split is real — Peña jumps <span style={{ fontFamily: T.mono, color: T.positive, fontWeight: 700 }}>+.199 OPS</span> against lefties.</>
          : <>Peña is <span style={{ fontFamily: T.mono, color: T.accent, fontWeight: 700 }}>{hand.delta}</span> below league vs righties — the breaking ball is where this matchup is won or lost.</>}
      </div>
    </Card>
  );
}

// ---- Location overlap ----
function LocationOverlap({ g }) {
  return (
    <Card title="Location" subtitle="Where Peña does damage vs where he attacks">
      <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start' }}>
        <div style={{ textAlign: 'center' }}>
          <Eyebrow style={{ display: 'block', marginBottom: 8 }}>Peña damage · SLG</Eyebrow>
          <StrikeZone size={132} heat={PENA_DAMAGE} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <Eyebrow style={{ display: 'block', marginBottom: 8 }}>{g.pitcher.name} · pitch %</Eyebrow>
          <StrikeZone size={132} heat={g.pitcher.heat} />
        </div>
        <div style={{ flex: 1, minWidth: 0, fontSize: 12, color: T.textMuted, lineHeight: 1.55, alignSelf: 'center' }}>
          <div style={{ marginBottom: 10 }}>
            <span style={{ fontFamily: T.mono, fontSize: 17, fontWeight: 700, color: T.accent }}>.840</span> — Peña’s damage lives <strong style={{ color: T.text }}>middle-middle</strong>.
          </div>
          <div>
            {g.pitcher.first || g.pitcher.name.split(' ').slice(-1)[0]} {g.lean === 'pitcher'
              ? <>elevates away from it; little overlap with Peña’s hot zone.</>
              : <>has to live in or near that zone, which is where Peña punishes mistakes.</>}
          </div>
        </div>
      </div>
    </Card>
  );
}

// ---- Recent meetings ----
function RecentMeetings({ g }) {
  if (!g.h2h) {
    return (
      <Card title="Recent meetings">
        <div style={{ textAlign: 'center', padding: '30px 12px', color: T.textMuted }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>No prior meetings</div>
          <div style={{ fontSize: 12.5, marginTop: 6, lineHeight: 1.5 }}>This is the first scheduled matchup. Plate appearances will populate here once they’ve faced each other.</div>
        </div>
      </Card>
    );
  }
  const toneColor = { positive: T.positive, negative: T.accent, neutral: T.textMuted };
  return (
    <Card title="Recent meetings" subtitle={`${g.h2h.log.length} most recent · career`} padless>
      <div>
        {g.h2h.log.map((m, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '96px 74px 1fr', gap: 12, alignItems: 'center', padding: '12px 18px', borderTop: i ? `1px solid ${T.border}` : 'none' }}>
            <span style={{ fontFamily: T.mono, fontSize: 12, color: T.textMuted, fontVariantNumeric: 'tabular-nums' }}>{m.date}</span>
            <span style={{ fontFamily: T.mono, fontSize: 13, fontWeight: 700, color: toneColor[m.tone] }}>{m.res}</span>
            <span style={{ fontFamily: T.sans, fontSize: 12.5, color: T.text }}>{m.detail}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

window.UpcomingTab = function UpcomingTab() {
  const [sel, setSel] = React.useState(0);
  const g = UPCOMING_GAMES[sel];
  return (
    <div style={{ marginTop: 18 }}>
      {/* Intro */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 14, gap: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontFamily: T.sans, fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em' }}>Next 3 games</h2>
          <div style={{ fontSize: 12, color: T.textMuted, marginTop: 4 }}>Pick a game to see how Peña projects against the probable starter.</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Pill tone="highlight" style={{ fontFamily: T.sans }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.highlight }} />
            Sample data · live feed pending
          </Pill>
          <Pill tone="soft" style={{ fontFamily: T.mono }}>Probables · subject to change</Pill>
        </div>
      </div>

      {/* Game rail */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 22 }}>
        {UPCOMING_GAMES.map((gm, i) => (
          <GameSelectCard key={gm.id} g={gm} active={i === sel} onClick={() => setSel(i)} />
        ))}
      </div>

      {/* Deep-dive header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 14px', paddingBottom: 12, borderBottom: `1px solid ${T.border}` }}>
        <TeamDot team={g.opp} size={22} />
        <span style={{ fontFamily: T.sans, fontSize: 15, fontWeight: 700, color: T.text }}>
          Peña vs {g.pitcher.name}
        </span>
        <span style={{ fontFamily: T.mono, fontSize: 12, color: T.textMuted }}>· {g.date} · {g.time} · {g.venue}</span>
      </div>

      {/* Row 1 — head-to-head · pitcher · read */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
        <H2HCard g={g} />
        <PitcherSnapshot g={g} />
        <ReadCard g={g} />
      </div>

      {/* Row 2 — arsenal cross (star) + splits */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: 16, marginBottom: 16 }}>
        <ArsenalCross g={g} />
        <MatchupSplits g={g} />
      </div>

      {/* Row 3 — location + recent meetings */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: 16 }}>
        <LocationOverlap g={g} />
        <RecentMeetings g={g} />
      </div>
    </div>
  );
};
