// SNAPSHOT: copied from the live design workspace (holistic/player.jsx) on Sep 10, 2026.
// This is a FROZEN COPY for handoff. If the date above is old, the live file may have
// moved on — check before treating this as current.
/* global React, T, TEAMS, TeamDot, TeamMark, Card, Eyebrow, Stat, StatBlock, Pill, LivePill, Tabs, Segmented, Th, Td, Tr, Sparkline, StrikeZone, AppHeader, btn, btnPrimary, iconBtn, Page, PageTitle, Headshot */

// ============================================================
// PLAYER VIEW
// Restructured: full-width hero band with photo + slash line as the
// headline (kills the awkward left rail). Tabs span full width.
// Tab content uses the system; Splits and History get visual bars
// and sparklines, not just numbers.
// ============================================================

// ----- shared player helpers -----

function PlayerHero({ activeTab = 0, onTab }) {
  const tabs = ['Overview', 'Stats', 'Splits', 'Pitching', 'History', 'Upcoming'];
  const [cmpOpen, setCmpOpen] = React.useState(false);
  const [cmpSel, setCmpSel] = React.useState(null);
  const [notified, setNotified] = React.useState(false);
  const cmpWrap = React.useRef(null);
  const openCompare = () => {
    setCmpOpen((o) => {
      const next = !o;
      if (next) window.track && window.track('compare_opened', { player: 'Jeremy Peña' });
      return next;
    });
  };
  const selectCompare = (c) => {
    setCmpSel(c);
    setNotified(false);
    window.track && window.track('compare_player_selected', { player: 'Jeremy Peña', vs: c.name });
  };
  React.useEffect(() => {
    if (!cmpOpen) return;
    const onDoc = (e) => { if (cmpWrap.current && !cmpWrap.current.contains(e.target)) setCmpOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setCmpOpen(false); };
    document.addEventListener('pointerdown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [cmpOpen]);
  // Candidate players for the Compare picker (real MLB ids → real headshots/logos).
  const compareCandidates = [
    { name: 'Gunnar Henderson', team: TEAMS.BAL, pos: 'SS', line: '.281 / .350 / .478', mlbId: 683002 },
    { name: 'Anthony Volpe',    team: TEAMS.NYY, pos: 'SS', line: '.248 / .309 / .415', mlbId: 683011 },
    { name: 'Alex Bregman',     team: TEAMS.HOU, pos: '3B', line: '.262 / .342 / .441', mlbId: 608324 },
  ];
  // Today-game state. 'live' = player is in a game right now (default view);
  // 'none' = no game today (off-day, or season over). Drives BOTH the Today
  // widget and the hero's "Watch live" button, which must degrade together.
  const todayState = window.PLAYER_TODAY_STATE || 'live';
  const hasGameToday = todayState === 'live';
  return (
    <div style={{ padding: '0 28px' }}>
      <div style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: T.r.lg,
        boxShadow: T.sh.sm,
        overflow: 'hidden',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '124px 1fr auto', alignItems: 'center', gap: 24, padding: 24, borderBottom: `1px solid ${T.border}` }}>
          {/* Photo — shared Headshot atom: portrait crop, never clips the chin */}
          <Headshot team={TEAMS.HOU} initials="JP" mlbId={665161} size={124} ratio={1.32} />

          {/* Headline */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <TeamDot team={TEAMS.HOU} size={24} />
              {/* Team name links to the team page (app: <Link to={`/team/${abbr}`}>) */}
              <span style={{ fontSize: 13, color: T.textMuted, fontWeight: 600, cursor: 'pointer', textDecoration: 'none' }}>{TEAMS.HOU.name}</span>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: T.borderStrong }} />
              <Eyebrow>SS · #3 · R/R · 28 yrs</Eyebrow>
            </div>
            <h1 style={{ margin: 0, fontFamily: T.sans, fontSize: 38, fontWeight: 700, letterSpacing: '-0.02em' }}>
              Jeremy Peña
            </h1>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginTop: 10 }}>
              <span style={{ fontFamily: T.mono, fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em' }}>.239 / .278 / .299</span>
              <span style={{ fontSize: 12, color: T.textMuted, fontFamily: T.mono }}>.577 OPS</span>
              <span style={{ width: 1, height: 14, background: T.border }} />
              <span style={{ fontSize: 12, color: T.textMuted }}>2026 · 16 GP</span>
            </div>
          </div>

          {/* Today widget — clickable when there IS a game today (hovers to
              borderStrong + surface). With no game today it keeps the same box
              (so the hero grid doesn't reflow) but goes flat: dashed border, no
              hover, no cursor, and the last-game result stands in for the live
              line so the space still says something true. */}
          {hasGameToday ? (
            <div style={{
              width: 220, minHeight: 107, padding: '14px 16px', cursor: 'pointer',
              background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: T.r.md,
              transition: 'border-color 120ms, background 120ms',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.borderStrong; e.currentTarget.style.background = T.surface; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.background = T.surfaceAlt; }}
              onClick={() => window.openGameView && window.openGameView()}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Eyebrow>Today · vs CHC</Eyebrow>
                <LivePill label="ON DECK" />
              </div>
              <div style={{ fontFamily: T.mono, fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>1-for-3</div>
              <div style={{ fontFamily: T.mono, fontSize: 11, color: T.textMuted, marginTop: 4 }}>1B · K · F8 · BB</div>
            </div>
          ) : (
            <div style={{
              width: 220, minHeight: 107, padding: '14px 16px',
              background: 'transparent', border: `1px dashed ${T.borderStrong}`, borderRadius: T.r.md,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Eyebrow>Today</Eyebrow>
                <span style={{ fontSize: 11, fontWeight: 600, color: T.textFaint, letterSpacing: '0.04em' }}>OFF DAY</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.textMuted }}>No game today</div>
              <div style={{ fontSize: 11, color: T.textFaint, marginTop: 6, lineHeight: 1.45 }}>
                Last played <span style={{ fontFamily: T.mono, whiteSpace: 'nowrap' }}>Aug 26</span> at CHC · <span style={{ fontFamily: T.mono, whiteSpace: 'nowrap' }}>2-for-4</span>
              </div>
            </div>
          )}
        </div>

        {/* Bio strip + tabs */}
        <div style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${T.border}`, background: T.surfaceAlt }}>
          <div style={{ display: 'flex', gap: 22 }}>
            {[
              ['From', 'Santo Domingo, DR'],
              ['Debut', 'Apr 6, 2022'],
              ['Height', '6\' 0"'],
              ['Weight', '202 lbs'],
              ['Bats / Throws', 'R / R'],
            ].map(([l, v]) => (
              <div key={l}>
                <Eyebrow style={{ fontSize: 9 }}>{l}</Eyebrow>
                <div style={{ fontSize: 12, fontWeight: 600, marginTop: 2 }}>{v}</div>
              </div>
            ))}
          </div>
          <div ref={cmpWrap} style={{ display: 'flex', gap: 6, position: 'relative' }}>
            {/* Watch live — disabled with no game today. Dimmed, no hover, and
                retitled so the reason is legible rather than mysterious. */}
            <button
              style={hasGameToday ? btn : { ...btn, color: T.textFaint, borderColor: T.border, background: 'transparent', cursor: 'not-allowed' }}
              disabled={!hasGameToday}
              title={hasGameToday ? undefined : 'No game today'}
              onClick={() => hasGameToday && window.openGameView && window.openGameView()}
            >
              Watch live
              <svg width="10" height="11" viewBox="0 0 10 11" fill="currentColor" aria-hidden="true"><path d="M1 1.2v8.6a.5.5 0 0 0 .77.42l6.7-4.3a.5.5 0 0 0 0-.84L1.77.78A.5.5 0 0 0 1 1.2z"/></svg>
            </button>
            <button
              style={{ ...btn, ...(cmpOpen ? { background: T.surfaceAlt, borderColor: T.borderStrong } : {}) }}
              onClick={openCompare}
            >
              Compare
              <svg width="9" height="6" viewBox="0 0 9 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ transform: cmpOpen ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}><path d="M1 1l3.5 3.5L8 1"/></svg>
            </button>

            {cmpOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 6px)', right: 0, width: 280, zIndex: 40,
                background: T.surface, border: `1px solid ${T.borderStrong}`, borderRadius: T.r.md, boxShadow: T.sh.lg,
                overflow: 'hidden',
              }}>
                <div style={{ padding: '12px 14px 10px', borderBottom: `1px solid ${T.border}` }}>
                  <Eyebrow>Compare Peña with</Eyebrow>
                  <input
                    placeholder="Search players…"
                    style={{
                      marginTop: 8, width: '100%', boxSizing: 'border-box',
                      padding: '7px 10px', borderRadius: T.r.sm, border: `1px solid ${T.border}`,
                      background: T.surfaceAlt, fontFamily: T.sans, fontSize: 12, color: T.text, outline: 'none',
                    }}
                  />
                </div>
                <div style={{ padding: 6 }}>
                  {compareCandidates.map((c) => {
                    const sel = cmpSel && cmpSel.name === c.name;
                    return (
                      <button
                        key={c.name}
                        onClick={() => selectCompare(c)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
                          padding: '8px 8px', borderRadius: T.r.sm, cursor: 'pointer',
                          border: `1px solid ${sel ? T.borderStrong : 'transparent'}`,
                          background: sel ? T.surfaceAlt : 'transparent',
                        }}
                      >
                        <TeamDot team={c.team} size={26} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 600, color: T.text }}>{c.name}</div>
                          <div style={{ fontFamily: T.mono, fontSize: 10, color: T.textMuted, marginTop: 1, fontVariantNumeric: 'tabular-nums' }}>{c.team.abbr} · {c.pos} · {c.line}</div>
                        </div>
                        {sel && <span style={{ color: T.positive, fontSize: 13, fontWeight: 700 }}>✓</span>}
                      </button>
                    );
                  })}
                </div>
                <div style={{ padding: '12px 14px', borderTop: `1px solid ${T.border}`, background: T.surfaceAlt }}>
                  {!cmpSel ? (
                    <div style={{ fontSize: 12, color: T.textFaint }}>Pick a player to see the matchup.</div>
                  ) : notified ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: T.positive, fontWeight: 600 }}>
                      <span>✓</span>
                      <span>Thanks — we’ll let you know when Compare ships.</span>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: 11, color: T.textMuted, lineHeight: 1.45, marginBottom: 8 }}>
                        A side-by-side <strong style={{ color: T.text }}>Peña vs {cmpSel.name}</strong> breakdown is in the works.
                      </div>
                      <button
                        style={{ ...btnPrimary, width: '100%', justifyContent: 'center', fontSize: 12, padding: '8px 12px' }}
                        onClick={() => { setNotified(true); window.track && window.track('compare_notify_requested', { player: 'Jeremy Peña', vs: cmpSel.name }); }}
                      >
                        Notify me when this ships
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ padding: '0 24px' }}>
          <Tabs items={tabs} active={activeTab} onClick={onTab} />
        </div>
      </div>
    </div>
  );
}

// ----- Visual bar component for tables (0-1 normalized value) -----
function VBar({ value, max = 1, color, width = 70 }) {
  color = color || T.accent;
  const w = Math.min(100, (value / max) * 100);
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width, height: 5, background: T.surfaceAlt, borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${w}%`, height: '100%', background: color, borderRadius: 3 }} />
      </div>
    </div>
  );
}

// Hot zone — heat map rendered inside the SAME tall strike-zone frame used on the
// game page (home plate + perspective). Just wraps StrikeZone's heat mode.
function HotZone({ data, size = 150, title }) {
  return (
    <div>
      {title && <Eyebrow style={{ display: 'block', marginBottom: 8 }}>{title}</Eyebrow>}
      <StrikeZone size={size} heat={data} />
    </div>
  );
}

// ----- OVERVIEW -----

// Per-game "form guide": one bar per game (oldest → most recent), height = total
// bases that game. Varies game-to-game (unlike a flat late-season AVG line);
// hitless games show a faint stub, multi-base games saturate, HR games flagged.
function FormGuide({ games, width = 200, height = 56 }) {
  const maxTb = Math.max(4, ...games.map(g => g.tb));
  return (
    <div style={{ width }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height }}>
        {games.map((g, i) => {
          const hit = g.tb > 0;
          const barH = hit ? Math.round((g.tb / maxTb) * (height - 10)) + 6 : 3;
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
              {g.hr && <span style={{ width: 4, height: 4, borderRadius: '50%', background: T.highlight, marginBottom: 3 }} />}
              <div style={{
                width: '100%', height: barH, borderRadius: 2,
                background: hit ? T.accent : T.border,
                opacity: hit ? 0.45 + 0.55 * (g.tb / maxTb) : 1,
              }} />
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontFamily: T.mono, fontSize: 9, color: T.textFaint, letterSpacing: '0.02em' }}>
        <span>Total bases / game</span>
        <span>last night →</span>
      </div>
    </div>
  );
}

// 15 games, oldest → newest. Hits sum to 14 (matches "14-for-49"); 2 HR.
const RECENT_FORM_GAMES = [
  { tb: 1 }, { tb: 0 }, { tb: 3, xbh: true }, { tb: 1 }, { tb: 0 },
  { tb: 1 }, { tb: 0 }, { tb: 5, hr: true }, { tb: 0 }, { tb: 1 },
  { tb: 1 }, { tb: 0 }, { tb: 6, hr: true }, { tb: 1 }, { tb: 1 },
];

function OverviewTab() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 16, marginTop: 18 }}>
      {/* Recent form — per-game form guide + numbers */}
      <Card title="Recent form" subtitle="Last 15 games" action={<Pill tone="positive">▲ season avg</Pill>}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14, gap: 16 }}>
          <Stat label="Last 15 · AVG" value=".286" sub="14-for-49" size="hero" />
          <FormGuide games={RECENT_FORM_GAMES} width={210} height={56} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          <StatBlock label="OPS" value=".732" size="sm" />
          <StatBlock label="HR" value="2" size="sm" />
          <StatBlock label="RBI" value="9" size="sm" />
          <StatBlock label="K%" value="22.1" sub="−4.3% vs YTD" size="sm" />
        </div>
      </Card>

      {/* Hot zones — SLG by location; insights are the derived hottest + coldest
          zone (coldest in info blue), named from the 9-cell zone map. */}
      <Card title="Hot zones" subtitle="SLG by location · 2026">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, width: 'fit-content', maxWidth: '100%' }}>
          <HotZone data={[0.12, 0.42, 0.18, 0.31, 0.72, 0.55, 0.08, 0.24, 0.19]} size={150} />
          <div style={{ flex: 1, minWidth: 100, fontSize: 12, color: T.textMuted, lineHeight: 1.5, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div>
              <span style={{ fontFamily: T.mono, fontSize: 18, fontWeight: 700, color: T.accent }}>.720</span>
              <span style={{ fontFamily: T.mono, color: T.text, fontWeight: 600, marginLeft: 6 }}>middle-middle</span>
            </div>
            <div>
              <span style={{ fontFamily: T.mono, fontSize: 18, fontWeight: 700, color: T.info }}>.083</span>
              <span style={{ fontFamily: T.mono, color: T.text, fontWeight: 600, marginLeft: 6 }}>down &amp; away</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Streaks / context */}
      <Card title="Now" subtitle="Trends + notable">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { pill: <Pill tone="highlight">7 game</Pill>, label: 'Hitting streak' },
            { pill: <Pill tone="info">.353</Pill>, label: 'AVG last 7 games' },
            { pill: <Pill tone="positive">.732</Pill>, label: 'Season OPS' },
            { pill: <Pill tone="accent">22.1%</Pill>, label: 'Strikeout rate' },
          ].map((row, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingBottom: 10, borderBottom: i === 3 ? 'none' : `1px solid ${T.border}` }}>
              <span style={{ fontSize: 12, color: T.textMuted }}>{row.label}</span>
              {row.pill}
            </div>
          ))}
        </div>
      </Card>

      {/* Last 5 games — story strip */}
      <Card title="Last 5 games" subtitle="At-bat outcomes by game" style={{ gridColumn: '1 / -1' }} padless>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)' }}>
          {[
            { date: '05-24', opp: '@ CHC', result: 'W', line: '1-for-4', detail: '1B · K · F8 · BB', kpi: '.250', kpiLabel: 'AB AVG' },
            { date: '05-23', opp: '@ CHC', result: 'W', line: '0-for-4', detail: 'K · K · G6 · F7', kpi: '0', kpiLabel: 'Hits' },
            { date: '05-22', opp: '@ CHC', result: 'W', line: '1-for-5', detail: '1B · K · G3 · F8 · F9', kpi: '.200', kpiLabel: 'AB AVG' },
            { date: '05-20', opp: '@ MIN', result: 'L', line: '1-for-4', detail: 'K · K · K · 2B', kpi: '+1', kpiLabel: 'XBH' },
            { date: '05-19', opp: '@ MIN', result: 'W', line: '2-for-4', detail: '1B · 2B · F8 · K', kpi: '.500', kpiLabel: 'AB AVG' },
          ].map((g, i) => (
            <div key={i} style={{
              padding: '14px 16px',
              borderRight: i < 4 ? `1px solid ${T.border}` : 'none',
              display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Eyebrow style={{ fontSize: 10, fontFamily: T.mono }}>{g.date}</Eyebrow>
                <Pill tone={g.result === 'W' ? 'win' : 'loss'} style={{ padding: '1px 7px', fontSize: 10 }}>{g.result}</Pill>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{g.opp}</div>
              <div>
                <div style={{ fontFamily: T.mono, fontSize: 20, fontWeight: 700, letterSpacing: '-0.01em' }}>{g.line}</div>
                <div style={{ fontFamily: T.mono, fontSize: 10, color: T.textMuted, marginTop: 2 }}>{g.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Notable — milestones + achievements */}
      <Card title="Notable" subtitle="Season milestones" style={{ gridColumn: '1 / -1' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { eyebrow: 'Career', heading: '500 hits', detail: '14 hits away', progress: 0.97, tone: T.positive },
            { eyebrow: 'Season', heading: 'Multi-hit streak', detail: '3 games (career best: 6)', progress: 0.5, tone: T.highlight },
            { eyebrow: 'Defense', heading: 'Gold Glove pace', detail: '+2 OAA · top 8 at SS', progress: 0.65, tone: T.info },
            { eyebrow: 'Today', heading: 'On base streak', detail: '7 games · longest of season', progress: 0.7, tone: T.accent },
          ].map((n, i) => (
            <div key={i} style={{ padding: 12, background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: T.r.md, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Eyebrow>{n.eyebrow}</Eyebrow>
              <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em' }}>{n.heading}</div>
              <div style={{ height: 4, background: T.surface, borderRadius: 2, border: `1px solid ${T.border}` }}>
                <div style={{ width: `${n.progress * 100}%`, height: '100%', background: n.tone, borderRadius: 2 }} />
              </div>
              <div style={{ fontSize: 11, color: T.textMuted }}>{n.detail}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ----- STATS -----

// Glossary tooltip for unfamiliar stats. A small "?" marker that opens on BOTH
// hover (desktop) and click/tap (touch + keyboard). Dismisses on tap-out / Esc.
function StatInfo({ title, body, scale, align = 'left' }) {
  const [open, setOpen] = React.useState(false);   // click-latched
  const [hover, setHover] = React.useState(false);  // pointer hover
  const ref = React.useRef(null);
  const show = open || hover;
  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);
  return (
    <span ref={ref} style={{ position: 'relative', display: 'inline-flex', verticalAlign: 'middle', marginLeft: 6 }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <button
        aria-label={`What is ${title}?`}
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        style={{
          width: 15, height: 15, borderRadius: '50%', padding: 0, cursor: 'help',
          border: `1px solid ${show ? T.accent : T.borderStrong}`,
          background: show ? T.accent : 'transparent',
          color: show ? '#fff' : T.textMuted,
          fontFamily: T.sans, fontSize: 10, fontWeight: 700, lineHeight: 1,
          display: 'grid', placeItems: 'center', transition: 'all .12s',
        }}>?</button>
      {show && (
        <span role="tooltip" style={{
          position: 'absolute', bottom: 'calc(100% + 8px)',
          ...(align === 'right' ? { right: -2 } : { left: -2 }),
          width: 268, zIndex: 20, textAlign: 'left',
          background: T.ink, color: '#f4f1ea',
          border: `1px solid ${T.ink}`, borderRadius: T.r.md,
          boxShadow: '0 8px 28px rgba(0,0,0,.28)', padding: '11px 13px',
          fontFamily: T.sans, fontWeight: 500,
        }}>
          <span style={{ display: 'block', fontFamily: T.mono, fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: T.highlight, marginBottom: 5 }}>{title}</span>
          <span style={{ display: 'block', fontSize: 12.5, lineHeight: 1.5, color: '#e7e2d6' }}>{body}</span>
          {scale && <span style={{ display: 'block', marginTop: 7, paddingTop: 7, borderTop: '1px solid rgba(255,255,255,0.14)', fontFamily: T.mono, fontSize: 11, color: '#bdb6a6' }}>{scale}</span>}
          <span style={{ position: 'absolute', top: '100%', ...(align === 'right' ? { right: 1 } : { left: 7 }), transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: `6px solid ${T.ink}` }} />
        </span>
      )}
    </span>
  );
}

function StatsTab() {
  const SectionTable = ({ title, items }) => (
    <Card title={title} padless style={{ marginBottom: 14 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: T.surfaceAlt }}>
            <Th align="left" style={{ paddingLeft: 20, paddingTop: 12, paddingBottom: 12 }}>Statistic</Th>
            <Th align="right" style={{ paddingTop: 12, paddingBottom: 12 }}>2026</Th>
            <Th align="right" style={{ paddingTop: 12, paddingBottom: 12 }}>League</Th>
            <Th align="right" style={{ paddingTop: 12, paddingBottom: 12 }}>Δ</Th>
            <Th align="left" style={{ paddingRight: 20, paddingTop: 12, paddingBottom: 12, width: 220 }}>Percentile</Th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.label}>
              <td style={{
                fontFamily: T.sans, fontSize: 14, fontWeight: 600,
                padding: '14px 8px 14px 20px',
                borderBottom: `1px solid ${T.border}`,
                color: T.text,
              }}>
                {it.label}
                {it.info && <StatInfo title={it.info.title} body={it.info.body} scale={it.info.scale} />}
                {it.note && <span style={{ marginLeft: 8, fontSize: 11, color: T.textMuted, fontWeight: 500 }}>{it.note}</span>}
              </td>
              <td style={{
                fontFamily: T.mono, fontSize: 18, fontWeight: 700,
                padding: '14px 8px', textAlign: 'right',
                color: it.hot ? T.accent : T.text,
                fontVariantNumeric: 'tabular-nums',
                borderBottom: `1px solid ${T.border}`,
              }}>{it.value}</td>
              <td style={{
                fontFamily: T.mono, fontSize: 14,
                padding: '14px 8px', textAlign: 'right',
                color: T.textMuted,
                fontVariantNumeric: 'tabular-nums',
                borderBottom: `1px solid ${T.border}`,
              }}>{it.lg || '—'}</td>
              <td style={{
                fontFamily: T.mono, fontSize: 13, fontWeight: 600,
                padding: '14px 8px', textAlign: 'right',
                color: it.deltaTone === 'positive' ? T.positive : it.deltaTone === 'negative' ? T.accent : T.textMuted,
                fontVariantNumeric: 'tabular-nums',
                borderBottom: `1px solid ${T.border}`,
              }}>{it.delta || '—'}</td>
              <td style={{ padding: '14px 20px 14px 8px', borderBottom: `1px solid ${T.border}` }}>
                {it.pct !== undefined ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1, height: 6, background: T.surfaceAlt, borderRadius: 3, overflow: 'hidden', border: `1px solid ${T.border}` }}>
                      <div style={{
                        width: `${it.pct}%`, height: '100%',
                        background: it.pct >= 60 ? T.positive : it.pct >= 40 ? T.highlight : T.accent,
                        borderRadius: 3,
                      }} />
                    </div>
                    <span style={{ fontFamily: T.mono, fontSize: 12, color: T.textMuted, fontWeight: 600, minWidth: 36, textAlign: 'right' }}>{it.pct}<span style={{ color: T.textFaint }}>th</span></span>
                  </div>
                ) : <span style={{ color: T.textFaint, fontSize: 12 }}>—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );

  return (
    <div style={{ marginTop: 18 }}>
      {/* Range filter */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <Segmented items={['2026 season', 'Last 30d', 'Last 7d', 'Today', 'Career']} active={0} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Eyebrow>Compare</Eyebrow>
          <Segmented items={['League avg', 'Position', 'Team']} active={0} size="sm" />
        </div>
      </div>

      <SectionTable title="Rate" items={[
        { label: 'Batting Average',    value: '.239', lg: '.248', delta: '−9 pts',   deltaTone: 'negative', pct: 38 },
        { label: 'On-Base %',          value: '.278', lg: '.319', delta: '−41 pts',  deltaTone: 'negative', pct: 22, note: 'low walk rate' },
        { label: 'Slugging %',         value: '.299', lg: '.412', delta: '−113 pts', deltaTone: 'negative', pct: 14 },
        { label: 'OPS',                value: '.577', lg: '.731', delta: '−154 pts', deltaTone: 'negative', hot: true, pct: 16 },
        { label: 'wOBA',               value: '.272', lg: '.318', delta: '−46 pts',  deltaTone: 'negative', pct: 18,
          info: { title: 'Weighted On-Base Avg', body: 'Like OBP, but each way of reaching base is weighted by how much it actually helps you score — a homer counts far more than a walk. Scaled to look like OBP.', scale: '.320 ≈ average · .370+ great · .290 poor' } },
        { label: 'wRC+',               value: '78',   lg: '100',  delta: '−22',      deltaTone: 'negative', pct: 24, note: 'park-adjusted',
          info: { title: 'Weighted Runs Created +', body: 'Total offense rolled into one number, adjusted for ballpark and era. The single cleanest "is this hitter good?" stat.', scale: '100 = league average · each point = 1% better / worse' } },
      ]} />

      {/* Counting stats are raw totals, not percentiled — a percentile on a
          counting total conflates playing time with skill (an "8th-pct" stamp
          on 2 HR in a 29-game sample reflects sample size, not talent). Savant
          reserves percentile sliders for rate/quality stats; we do the same.
          Comparison context lives in the per-game/per-PA note instead. */}
      <SectionTable title="Production" items={[
        { label: 'Runs',          value: '7',  note: '0.44 / game' },
        { label: 'RBI',           value: '3',  note: '0.19 / game' },
        { label: 'Home Runs',     value: '0',  note: 'Zero in 16 games' },
        { label: 'Extra-base hits', value: '4', note: '4 doubles' },
        { label: 'Total bases',   value: '20', note: '1.25 / game' },
      ]} />

      <SectionTable title="Plate discipline" items={[
        { label: 'Walk %',            value: '4.2%',  lg: '8.4%',  delta: '−4.2 pts', deltaTone: 'negative', pct: 12 },
        { label: 'Strikeout %',       value: '19.4%', lg: '22.6%', delta: '−3.2 pts', deltaTone: 'positive', pct: 64 },
        { label: 'Chase %',           value: '32.1%', lg: '28.4%', delta: '+3.7 pts', deltaTone: 'negative', pct: 28, note: 'chases outside zone',
          info: { title: 'Chase Rate', body: 'How often he swings at pitches OUTSIDE the strike zone. Lower is better — chasing bad pitches leads to weak contact and strikeouts.', scale: 'Lower = more disciplined · ~28% is average' } },
        { label: 'Whiff %',           value: '24.8%', lg: '24.5%', delta: '+0.3 pts', deltaTone: 'neutral', pct: 50,
          info: { title: 'Whiff Rate', body: 'Share of swings that miss entirely. A swing-and-miss measure of bat-to-ball skill — lower means more contact.', scale: 'Lower = more contact · ~25% is average' } },
        { label: 'Contact %',         value: '75.2%', lg: '76.8%', delta: '−1.6 pts', deltaTone: 'neutral', pct: 46 },
        { label: 'Swing %',           value: '49.1%', lg: '47.0%', delta: '+2.1 pts', deltaTone: 'neutral', pct: 58 },
      ]} />

      <SectionTable title="Contact quality · Statcast" items={[
        { label: 'Exit Velocity (avg)', value: '88.1', lg: '88.5', delta: '−0.4',   deltaTone: 'neutral', pct: 48, note: 'mph' },
        { label: 'Exit Velocity (max)', value: '108.3', lg: '105.4', delta: '+2.9', deltaTone: 'positive', pct: 78, note: 'mph' },
        { label: 'Hard Hit %',          value: '37.2%', lg: '38.0%', delta: '−0.8 pts', deltaTone: 'neutral', pct: 46,
          info: { title: 'Hard-Hit Rate', body: 'Share of batted balls hit at 95+ mph exit velocity. Hard contact turns into hits and extra bases far more often — higher is better.', scale: 'Higher = better · ~38% is average' } },
        { label: 'Barrel %',            value: '4.6%',  lg: '7.4%',  delta: '−2.8 pts', deltaTone: 'negative', pct: 22,
          info: { title: 'Barrel Rate', body: 'Share of batted balls hit in the ideal exit-velocity + launch-angle combo — the “barrel.” Barrels become extra-base hits and homers most often. The gold standard for damage.', scale: 'Higher = better · ~7–8% is average' } },
        { label: 'Launch Angle',        value: '11.8°', lg: '12.5°', delta: '−0.7°',    deltaTone: 'neutral', pct: 42, note: 'flat plane' },
      ]} />

      <SectionTable title="Volume + speed" items={[
        { label: 'Games',         value: '16',   note: 'starts: 15' },
        { label: 'At-Bats',       value: '67' },
        { label: 'Plate Appearances', value: '71' },
        { label: 'Stolen Bases',  value: '1',    note: '1 attempt · 100%' },
      ]} />
    </div>
  );
}

// ----- SPLITS -----

function SplitsTab() {
  const CATS = ['All splits', 'Handedness', 'Venue', 'Day/Night', 'Bases', 'Count', 'Pitch type'];
  // App ships two ranges only — "Last 30d" has no split-level data.
  const FRAMES = ['2026', 'Career'];
  const FRAME_LABEL = { '2026': '2026 season', 'Career': 'career' };
  const [cat, setCat] = React.useState(0);
  const [frame, setFrame] = React.useState(0);
  const SplitTable = ({ title, rows, cols = ['G','AB','H','HR','RBI','BB','K','AVG','OBP','SLG','OPS'] }) => (
    <Card title={title} padless style={{ marginBottom: 16 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <Th align="left" style={{ paddingLeft: 18 }}>Split</Th>
            {cols.map(c => <Th key={c}>{c}</Th>)}
            <Th style={{ paddingRight: 18 }}>vs Lg</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <Td align="left" mono={false} style={{ paddingLeft: 18, fontWeight: 600 }}>{r.label}</Td>
              <Td>{r.G}</Td>
              <Td>{r.AB}</Td>
              <Td>{r.H}</Td>
              <Td dim={r.HR === '0'}>{r.HR}</Td>
              <Td>{r.RBI}</Td>
              <Td>{r.BB}</Td>
              <Td>{r.K}</Td>
              <Td hot>{r.AVG}</Td>
              <Td>{r.OBP}</Td>
              <Td>{r.SLG}</Td>
              <Td hot>{r.OPS}</Td>
              <Td style={{ paddingRight: 18 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <VBar value={parseFloat(r.OPS.replace('.','0.'))} max={1} color={r.hot ? T.positive : T.accent} width={50} />
                  <span style={{ fontFamily: T.mono, fontSize: 10, color: r.hot ? T.positive : T.textMuted, fontWeight: 600 }}>
                    {r.delta}
                  </span>
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );

  // Each table tagged with the rail category it belongs to.
  const tables = [
    { cat: 'Handedness', title: 'Pitcher handedness', rows: [
      { label: 'vs LHP', G: 7,  AB: 14, H: 4,  HR: '0', RBI: 2, BB: 1, K: 3,  AVG: '.286', OBP: '.375', SLG: '.357', OPS: '.732', hot: true, delta: '+.155' },
      { label: 'vs RHP', G: 16, AB: 53, H: 12, HR: '0', RBI: 1, BB: 2, K: 10, AVG: '.226', OBP: '.250', SLG: '.283', OPS: '.533', delta: '−.044' },
    ] },
    { cat: 'Venue', title: 'Venue', rows: [
      { label: 'Home', G: 3,  AB: 15, H: 3,  HR: '0', RBI: 0, BB: 0, K: 3,  AVG: '.200', OBP: '.200', SLG: '.200', OPS: '.400', delta: '−.177' },
      { label: 'Away', G: 13, AB: 52, H: 13, HR: '0', RBI: 3, BB: 3, K: 10, AVG: '.250', OBP: '.298', SLG: '.327', OPS: '.625', hot: true, delta: '+.048' },
    ] },
    { cat: 'Day/Night', title: 'Day / Night', rows: [
      { label: 'Day',   G: 7, AB: 30, H: 6,  HR: '0', RBI: 2, BB: 1, K: 10, AVG: '.200', OBP: '.226', SLG: '.267', OPS: '.493', delta: '−.084' },
      { label: 'Night', G: 9, AB: 37, H: 10, HR: '0', RBI: 1, BB: 2, K: 3,  AVG: '.270', OBP: '.317', SLG: '.324', OPS: '.641', hot: true, delta: '+.064' },
    ] },
    { cat: 'Bases', title: 'Baserunners', rows: [
      { label: 'Bases empty', G: 16, AB: 40, H: 10, HR: '0', RBI: 0, BB: 1, K: 8, AVG: '.250', OBP: '.268', SLG: '.300', OPS: '.568', delta: '−.009' },
      { label: 'Runners on',  G: 14, AB: 27, H: 6,  HR: '0', RBI: 3, BB: 2, K: 5, AVG: '.222', OBP: '.276', SLG: '.296', OPS: '.572', delta: '−.005' },
      { label: 'RISP',        G: 12, AB: 18, H: 3,  HR: '0', RBI: 3, BB: 2, K: 4, AVG: '.167', OBP: '.250', SLG: '.222', OPS: '.472', delta: '−.105' },
    ] },
    { cat: 'Count', title: 'Count leverage', rows: [
      { label: 'Ahead in count', G: 16, AB: 22, H: 8,  HR: '0', RBI: 1, BB: 0, K: 1, AVG: '.364', OBP: '.364', SLG: '.500', OPS: '.864', hot: true, delta: '+.287' },
      { label: 'Even',           G: 16, AB: 28, H: 6,  HR: '0', RBI: 1, BB: 0, K: 4, AVG: '.214', OBP: '.214', SLG: '.286', OPS: '.500', delta: '−.077' },
      { label: 'Behind',         G: 14, AB: 17, H: 2,  HR: '0', RBI: 1, BB: 0, K: 8, AVG: '.118', OBP: '.118', SLG: '.176', OPS: '.294', delta: '−.283' },
    ] },
    { cat: 'Pitch type', title: 'Pitch type', rows: [
      { label: 'vs Fastball', G: 16, AB: 38, H: 11, HR: '0', RBI: 2, BB: 1, K: 4, AVG: '.289', OBP: '.325', SLG: '.368', OPS: '.693', hot: true, delta: '+.116' },
      { label: 'vs Breaking', G: 16, AB: 21, H: 3,  HR: '0', RBI: 1, BB: 1, K: 7, AVG: '.143', OBP: '.182', SLG: '.190', OPS: '.372', delta: '−.205' },
      { label: 'vs Offspeed', G: 13, AB: 8,  H: 2,  HR: '0', RBI: 0, BB: 0, K: 2, AVG: '.250', OBP: '.250', SLG: '.375', OPS: '.625', delta: '+.048' },
    ] },
  ];
  const activeCat = CATS[cat];
  const visible = activeCat === 'All splits' ? tables : tables.filter(t => t.cat === activeCat);

  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <Segmented items={CATS} active={cat} onClick={setCat} />
        <Segmented items={FRAMES} active={frame} onClick={setFrame} size="sm" />
      </div>
      <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 16 }}>
        Showing {activeCat === 'All splits' ? `all ${tables.length} split groups` : `“${activeCat}”`} · {FRAME_LABEL[FRAMES[frame]]}
      </div>

      {visible.map(t => <SplitTable key={t.title} title={t.title} rows={t.rows} />)}
    </div>
  );
}

// ----- PITCHING (for batter: "how pitchers attack you") -----
//
// OPTION 2 (BUG-011, Jun 20 2026): a LEAN, player-specific tab built ONLY from
// data the current API can produce — pitch-type slash splits and
// handedness slash splits.
// DATA SOURCE (corrected Jun 20): pitch-type slash splits are NOT from
// `splits` group=pitchType (that returns ZERO rows for batters). They are
// aggregated server-side from the `pitchLog` stat type — see PR 6.6
// (PROMPT_pitching_pitchtype_wiring.md). Handedness splits are unaffected.
// Jul 24, 2026 — Statcast/Savant ingest wired: the RICH five-card design
// (pitch mix, whiff%, location heat map, count-attack grid) is restored here,
// merged with the already-real pitchLog/handedness data (see PitchingTab below).

// ===== RICH Pitching tab (BUG-011 option 1, restored) =====
// Statcast/Savant ingest wired (Jul 24, 2026) — pitch-mix, whiff%, and
// location data now flow through, so the lean fallback (pitchLog-only
// AVG/SLG/OPS) is retired: this table MERGES pitchLog's real per-AB slash
// data with the new Statcast whiff% column (whiff% is the only net-new
// field — AB/AVG/SLG/OPS are unchanged from the lean tab, PR 6.6). Handedness
// zone%/FPS%/put-away are restored now that zone data exists.
function PitchingTab() {
  const pitches = [
    { type: 'Four-seam', color: '#dc2626', AB: 78, AVG: '.269', SLG: '.397', OPS: '.731', share: 38, whiff: '17%' },
    { type: 'Slider',    color: '#0891b2', AB: 52, AVG: '.173', SLG: '.250', OPS: '.505', share: 19, whiff: '38%' },
    { type: 'Sinker',    color: '#ea580c', AB: 41, AVG: '.293', SLG: '.415', OPS: '.760', share: 17, whiff: '9%' },
    { type: 'Changeup',  color: '#16a34a', AB: 31, AVG: '.323', SLG: '.548', OPS: '.881', share: 11, whiff: '14%' },
    { type: 'Curveball', color: '#3b82f6', AB: 23, AVG: '.217', SLG: '.304', OPS: '.591', share: 9,  whiff: '24%' },
    { type: 'Cutter',    color: '#a3a3a3', AB: 23, AVG: '.130', SLG: '.174', OPS: '.402', share: 6,  whiff: '50%' },
  ];
  const totalAB = pitches.reduce((s, p) => s + p.AB, 0);
  const PITCHES_SEEN = 314; // pitch-level count (Statcast) — the tab's denominator
  const num = (s) => parseFloat(String(s).replace('.', '0.'));
  let hot = pitches[0], cold = pitches[0];
  pitches.forEach(p => { if (num(p.OPS) > num(hot.OPS)) hot = p; if (num(p.OPS) < num(cold.OPS)) cold = p; });

  const [filter, setFilter] = React.useState(0); // 0 All · 1 vs LHP · 2 vs RHP · 3 In-zone · 4 Outside-zone
  const zonePct = { LHP: 52, RHP: 47 };
  const zonePA = { LHP: 14, RHP: 53 };
  const inZone = Math.round((zonePct.LHP * zonePA.LHP + zonePct.RHP * zonePA.RHP) / (zonePA.LHP + zonePA.RHP));
  const outsideZone = 100 - inZone;

  // The zone filters read two DIFFERENT Statcast subsets (app:
  // `statcast.inZonePitchMix` / `outZonePitchMix`) — pitchers don't throw the
  // same mix in and out of the zone, which is the whole point of the view.
  // Counts split PITCHES_SEEN on the in/out share above; usage is derived from
  // the counts so the column can't contradict them.
  const IN_ZONE_MIX = [
    { type: 'Four-seam', color: '#dc2626', n: 69, whiff: '12%' },
    { type: 'Sinker',    color: '#ea580c', n: 32, whiff: '7%'  },
    { type: 'Slider',    color: '#0891b2', n: 20, whiff: '26%' },
    { type: 'Cutter',    color: '#a3a3a3', n: 12, whiff: '33%' },
    { type: 'Changeup',  color: '#16a34a', n: 11, whiff: '10%' },
    { type: 'Curveball', color: '#3b82f6', n: 7,  whiff: '15%' },
  ];
  const OUT_ZONE_MIX = [
    { type: 'Slider',    color: '#0891b2', n: 41, whiff: '44%' },
    { type: 'Four-seam', color: '#dc2626', n: 38, whiff: '22%' },
    { type: 'Changeup',  color: '#16a34a', n: 27, whiff: '31%' },
    { type: 'Curveball', color: '#3b82f6', n: 24, whiff: '29%' },
    { type: 'Sinker',    color: '#ea580c', n: 19, whiff: '14%' },
    { type: 'Cutter',    color: '#a3a3a3', n: 14, whiff: '55%' },
  ];
  const zoneMix = filter === 3 ? IN_ZONE_MIX : OUT_ZONE_MIX;
  const zoneTotal = zoneMix.reduce((s, p) => s + p.n, 0);

  const hands = [
    { vs: 'RHP', AB: 188, AVG: '.247', OBP: '.298', SLG: '.402', OPS: '.700', FB: '57%', BRK: '28%', OS: '15%', zone: zonePct.RHP, fps: '61%', putaway: '28%' },
    { vs: 'LHP', AB: 60,  AVG: '.283', OBP: '.344', SLG: '.500', OPS: '.844', FB: '49%', BRK: '27%', OS: '24%', zone: zonePct.LHP, fps: '65%', putaway: '22%' },
  ];
  const harder = num(hands[0].OPS) >= num(hands[1].OPS) ? hands[0] : hands[1];
  const easier = harder === hands[0] ? hands[1] : hands[0];

  const zoneData = [0.18, 0.42, 0.12, 0.28, 0.84, 0.58, 0.04, 0.21, 0.15];
  const zoneNames = ['up & in', 'up', 'up & away', 'middle in', 'middle-middle', 'middle away', 'down & in', 'down', 'down & away'];
  let hotIdx = 0, coldIdx = 0;
  zoneData.forEach((v, i) => { if (v > zoneData[hotIdx]) hotIdx = i; if (v < zoneData[coldIdx]) coldIdx = i; });

  const SLG_MAX = 0.6;
  const SlgBar = ({ slg, color }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
      <span style={{ minWidth: 34, textAlign: 'right' }}>{slg}</span>
      <div style={{ width: 56, height: 5, background: T.surfaceAlt, borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(100, (num(slg) / SLG_MAX) * 100)}%`, height: '100%', background: color, borderRadius: 3 }} />
      </div>
    </div>
  );

  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 14, gap: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontFamily: T.sans, fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em' }}>How pitchers attack Peña</h2>
          <div style={{ fontSize: 12, color: T.textMuted, marginTop: 4 }}>
            <span style={{ fontFamily: T.mono, fontWeight: 600 }}>{filter >= 3 ? zoneTotal : PITCHES_SEEN}</span> pitches seen · 2026 season{filter >= 3 ? ` · ${filter === 3 ? 'in-zone' : 'out-of-zone'} only` : ''}
          </div>
        </div>
        <Segmented items={['All', 'vs LHP', 'vs RHP', 'In strike zone', 'Outside zone']} active={filter} onClick={setFilter} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.2fr 1fr', gap: 16 }}>
        <Card title="Pitch mix">
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <Donut data={pitches.map(p => ({ value: p.share, color: p.color }))} size={170} total={PITCHES_SEEN} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {pitches.map(p => (
                <div key={p.type} style={{ display: 'grid', gridTemplateColumns: '12px 1fr auto', gap: 8, alignItems: 'center', fontSize: 12 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: p.color }} />
                  <span>{p.type}</span>
                  <span style={{ fontFamily: T.mono, color: T.textMuted, fontWeight: 600 }}>{p.share}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card title="Performance by pitch type" subtitle="AVG/SLG/OPS from pitchLog · whiff% from Statcast" padless>
          {/* The two zone filters swap this card's body for a usage + whiff view
              of the pitches thrown there (app behaviour). */}
          {filter >= 3 ? (
            <>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <Th align="left" style={{ paddingLeft: 16 }}>Pitch</Th>
                    <Th>Pitches</Th>
                    <Th>Usage</Th>
                    <Th style={{ paddingRight: 16 }}>Whiff</Th>
                  </tr>
                </thead>
                <tbody>
                  {zoneMix.map(p => (
                    <tr key={p.type}>
                      <Td align="left" mono={false} style={{ paddingLeft: 16, fontWeight: 600 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ width: 8, height: 8, borderRadius: 2, background: p.color }} />
                          {p.type}
                        </span>
                      </Td>
                      <Td style={{ color: T.textMuted }}>{p.n}</Td>
                      <Td>{Math.round((p.n / zoneTotal) * 100)}%</Td>
                      <Td style={{ paddingRight: 16, fontWeight: 600 }}>{p.whiff}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ padding: '12px 16px', borderTop: `1px solid ${T.border}`, fontSize: 12, color: T.textMuted, lineHeight: 1.5 }}>
                How pitchers attack Peña with {filter === 3 ? 'in-zone' : 'out-of-zone'} pitches · usage and whiff rate by type
              </div>
            </>
          ) : (
          <>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <Th align="left" style={{ paddingLeft: 16 }}>Pitch</Th>
                <Th>AB</Th>
                <Th>AVG</Th>
                <Th style={{ width: 116 }}>SLG</Th>
                <Th>Whiff</Th>
                <Th style={{ paddingRight: 16 }}>OPS</Th>
              </tr>
            </thead>
            <tbody>
              {pitches.map(p => (
                <tr key={p.type}>
                  <Td align="left" mono={false} style={{ paddingLeft: 16, fontWeight: 600 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: p.color }} />
                      {p.type}
                    </span>
                  </Td>
                  <Td style={{ color: T.textMuted }}>{p.AB}</Td>
                  <Td hot={num(p.AVG) >= 0.28}>{p.AVG}</Td>
                  <Td style={{ width: 116 }}><SlgBar slg={p.SLG} color={p.color} /></Td>
                  <Td>{p.whiff}</Td>
                  <Td hot={num(p.OPS) >= 0.8} style={{ paddingRight: 16, fontWeight: 600 }}>{p.OPS}</Td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: '12px 16px', borderTop: `1px solid ${T.border}`, fontSize: 11, color: T.textMuted, lineHeight: 1.5 }}>
            Most vulnerable to the <span style={{ color: T.text, fontWeight: 600 }}>{hot.type.toLowerCase()}</span>
            {' '}(<span style={{ fontFamily: T.mono, color: T.accent, fontWeight: 700 }}>{hot.OPS}</span> OPS);
            {' '}quietest against the <span style={{ color: T.text, fontWeight: 600 }}>{cold.type.toLowerCase()}</span>
            {' '}(<span style={{ fontFamily: T.mono, color: T.textFaint, fontWeight: 700 }}>{cold.OPS}</span>).
          </div>
          </>
          )}
        </Card>

        <Card title="Damage by location" subtitle="SLG · 2026">
          {(() => {
            const fmt = (v) => v.toFixed(3).replace(/^0/, '');
            const ExtremeRow = ({ label, idx, color }) => (
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: 11, color: T.textMuted }}>{label}</span>
                <span style={{ display: 'flex', alignItems: 'baseline', gap: 6, minWidth: 0 }}>
                  <span style={{ fontFamily: T.mono, fontSize: 15, fontWeight: 700, color }}>{fmt(zoneData[idx])}</span>
                  <span style={{ fontSize: 11, color: T.text, whiteSpace: 'nowrap' }}>{zoneNames[idx]}</span>
                </span>
              </div>
            );
            return (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <HotZone data={zoneData} size={150} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
                  <div>
                    <Eyebrow style={{ fontSize: 9 }}>SLG scale</Eyebrow>
                    <div style={{ height: 8, borderRadius: 4, marginTop: 6, background: `linear-gradient(90deg, ${T.surfaceAlt} 0%, ${T.accentSoft} 45%, ${T.accent} 100%)` }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontFamily: T.mono, fontSize: 10, color: T.textMuted }}>
                      <span>.000</span><span>.840+</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                    <ExtremeRow label="Hottest" idx={hotIdx} color={T.accent} />
                    <ExtremeRow label="Coldest" idx={coldIdx} color={T.textFaint} />
                  </div>
                </div>
              </div>
            );
          })()}
          <div style={{ marginTop: 14, fontSize: 11, color: T.textMuted, lineHeight: 1.5 }}>
            Pitchers throw <span style={{ fontFamily: T.mono, color: T.text, fontWeight: 600 }}>{outsideZone}%</span> outside the strike zone vs Peña, exploiting his coldest zone <span style={{ color: T.text, fontWeight: 600 }}>{zoneNames[coldIdx]}</span> (<span style={{ fontFamily: T.mono, color: T.text, fontWeight: 600 }}>{zoneData[coldIdx].toFixed(3).replace(/^0/, '')}</span> SLG).
          </div>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
        <Card title="By pitcher hand" subtitle="Platoon split · 2026" padless>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <Th align="left" style={{ paddingLeft: 16 }}>vs</Th>
                <Th>AB</Th>
                <Th>AVG</Th>
                <Th>OBP</Th>
                <Th>SLG</Th>
                <Th>OPS</Th>
                <Th>Zone%</Th>
                <Th>FPS%</Th>
                <Th style={{ paddingRight: 16 }}>Put-away</Th>
              </tr>
            </thead>
            <tbody>
              {hands.map(h => (
                <tr key={h.vs}>
                  <Td align="left" mono={false} style={{ paddingLeft: 16, fontWeight: 600 }}>{h.vs}</Td>
                  <Td style={{ color: T.textMuted }}>{h.AB}</Td>
                  <Td>{h.AVG}</Td>
                  <Td>{h.OBP}</Td>
                  <Td>{h.SLG}</Td>
                  <Td hot={num(h.OPS) >= 0.8} style={{ fontWeight: 600 }}>{h.OPS}</Td>
                  <Td>{h.zone}%</Td>
                  <Td>{h.fps}</Td>
                  <Td style={{ paddingRight: 16 }}>{h.putaway}</Td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: '12px 16px', borderTop: `1px solid ${T.border}`, fontSize: 11, color: T.textMuted, lineHeight: 1.5 }}>
            Hits <span style={{ color: T.text, fontWeight: 600 }}>{harder.vs}</span> harder —
            {' '}<span style={{ fontFamily: T.mono, color: T.text, fontWeight: 700 }}>{harder.OPS}</span> OPS
            {' '}vs <span style={{ fontFamily: T.mono, color: T.textMuted, fontWeight: 600 }}>{easier.OPS}</span> against {easier.vs}.
          </div>
        </Card>

        <Card title="Counts attacked" subtitle="Go-to pitch per count · 2026">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {[
              { c: '0-2', p: 'Slider', thrown: '38%', k: '31%' },
              { c: '1-2', p: 'Slider', thrown: '34%', k: '27%' },
              { c: 'Ahead', p: 'Sinker', thrown: '24%', state: true },
              { c: '2-2', p: '4-Seam', thrown: '29%', k: '22%' },
              { c: '3-2', p: '4-Seam', thrown: '41%', k: '24%' },
              { c: 'Behind', p: '4-Seam', thrown: '52%', state: true },
            ].map((cell) => (
              <div key={cell.c} style={{
                padding: '10px 12px',
                background: cell.state ? T.surface : T.surfaceAlt,
                borderRadius: T.r.sm,
                border: cell.state ? `1px dashed ${T.borderStrong}` : `1px solid ${T.border}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 6 }}>
                  <Eyebrow style={{ fontSize: 9 }}>{cell.c}</Eyebrow>
                  <span style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 700 }}>{cell.p}</span>
                </div>
                <div style={{ display: 'flex', gap: 14, marginTop: 9 }}>
                  <div>
                    <div style={{ fontFamily: T.mono, fontSize: 15, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{cell.thrown}</div>
                    <Eyebrow style={{ fontSize: 8 }}>thrown</Eyebrow>
                  </div>
                  {!cell.state && (
                    <div>
                      <div style={{ fontFamily: T.mono, fontSize: 15, fontWeight: 700, color: T.accent, fontVariantNumeric: 'tabular-nums' }}>{cell.k}</div>
                      <Eyebrow style={{ fontSize: 8 }}>put-away K</Eyebrow>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}


function Donut({ data, size = 160, thickness = 22, total }) {
  const r = size / 2;
  const cr = r - thickness / 2;
  // Arcs are normalised by the SUM of the values, so the ring always closes;
  // `total` is the centre-label figure only (a different denominator).
  const sum = data.reduce((s, d) => s + d.value, 0) || 1;
  let angle = -Math.PI / 2;
  const segs = data.map(d => {
    const a0 = angle;
    const a1 = angle + (d.value / sum) * Math.PI * 2;
    angle = a1;
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const x0 = r + cr * Math.cos(a0), y0 = r + cr * Math.sin(a0);
    const x1 = r + cr * Math.cos(a1), y1 = r + cr * Math.sin(a1);
    return { x0, y0, x1, y1, large, color: d.color, value: d.value };
  });
  return (
    <svg width={size} height={size}>
      {segs.map((s, i) => (
        <path key={i}
              d={`M ${s.x0} ${s.y0} A ${cr} ${cr} 0 ${s.large} 1 ${s.x1} ${s.y1}`}
              fill="none" stroke={s.color} strokeWidth={thickness} strokeLinecap="butt" />
      ))}
      <circle cx={r} cy={r} r={cr - thickness / 2 - 2} fill={T.surface} />
      <text x={r} y={r - 2} textAnchor="middle" fontFamily={T.sans} fontSize="10" fontWeight="700" letterSpacing="0.1em" fill={T.textMuted}>PITCHES</text>
      <text x={r} y={r + 18} textAnchor="middle" fontFamily={T.mono} fontSize="22" fontWeight="700" fill={T.text}>{total}</text>
    </svg>
  );
}

// ----- HISTORY -----

function HistoryTab() {
  const SEASONS = ['2026', '2025', '2024', '2023', '2022'];
  const [sub, setSub] = React.useState(0);
  const [season, setSeason] = React.useState(0);
  const [vsSort, setVsSort] = React.useState(0);

  const gamesBySeason = {
    '2026': [
      ['05-24', 'W', '@ Cubs',     '1-4', '0','2','0','3', '.239', '1-for-4 with K'],
      ['05-23', 'W', '@ Cubs',     '0-4', '0','0','0','0', '.238', 'Hit by pitch · 0-for-4'],
      ['05-22', 'W', '@ Cubs',     '1-5', '0','0','0','1', '.254', 'Single · K'],
      ['05-20', 'L', '@ Twins',    '1-4', '0','0','0','3', '.259', '3 K · cold'],
      ['05-19', 'W', '@ Twins',    '2-4', '0','0','0','0', '.260', '2 hits'],
      ['05-18', 'L', '@ Twins',    '0-3', '0','1','0','0', '.239', 'RBI groundout'],
      ['04-11', 'L', '@ Mariners', '1-3', '0','0','0','0', '.256', ''],
      ['04-10', 'L', '@ Mariners', '1-5', '0','0','0','1', '.250', 'IL stint started'],
      ['04-08', 'L', '@ Rockies',  '1-5', '0','0','0','1', '.257', ''],
      ['04-07', 'L', '@ Rockies',  '0-3', '0','0','1','0', '.267', 'Walk · 2 fly outs'],
    ],
    '2025': [
      ['09-28', 'W', 'vs Mariners','2-4', '1','3','0','1', '.295', 'HR · 2 RBI'],
      ['09-27', 'W', 'vs Mariners','1-4', '0','1','0','0', '.294', 'RBI single'],
      ['09-26', 'L', 'vs Mariners','2-5', '0','0','1','1', '.295', '2 hits'],
      ['09-24', 'W', '@ Angels',   '3-5', '1','2','0','0', '.296', '3-hit night'],
      ['09-23', 'W', '@ Angels',   '1-4', '0','0','1','1', '.293', ''],
      ['09-22', 'L', '@ Angels',   '0-4', '0','0','0','2', '.292', '0-for-4'],
      ['09-20', 'W', 'vs Rangers', '2-3', '0','1','1','0', '.294', '2 hits · BB'],
      ['09-19', 'W', 'vs Rangers', '1-4', '1','2','0','1', '.293', 'solo HR'],
      ['09-18', 'L', 'vs Rangers', '1-5', '0','1','0','2', '.292', ''],
      ['09-16', 'W', '@ Athletics','2-4', '0','0','0','0', '.293', '2 singles'],
    ],
    '2024': [
      ['09-29', 'W', 'vs Guardians','1-4','0','1','0','1', '.285', ''],
      ['09-28', 'L', 'vs Guardians','0-3','0','0','1','1', '.284', 'quiet night'],
      ['09-27', 'W', 'vs Guardians','2-4','1','3','0','0', '.286', 'HR · 3 RBI'],
      ['09-25', 'W', '@ Yankees',  '1-4', '0','0','0','2', '.285', ''],
      ['09-24', 'L', '@ Yankees',  '1-5', '0','1','0','1', '.284', 'RBI double'],
      ['09-22', 'W', '@ Orioles',  '2-4', '0','0','0','0', '.285', '2 hits'],
      ['09-21', 'W', '@ Orioles',  '3-5', '1','2','0','1', '.287', '3 hits'],
      ['09-20', 'L', '@ Orioles',  '0-4', '0','0','1','2', '.285', ''],
      ['09-18', 'W', 'vs Rangers', '1-3', '0','1','1','0', '.285', 'RBI single'],
      ['09-17', 'W', 'vs Rangers', '2-4', '0','0','0','1', '.286', ''],
    ],
    '2023': [
      ['09-30', 'L', 'vs Mariners','1-4', '0','0','0','1', '.263', ''],
      ['09-29', 'W', 'vs Mariners','0-4', '0','0','0','2', '.262', '0-for-4'],
      ['09-27', 'L', '@ Royals',   '1-5', '0','1','0','1', '.263', ''],
      ['09-26', 'W', '@ Royals',   '2-4', '1','2','0','0', '.265', 'HR'],
      ['09-24', 'L', '@ D-backs',  '1-4', '0','0','1','1', '.264', ''],
      ['09-23', 'W', '@ D-backs',  '1-3', '0','1','1','0', '.264', 'RBI single'],
      ['09-21', 'L', 'vs Royals',  '0-4', '0','0','0','2', '.262', 'cold'],
      ['09-20', 'W', 'vs Royals',  '2-5', '0','1','0','1', '.263', '2 hits'],
      ['09-18', 'W', 'vs Angels',  '1-4', '1','3','0','0', '.264', '3 RBI'],
      ['09-17', 'L', 'vs Angels',  '1-4', '0','0','0','1', '.263', ''],
    ],
    '2022': [
      ['10-05', 'W', 'vs Phillies','2-4', '1','2','0','1', '.253', 'rookie HR'],
      ['10-04', 'W', 'vs Phillies','1-4', '0','0','0','0', '.252', ''],
      ['10-02', 'L', '@ Rays',     '1-5', '0','1','0','2', '.253', ''],
      ['10-01', 'W', '@ Rays',     '2-4', '0','0','1','0', '.254', '2 hits · BB'],
      ['09-29', 'W', '@ Orioles',  '1-4', '0','1','0','1', '.253', 'RBI'],
      ['09-28', 'L', '@ Orioles',  '0-3', '0','0','1','1', '.252', ''],
      ['09-26', 'W', 'vs D-backs', '3-5', '1','3','0','0', '.255', '3-hit · HR'],
      ['09-25', 'L', 'vs D-backs', '1-4', '0','0','0','2', '.253', ''],
      ['09-23', 'W', 'vs Orioles', '2-4', '0','1','0','0', '.254', '2 singles'],
      ['09-22', 'W', 'vs Orioles', '1-3', '0','0','1','1', '.253', ''],
    ],
  };
  const games = gamesBySeason[SEASONS[season]];

  const milestones = [
    { date: 'Apr 6, 2022',  text: 'MLB debut',                                     sub: 'Houston Astros · shortstop',    tag: null },
    { date: 'Nov 5, 2022',  text: 'World Series MVP',                              sub: 'vs Philadelphia · .400 series', tag: 'Award' },
    { date: 'Oct 2022',     text: 'Most hits by a rookie in a single postseason', sub: 'MLB record',                    tag: 'Record' },
    { date: '2022',         text: 'AL Gold Glove — Shortstop',                     sub: 'Rookie campaign',               tag: 'Award' },
    { date: '2024',         text: 'First 20-steal season',                        sub: '20 SB · career high',           tag: null },
    { date: 'Apr 18, 2026', text: 'Placed on 10-day IL',                          sub: 'Left oblique strain',           tag: 'Injury' },
    { date: '2026',         text: '14 hits from 500 career',                      sub: 'On pace by midseason',          tag: null },
  ];

  const career = [
    { yr: '2022', g: 136, ab: 558, h: 141, hr: 22, rbi: 63, sb: 11, bb: 22, k: 135, avg: '.253', obp: '.289', slg: '.426', ops: '.715', opsN: 0.715 },
    { yr: '2023', g: 158, ab: 634, h: 167, hr: 10, rbi: 52, sb: 13, bb: 36, k: 136, avg: '.263', obp: '.324', slg: '.381', ops: '.705', opsN: 0.705 },
    { yr: '2024', g: 152, ab: 597, h: 170, hr: 15, rbi: 70, sb: 20, bb: 40, k: 128, avg: '.285', obp: '.336', slg: '.396', ops: '.732', opsN: 0.732 },
    { yr: '2025', g: 151, ab: 580, h: 171, hr: 17, rbi: 75, sb: 18, bb: 44, k: 120, avg: '.295', obp: '.348', slg: '.420', ops: '.768', opsN: 0.768 },
    { yr: '2026', g: 16,  ab: 67,  h: 16,  hr: 1,  rbi: 6,  sb: 2,  bb: 3,  k: 13,  avg: '.239', obp: '.278', slg: '.299', ops: '.577', opsN: 0.577, live: true },
  ];
  const careerTot = { g: 613, ab: 2436, h: 665, hr: 65, rbi: 266, sb: 64, bb: 145, k: 532, avg: '.273', obp: '.315', slg: '.398', ops: '.713' };

  const vsTeam = [
    { tm: 'NYY', g: 24, ab: 92,  h: 27, hr: 4, rbi: 14, avg: '.293', obp: '.340', slg: '.500', ops: '.840' },
    { tm: 'CLE', g: 28, ab: 104, h: 31, hr: 3, rbi: 13, avg: '.298', obp: '.337', slg: '.452', ops: '.789' },
    { tm: 'TOR', g: 30, ab: 118, h: 34, hr: 4, rbi: 16, avg: '.288', obp: '.331', slg: '.458', ops: '.789' },
    { tm: 'BAL', g: 34, ab: 131, h: 35, hr: 5, rbi: 18, avg: '.267', obp: '.312', slg: '.443', ops: '.755' },
    { tm: 'TBR', g: 32, ab: 121, h: 30, hr: 3, rbi: 14, avg: '.248', obp: '.301', slg: '.388', ops: '.689' },
    { tm: 'DET', g: 26, ab: 98,  h: 24, hr: 2, rbi: 10, avg: '.245', obp: '.296', slg: '.378', ops: '.674' },
    { tm: 'PHI', g: 9,  ab: 35,  h: 11, hr: 2, rbi: 7,  avg: '.314', obp: '.359', slg: '.571', ops: '.930' },
    { tm: 'LAD', g: 7,  ab: 27,  h: 9,  hr: 2, rbi: 6,  avg: '.333', obp: '.379', slg: '.630', ops: '1.009' },
    { tm: 'ATL', g: 6,  ab: 23,  h: 6,  hr: 1, rbi: 3,  avg: '.261', obp: '.296', slg: '.435', ops: '.731' },
    { tm: 'CHC', g: 7,  ab: 26,  h: 7,  hr: 0, rbi: 2,  avg: '.269', obp: '.310', slg: '.346', ops: '.656' },
    { tm: 'PIT', g: 6,  ab: 22,  h: 5,  hr: 1, rbi: 3,  avg: '.227', obp: '.292', slg: '.409', ops: '.701' },
  ];
  const vsSorted = vsTeam.slice().sort((a, b) => {
    if (vsSort === 1) return b.g - a.g;
    if (vsSort === 2) return TEAMS[a.tm].short.localeCompare(TEAMS[b.tm].short);
    return parseFloat(b.ops) - parseFloat(a.ops);
  });

  const post = [
    { yr: '2022', round: 'ALDS', tm: 'CLE', g: 3, ab: 11, h: 4,  hr: 1, rbi: 2, avg: '.364', ops: '.971' },
    { yr: '2022', round: 'ALCS', tm: 'NYY', g: 4, ab: 15, h: 5,  hr: 1, rbi: 3, avg: '.333', ops: '.882', honor: 'ALCS MVP' },
    { yr: '2022', round: 'WS',   tm: 'PHI', g: 6, ab: 25, h: 10, hr: 1, rbi: 3, avg: '.400', ops: '.913', honor: 'WS MVP' },
    { yr: '2024', round: 'ALDS', tm: 'DET', g: 4, ab: 16, h: 4,  hr: 0, rbi: 1, avg: '.250', ops: '.611' },
  ];
  const postTot = { g: 17, ab: 67, h: 23, hr: 3, rbi: 9, avg: '.343', ops: '.870' };

  const Honor = ({ children }) => <Pill tone="highlight" style={{ padding: '2px 9px', fontSize: 10 }}>{children}</Pill>;

  // ---- Game log ----
  const gameLog = (
    <Card title="Game log" subtitle={`Last 10 games · ${SEASONS[season]} season`} padless>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <Th align="left" style={{ paddingLeft: 18 }}>Date</Th>
            <Th align="left">Result</Th>
            <Th align="left">Opp</Th>
            <Th>H/AB</Th><Th>HR</Th><Th>RBI</Th><Th>BB</Th><Th>K</Th><Th>AVG</Th>
            <Th align="left" style={{ paddingRight: 18 }}>Notes</Th>
          </tr>
        </thead>
        <tbody>
          {games.map((g, i) => (
            <tr key={i}>
              <Td align="left" style={{ paddingLeft: 18 }} dim>{g[0]}</Td>
              <Td align="left" mono={false}><Pill tone={g[1] === 'W' ? 'win' : 'loss'} style={{ padding: '2px 8px', fontSize: 10 }}>{g[1]}</Pill></Td>
              <Td align="left" mono={false} style={{ fontWeight: 600 }}>{g[2]}</Td>
              <Td hot>{g[3]}</Td>
              <Td dim={g[4] === '0'}>{g[4]}</Td>
              <Td dim={g[5] === '0'}>{g[5]}</Td>
              <Td dim={g[6] === '0'}>{g[6]}</Td>
              <Td dim={g[7] === '0'}>{g[7]}</Td>
              <Td>{g[8]}</Td>
              <Td align="left" mono={false} style={{ paddingRight: 18, color: T.textMuted, fontSize: 12 }}>{g[9]}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );

  // ---- Career ----
  const careerView = (
    <div>
      <Card title="Career arc" subtitle="OPS by year" style={{ marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, alignItems: 'end' }}>
          {career.map(y => (
            <div key={y.yr} style={{
              padding: 14, background: y.live ? T.accentSoft : T.surfaceAlt,
              border: `1px solid ${y.live ? T.accent + '55' : T.border}`,
              borderRadius: T.r.md, display: 'flex', flexDirection: 'column', gap: 6,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Eyebrow>{y.yr}</Eyebrow>
                {y.live && <Pill tone="live">CURRENT</Pill>}
              </div>
              <div style={{ fontFamily: T.mono, fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: y.live ? T.accent : T.text }}>{y.ops}</div>
              <div style={{ height: 4, background: T.surfaceAlt, borderRadius: 2, border: `1px solid ${T.border}` }}>
                <div style={{ width: `${(y.opsN / 0.9) * 100}%`, height: '100%', background: y.live ? T.accent : T.ink, borderRadius: 2 }} />
              </div>
              <div style={{ fontFamily: T.mono, fontSize: 10, color: T.textMuted, marginTop: 2 }}>{`${y.avg}/${y.obp}/${y.slg}`}</div>
              <div style={{ fontSize: 10, color: T.textMuted, fontFamily: T.sans }}>{y.g} GP</div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Season by season" subtitle="Regular season · with career totals" padless>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <Th align="left" style={{ paddingLeft: 18 }}>Season</Th>
              <Th>G</Th><Th>AB</Th><Th>H</Th><Th>HR</Th><Th>RBI</Th><Th>SB</Th><Th>BB</Th><Th>K</Th>
              <Th>AVG</Th><Th>OBP</Th><Th>SLG</Th><Th style={{ paddingRight: 18 }}>OPS</Th>
            </tr>
          </thead>
          <tbody>
            {career.map(y => (
              <tr key={y.yr}>
                <Td align="left" style={{ paddingLeft: 18, fontWeight: 600 }} mono={false}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>{y.yr}{y.live && <Pill tone="live" style={{ padding: '1px 7px', fontSize: 9 }}>NOW</Pill>}</span>
                </Td>
                <Td>{y.g}</Td><Td>{y.ab}</Td><Td>{y.h}</Td>
                <Td dim={y.hr === 0}>{y.hr}</Td><Td>{y.rbi}</Td><Td dim={y.sb === 0}>{y.sb}</Td><Td>{y.bb}</Td><Td>{y.k}</Td>
                <Td>{y.avg}</Td><Td>{y.obp}</Td><Td>{y.slg}</Td>
                <Td hot={y.opsN >= 0.75} style={{ paddingRight: 18 }}>{y.ops}</Td>
              </tr>
            ))}
            <tr style={{ borderTop: `2px solid ${T.borderStrong}`, background: T.surfaceAlt }}>
              <Td align="left" style={{ paddingLeft: 18, fontWeight: 700 }} mono={false}>Career</Td>
              <Td style={{ fontWeight: 700 }}>{careerTot.g}</Td><Td style={{ fontWeight: 700 }}>{careerTot.ab}</Td><Td style={{ fontWeight: 700 }}>{careerTot.h}</Td>
              <Td style={{ fontWeight: 700 }}>{careerTot.hr}</Td><Td style={{ fontWeight: 700 }}>{careerTot.rbi}</Td><Td style={{ fontWeight: 700 }}>{careerTot.sb}</Td><Td style={{ fontWeight: 700 }}>{careerTot.bb}</Td><Td style={{ fontWeight: 700 }}>{careerTot.k}</Td>
              <Td style={{ fontWeight: 700 }}>{careerTot.avg}</Td><Td style={{ fontWeight: 700 }}>{careerTot.obp}</Td><Td style={{ fontWeight: 700 }}>{careerTot.slg}</Td>
              <Td style={{ fontWeight: 700, paddingRight: 18 }}>{careerTot.ops}</Td>
            </tr>
          </tbody>
        </table>
      </Card>

      <Card title="Milestones & transactions" subtitle="Career timeline" style={{ marginTop: 16 }}>
        <div>
          {milestones.map((m, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '116px 1fr auto', gap: 14, alignItems: 'baseline', padding: '11px 0', borderTop: i ? `1px solid ${T.border}` : 'none' }}>
              <div style={{ fontFamily: T.mono, fontSize: 12, color: T.textMuted, fontVariantNumeric: 'tabular-nums' }}>{m.date}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{m.text}</div>
                <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>{m.sub}</div>
              </div>
              {m.tag
                ? <Pill tone={m.tag === 'Injury' ? 'live' : m.tag === 'Record' ? 'info' : 'highlight'} style={{ padding: '2px 9px', fontSize: 10 }}>{m.tag}</Pill>
                : <span style={{ color: T.textFaint, fontSize: 12 }}>—</span>}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );

  // ---- vs Team ----
  const vsTeamView = (
    <Card title="Career vs opponent" subtitle={`Regular season · ${vsTeam.length} opponents`}
      action={<Segmented items={['OPS', 'Games', 'Team']} active={vsSort} onClick={setVsSort} size="sm" />} padless>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <Th align="left" style={{ paddingLeft: 18 }}>Team</Th>
            <Th>G</Th><Th>AB</Th><Th>H</Th><Th>HR</Th><Th>RBI</Th>
            <Th>AVG</Th><Th>OBP</Th><Th>SLG</Th><Th style={{ paddingRight: 18 }}>OPS</Th>
          </tr>
        </thead>
        <tbody>
          {vsSorted.map(t => (
            <tr key={t.tm}>
              <Td align="left" mono={false} style={{ paddingLeft: 18 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, fontWeight: 600 }}>
                  <TeamDot team={TEAMS[t.tm]} size={20} />{TEAMS[t.tm].short}
                </span>
              </Td>
              <Td>{t.g}</Td><Td>{t.ab}</Td><Td>{t.h}</Td><Td dim={t.hr === 0}>{t.hr}</Td><Td>{t.rbi}</Td>
              <Td>{t.avg}</Td><Td>{t.obp}</Td><Td>{t.slg}</Td>
              <Td hot={parseFloat(t.ops) >= 0.8} style={{ paddingRight: 18 }}>{t.ops}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );

  // ---- Postseason ----
  const PStat = ({ label, value, hot }) => (
    <div style={{ flex: 1, padding: '12px 14px', background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: T.r.md }}>
      <Eyebrow>{label}</Eyebrow>
      <div style={{ fontFamily: T.mono, fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: hot ? T.accent : T.text, marginTop: 4 }}>{value}</div>
    </div>
  );
  const postEmpty = (
    <Card title="Postseason career">
      <div style={{ textAlign: 'center', padding: '36px 16px' }}>
        <div style={{ fontSize: 15, fontWeight: 600 }}>No postseason appearances</div>
        <div style={{ fontSize: 13, color: T.textMuted, marginTop: 6 }}>This player's clubs haven't reached the playoffs in a season on record.</div>
      </div>
    </Card>
  );
  const postView = post.length === 0 ? postEmpty : (
    <div>
      <Card title="Postseason career" subtitle="Houston Astros · 4 series" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <Honor>2022 World Series MVP</Honor>
          <Honor>2022 ALCS MVP</Honor>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <PStat label="Games" value={postTot.g} />
          <PStat label="AVG" value={postTot.avg} hot />
          <PStat label="HR" value={postTot.hr} />
          <PStat label="RBI" value={postTot.rbi} />
          <PStat label="OPS" value={postTot.ops} hot />
        </div>
      </Card>

      <Card title="By series" padless>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <Th align="left" style={{ paddingLeft: 18 }}>Year</Th>
              <Th align="left">Round</Th>
              <Th align="left">Opp</Th>
              <Th>G</Th><Th>AB</Th><Th>H</Th><Th>HR</Th><Th>RBI</Th><Th>AVG</Th><Th>OPS</Th>
              <Th align="left" style={{ paddingRight: 18 }}>Honors</Th>
            </tr>
          </thead>
          <tbody>
            {post.map((p, i) => (
              <tr key={i}>
                <Td align="left" style={{ paddingLeft: 18 }} dim>{p.yr}</Td>
                <Td align="left" mono={false} style={{ fontWeight: 600 }}>{p.round}</Td>
                <Td align="left" mono={false}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><TeamDot team={TEAMS[p.tm]} size={18} />{TEAMS[p.tm].short}</span>
                </Td>
                <Td>{p.g}</Td><Td>{p.ab}</Td><Td>{p.h}</Td><Td dim={p.hr === 0}>{p.hr}</Td><Td>{p.rbi}</Td>
                <Td hot={parseFloat(p.avg) >= 0.3}>{p.avg}</Td><Td>{p.ops}</Td>
                <Td align="left" mono={false} style={{ paddingRight: 18 }}>{p.honor ? <Honor>{p.honor}</Honor> : <span style={{ color: T.textFaint }}>—</span>}</Td>
              </tr>
            ))}
            <tr style={{ borderTop: `2px solid ${T.borderStrong}`, background: T.surfaceAlt }}>
              <Td align="left" style={{ paddingLeft: 18, fontWeight: 700 }} mono={false}>Career</Td>
              <Td />
              <Td />
              <Td style={{ fontWeight: 700 }}>{postTot.g}</Td><Td style={{ fontWeight: 700 }}>{postTot.ab}</Td><Td style={{ fontWeight: 700 }}>{postTot.h}</Td><Td style={{ fontWeight: 700 }}>{postTot.hr}</Td><Td style={{ fontWeight: 700 }}>{postTot.rbi}</Td>
              <Td style={{ fontWeight: 700 }}>{postTot.avg}</Td><Td style={{ fontWeight: 700 }}>{postTot.ops}</Td>
              <Td style={{ paddingRight: 18 }} />
            </tr>
          </tbody>
        </table>
      </Card>
    </div>
  );

  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <Segmented items={['Game log', 'Career', 'vs Team', 'Postseason']} active={sub} onClick={setSub} />
        {sub === 0 && <Segmented items={SEASONS} active={season} onClick={setSeason} size="sm" />}
      </div>
      {sub === 0 && gameLog}
      {sub === 1 && careerView}
      {sub === 2 && vsTeamView}
      {sub === 3 && postView}
    </div>
  );
}

// ----- Screens wrapper -----

window.PlayerScreen = function PlayerScreen({ tab = 0 }) {
  const [navOpen, setNavOpen] = React.useState(false);
  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
    <Page>
      <window.BrandHeader back="Astros @ Cubs" active="games" onMenu={() => setNavOpen(true)} />
            <PageTitle
        title="Player"
        subtitle="Roster · #3 · Houston Astros"
      />

      <PlayerHero activeTab={tab} />

      <div style={{ padding: '0 28px 36px' }}>
        {tab === 0 && <OverviewTab />}
        {tab === 1 && <StatsTab />}
        {tab === 2 && <SplitsTab />}
        {tab === 3 && <PitchingTab />}
        {tab === 4 && <HistoryTab />}
        {tab === 5 && <UpcomingTab />}
      </div>
    </Page>
    <window.NavDrawer open={navOpen} onClose={() => setNavOpen(false)} active="games" />
    </div>
  );
};
