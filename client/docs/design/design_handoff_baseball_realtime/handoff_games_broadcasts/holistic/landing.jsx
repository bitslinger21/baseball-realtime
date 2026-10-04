/* global React, T, TEAMS, TeamDot, TeamMark, Pips, Bases, Inning, Card, Eyebrow, Stat, StatBlock, Pill, LivePill, Tabs, Segmented, Th, Td, Tr, Sparkline, AppHeader, btn, btnPrimary, iconBtn, Page, PageTitle, ScoringWidget */

// ============================================================
// LANDING — Daily Games
// Restructured: top filter bar, Live games as rich hero cards,
// Finals as compact grid, Upcoming as preview cards. Optional
// inspector panel slides over.
// ============================================================



function GameCardFinal({ away, awayScore, home, homeScore, recap, venue, innings }) {
  const awayWon = awayScore > homeScore;
  const extras = innings && innings > 9;
  return (
    <div style={{
      background: T.surface,
      border: `1px solid ${T.border}`,
      borderRadius: T.r.md,
      boxShadow: T.sh.sm,
      overflow: 'hidden',
    }}>
      <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${T.border}` }}>
        <Pill tone="soft">
          FINAL{extras && <span style={{ fontFamily: T.mono, fontWeight: 700, color: T.accent, marginLeft: 1 }}>({innings})</span>}
        </Pill>
        <Eyebrow style={{ fontSize: 10, fontFamily: T.mono, letterSpacing: '0.06em', textTransform: 'none' }}>{venue}</Eyebrow>
      </div>
      <div>
        {[{ team: away, score: awayScore, won: awayWon },{ team: home, score: homeScore, won: !awayWon }].map((row, i) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: 'auto 1fr auto',
            alignItems: 'center', gap: 12,
            padding: '10px 14px',
            borderBottom: i === 0 ? `1px solid ${T.border}` : 'none',
            borderLeft: `4px solid ${row.team.primary}`,
            opacity: row.won ? 1 : 0.55,
          }}>
            <TeamDot team={row.team} size={22} />
            <div style={{ fontFamily: T.sans, fontSize: 13, fontWeight: row.won ? 700 : 500 }}>
              {row.team.name}
              {row.won && <span style={{ marginLeft: 6, fontSize: 9, color: T.positive, fontWeight: 700, letterSpacing: '0.12em' }}>W</span>}
            </div>
            <div style={{ fontFamily: T.mono, fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums', minWidth: 28, textAlign: 'right' }}>{row.score}</div>
          </div>
        ))}
      </div>
      <div style={{ padding: '10px 14px', background: T.surfaceAlt, fontSize: 12, color: T.textMuted, borderTop: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ flex: 1, paddingRight: 8 }}>{recap}</span>
        <span style={{ fontFamily: T.sans, fontSize: 12.5, fontWeight: 700, color: T.accent, whiteSpace: 'nowrap', cursor: 'pointer' }}>Enter game →</span>
      </div>
    </div>
  );
}

function GameCardUpcoming({ away, home, time, awayPitcher, homePitcher, venue, broadcasts }) {
  return (
    <div style={{
      background: T.surface,
      border: `1px solid ${T.border}`,
      borderRadius: T.r.md,
      boxShadow: T.sh.sm,
      overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ padding: '12px 14px', minHeight: 79, boxSizing: 'border-box', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, borderBottom: `1px solid ${T.border}` }}>
        <Pill tone="info">UPCOMING</Pill>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, minWidth: 0, textAlign: 'right' }}>
          <div style={{ fontFamily: T.mono, fontSize: 13, fontWeight: 700 }}>{time}</div>
          <window.BroadcastLine broadcasts={broadcasts} lines={2} style={{ justifyContent: 'flex-end' }} />
        </div>
      </div>
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
        {[{ team: away, p: awayPitcher },{ team: home, p: homePitcher }].map((row, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: 12, borderLeft: `4px solid ${row.team.primary}`, paddingLeft: 10, marginLeft: -14 }}>
            <TeamDot team={row.team} size={22} />
            <div>
              <div style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 700 }}>{row.team.name}</div>
              <div style={{ fontSize: 11, color: T.textMuted }}>{row.p.name} <span style={{ fontFamily: T.mono, color: T.textFaint }}>{row.p.era} ERA</span></div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: '10px 14px', background: T.surfaceAlt, fontSize: 12, color: T.textMuted, borderTop: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{venue}</span>
        <span style={{ fontFamily: T.sans, fontSize: 12.5, fontWeight: 700, color: T.accent, whiteSpace: 'nowrap', cursor: 'pointer' }}>Enter game →</span>
      </div>
    </div>
  );
}

window.LandingScreen = function LandingScreen() {
  const [offset, setOffset] = React.useState(0);
  const [navOpen, setNavOpen] = React.useState(false);
  const [minimizedWidgets, setMinimizedWidgets] = React.useState({}); // Track minimized state by game id
  const WD = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const sel = new Date(2026, 4, 24);
  sel.setDate(sel.getDate() + offset);
  const weekday = WD[sel.getDay()];
  const isToday = offset === 0;
  const title = isToday ? "Today's games"
    : offset === -1 ? "Yesterday's games"
    : offset === 1 ? "Tomorrow's games"
    : `${weekday}'s games`;
  const dateLong = `${weekday}, ${MO[sel.getMonth()]} ${sel.getDate()}`;
  const dateMono = `${String(sel.getMonth() + 1).padStart(2, '0')}/${String(sel.getDate()).padStart(2, '0')}/2026`;
  // One content-column box for every screen: 1240 of content inside 28px gutters.
  const col = { maxWidth: 1296, margin: '0 auto', width: '100%', padding: '0 28px', boxSizing: 'border-box' };
  return (
    <div style={{ position: 'relative', overflow: 'hidden', height: 1400, display: 'flex', flexDirection: 'column' }}>
    <Page style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <window.BrandHeader active="games" colStyle={col} />
      <div style={col}>
            <PageTitle
        flush
        title={title}
        subtitle={`${dateLong} · 10 games`}
        subtitleRight={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button style={btn} onClick={() => setOffset(o => o - 1)}>← Prev</button>
            <button style={{ ...btn, fontFamily: T.mono }}>{dateMono}</button>
            <button style={btn} onClick={() => setOffset(o => o + 1)}>Next →</button>
            {!isToday && <button style={btnPrimary} onClick={() => setOffset(0)}>Today</button>}
          </div>
        }
      />

      </div>

      {/* Filter strip removed (Aug 29, 2026): with ≤15 games/day and labeled sections,
          filtering was redundant — the counts it carried live in the section labels.
          Reverses part of migration decision #2. */}
      {/* Only the games list scrolls; header and title stay put */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingTop: 14 }}>
      <div style={col}>

      {/* LIVE section */}
      <div style={{ padding: '0 0 24px', display: 'flex', flexDirection: 'column' }}>
        <h2 style={sectionH}>Live now · 2</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 14, marginTop: 12 }}>
          {minimizedWidgets['pit-tor'] ? null : <window.LiveWidget game={0} onMinimize={() => setMinimizedWidgets(m => ({ ...m, 'pit-tor': true }))} />}
          {minimizedWidgets['hou-chc'] ? null : <window.LiveWidget game={1} onMinimize={() => setMinimizedWidgets(m => ({ ...m, 'hou-chc': true }))} />}
        </div>
        
        {/* Minimized widgets dock */}
        {(minimizedWidgets['pit-tor'] || minimizedWidgets['hou-chc']) && (
          <div style={{ display: 'flex', gap: 12, marginTop: 16, alignSelf: 'flex-start', flexWrap: 'wrap' }}>
            {minimizedWidgets['pit-tor'] && (
              <window.LiveWidgetMini game={0} onRestore={() => setMinimizedWidgets(m => ({ ...m, 'pit-tor': false }))} />
            )}
            {minimizedWidgets['hou-chc'] && (
              <window.LiveWidgetMini game={1} onRestore={() => setMinimizedWidgets(m => ({ ...m, 'hou-chc': false }))} />
            )}
          </div>
        )}
      </div>

      {/* FINAL */}
      <div style={{ padding: '0 0 24px' }}>
        <h2 style={{ ...sectionH, marginBottom: 12 }}>Final · 4</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          <GameCardFinal away={TEAMS.DET} awayScore={3} home={TEAMS.BAL} homeScore={5} recap="Henderson 2 HR · Rodriguez 7K" venue="Camden Yards" innings={9} />
          <GameCardFinal away={TEAMS.CLE} awayScore={3} home={TEAMS.PHI} homeScore={1} recap="Ramírez go-ahead HR in 8th" venue="Citizens Bank" innings={9} />
          <GameCardFinal away={TEAMS.TBR} awayScore={0} home={TEAMS.NYY} homeScore={2} recap="Cole CG, 11 K shutout" venue="Yankee Stadium" innings={9} />
          <GameCardFinal away={TEAMS.LAD} awayScore={5} home={TEAMS.ATL} homeScore={4} recap="Betts go-ahead single in the 11th" venue="Truist Park" innings={11} />
        </div>
      </div>

      {/* UPCOMING */}
      <div style={{ padding: '0 0 36px' }}>
        <h2 style={{ ...sectionH, marginBottom: 12 }}>Upcoming · 4</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          <GameCardUpcoming
            away={TEAMS.LAD} home={TEAMS.ATL} time="7:10p ET"
            awayPitcher={{ name: 'T. Glasnow', era: '2.91' }}
            homePitcher={{ name: 'C. Sale', era: '3.18' }}
            venue="Truist Park"
            broadcasts={[{ type: 'TV', name: 'TBS', isNational: true }, { type: 'TV', name: 'MLB.TV', homeAway: 'home' }]}
          />
          <GameCardUpcoming
            away={TEAMS.HOU} home={TEAMS.CHC} time="8:05p ET"
            awayPitcher={{ name: 'F. Valdez', era: '3.42' }}
            homePitcher={{ name: 'J. Hendricks', era: '4.07' }}
            venue="Wrigley Field"
            broadcasts={[{ type: 'TV', name: 'FOX', isNational: true }, { type: 'TV', name: 'FOX Deportes', isNational: true, language: 'es' }]}
          />
          <GameCardUpcoming
            away={TEAMS.NYY} home={TEAMS.TBR} time="8:40p ET"
            awayPitcher={{ name: 'G. Cole', era: '2.63' }}
            homePitcher={{ name: 'S. McClanahan', era: '3.05' }}
            venue="Tropicana"
            broadcasts={[{ type: 'TV', name: 'YES', homeAway: 'away' }, { type: 'TV', name: 'FanDuel SN Sun', homeAway: 'home' }]}
          />
          <GameCardUpcoming
            away={TEAMS.PHI} home={TEAMS.CLE} time="9:40p ET"
            awayPitcher={{ name: 'Z. Wheeler', era: '2.77' }}
            homePitcher={{ name: 'S. Bieber', era: '3.21' }}
            venue="Progressive Field"
            broadcasts={[{ type: 'TV', name: 'NBCS Philadelphia', homeAway: 'away' }, { type: 'TV', name: 'CLEGuardians.TV', homeAway: 'home' }, { type: 'TV', name: 'MLB Network', isNational: true }]}
          />
        </div>
      </div>
      </div>
      </div>
    </Page>
    <window.NavDrawer open={navOpen} onClose={() => setNavOpen(false)} active="games" />
    </div>
  );
};

const sectionH = {
  margin: 0,
  fontFamily: T.sans,
  fontSize: 20, fontWeight: 700,
  letterSpacing: '-0.02em',
  color: T.text,
};
