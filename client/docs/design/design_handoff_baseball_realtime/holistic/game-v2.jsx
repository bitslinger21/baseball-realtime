/* global React, T, TEAMS, TeamMark, Pips, Bases, Inning, Card, Eyebrow, Pill, LivePill, Segmented, Th, Td, Tr, StrikeZone, AppHeader, btn, iconBtn, Page, PageTitle */

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
  const hou = [0, 1, 0, 0, 2, 0, 1, 4, null];
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
    <div style={{ width: 34, textAlign: 'center', fontFamily: T.mono, fontSize: 15, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: accent ? '#fff' : '#d4d4d8' }}>{v}</div>
  );
  const Row = ({ team, name, runs, r, h, e, bold }) => (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <div style={{ width: 132, display: 'flex', alignItems: 'center', gap: 9 }}>
        <TeamDot team={team} size={24} />
        <span style={{ fontFamily: T.sans, fontSize: 12, fontWeight: bold ? 700 : 600, color: '#fff', whiteSpace: 'nowrap' }}>{name}</span>
      </div>
      <div style={{ display: 'flex', gap: 1 }}>{runs.map((v, i) => <React.Fragment key={i}>{cell(v, innings[i] === cur)}</React.Fragment>)}</div>
      <div style={{ display: 'flex', gap: 2, paddingLeft: 10, marginLeft: 8, borderLeft: '1px solid #3f3f46' }}>
        {rhe(r, true)}{rhe(h)}{rhe(e)}
      </div>
    </div>
  );

  const ZoneHead = ({ children }) => (
    <div style={{ fontSize: 9, color: '#71717a', letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 12 }}>{children}</div>
  );

  const scoring = [
    { inn: '3rd', txt: 'Suzuki RBI single (CHC 1–0)' },
    { inn: '5th', txt: 'Tucker 2-run HR (HOU 2–1)' },
    { inn: '8th', txt: 'Bregman bases-clearing 2B (HOU 6–4)' },
  ];
  const leaders = [
    { team: TEAMS.HOU, name: 'Yordan Álvarez', line: '2-4 · HR · 3 RBI' },
    { team: TEAMS.CHC, name: 'Seiya Suzuki', line: '2-3 · 2B · BB' },
  ];

  return (
    <div style={{ background: T.ink, borderRadius: T.r.lg, padding: '16px 20px', display: 'grid', gridTemplateColumns: '660px 1fr 1fr' }}>
      {/* Zone 1 — line score */}
      <div style={{ paddingRight: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ width: 132, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 0 3px rgba(239,68,68,0.18)' }} />
            <span style={{ fontSize: 9, color: '#a1a1aa', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700 }}>Live · ▼9th</span>
          </div>
          <div style={{ display: 'flex', gap: 1 }}>
            {innings.map(i => <div key={i} style={{ width: 28, textAlign: 'center', fontFamily: T.mono, fontSize: 10, color: i === cur ? T.accent : '#71717a', fontWeight: 700 }}>{i}</div>)}
          </div>
          <div style={{ display: 'flex', gap: 2, paddingLeft: 10, marginLeft: 8, borderLeft: '1px solid #3f3f46' }}>
            {['R', 'H', 'E'].map(x => <div key={x} style={{ width: 34, textAlign: 'center', fontFamily: T.sans, fontSize: 10, color: '#71717a', fontWeight: 700 }}>{x}</div>)}
          </div>
        </div>
        <Row team={TEAMS.HOU} name="Houston" runs={hou} r={8} h={11} e={0} bold />
        <div style={{ height: 1, background: '#27272a', margin: '6px 0' }} />
        <Row team={TEAMS.CHC} name="Chicago Cubs" runs={chc} r={5} h={9} e={1} />
      </div>

      {/* Zone 2 — scoring summary (capped at 3, "+N more") */}
      <div style={{ padding: '0 20px', borderLeft: '1px solid #27272a' }}>
        <ZoneHead>Scoring summary</ZoneHead>
        {scoring.map((s, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 9, alignItems: 'baseline' }}>
            <span style={{ fontFamily: T.mono, fontSize: 11, color: T.accent, fontWeight: 700, width: 26, flexShrink: 0 }}>{s.inn}</span>
            <span style={{ fontFamily: T.sans, fontSize: 12, color: '#d4d4d8', lineHeight: 1.35 }}>{s.txt}</span>
          </div>
        ))}
        <button style={{ background: 'transparent', border: 'none', color: '#71717a', fontFamily: T.sans, fontSize: 11, fontWeight: 600, cursor: 'pointer', padding: 0, marginTop: 2 }}>
          + 2 more scoring plays →
        </button>
      </div>

      {/* Zone 3 — game leaders */}
      <div style={{ padding: '0 0 0 20px', borderLeft: '1px solid #27272a' }}>
        <ZoneHead>Game leaders</ZoneHead>
        {leaders.map((g, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'center' }}>
            <TeamDot team={g.team} size={22} />
            <div>
              <div style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 600, color: '#fff' }}>{g.name}</div>
              <div style={{ fontFamily: T.mono, fontSize: 11, color: '#a1a1aa' }}>{g.line}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Headshot — real MLB player photo with initials fallback ----------

function Headshot({ team, initials, mlbId, size = 64 }) {
  const [failed, setFailed] = React.useState(false);
  const boxH = Math.round(size * 1.28); // portrait — fits head + shoulders without clipping the face
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
      display: 'flex', flexDirection: 'column',
      flexShrink: 0,
      position: 'relative',
    }}>
      <div style={{ height: 6, background: team.primary }} />
      {url && !failed ? (
        <img src={url} alt={initials}
          onError={() => setFailed(true)}
          style={{ flex: 1, width: '100%', minHeight: 0, objectFit: 'cover', objectPosition: 'center top', display: 'block' }} />
      ) : (
        <div style={{
          flex: 1, display: 'grid', placeItems: 'center',
          fontFamily: T.sans, fontSize: size * 0.34, fontWeight: 700,
          color: T.textFaint, letterSpacing: '-0.02em',
        }}>
          {initials}
        </div>
      )}
    </div>
  );
}

// ---------- Sticky left column: zone + batter card + last-pitch ----------

function MatchupLeft() {
  // All pitches in the current at-bat, plotted with numerals.
  // (Option A from the brainstorm.)
  const currentPAPitches = [
    { x: 48, y: 40, label: 1, color: T.positive, type: 'Changeup' },  // zone 5, in play foul
    { x: 84, y: 34, label: 2, color: T.accent,   type: 'Four-Seam' }, // off the outer edge, ball
  ];
  // Pitch-type swatches that appear in this PA, deduplicated.
  const swatches = [
    { color: T.positive, name: 'In play' },
    { color: T.accent,   name: 'Ball' },
    { color: T.text,     name: 'Strike' },
  ];

  return (
    <Card padless style={{ position: 'sticky', top: 16 }}>
      {/* Light play-state eyebrow — inning · bases · B/S/O pips · LIVE */}
      <div style={{
        padding: '11px 18px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: `1px solid ${T.border}`,
        background: T.surfaceAlt,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <span style={{ fontFamily: T.mono, fontSize: 14, fontWeight: 700, color: T.text }}>▼ 9th</span>
          <Bases on={[true, true, false]} size={26} fill={T.accent} empty={T.border} />
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            {[
              { l: 'B', count: 1, total: 3, color: T.info },
              { l: 'S', count: 1, total: 2, color: T.text },
              { l: 'O', count: 2, total: 2, color: T.accent },
            ].map(p => (
              <span key={p.l} style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                <span style={{ fontFamily: T.sans, fontSize: 10, fontWeight: 700, color: T.textMuted }}>{p.l}</span>
                <Pips count={p.count} total={p.total} size={8} gap={4} color={p.color} emptyColor={T.border} />
              </span>
            ))}
          </div>
        </div>
        <button style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          padding: '6px 12px',
          background: T.surface,
          border: `1px solid ${T.borderStrong}`,
          borderRadius: T.r.pill,
          cursor: 'pointer',
          fontFamily: T.sans, fontSize: 12, fontWeight: 600, color: T.text,
        }}>
          Lineups
          <span style={{ color: T.textFaint, fontSize: 11 }}>▾</span>
        </button>
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '280px 1fr',
        gap: 0,
      }}>
        {/* Zone diagram */}
        <div style={{
          padding: '18px 16px 14px',
          borderRight: `1px solid ${T.border}`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
        }}>
          <StrikeZone size={240} dots={currentPAPitches} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', fontSize: 10, color: T.textMuted, fontFamily: T.sans }}>
            {swatches.map(s => (
              <span key={s.name} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
                {s.name}
              </span>
            ))}
          </div>
        </div>

        {/* Batter card */}
        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Eyebrow style={{ fontSize: 9 }}>At bat · CHC</Eyebrow>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <Headshot team={TEAMS.CHC} initials="AB" mlbId={608324} size={68} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em' }}>Alex Bregman</div>
              <div style={{ fontFamily: T.mono, fontSize: 11, color: T.textMuted }}>3B · R/R</div>
              <div style={{ fontFamily: T.mono, fontSize: 14, fontWeight: 600, color: T.text, marginTop: 4, letterSpacing: '-0.01em' }}>
                .250 <span style={{ color: T.textFaint }}>/</span> .338 <span style={{ color: T.textFaint }}>/</span> .346
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 6, marginTop: 4 }}>
            <div style={{
              padding: '8px 10px', border: `1px solid ${T.border}`, borderRadius: T.r.sm,
              display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8,
            }}>
              <span style={{ fontSize: 10, color: T.textMuted, fontFamily: T.sans, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Today</span>
              <span style={{ fontFamily: T.mono, fontSize: 12, color: T.text, fontWeight: 600 }}>
                1-for-4 <span style={{ color: T.textFaint }}>· 1B · K · F8 · BB</span>
              </span>
            </div>
            <div style={{
              padding: '8px 10px', border: `1px solid ${T.border}`, borderRadius: T.r.sm,
              display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8,
            }}>
              <span style={{ fontSize: 10, color: T.textMuted, fontFamily: T.sans, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>vs Pearson</span>
              <span style={{ fontFamily: T.mono, fontSize: 12, color: T.text, fontWeight: 600 }}>
                0-for-2 <span style={{ color: T.textFaint }}>· career</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Last-pitch headline (full width below) */}
      <div style={{ padding: '14px 18px 18px' }}>
        <div style={{
          background: T.ink, color: '#fff',
          borderRadius: T.r.md,
          padding: '16px 18px',
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
            <div style={{ fontFamily: T.mono, fontSize: 11, color: '#a1a1aa', marginTop: 6 }}>missed away</div>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ---------- Right column: pitch-by-pitch with internal scroll ----------

function PitchByPitchV2() {
  // Newest PA at top. Current PA expanded with pitches in CHRONOLOGICAL order.
  const PAs = [
    {
      id: 'current', live: true, inning: 'BOT 9', team: TEAMS.CHC, batter: 'Alex Bregman',
      summary: 'At bat · 1-0',
      pitches: [
        { n: 1, type: 'Changeup',  mph: 93.5, zone: 5, result: 'In play, foul',   tone: 'positive', count: '0-0' },
        { n: 2, type: 'Four-Seam', mph: 100,  zone: 1, result: 'Ball',            tone: 'live',     count: '1-0' },
      ],
    },
    { id: 'busch',   inning: 'BOT 9', team: TEAMS.CHC, batter: 'Michael Busch',   summary: 'Single to LF · 2-2',         icon: '1B', color: T.positive },
    { id: 'happ',    inning: 'BOT 9', team: TEAMS.CHC, batter: 'Ian Happ',        summary: 'Strikeout swinging · 1-2',   icon: 'K',  color: T.textFaint },
    { id: 'suzuki',  inning: 'BOT 9', team: TEAMS.CHC, batter: 'Seiya Suzuki',    summary: 'Walk · 3-1',                 icon: 'BB', color: T.info },
    { id: 'allen',   inning: 'TOP 9', team: TEAMS.HOU, batter: 'Nick Allen',      summary: 'Home run to LCF · 412 ft',   icon: 'HR', color: T.accent, scored: { runs: 2, score: 'HOU 8 – 5 CHC' } },
    { id: 'vazquez', inning: 'TOP 9', team: TEAMS.HOU, batter: 'Christian Vázquez', summary: 'Flyout to CF',             icon: 'F8', color: T.textFaint },
    { id: 'dezenzo', inning: 'TOP 9', team: TEAMS.HOU, batter: 'Zach Dezenzo',    summary: 'Strikeout looking · 0-2',    icon: 'K',  color: T.textFaint },
    { id: 'smith',   inning: 'BOT 8', team: TEAMS.CHC, batter: 'Cam Smith',       summary: 'Triple to RF · 1-1',         icon: '3B', color: T.positive, scored: { runs: 1, score: 'HOU 6 – 5 CHC' } },
    { id: 'meyers',  inning: 'BOT 8', team: TEAMS.HOU, batter: 'Jake Meyers',     summary: 'Strikeout swinging · 2-2',   icon: 'K',  color: T.textFaint },
    { id: 'paredes', inning: 'BOT 8', team: TEAMS.HOU, batter: 'Isaac Paredes',   summary: 'Single to RF · 1-0',         icon: '1B', color: T.positive },
  ];

  return (
    <div style={{
      background: T.surface,
      border: `1px solid ${T.border}`,
      borderRadius: T.r.lg,
      boxShadow: T.sh.sm,
      display: 'flex',
      flexDirection: 'column',
      height: 640,
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
        </div>
      </div>

      {/* Scrollable list */}
      <div style={{ flex: 1, overflowY: 'auto', position: 'relative', minHeight: 0 }}>
        {PAs.map((pa, paI) => (
          <div key={pa.id} style={{
            borderBottom: paI === PAs.length - 1 ? 'none' : `1px solid ${T.border}`,
            background: pa.live ? T.accentSoft + '33' : 'transparent',
            borderLeft: pa.live ? `3px solid ${T.accent}` : '3px solid transparent',
          }}>
            {/* PA header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '74px 32px 1fr auto',
              gap: 12, alignItems: 'center',
              padding: '11px 16px',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
                <span style={{ fontFamily: T.mono, fontSize: 10, color: T.textMuted, fontWeight: 700, letterSpacing: '0.06em' }}>{pa.inning}</span>
                <TeamDot team={pa.team} size={22} />
              </div>
              {pa.live ? (
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: T.accent, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700 }}>●</div>
              ) : (
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: pa.color, color: '#fff', display: 'grid', placeItems: 'center', fontFamily: T.sans, fontSize: 10, fontWeight: 700 }}>{pa.icon}</div>
              )}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <span>
                    <span style={{ textDecoration: 'underline dotted', textUnderlineOffset: 2, cursor: 'pointer' }}>{pa.batter}</span>{' '}
                    <span style={{ color: T.textMuted, fontWeight: 500 }}>· {pa.summary}</span>
                  </span>
                  {pa.live && <Pill tone="live">LIVE</Pill>}
                  {pa.scored && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '2px 9px', borderRadius: T.r.pill,
                      background: T.accentSoft, border: `1px solid ${T.accent}33`,
                      whiteSpace: 'nowrap',
                    }}>
                      <span style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, color: T.accent, letterSpacing: '0.02em' }}>
                        {pa.scored.runs === 1 ? '1 run scores' : `${pa.scored.runs} runs score`}
                      </span>
                      <span style={{ width: 1, height: 11, background: `${T.accent}40` }} />
                      <span style={{ fontFamily: T.mono, fontSize: 11, fontWeight: 600, color: T.text, fontVariantNumeric: 'tabular-nums' }}>{pa.scored.score}</span>
                    </span>
                  )}
                </div>
              </div>
              <button style={{ background: 'transparent', border: 'none', color: T.textMuted, fontSize: 14, cursor: 'pointer', padding: 4 }}>
                {pa.pitches ? '▾' : '▸'}
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
          </div>
        ))}
      </div>

      {/* fade hint at bottom */}
      <div style={{
        height: 1, background: T.border, flexShrink: 0,
      }} />
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
          <Eyebrow style={{ fontSize: 9 }}>Pitching · HOU</Eyebrow>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em' }}>Nate Pearson</div>
          <div style={{ fontFamily: T.mono, fontSize: 12, color: T.textMuted }}>RHP · #29</div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {[
            { label: 'Today',   value: '2.0 IP', sub: '1 H · 0 R · 3 K' },
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
  const X = t => pad.l + t * iw;
  const Y = p => pad.t + (1 - p / 100) * ih;
  const midY = Y(50);
  const line = pts.map((d, i) => `${i ? 'L' : 'M'}${X(d[0]).toFixed(1)} ${Y(d[1]).toFixed(1)}`).join(' ');
  const area = `${line} L${X(1).toFixed(1)} ${midY.toFixed(1)} L${X(0).toFixed(1)} ${midY.toFixed(1)} Z`;
  const last = pts[pts.length - 1];
  const innings = [1, 3, 5, 7, 9];
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
              <text x={W - pad.r + 7} y={Y(v) + 4} fontFamily={T.mono} fontSize="11" fill={T.textFaint}>{v}</text>
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
        favored to win after each play. It starts even at 50% and rises toward{' '}
        <span style={{ color: TEAMS.HOU.primary, fontWeight: 700 }}>HOU</span> (top) or falls toward{' '}
        <span style={{ color: TEAMS.CHC.primary, fontWeight: 700 }}>CHC</span> (bottom); the shaded area marks
        the leader. The sharp rise in the 8th is the bases-clearing double.
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
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontFamily: T.mono, fontSize: 10, color: T.textFaint }}>
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

// ---------- Assembly ----------

window.GameScreenV2 = function GameScreenV2() {
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
        <LineScoreBand />

        {/* Above-the-fold two-column row */}
        <div style={{ display: 'grid', gridTemplateColumns: '600px 1fr', gap: 16, alignItems: 'start' }}>
          <MatchupLeft />
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
  );
};
