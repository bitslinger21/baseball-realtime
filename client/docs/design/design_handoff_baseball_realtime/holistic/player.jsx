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
  const tabs = ['Overview', 'Stats', 'Splits', 'Pitching', 'History'];
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
          <Headshot team={TEAMS.HOU} initials="JP" mlbId={665161} size={124} ratio={1.18} />

          {/* Headline */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <TeamDot team={TEAMS.HOU} size={24} />
              <span style={{ fontSize: 13, color: T.textMuted, fontWeight: 600 }}>{TEAMS.HOU.name}</span>
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

          {/* Today widget */}
          <div style={{
            width: 220, padding: '14px 16px',
            background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: T.r.md,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <Eyebrow>Today · vs CHC</Eyebrow>
              <LivePill label="ON DECK" />
            </div>
            <div style={{ fontFamily: T.mono, fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>1-for-3</div>
            <div style={{ fontFamily: T.mono, fontSize: 11, color: T.textMuted, marginTop: 4 }}>1B · K · F8 · BB</div>
          </div>
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
            <button style={btn} onClick={() => window.openGameView && window.openGameView()}>
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
                position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 312, zIndex: 40,
                background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.r.md, boxShadow: T.sh.lg,
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
                    <div style={{ fontSize: 11, color: T.textMuted }}>Pick a player to see the matchup.</div>
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
      <Card title="Recent form" subtitle="Last 15 games" action={<Pill tone="positive">▲ +.048 vs season</Pill>}>
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

      {/* Hot zones */}
      <Card title="Hot zones" subtitle="Batting average by location · 2026">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <HotZone data={[0.12, 0.42, 0.18, 0.31, 0.72, 0.55, 0.08, 0.24, 0.19]} size={150} />
          <div style={{ flex: 1, fontSize: 12, color: T.textMuted, lineHeight: 1.5 }}>
            <div style={{ marginBottom: 8 }}><span style={{ fontFamily: T.mono, fontSize: 18, fontWeight: 700, color: T.accent }}>.720</span> on middle-middle</div>
            <div style={{ marginBottom: 8 }}>Cold low/away: <span style={{ fontFamily: T.mono, color: T.text, fontWeight: 600 }}>.083</span></div>
            <div>Bat path: <span style={{ fontFamily: T.mono, color: T.text, fontWeight: 600 }}>flat, 14°</span></div>
          </div>
        </div>
      </Card>

      {/* Streaks / context */}
      <Card title="Now" subtitle="Trends + notable">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { pill: <Pill tone="highlight">7 game</Pill>, label: 'On-base streak' },
            { pill: <Pill tone="positive">3-for-9</Pill>, label: 'vs Cubs starter' },
            { pill: <Pill tone="info">.353</Pill>, label: 'AVG in night games (last 30d)' },
            { pill: <Pill tone="accent">2 errors</Pill>, label: 'Defense, last 5' },
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
                <Pill tone={g.result === 'W' ? 'positive' : 'live'} style={{ padding: '1px 7px', fontSize: 10 }}>{g.result}</Pill>
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
      <Card title="Notable" subtitle="Milestones & achievements within reach" style={{ gridColumn: '1 / -1' }}>
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
function StatInfo({ title, body, scale }) {
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
          position: 'absolute', bottom: 'calc(100% + 8px)', left: -2,
          width: 268, zIndex: 20, textAlign: 'left',
          background: T.ink, color: '#f4f1ea',
          border: `1px solid ${T.ink}`, borderRadius: T.r.md,
          boxShadow: '0 8px 28px rgba(0,0,0,.28)', padding: '11px 13px',
          fontFamily: T.sans, fontWeight: 500,
        }}>
          <span style={{ display: 'block', fontFamily: T.mono, fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: T.highlight, marginBottom: 5 }}>{title}</span>
          <span style={{ display: 'block', fontSize: 12.5, lineHeight: 1.5, color: '#e7e2d6' }}>{body}</span>
          {scale && <span style={{ display: 'block', marginTop: 7, paddingTop: 7, borderTop: '1px solid rgba(255,255,255,0.14)', fontFamily: T.mono, fontSize: 11, color: '#bdb6a6' }}>{scale}</span>}
          <span style={{ position: 'absolute', top: '100%', left: 7, transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: `6px solid ${T.ink}` }} />
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

      <SectionTable title="Production" items={[
        { label: 'Runs',          value: '7',  note: '0.44 / game', pct: 30 },
        { label: 'RBI',           value: '3',  note: '0.19 / game', pct: 12 },
        { label: 'Home Runs',     value: '0',  note: 'Zero in 16 games', pct: 8 },
        { label: 'Extra-base hits', value: '4', note: '4 doubles', pct: 28 },
        { label: 'Total bases',   value: '20', note: '1.25 / game', pct: 32 },
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
        { label: 'BsR',           value: '+0.8', note: 'baserunning runs', deltaTone: 'positive', pct: 62,
          info: { title: 'Base Running Runs', body: 'Total runs added or lost from baserunning — steals, taking extra bases, avoiding outs on the basepaths — vs. an average runner.', scale: '0 = average · positive = above-average baserunner' } },
      ]} />
    </div>
  );
}

// ----- SPLITS -----

function SplitsTab() {
  const CATS = ['All splits', 'Handedness', 'Venue', 'Day/Night', 'Bases', 'Count', 'Pitch type'];
  const FRAMES = ['2026', 'Career', 'Last 30d'];
  const FRAME_LABEL = { '2026': '2026 season', 'Career': 'career', 'Last 30d': 'last 30 days' };
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

function PitchingTab() {
  const pitches = [
    { type: 'Four-seam',  share: 38, AVG: '.250', SLG: '.292', whiff: '17%', color: '#dc2626' },
    { type: 'Sinker',     share: 17, AVG: '.286', SLG: '.357', whiff: '9%',  color: '#ea580c' },
    { type: 'Slider',     share: 19, AVG: '.143', SLG: '.214', whiff: '38%', color: '#0891b2' },
    { type: 'Curveball',  share: 9,  AVG: '.200', SLG: '.200', whiff: '24%', color: '#3b82f6' },
    { type: 'Changeup',   share: 11, AVG: '.333', SLG: '.500', whiff: '14%', color: '#16a34a' },
    { type: 'Cutter',     share: 6,  AVG: '.000', SLG: '.000', whiff: '50%', color: '#a3a3a3' },
  ];
  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <h2 style={{ margin: 0, fontFamily: T.sans, fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em' }}>How pitchers attack Peña</h2>
          <div style={{ fontSize: 12, color: T.textMuted, marginTop: 4 }}>314 pitches seen · 2026 season</div>
        </div>
        <Segmented items={['All', 'vs LHP', 'vs RHP', 'In strike zone', 'Outside zone']} active={0} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.2fr 1fr', gap: 16 }}>
        {/* Pitch mix donut */}
        <Card title="Pitch mix">
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <Donut data={pitches.map(p => ({ value: p.share, color: p.color }))} size={170} />
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

        {/* Performance vs pitch type */}
        <Card title="Performance vs pitch type" padless>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <Th align="left" style={{ paddingLeft: 16 }}>Pitch</Th>
                <Th>AVG</Th>
                <Th style={{ width: 140 }}>SLG</Th>
                <Th style={{ paddingRight: 16 }}>Whiff</Th>
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
                  <Td hot={parseFloat(p.AVG.replace('.','0.')) > 0.25}>{p.AVG}</Td>
                  <Td style={{ width: 140 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <span style={{ minWidth: 34, textAlign: 'right' }}>{p.SLG}</span>
                      <div style={{ width: 56, height: 5, background: T.surfaceAlt, borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(100, (parseFloat(p.SLG.replace('.','0.')) / 0.5) * 100)}%`, height: '100%', background: p.color, borderRadius: 3 }} />
                      </div>
                    </div>
                  </Td>
                  <Td style={{ paddingRight: 16 }}>{p.whiff}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {/* Hot zone heat map */}
        <Card title="Damage by location" subtitle="SLG · 2026">
          <HotZone data={[0.18, 0.42, 0.12, 0.28, 0.84, 0.58, 0.04, 0.21, 0.15]} size={170} />
          <div style={{ marginTop: 12, fontSize: 11, color: T.textMuted, lineHeight: 1.5 }}>
            Pitchers throw <span style={{ fontFamily: T.mono, color: T.text, fontWeight: 600 }}>62%</span> outside the strike zone vs Peña, exploiting low/away weakness.
          </div>
        </Card>
      </div>

      {/* Pitcher tendencies */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
        <Card title="By pitcher handedness" padless>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <Th align="left" style={{ paddingLeft: 16 }}>vs</Th>
                <Th>FB%</Th>
                <Th>BB%</Th>
                <Th>OS%</Th>
                <Th>Zone%</Th>
                <Th>First-pitch strike</Th>
                <Th style={{ paddingRight: 16 }}>Put-away</Th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <Td align="left" mono={false} style={{ paddingLeft: 16, fontWeight: 600 }}>LHP</Td>
                <Td>49%</Td><Td>27%</Td><Td>24%</Td><Td>52%</Td><Td>65%</Td><Td style={{ paddingRight: 16 }}>22%</Td>
              </tr>
              <tr>
                <Td align="left" mono={false} style={{ paddingLeft: 16, fontWeight: 600 }}>RHP</Td>
                <Td>57%</Td><Td>28%</Td><Td>15%</Td><Td>47%</Td><Td>61%</Td><Td style={{ paddingRight: 16 }}>28%</Td>
              </tr>
            </tbody>
          </table>
        </Card>
        <Card title="Counts attacked" subtitle="Two-strike put-away (solid) · go-to by count state (dashed)">
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

// Simple SVG donut
function Donut({ data, size = 160, thickness = 22 }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = size / 2;
  const cr = r - thickness / 2;
  let angle = -Math.PI / 2;
  const segs = data.map(d => {
    const a0 = angle;
    const a1 = angle + (d.value / total) * Math.PI * 2;
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
      <text x={r} y={r - 2} textAnchor="middle" fontFamily={T.sans} fontSize="10" fontWeight="700" letterSpacing="0.1em" fill={T.textMuted}>SEEN</text>
      <text x={r} y={r + 18} textAnchor="middle" fontFamily={T.mono} fontSize="22" fontWeight="700" fill={T.text}>314</text>
    </svg>
  );
}

// ----- HISTORY -----

function HistoryTab() {
  const games = [
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
  ];
  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <Segmented items={['Game log', 'Career', 'vs Team', 'Postseason']} active={0} />
        <div style={{ display: 'flex', gap: 8 }}>
          <Segmented items={['2026', '2025', '2024', '2023', '2022']} active={0} size="sm" />
        </div>
      </div>

      {/* Career arc chart */}
      <Card title="Career arc" subtitle="OPS by year" style={{ marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, alignItems: 'end' }}>
          {[
            { yr: '2022', ops: 0.715, val: '.715', games: 136, slash: '.253/.289/.426' },
            { yr: '2023', ops: 0.672, val: '.672', games: 158, slash: '.263/.324/.381' },
            { yr: '2024', ops: 0.732, val: '.732', games: 152, slash: '.285/.336/.396' },
            { yr: '2025', ops: 0.768, val: '.768', games: 151, slash: '.295/.348/.420' },
            { yr: '2026', ops: 0.577, val: '.577', games: 16,  slash: '.239/.278/.299', live: true },
          ].map(y => (
            <div key={y.yr} style={{
              padding: 14, background: y.live ? T.accentSoft : T.surfaceAlt,
              border: `1px solid ${y.live ? T.accent + '55' : T.border}`,
              borderRadius: T.r.md,
              display: 'flex', flexDirection: 'column', gap: 6,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Eyebrow>{y.yr}</Eyebrow>
                {y.live && <Pill tone="live">CURRENT</Pill>}
              </div>
              <div style={{ fontFamily: T.mono, fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: y.live ? T.accent : T.text }}>{y.val}</div>
              <div style={{ height: 4, background: T.surfaceAlt, borderRadius: 2, border: `1px solid ${T.border}` }}>
                <div style={{ width: `${(y.ops / 0.9) * 100}%`, height: '100%', background: y.live ? T.accent : T.ink, borderRadius: 2 }} />
              </div>
              <div style={{ fontFamily: T.mono, fontSize: 10, color: T.textMuted, marginTop: 2 }}>{y.slash}</div>
              <div style={{ fontSize: 10, color: T.textMuted, fontFamily: T.sans }}>{y.games} GP</div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Game log" subtitle="Last 10 games · 2026" padless>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <Th align="left" style={{ paddingLeft: 18 }}>Date</Th>
              <Th align="left">Result</Th>
              <Th align="left">Opp</Th>
              <Th>H/AB</Th>
              <Th>HR</Th>
              <Th>RBI</Th>
              <Th>BB</Th>
              <Th>K</Th>
              <Th>AVG</Th>
              <Th align="left" style={{ paddingRight: 18 }}>Notes</Th>
            </tr>
          </thead>
          <tbody>
            {games.map((g, i) => (
              <tr key={i}>
                <Td align="left" style={{ paddingLeft: 18 }} dim>{g[0]}</Td>
                <Td align="left" mono={false}>
                  <Pill tone={g[1] === 'W' ? 'positive' : 'live'} style={{ padding: '2px 8px', fontSize: 10 }}>{g[1]}</Pill>
                </Td>
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
    </div>
  );
}

// ----- Screens wrapper -----

window.PlayerScreen = function PlayerScreen({ tab = 0 }) {
  return (
    <Page>
      <AppHeader right={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button style={btn}>← Back to game</button>
        </div>
      } />

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
      </div>
    </Page>
  );
};
