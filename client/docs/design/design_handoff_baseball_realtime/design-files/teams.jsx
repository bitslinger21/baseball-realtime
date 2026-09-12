// SNAPSHOT: copied from the live design workspace (holistic/teams.jsx) on Sep 10, 2026.
// This is a FROZEN COPY for handoff. If the date above is old, the live file may have
// moved on — check before treating this as current.
/* global React, T, TeamDot, Eyebrow, Segmented, PageTitle */

// ============================================================
// Teams — the league directory. A top-level destination, because a team is a
// top-level entity: 30 of them, stable, and the thing most people organise
// around. Before this page existed the only doors to a team page were a game
// card, a matchup title, or a Standings row — i.e. you had to find something
// else first.
//
// This ALSO takes the A–Z view off Standings. Standings answers "who is
// winning"; this answers "take me to a club". They only ever shared a page
// because both render a list of 30 teams.
// ============================================================

const TeamsRow = ({ x, showDiv }) => {
  const t = window.standingsTeam(x.k);
  return (
    <a href="Team Page - Overview v2.html" style={{
      display: 'grid', gridTemplateColumns: showDiv ? '26px minmax(0,1fr) 96px 64px 50px' : '26px minmax(0,1fr) 64px 50px',
      gap: 10, alignItems: 'center', padding: '10px 6px', textDecoration: 'none', color: T.text,
      borderBottom: `1px solid ${T.border}`, borderRadius: T.r.sm,
    }}
      onMouseEnter={e => { e.currentTarget.style.background = T.surfaceAlt; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
      <TeamDot team={t} size={26} />
      <span style={{ fontFamily: T.sans, fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</span>
      {showDiv && <span style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 500, color: T.textMuted, whiteSpace: 'nowrap' }}>{x.div}</span>}
      <span style={{ fontFamily: T.mono, fontSize: 13, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{x.w}–{x.l}</span>
      <span style={{ fontFamily: T.mono, fontSize: 13, textAlign: 'right', color: T.textMuted, fontVariantNumeric: 'tabular-nums' }}>{window.standingsPct(x.w, x.l)}</span>
    </a>
  );
};

window.TeamsScreen = function TeamsScreen() {
  const [order, setOrder] = React.useState(0); // 0 division · 1 A–Z
  const [navOpen, setNavOpen] = React.useState(false);
  const divs = window.STANDINGS_DIVISIONS;
  const flat = React.useMemo(
    () => divs.flatMap(d => d.teams.map(x => ({ ...x, div: d.name })))
      .sort((a, b) => window.standingsTeam(a.k).name.localeCompare(window.standingsTeam(b.k).name)),
    [divs]);
  const col = { maxWidth: 1240, margin: '0 auto' };

  return (
    <div style={{ width: '100%', background: T.bg, color: T.text, fontFamily: T.sans, minHeight: 900, position: 'relative', overflow: 'hidden' }}>
      <window.BrandHeader back="Games" active="teams" onMenu={() => setNavOpen(true)} colStyle={col} />
      <div style={col}>
        <PageTitle
          title="Teams"
          subtitle="30 teams · 6 divisions"
          subtitleRight={
            <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
              <Eyebrow style={{ color: T.textFaint }}>Order</Eyebrow>
              <Segmented items={['Division', 'A–Z']} active={order} onClick={setOrder} />
            </div>
          }
        />

        {order === 0 ? (
          <div style={{ padding: '0 28px 44px', display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: '75px 30px' }}>
            {divs.map(d => (
              <div key={d.name}>
                <div style={{ padding: '0 6px 7px', borderBottom: `1px solid ${T.borderStrong}` }}>
                  <Eyebrow style={{ fontSize: 11.5 }}>{d.name}</Eyebrow>
                </div>
                {d.teams.map(x => <TeamsRow key={x.k} x={x} />)}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '0 28px 44px', display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: '0 34px' }}>
            {flat.map(x => <TeamsRow key={x.k} x={x} showDiv />)}
          </div>
        )}
      </div>
      <window.NavDrawer open={navOpen} onClose={() => setNavOpen(false)} active="teams" />
    </div>
  );
};
