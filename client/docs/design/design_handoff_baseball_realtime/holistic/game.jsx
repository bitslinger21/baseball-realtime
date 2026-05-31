/* global React, T, TEAMS, TeamDot, TeamMark, Pips, Bases, Inning, Card, Eyebrow, Stat, StatBlock, Pill, LivePill, Tabs, Segmented, Th, Td, Tr, Sparkline, StrikeZone, AppHeader, btn, btnPrimary, iconBtn, Page, PageTitle */

// ============================================================
// GAME VIEW (restructured)
// Top:  Strike zone (left) · Pitch description (right)
// Body: Pitch-by-pitch list (left, primary) · Lineup (right)
// No box score. No timeline.
// ============================================================

function ScoreboardStrip() {
  return (
    <div style={{
      background: T.ink, color: '#fff', borderRadius: T.r.lg,
      padding: '14px 20px',
      display: 'grid', gridTemplateColumns: '1fr auto 1fr',
      alignItems: 'center', gap: 24,
      fontFamily: T.sans,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <TeamMark team={TEAMS.HOU} size={42} />
        <div>
          <div style={{ fontSize: 11, color: '#a1a1aa', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Away</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <div style={{ fontFamily: T.mono, fontSize: 36, fontWeight: 700, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>8</div>
            <div style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 600, color: '#d4d4d8' }}>Houston Astros</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 0 3px rgba(239,68,68,0.18)' }} />
          <span style={{ fontSize: 10, color: '#a1a1aa', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700 }}>Live</span>
        </div>
        <Inning half="bottom" num={9} color="#fff" size={18} />
        <Bases on={[true,true,false]} size={34} fill="#fff" empty="#3f3f46" />
        <div style={{ display: 'flex', gap: 10 }}>
          {[['B', 0, 3],['S', 1, 2],['O', 2, 2]].map(([l,c,t]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 10, color: '#a1a1aa', fontWeight: 700 }}>{l}</span>
              <Pips count={c} total={t} size={7} gap={3} color="#fff" emptyColor="#3f3f46" />
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, justifyContent: 'flex-end' }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: '#a1a1aa', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Home</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, justifyContent: 'flex-end' }}>
            <div style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 600, color: '#d4d4d8' }}>Chicago Cubs</div>
            <div style={{ fontFamily: T.mono, fontSize: 36, fontWeight: 700, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>5</div>
          </div>
        </div>
        <TeamMark team={TEAMS.CHC} size={42} />
      </div>
    </div>
  );
}

// ----- TOP: Strike zone (left) + pitch description (right) -----

function PitchHero() {
  return (
    <Card padless>
      <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${T.border}`, background: T.surfaceAlt }}>
        <Eyebrow>Current at-bat · Bottom 9th · 2 outs</Eyebrow>
        <LivePill />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', alignItems: 'stretch' }}>
        {/* LEFT: Strike zone */}
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, borderRight: `1px solid ${T.border}`, background: T.surface }}>
          <StrikeZone size={260} dots={[
            { x: 28, y: 38, label: 1, color: T.positive },
            { x: 62, y: 28, label: 2, color: T.accent },
          ]} />
          <div style={{ display: 'flex', gap: 18, fontSize: 11, color: T.textMuted, fontFamily: T.sans }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 14, height: 14, borderRadius: '50%', background: T.positive, color: '#fff', display: 'grid', placeItems: 'center', fontFamily: T.mono, fontSize: 9, fontWeight: 700 }}>1</span>
              In play
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 14, height: 14, borderRadius: '50%', background: T.accent, color: '#fff', display: 'grid', placeItems: 'center', fontFamily: T.mono, fontSize: 9, fontWeight: 700 }}>2</span>
              Ball
            </span>
          </div>
        </div>

        {/* RIGHT: Pitch description */}
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Pitcher / Batter row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: TEAMS.HOU.primary, color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 14, border: `2px solid ${TEAMS.HOU.secondary}` }}>NP</div>
              <div>
                <Eyebrow style={{ fontSize: 9 }}>Pitching · HOU</Eyebrow>
                <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>Nate Pearson</div>
                <div style={{ fontFamily: T.mono, fontSize: 11, color: T.textMuted }}>RHP · 0.00 ERA · 14 P</div>
              </div>
            </div>
            <div style={{ fontFamily: T.sans, fontSize: 11, color: T.textFaint, letterSpacing: '0.16em', fontWeight: 700 }}>vs</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'flex-end', textAlign: 'right' }}>
              <div>
                <Eyebrow style={{ fontSize: 9 }}>At bat · CHC</Eyebrow>
                <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>Alex Bregman</div>
                <div style={{ fontFamily: T.mono, fontSize: 11, color: T.textMuted }}>3B · R/R · .250/.338/.346</div>
              </div>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: TEAMS.CHC.primary, color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 14, border: `2px solid ${TEAMS.CHC.secondary}` }}>AB</div>
            </div>
          </div>

          {/* Last pitch headline */}
          <div style={{
            background: T.ink, color: '#fff',
            borderRadius: T.r.md,
            padding: '16px 20px',
            display: 'grid', gridTemplateColumns: '1fr auto auto', alignItems: 'center', gap: 18,
          }}>
            <div>
              <div style={{ fontSize: 10, color: '#a1a1aa', letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 700 }}>Last pitch · #2 of at-bat</div>
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em', marginTop: 4 }}>Four-Seam Fastball</div>
            </div>
            <div style={{ textAlign: 'center', borderLeft: '1px solid #27272a', borderRight: '1px solid #27272a', padding: '0 22px' }}>
              <div style={{ fontFamily: T.mono, fontSize: 38, fontWeight: 700, lineHeight: 1, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>100</div>
              <div style={{ fontSize: 10, color: '#a1a1aa', letterSpacing: '0.12em', textTransform: 'uppercase' }}>MPH</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <Pill tone="live" style={{ fontSize: 12, padding: '5px 12px' }}>BALL</Pill>
              <div style={{ fontFamily: T.mono, fontSize: 11, color: '#a1a1aa', marginTop: 6 }}>Count → 1-0</div>
            </div>
          </div>

          {/* Quick context row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            <StatBlock label="Today" value="1-for-4" sub="1B · K · F8 · BB" size="sm" />
            <StatBlock label="vs Pearson" value="0-for-2" sub="career" size="sm" />
            <StatBlock label="Win prob" value="84%" sub="HOU" accent={TEAMS.HOU.primary} size="sm" />
            <StatBlock label="Leverage" value="2.4x" sub="high" size="sm" accent={T.accent} />
          </div>
        </div>
      </div>
    </Card>
  );
}

// ----- BELOW LEFT: pitch-by-pitch list, with per-pitch detail -----

function PitchByPitch() {
  // Each PA is a group of pitches. Current PA is expanded; finished PAs collapsed
  // by default but their summary is visible.
  const PAs = [
    {
      id: 'current', live: true, inning: 'BOT 9', team: TEAMS.CHC, batter: 'Alex Bregman',
      summary: 'At bat · 1-0', count: '1-0',
      pitches: [
        { n: 1, type: 'Changeup', mph: 93.5, zone: 5, result: 'In play, no out', tone: 'positive', count: '0-0', detail: 'Ground ball, foul' },
        { n: 2, type: 'Four-Seam', mph: 100, zone: 1, result: 'Ball', tone: 'live', count: '1-0', detail: 'High, outside' },
      ],
    },
    {
      id: 'busch', inning: 'BOT 9', team: TEAMS.CHC, batter: 'Michael Busch',
      summary: 'Single to LF · 2-2', icon: '1B', color: T.positive,
      pitches: [
        { n: 1, type: 'Sweeper',  mph: 84, zone: 4, result: 'Called Strike', count: '0-1' },
        { n: 2, type: 'Four-Seam', mph: 99, zone: 2, result: 'Foul',           count: '0-2' },
        { n: 3, type: 'Curveball', mph: 78, zone: 7, result: 'Ball',           count: '1-2' },
        { n: 4, type: 'Sweeper',   mph: 84, zone: 5, result: 'Single to LF',   tone: 'positive', count: '1-2' },
      ],
    },
    {
      id: 'happ', inning: 'BOT 9', team: TEAMS.CHC, batter: 'Ian Happ',
      summary: 'Strikeout swinging · 1-2', icon: 'K', color: T.textFaint,
      pitches: [
        { n: 1, type: 'Four-Seam', mph: 100, zone: 5, result: 'Called Strike', count: '0-1' },
        { n: 2, type: 'Slider',    mph: 87,  zone: 8, result: 'Ball',           count: '1-1' },
        { n: 3, type: 'Slider',    mph: 87,  zone: 9, result: 'Swinging Strike (K)', tone: 'live', count: '1-2' },
      ],
    },
    {
      id: 'suzuki', inning: 'BOT 9', team: TEAMS.CHC, batter: 'Seiya Suzuki',
      summary: 'Walk · 3-1', icon: 'BB', color: T.info,
      pitches: [],
    },
    {
      id: 'allen', inning: 'TOP 9', team: TEAMS.HOU, batter: 'Nick Allen',
      summary: 'Home run to LCF · 412 ft', icon: 'HR', color: T.accent,
      pitches: [],
    },
  ];

  return (
    <Card title="Pitch by pitch" action={
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <Segmented items={['All pitches', 'Outcomes', 'Runs', 'K', 'HR', 'BB']} active={0} size="sm" />
        <button style={{ ...btn, padding: '4px 10px', fontSize: 11 }}>↓ Auto-scroll</button>
      </div>
    } padless>
      <div style={{ maxHeight: 900, overflowY: 'auto' }}>
        {PAs.map((pa, paI) => (
          <div key={pa.id} style={{
            borderBottom: paI === PAs.length - 1 ? 'none' : `1px solid ${T.border}`,
            background: pa.live ? T.accentSoft + '30' : 'transparent',
            borderLeft: pa.live ? `3px solid ${T.accent}` : '3px solid transparent',
          }}>
            {/* PA header */}
            <div style={{ display: 'grid', gridTemplateColumns: '78px 36px 1fr auto', gap: 14, alignItems: 'center', padding: '12px 18px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontFamily: T.mono, fontSize: 10, color: T.textMuted, fontWeight: 700, letterSpacing: '0.06em' }}>{pa.inning}</span>
                <TeamDot team={pa.team} size={18} />
              </div>
              {pa.live ? (
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: T.accent, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 700 }}>●</div>
              ) : (
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: pa.color, color: '#fff', display: 'grid', placeItems: 'center', fontFamily: T.sans, fontSize: 11, fontWeight: 700 }}>{pa.icon}</div>
              )}
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  <span style={{ textDecoration: 'underline dotted', textUnderlineOffset: 2, cursor: 'pointer' }}>{pa.batter}</span>{' '}
                  <span style={{ color: T.textMuted, fontWeight: 500 }}>· {pa.summary}</span>
                  {pa.live && <Pill tone="live" style={{ marginLeft: 8 }}>LIVE</Pill>}
                </div>
              </div>
              <button style={{ background: 'transparent', border: 'none', color: T.textMuted, fontSize: 16, cursor: 'pointer' }}>
                {pa.pitches.length > 0 ? '▾' : '▸'}
              </button>
            </div>

            {/* Pitches in this PA */}
            {pa.pitches.length > 0 && (
              <div style={{ padding: '0 18px 14px 78px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <Th align="left" style={{ paddingLeft: 14, paddingTop: 6, paddingBottom: 6 }}>#</Th>
                      <Th align="left" style={{ paddingTop: 6, paddingBottom: 6 }}>Pitch</Th>
                      <Th style={{ paddingTop: 6, paddingBottom: 6 }}>Velocity</Th>
                      <Th style={{ paddingTop: 6, paddingBottom: 6 }}>Zone</Th>
                      <Th align="left" style={{ paddingTop: 6, paddingBottom: 6 }}>Result</Th>
                      <Th style={{ paddingTop: 6, paddingBottom: 6 }}>Count</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {pa.pitches.map((p, i) => (
                      <tr key={i} style={{ background: p.tone === 'live' ? T.accentSoft : 'transparent' }}>
                        <Td align="left" style={{ paddingLeft: 14 }} dim>{p.n}</Td>
                        <Td align="left" mono={false} style={{ fontWeight: 600 }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: pitchColor(p.type) }} />
                            {p.type}
                          </span>
                        </Td>
                        <Td>{p.mph.toFixed(1)}</Td>
                        <Td><ZoneChip n={p.zone} /></Td>
                        <Td align="left" mono={false} hot={p.tone === 'positive' || p.tone === 'live'} style={{ fontWeight: p.tone ? 600 : 500 }}>{p.result}</Td>
                        <Td dim>{p.count}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

function pitchColor(type) {
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

function ZoneChip({ n }) {
  // 3x3 zone, n = 1..9
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

// ----- BELOW RIGHT: Lineup -----

function LineupCompact() {
  const HOU_BAT = [
    ['1', '0',  'Brice Matthews', 'LF', '5','0','0','0','0','2'],
    ['2', '3',  'Jeremy Peña', 'SS', '4','1','1','2','0','3'],
    ['3', '8',  'Christian Walker', '1B', '4','1','1','3','0','0'],
    ['4', '15', 'Isaac Paredes', 'DH', '4','0','2','0','0','0'],
    ['5', '6',  'Jake Meyers', 'CF', '4','1','1','1','0','0'],
    ['6', '11', 'Cam Smith', 'RF', '3','2','1','0','1','1'],
    ['7', '9',  'Zach Dezenzo', 'LF', '2','1','0','0','1','2'],
    ['8', '2',  'Christian Vázquez', 'C', '4','0','0','0','0','0'],
    ['9', '20', 'Nick Allen', '2B', '3','2','3','2','0','0'],
  ];
  return (
    <Card title="Lineup" action={
      <div style={{ display: 'flex', gap: 6 }}>
        <Segmented items={['HOU', 'CHC']} active={0} size="sm" />
        <Segmented items={['Bat', 'Pit']} active={0} size="sm" />
      </div>
    } padless>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <Th align="left" style={{ paddingLeft: 16 }}>Ord</Th>
            <Th align="left">Batter</Th>
            <Th>AB</Th>
            <Th>R</Th>
            <Th>H</Th>
            <Th>RBI</Th>
            <Th>BB</Th>
            <Th style={{ paddingRight: 16 }}>K</Th>
          </tr>
        </thead>
        <tbody>
          {HOU_BAT.map((r, i) => (
            <tr key={i}>
              <Td align="left" style={{ paddingLeft: 16 }} dim>{r[0]}</Td>
              <Td align="left" mono={false}>
                <span style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 600, textDecoration: 'underline dotted', textUnderlineOffset: 2, cursor: 'pointer' }}>{r[2]}</span>
                  <span style={{ fontSize: 11, color: T.textMuted }}>#{r[1]} · {r[3]}</span>
                </span>
              </Td>
              {r.slice(4).map((v, j) => <Td key={j} dim={v === '0'} style={j === r.slice(4).length - 1 ? { paddingRight: 16 } : undefined}>{v}</Td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

window.GameScreen = function GameScreen() {
  return (
    <Page>
      <AppHeader right={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button style={btn}>🔔 <span style={{ display: 'inline-grid', placeItems: 'center', minWidth: 16, height: 16, borderRadius: 999, background: T.accent, color: '#fff', fontSize: 10, fontWeight: 700, padding: '0 4px' }}>3</span></button>
          <button style={btn}>← Today's games</button>
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
        <ScoreboardStrip />
        <PitchHero />

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, alignItems: 'start' }}>
          <PitchByPitch />
          <LineupCompact />
        </div>
      </div>
    </Page>
  );
};
