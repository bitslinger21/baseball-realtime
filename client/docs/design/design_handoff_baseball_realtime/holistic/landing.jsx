/* global React, T, TEAMS, TeamDot, TeamMark, Pips, Bases, Inning, Card, Eyebrow, Stat, StatBlock, Pill, LivePill, Tabs, Segmented, Th, Td, Tr, Sparkline, AppHeader, btn, btnPrimary, iconBtn, Page, PageTitle */

// ============================================================
// LANDING — Daily Games
// Restructured: top filter bar, Live games as rich hero cards,
// Finals as compact grid, Upcoming as preview cards. Optional
// inspector panel slides over.
// ============================================================

function GameCardLive({ away, awayScore, home, homeScore, inning, half, count, bases, atBat, lastPlay, awayPitcher, homeBatter }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr',
      background: T.surface,
      border: `1px solid ${T.border}`,
      borderRadius: T.r.lg,
      overflow: 'hidden',
      boxShadow: T.sh.sm,
    }}>
      {/* Top: scores band */}
      <div style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <LivePill />
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <Inning half={half} num={inning} size={14} />
            <span style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.textMuted }}>{half === 'top' ? 'Top' : 'Bottom'}</span>
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <Bases on={bases} size={28} />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', paddingLeft: 10, marginLeft: 4, borderLeft: `1px solid ${T.border}` }}>
            {[['B', count[0], 3],['S', count[1], 2],['O', count[2], 2]].map(([l,c,t])=> (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 9, color: T.textMuted, fontWeight: 700 }}>{l}</span>
                <Pips count={c} total={t} size={6} gap={2} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Score rows */}
      <div style={{ borderTop: `1px solid ${T.border}` }}>
        {[
          { team: away, score: awayScore, batting: half === 'top' },
          { team: home, score: homeScore, batting: half === 'bottom' },
        ].map((row, i) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: 'auto 1fr auto',
            alignItems: 'center', gap: 14,
            padding: '12px 18px',
            background: row.batting ? T.accentSoft + '55' : 'transparent',
            borderBottom: i === 0 ? `1px solid ${T.border}` : 'none',
            borderLeft: `3px solid ${row.team.primary}`,
          }}>
            <TeamDot team={row.team} size={28} />
            <div>
              <div style={{ fontFamily: T.sans, fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em' }}>
                {row.team.name}{' '}
                {row.batting && <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: T.accent, marginLeft: 4 }}>● AT BAT</span>}
              </div>
            </div>
            <div style={{ fontFamily: T.mono, fontSize: 30, fontWeight: 700, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', minWidth: 36, textAlign: 'right' }}>
              {row.score}
            </div>
          </div>
        ))}
      </div>

      {/* At-bat matchup */}
      <div style={{ padding: '12px 18px', background: T.surfaceAlt, borderTop: `1px solid ${T.border}`, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <Eyebrow style={{ fontSize: 9 }}>Pitching</Eyebrow>
          <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{awayPitcher.name}</div>
          <div style={{ fontFamily: T.mono, fontSize: 11, color: T.textMuted }}>{awayPitcher.line}</div>
        </div>
        <div style={{ textAlign: 'right', borderLeft: `1px solid ${T.border}`, paddingLeft: 14 }}>
          <Eyebrow style={{ fontSize: 9 }}>At Bat</Eyebrow>
          <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{homeBatter.name}</div>
          <div style={{ fontFamily: T.mono, fontSize: 11, color: T.textMuted }}>{homeBatter.line}</div>
        </div>
      </div>

      {/* Last play */}
      <div style={{ padding: '12px 18px', borderTop: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Eyebrow style={{ fontSize: 9 }}>Last Pitch</Eyebrow>
        <span style={{ fontSize: 13 }}>{lastPlay}</span>
      </div>

      {/* CTA row */}
      <div style={{ padding: 12, borderTop: `1px solid ${T.border}`, display: 'flex', gap: 8, background: T.surface }}>
        <button style={{ ...btnPrimary, flex: 1, justifyContent: 'center' }}>Enter game →</button>
        <button style={btn}>Pitch-by-pitch</button>
      </div>
    </div>
  );
}

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
            borderLeft: `3px solid ${row.team.primary}`,
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
        <button style={{ ...btn, padding: '4px 10px', fontSize: 11 }}>Box</button>
      </div>
    </div>
  );
}

function GameCardUpcoming({ away, home, time, awayPitcher, homePitcher, venue }) {
  return (
    <div style={{
      background: T.surface,
      border: `1px solid ${T.border}`,
      borderRadius: T.r.md,
      boxShadow: T.sh.sm,
      overflow: 'hidden',
    }}>
      <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${T.border}` }}>
        <Pill tone="info">UPCOMING</Pill>
        <div style={{ fontFamily: T.mono, fontSize: 13, fontWeight: 700 }}>{time}</div>
      </div>
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[{ team: away, p: awayPitcher },{ team: home, p: homePitcher }].map((row, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: 12 }}>
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
        <button style={{ ...btn, padding: '4px 10px', fontSize: 11 }}>🔔 Alert</button>
      </div>
    </div>
  );
}

window.LandingScreen = function LandingScreen() {
  // Mock "today" = Sunday, May 24, 2026. The title only reads "Today's games"
  // when the selected date IS today; any other date names that day instead,
  // so the heading never lies after you page Prev/Next.
  const [offset, setOffset] = React.useState(0);
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
  return (
    <Page>
      <AppHeader right={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button style={btn}>🔔 <span style={{ display: 'inline-grid', placeItems: 'center', minWidth: 16, height: 16, borderRadius: 999, background: T.accent, color: '#fff', fontSize: 10, fontWeight: 700, padding: '0 4px' }}>4</span></button>
          <button style={iconBtn}>⚙</button>
        </div>
      } />

      <PageTitle
        title={title}
        subtitle={`${dateLong} · 8 games`}
        right={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button style={btn} onClick={() => setOffset(o => o - 1)}>← Prev</button>
            <button style={{ ...btn, fontFamily: T.mono }}>{dateMono}</button>
            <button style={btn} onClick={() => setOffset(o => o + 1)}>Next →</button>
            {!isToday && <button style={btnPrimary} onClick={() => setOffset(0)}>Today</button>}
            <span style={{ width: 1, height: 22, background: T.border, margin: '0 4px' }} />
            <button style={btn}>Late game</button>
          </div>
        }
      />

      {/* Filters / segmented */}
      <div style={{ padding: '0 28px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Segmented items={['All', 'Live · 2', 'Final · 4', 'Upcoming · 2']} active={0} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Eyebrow>Watching</Eyebrow>
          <Pill tone="accent">PIT @ TOR</Pill>
          <Pill tone="accent">HOU @ CHC</Pill>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: T.positive }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: T.positive }} />
            Connected
          </span>
        </div>
      </div>

      {/* LIVE section */}
      <div style={{ padding: '0 28px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
          <h2 style={sectionH}>Live now</h2>
          <Eyebrow>2 in progress</Eyebrow>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <GameCardLive
            away={TEAMS.PIT} awayScore={1} home={TEAMS.TOR} homeScore={0}
            inning={1} half="bottom" count={[0,1,2]} bases={[true,true,false]}
            awayPitcher={{ name: 'Mitch Keller', line: '3.64 ERA · 22P' }}
            homeBatter={{ name: 'Y. Piñango', line: '.313 AVG · 0-for-1' }}
            lastPlay="Sweeper, 83 mph · Called Strike (0-1)"
          />
          <GameCardLive
            away={TEAMS.HOU} awayScore={8} home={TEAMS.CHC} homeScore={5}
            inning={9} half="bottom" count={[0,1,2]} bases={[true,true,false]}
            awayPitcher={{ name: 'N. Pearson', line: '0.00 ERA · 14P' }}
            homeBatter={{ name: 'A. Bregman', line: '.250 AVG · 1-for-4' }}
            lastPlay="4-Seam, 100 mph · Ball (1-1)"
          />
        </div>
      </div>

      {/* FINAL */}
      <div style={{ padding: '0 28px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
          <h2 style={sectionH}>Final</h2>
          <Eyebrow>4 games</Eyebrow>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          <GameCardFinal away={TEAMS.DET} awayScore={3} home={TEAMS.BAL} homeScore={5} recap="Henderson 2 HR · Rodriguez 7K" venue="Camden Yards" innings={9} />
          <GameCardFinal away={TEAMS.CLE} awayScore={3} home={TEAMS.PHI} homeScore={1} recap="Ramírez go-ahead HR in 8th" venue="Citizens Bank" innings={9} />
          <GameCardFinal away={TEAMS.TBR} awayScore={0} home={TEAMS.NYY} homeScore={2} recap="Cole CG, 11 K shutout" venue="Yankee Stadium" innings={9} />
          <GameCardFinal away={TEAMS.LAD} awayScore={5} home={TEAMS.ATL} homeScore={4} recap="Betts go-ahead single in the 11th" venue="Truist Park" innings={11} />
        </div>
      </div>

      {/* UPCOMING */}
      <div style={{ padding: '0 28px 36px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
          <h2 style={sectionH}>Upcoming</h2>
          <Eyebrow>Today · later</Eyebrow>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          <GameCardUpcoming
            away={TEAMS.LAD} home={TEAMS.ATL} time="7:10p ET"
            awayPitcher={{ name: 'T. Glasnow', era: '2.91' }}
            homePitcher={{ name: 'C. Sale', era: '3.18' }}
            venue="Truist Park"
          />
          <GameCardUpcoming
            away={TEAMS.HOU} home={TEAMS.CHC} time="8:05p ET"
            awayPitcher={{ name: 'F. Valdez', era: '3.42' }}
            homePitcher={{ name: 'J. Hendricks', era: '4.07' }}
            venue="Wrigley Field"
          />
          <GameCardUpcoming
            away={TEAMS.NYY} home={TEAMS.TBR} time="8:40p ET"
            awayPitcher={{ name: 'G. Cole', era: '2.63' }}
            homePitcher={{ name: 'S. McClanahan', era: '3.05' }}
            venue="Tropicana"
          />
          <GameCardUpcoming
            away={TEAMS.PHI} home={TEAMS.CLE} time="9:40p ET"
            awayPitcher={{ name: 'Z. Wheeler', era: '2.77' }}
            homePitcher={{ name: 'S. Bieber', era: '3.21' }}
            venue="Progressive Field"
          />
        </div>
      </div>
    </Page>
  );
};

const sectionH = {
  margin: 0,
  fontFamily: T.sans,
  fontSize: 20, fontWeight: 700,
  letterSpacing: '-0.02em',
  color: T.text,
};
