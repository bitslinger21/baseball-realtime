/* global React, T, TEAMS, TeamDot, TeamMark, Pips, Bases, Inning, Card, Eyebrow, Stat, StatBlock, Pill, LivePill, Tabs, Segmented, Th, Td, Tr, Sparkline, StrikeZone, btn, btnPrimary, iconBtn */

// ============================================================
// FOUNDATIONS — Design system at a glance
// ============================================================

window.Foundations = function Foundations() {
  return (
    <div style={{
      width: 1400, padding: 36,
      background: T.bg, color: T.text, fontFamily: T.sans,
    }}>
      <div style={{ marginBottom: 24 }}>
        <Eyebrow>Design language</Eyebrow>
        <h1 style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.02em', margin: '8px 0 6px' }}>Editorial scorebook</h1>
        <p style={{ fontSize: 14, color: T.textMuted, maxWidth: 720, margin: 0, lineHeight: 1.5 }}>
          Cream paper foundation. Tabular monospaced numbers. Tables and stat cards read like a well-typeset scorebook — quiet chrome, the data is the only thing shouting.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 20 }}>
        {/* Surface + color */}
        <Card title="Surface & color" subtitle="Warm neutrals; accents reserved for state">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {[
              ['bg', T.bg, T.text],
              ['surface', T.surface, T.text],
              ['surfaceAlt', T.surfaceAlt, T.text],
              ['ink', T.ink, '#fff'],
              ['accent', T.accent, '#fff'],
              ['positive', T.positive, '#fff'],
              ['info', T.info, '#fff'],
              ['highlight', T.highlight, '#fff'],
            ].map(([n, c, fg]) => (
              <div key={n} style={{ borderRadius: T.r.sm, overflow: 'hidden', border: `1px solid ${T.border}` }}>
                <div style={{ height: 56, background: c }} />
                <div style={{ padding: '6px 8px', background: T.surface }}>
                  <div style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 600 }}>{n}</div>
                  <div style={{ fontFamily: T.mono, fontSize: 9, color: T.textMuted }}>{c}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Type */}
        <Card title="Typography" subtitle="DM Sans · JetBrains Mono">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <Eyebrow>Display 36</Eyebrow>
              <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1 }}>Bottom 9th</div>
            </div>
            <div>
              <Eyebrow>Heading 18</Eyebrow>
              <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em' }}>Houston Astros</div>
            </div>
            <div>
              <Eyebrow>Body 14</Eyebrow>
              <div style={{ fontSize: 14 }}>Single to right field</div>
            </div>
            <div>
              <Eyebrow>Mono 24 / numerals</Eyebrow>
              <div style={{ fontFamily: T.mono, fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>.250 / .338 / .346</div>
            </div>
          </div>
        </Card>

        {/* Pills + buttons */}
        <Card title="Pills & buttons" subtitle="Semantic tones">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
            <Pill tone="neutral">Neutral</Pill>
            <Pill tone="soft">Soft</Pill>
            <Pill tone="ink">Ink</Pill>
            <Pill tone="accent">Accent</Pill>
            <Pill tone="positive">Positive</Pill>
            <Pill tone="info">Info</Pill>
            <Pill tone="highlight">Highlight</Pill>
            <LivePill />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button style={btn}>Secondary</button>
            <button style={btnPrimary}>Primary</button>
          </div>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 20, marginTop: 20 }}>
        {/* Stat cards */}
        <Card title="Stat cards" subtitle="Three sizes; mono numerals are the hero">
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-end' }}>
            <div style={{ flex: 1, padding: 14, border: `1px solid ${T.border}`, borderRadius: T.r.md, background: T.surface }}>
              <Stat label="Slash" value=".250" sub=".338 OBP / .346 SLG" size="hero" />
            </div>
            <div style={{ flex: 1, padding: 14, border: `1px solid ${T.border}`, borderRadius: T.r.md, background: T.surface }}>
              <Stat label="OPS" value=".577" sub="vs RHP this month" size="md" trend={-12} />
            </div>
            <div style={{ flex: 1, padding: 14, border: `1px solid ${T.border}`, borderRadius: T.r.md, background: T.surface }}>
              <Stat label="HR" value="2" sub="last 7 days" size="sm" trend={2} />
            </div>
          </div>
          <div style={{ marginTop: 14, padding: 14, border: `1px solid ${T.border}`, borderRadius: T.r.md, background: T.surface, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <Stat label="Last 10 games · BA" value=".286" sub="up from .238" size="md" trend={48} />
            <Sparkline values={[3,2,4,1,3,2,5,4,3,5]} width={140} height={36} color={T.text} fill={T.surfaceAlt} />
          </div>
        </Card>

        {/* Tabs */}
        <Card title="Navigation" subtitle="Underline tabs, segmented for in-card toggles">
          <Tabs items={['Overview', 'Stats', 'Splits', 'Pitching', 'History']} active={0} />
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Segmented items={['HOU', 'CHC']} active={0} />
            <Segmented items={['Batting', 'Pitching']} active={0} />
            <Segmented items={['Today', '7d', '30d', 'Season']} active={2} size="sm" />
          </div>
        </Card>

        {/* Table */}
        <Card title="Tables" subtitle="No header fills; mono numerals, hot accents">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <Th align="left">Split</Th>
                <Th>G</Th>
                <Th>AB</Th>
                <Th>AVG</Th>
                <Th>OPS</Th>
              </tr>
            </thead>
            <tbody>
              <tr><Td mono={false} align="left">vs LHP</Td><Td>7</Td><Td>14</Td><Td hot>.286</Td><Td hot>.732</Td></tr>
              <tr><Td mono={false} align="left">vs RHP</Td><Td>16</Td><Td>53</Td><Td hot>.226</Td><Td>.533</Td></tr>
            </tbody>
          </table>
        </Card>
      </div>

      {/* Game atoms */}
      <Card title="Game-state primitives" subtitle="Bases, count, inning, strike zone, team marks" style={{ marginTop: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto auto auto auto 1fr', gap: 28, alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <Bases on={[true, true, false]} size={42} />
            <Eyebrow>Bases</Eyebrow>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 14, fontSize: 10, fontWeight: 700, color: T.textMuted }}>B</span><Pips count={0} total={3} /></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 14, fontSize: 10, fontWeight: 700, color: T.textMuted }}>S</span><Pips count={1} total={2} /></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 14, fontSize: 10, fontWeight: 700, color: T.textMuted }}>O</span><Pips count={2} total={2} /></div>
            </div>
            <Eyebrow>Count</Eyebrow>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <Inning half="bottom" num={9} size={20} />
            <Eyebrow>Inning</Eyebrow>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <TeamDot team={TEAMS.HOU} size={32} />
              <TeamDot team={TEAMS.CHC} size={32} />
              <TeamMark team={TEAMS.PIT} size={48} />
            </div>
            <Eyebrow>Team marks</Eyebrow>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <StrikeZone size={140} />
            <Eyebrow>Strike zone</Eyebrow>
          </div>
        </div>
      </Card>
    </div>
  );
};
