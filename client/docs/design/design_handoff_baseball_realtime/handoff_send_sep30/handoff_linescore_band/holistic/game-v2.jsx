/* global React, T, TEAMS, TeamMark, Pips, Bases, Inning, Card, Eyebrow, Pill, LivePill, Segmented, Th, Td, Tr, StrikeZone, AppHeader, btn, iconBtn, Page, PageTitle, Headshot */

// ============================================================
// GAME VIEW v2 — Option A (revised)
// · Sticky left column: zone + batter card (top row), last-pitch headline (bottom)
// · Right column: pitch-by-pitch list with INTERNAL scroll
// · Below the fold: pitcher card + context strip
// · Lineup moved off-page into a drawer (button in header)
// ============================================================

// (Legacy MatchupCard removed Aug 25 2026 — it was hardcoded to a different game
//  (TOR/HOU 1–3, ▲2nd) and duplicated the dark band, the play-state eyebrow and the
//  pitcher card. Not part of the v2 spec: band → two-column hero → pitcher → analytics.)

// ---------- Dark band: live-state bar + line-score drawer ----------
// OPTION 3 (Sep 5, 2026). The band used to be 164px of fixed chrome that never
// scrolled away and never changed height — a quarter of the feed's height, paid on
// every visit. It now splits by job: the SCORE is a 48px bar you always see;
// REFERENCE (inning grid, game leaders) opens in a drawer from that bar. Everything
// else the band carried was already on screen somewhere closer to the user's eye —
// LIVE pill (page header), inning + count (play-state eyebrow), last pitch
// (pitch-by-pitch feed) — so it was cut rather than moved. Saves 116px at rest.

// isLive is retained on the signature (callers pass it, and a future final/postgame
// treatment may want it) but the bar no longer renders status — the page header does.
// Scout mode and the pregame band are now THIN WRAPPERS around this component
// (ScoutBand in game-scout.jsx, PregameLineScoreBand below) rather than their own
// three-zone bands — one bar, one drawer, one innings scroller, three data sources.
// `mode='pregame'` dashes the runs and swaps the trigger label; `zones` replaces the
// drawer's right-hand content; `leaders` lets a caller supply head-derived leaders.
function LineScoreBand({ bleed, isLive = true, mode = 'live', runsAway, runsHome, curInning = 9, totals = { away: [8, 11, 0], home: [5, 9, 1] }, leaders: leadersProp, zones, triggerLabel, defaultOpen = false }) {
  const pre = mode === 'pregame';
  const [open, setOpen] = React.useState(defaultOpen);
  // Extra-inning capable: the innings grid grows past 9 inside ONE scroller, so the
  // header and both run rows can never drift apart. Chevrons appear over a gradient
  // fade only when there is overflow, stepping 3 innings.
  // Innings count is DERIVED, so an extra-inning game grows the row automatically.
  // This screen's pinned state is HOU 8–5 CHC, ▼9th (see the extra-innings artboard
  // for the overflow/chevron state).
  const hou = runsAway || [0, 1, 0, 0, 2, 0, 1, 4, 0];
  const chc = runsHome || [0, 0, 1, 2, 0, 1, 1, 0, null];
  const cur = curInning;
  const innings = Array.from({ length: Math.max(9, cur, hou.length, chc.length) }, (_, i) => i + 1);
  // ONE scroll container holds the inning header AND both run rows, as a 4-row ×
  // N-column grid: header · away · hairline · home. There is nothing to keep in
  // sync, so the three refs, the sync effect and a whole class of bug are gone.
  // (The rows used to be three separate scrollers synced on scroll. Because Row /
  // cell / rhe were declared INSIDE this component, every setCanL/setCanR produced
  // a new component type, React remounted the rows, and their scrollLeft reset to
  // 0 mid-scroll — the inning numbers drifted off the runs beneath them.)
  const STEP = 3 * 29; // 3 innings × (28px cell + 1px gap)
  const GRID_ROWS = '22px 30px 1px 30px';
  const scRef = React.useRef(null);
  const [canL, setCanL] = React.useState(false);
  const [canR, setCanR] = React.useState(false);
  React.useEffect(() => {
    const el = scRef.current;
    if (!el) return;
    const measure = () => {
      setCanL(el.scrollLeft > 1);
      setCanR(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
    };
    measure();
    el.addEventListener('scroll', measure, { passive: true });
    return () => el.removeEventListener('scroll', measure);
  }, []);
  const scrollInn = (dir) => scRef.current && scRef.current.scrollBy({ left: dir * STEP, behavior: 'smooth' });
  const Chevron = ({ side }) => (
    <button onClick={() => scrollInn(side === 'left' ? -1 : 1)} aria-label={`Scroll innings ${side}`}
      style={{ position: 'absolute', top: 0, bottom: 0, [side]: 0, width: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', padding: 0, cursor: 'pointer', color: '#b0b0b8', zIndex: 1, background: `linear-gradient(to ${side === 'left' ? 'right' : 'left'}, ${T.ink} 55%, transparent)` }}>
      <svg width="9" height="14" viewBox="0 0 9 14" fill="none" aria-hidden="true">
        <polyline points={side === 'left' ? '8,1 2,7 8,13' : '1,1 7,7 1,13'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );

  // Plain element factories, NOT components — nothing here can trigger a remount.
  const runCell = (v, isCur) => (
    <div style={{
      display: 'grid', placeItems: 'center', borderRadius: 4,
      fontFamily: T.mono, fontSize: 14, fontVariantNumeric: 'tabular-nums',
      color: v === null ? '#52525b' : '#fff',
      background: isCur ? 'rgba(184,66,30,0.22)' : 'transparent',
    }}>{v === null ? '–' : v}</div>
  );
  const rheCell = (v, accent) => (
    <div style={{ width: 34, textAlign: 'center', fontFamily: T.mono, fontSize: 17, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: accent ? '#fff' : '#d4d4d8' }}>{v}</div>
  );
  const teamLabel = (team, name, bold) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, overflow: 'hidden' }}>
      <TeamDot team={team} size={24} onDark />
      {/* Team name links to the team page (same pattern as the page title) */}
      <span style={{ fontFamily: T.sans, fontSize: 14, fontWeight: bold ? 700 : 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0, cursor: 'pointer', textDecoration: 'none' }}>{name}</span>
    </div>
  );
  const hairline = (key) => <div key={key} style={{ background: '#27272a' }} />;

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
  const leaders = leadersProp || [
    { team: TEAMS.HOU, name: 'Yordan Álvarez', line: '2-4 · HR · 2 RBI' },
    { team: TEAMS.CHC, name: 'Seiya Suzuki', line: '2-3 · 2B · BB' },
  ];

  const awayR = totals.away[0], homeR = totals.home[0];
  // Pregame has no leader — neither side is dimmed, both read as pending.
  const awayAhead = pre ? true : awayR >= homeR;
  const homeAhead = pre ? true : !(awayR >= homeR);
  const vdiv = { width: 1, height: 24, background: '#3f3f46', flexShrink: 0 };
  const runSt = (ahead) => ({ fontFamily: T.mono, fontSize: 26, fontWeight: 800, lineHeight: 1, fontVariantNumeric: 'tabular-nums', color: ahead ? '#fff' : '#c4c4cc' });
  const abbrSt = { fontFamily: T.sans, fontSize: 13, fontWeight: 700, letterSpacing: '0.04em', color: '#fff' };

  return (
    // Sticky: the bar is now the ONE piece of game chrome that survives scrolling.
    // That was the other half of the complaint — today, scrolling down to the feed
    // loses the score entirely. 48px is cheap enough to keep pinned.
    <div style={{ position: 'sticky', top: 0, zIndex: 30 }}>
    <div style={{ position: 'relative' }}>
      <div style={{ background: bleed ? 'transparent' : T.ink, borderRadius: bleed ? 0 : T.r.lg }}>
      {/* ── Live-state bar (48px). Score ONLY, plus the drawer trigger.
          Deliberately NOT here, all because the screen already shows them where
          the user is looking: the LIVE pill (page header owns it), the inning and
          count/outs (play-state eyebrow above the strike zone), and last pitch
          type/velo/result (the pitch-by-pitch feed — nobody looks up to re-read
          the pitch they just watched). Score is the one fact with no other home. ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, height: 48, padding: bleed ? 0 : '0 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <TeamDot team={TEAMS.HOU} size={22} onDark />
            <span style={abbrSt}>{TEAMS.HOU.abbr}</span>
          </span>
          <span style={runSt(awayAhead)}>{awayR}</span>
          {/* No separator before first pitch: three dashes in a row read as mush. The
              two run slots just sit empty, which is the truthful pregame state. */}
          {!pre && <span style={{ fontFamily: T.mono, fontSize: 18, color: '#52525b' }}>–</span>}
          <span style={runSt(homeAhead)}>{homeR}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={abbrSt}>{TEAMS.CHC.abbr}</span>
            <TeamDot team={TEAMS.CHC} size={22} onDark />
          </span>
        </div>
        <span style={vdiv} />
        {/* Trigger sits next to the score, not at the far right — a lone button
            across 1500px of empty band reads as unrelated chrome. */}
        <button onClick={() => setOpen((o) => !o)} aria-expanded={open} style={{
          flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 7,
          background: 'transparent', border: `1px solid ${open ? T.accent : '#3f3f46'}`,
          color: open ? '#fff' : '#b0b0b8', fontFamily: T.sans, fontSize: 11.5, fontWeight: 700,
          letterSpacing: '0.08em', textTransform: 'uppercase', padding: '6px 11px',
          borderRadius: 7, cursor: 'pointer', whiteSpace: 'nowrap',
        }}>{triggerLabel || (pre ? 'Line score & probables' : 'Line score & leaders')} {open ? '▴' : '▾'}</button>
        <div style={{ flex: 1, minWidth: 0 }} />
      </div>

      </div>

      {/* ── Drawer. OVERLAYS the content below rather than pushing it: the bar is
          sticky, so pushing would shove the feed down and move whatever you were
          reading. Same behaviour as the scorecard panel. Always mounted (the
          innings scroller's chevron measurement needs real layout width).
          Width is SHRINK-TO-FIT (left anchored, no right) so the panel ends just
          past Game leaders instead of running full-bleed with a void beside it.
          When Baseball IQ situational facts land (future.md F-010) the panel simply
          gets wider — nothing here pre-commits the space. ── */}
      <div style={{
        position: 'absolute', top: 'calc(100% + 6px)', left: 0, maxWidth: '100%', zIndex: 40,
        background: T.ink, borderRadius: T.r.lg, overflow: 'hidden',
        boxShadow: open ? '0 18px 40px rgba(0,0,0,0.38)' : 'none',
        maxHeight: open ? 260 : 0, opacity: open ? 1 : 0,
        pointerEvents: open ? 'auto' : 'none',
        transition: 'max-height 0.32s cubic-bezier(.22,.7,.3,1), opacity 0.22s ease',
      }}>
      {/* Column 1 is CAPPED at 560px, not `1fr`: the cap is what keeps Game leaders
          adjacent to the grid it belongs with, keeps a narrow frame able to provoke
          the innings overflow + chevrons, AND lets the shrink-to-fit panel end just
          past the leaders instead of stretching. */}
      <div style={{ borderTop: `2px solid ${T.accent}`, padding: bleed ? '14px 0' : '14px 20px', display: 'grid', gridTemplateColumns: 'minmax(0, 560px) max-content', justifyContent: 'start' }}>
      {/* Zone 1 — line score. Fixed label column · ONE scroller · fixed R/H/E. */}
      <div style={{ paddingRight: 20, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'stretch' }}>
          <div style={{ width: 132, flexShrink: 0, display: 'grid', gridTemplateRows: GRID_ROWS }}>
            {/* Status moved to the bar; this slot just names the grid. */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontFamily: T.sans, fontSize: 12, color: '#8b8b93', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700 }}>Innings</span>
            </div>
            {teamLabel(TEAMS.HOU, TEAMS.HOU.short, true)}
            {hairline('hl-label')}
            {teamLabel(TEAMS.CHC, TEAMS.CHC.short)}
          </div>
          <div style={{ position: 'relative', minWidth: 0, flexShrink: 1 }}>
            {canL && <Chevron side="left" />}
            <div ref={scRef} style={{ overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              <div style={{ display: 'grid', gridTemplateRows: GRID_ROWS, gridAutoFlow: 'column', gridAutoColumns: '28px', columnGap: 1 }}>
                {innings.map((n, i) => (
                  <React.Fragment key={n}>
                    <div style={{ display: 'grid', placeItems: 'center', fontFamily: T.mono, fontSize: 14, color: n === cur ? T.accent : '#b0b0b8', fontWeight: 700 }}>{n}</div>
                    {runCell(hou[i] === undefined ? null : hou[i], n === cur)}
                    {hairline(`hl-${n}`)}
                    {runCell(chc[i] === undefined ? null : chc[i], n === cur)}
                  </React.Fragment>
                ))}
              </div>
            </div>
            {canR && <Chevron side="right" />}
          </div>
          <div style={{ flexShrink: 0, paddingLeft: 10, marginLeft: 8, borderLeft: '1px solid #3f3f46', display: 'grid', gridTemplateRows: GRID_ROWS }}>
            <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              {['R', 'H', 'E'].map(x => <div key={x} style={{ width: 34, textAlign: 'center', fontFamily: T.sans, fontSize: 14, color: '#b0b0b8', fontWeight: 700 }}>{x}</div>)}
            </div>
            <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>{rheCell(totals.away[0], true)}{rheCell(totals.away[1])}{rheCell(totals.away[2])}</div>
            {hairline('hl-rhe')}
            <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>{rheCell(totals.home[0], true)}{rheCell(totals.home[1])}{rheCell(totals.home[2])}</div>
          </div>
        </div>
      </div>

      {/* Zone 2 — scoring summary (hidden, per app polish pass Jul 11 2026; un-comment to restore) */}

      {/* Zone 3 — game leaders (or whatever the caller's `zones` supplies: the pregame
          wrapper passes probable pitchers + season form, Scout passes head-derived
          leaders through `leaders`). */}
      {zones || (
      <div style={{ padding: '0 0 0 20px', borderLeft: '1px solid #27272a' }}>
        <ZoneHead>Game leaders</ZoneHead>
        {leaders.every(l => l == null) && (
          <div style={{ fontFamily: T.sans, fontSize: 12, color: '#8b8b93' }}>No hits yet</div>
        )}
        {leaders.map((g, i) => g == null ? (
          <div key={`empty-${i}`} aria-hidden="true" style={{ visibility: 'hidden', display: 'flex', gap: 10, marginBottom: 12, alignItems: 'center' }}>
            <div style={{ width: 22, height: 22 }} />
            <div><div style={{ fontSize: 15 }}>—</div><div style={{ fontSize: 13 }}>—</div></div>
          </div>
        ) : (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'center' }}>
            <TeamDot team={g.team} size={22} onDark />
            <div>
              <div onClick={() => window.openPlayerOverview()} style={{ fontFamily: T.sans, fontSize: 15, fontWeight: 600, color: '#fff', cursor: 'pointer', textDecoration: 'underline dotted', textDecorationColor: '#52525b', textUnderlineOffset: 2, width: 'fit-content' }}>{g.name}</div>
              <div style={{ fontFamily: T.mono, fontSize: 13, color: '#c4c4cc', marginTop: 3 }}>{g.line}</div>
            </div>
          </div>
        ))}
      </div>
      )}
      </div>
      </div>

      {/* Zone 4 (last pitch) retired — it lives in the pitch-by-pitch feed, where
          the user is already looking. The drawer holds reference content only. */}
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

function LineupsTray({ onClose, closing, lineupPosted = true }) {
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

        <SectionLabel count={lineupPosted ? d.lineup.length + d.lineup.reduce((n, p) => n + (p.subs ? p.subs.length : 0), 0) : 0}>Lineup</SectionLabel>
        <div style={{ borderBottom: `1px solid ${T.border}`, paddingBottom: 4 }}>
          {lineupPosted ? d.lineup.map((p) => <LineupEntry key={p.num + p.name} p={p} statCol={statCol} />) : (
            <div style={{ padding: '18px 16px 22px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', border: `2px dashed ${T.border}`, display: 'grid', placeItems: 'center', color: T.textFaint, fontSize: 15 }}>📋</div>
              <div style={{ fontFamily: T.sans, fontSize: 12.5, fontWeight: 700, color: T.text }}>Lineup not yet posted</div>
              <div style={{ fontFamily: T.sans, fontSize: 11.5, color: T.textMuted, lineHeight: 1.5, maxWidth: 210 }}>Clubs typically post the starting lineup about an hour before first pitch.</div>
            </div>
          )}
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

// ---------- Between-innings (half-inning transition) state ----------
// Shipped ad hoc Sep 2026 out of a live bug report — the card kept showing the
// batter who made the 3rd out through the whole commercial break — and formalized
// here. Signal is `outs === 3` (backend now derives it from the play's
// runners[].movement.outNumber; MLB's per-pitch count.outs never reaches 3).
//
// TREATMENT DECISION: a TINTED panel (surfaceAlt), not the dashed border that
// shipped. Dashed reads "loading / broken"; this is a normal, expected minute of
// baseball. surfaceAlt is already the play-state eyebrow's surface, so the card
// stays one object. Dark was rejected — it would fight the line-score band for
// the mode-change signal.
//
// HIERARCHY DECISION: the leading batter is emphasized (bigger headshot, name,
// slash line); 2nd and 3rd are context rows. Equal treatment (as shipped) makes
// you read three names to find the one that matters.
// The three batters who actually lead off the incoming half. CHC's 8th ended at
// slot 7 (Swanson in the feed), so the 9th starts at slot 8 — Hoerner, Amaya, Happ.
// The feed's pre-staged canvas names the SAME leadoff batter; one answer, two places.
const DUE_UP_NEXT = [
  { order: 8, num: 2, name: 'Nico Hoerner', pos: '2B', hand: 'R/R', mlbId: 663538, initials: 'NH', slash: '.281 / .329 / .365', today: '1-for-3' },
  { order: 9, num: 9, name: 'Miguel Amaya', pos: 'C',  hand: 'R/R', mlbId: 665804, initials: 'MA', slash: '.240 / .294 / .371', today: '0-for-3' },
  { order: 1, num: 8, name: 'Ian Happ',     pos: 'LF', hand: 'L/R', mlbId: 664023, initials: 'IH', slash: '.243 / .341 / .448', today: '1-for-4' },
];

// Replaces the batter-identity block AND its stat rows for the duration of the gap.
// The stat rows go too: "Today / At-bats / vs Pearson" all describe the batter who
// just made the out, so leaving them is the same staleness bug one level down.
//
// NO TINT and no nested panel: this is the same card cell doing the same job — naming
// who is at the plate — so it keeps the card's own surface. The tint read as a
// different class of object and, with a border, drew a card inside a card.
//
// EQUAL WEIGHT: all three batters get the live batter card's headshot size (68) and
// identical content — order spot, name, position/hand, today's line, slash line.
// Emphasising the leadoff batter was tried and rejected: reading order already says
// who is first, and shrinking 2 and 3 made them look like lesser information.
function DueUpTile({ team = TEAMS.CHC, half = '▼ 9th', batters = DUE_UP_NEXT }) {
  return (
    <div style={{ padding: 18, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
        <TeamDot team={team} size={22} />
        <span style={{ fontFamily: T.sans, fontSize: 14, fontWeight: 700, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{team.short} due up</span>
        <span style={{ marginLeft: 'auto', flexShrink: 0, fontFamily: T.mono, fontSize: 12.5, fontWeight: 700, color: T.textMuted, fontVariantNumeric: 'tabular-nums' }}>{half}</span>
      </div>
      {batters.map(b => (
        <div key={b.num} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', minWidth: 0 }}>
          <Headshot team={team} initials={b.initials} mlbId={b.mlbId} size={68} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
              <OrderSpot n={b.order} />
              <PlayerName style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em' }}>{b.name}</PlayerName>
            </div>
            <div style={{ fontFamily: T.mono, fontSize: 11, color: T.textMuted, whiteSpace: 'nowrap' }}>{b.pos} · {b.hand} · {b.today}</div>
            <div style={{ fontFamily: T.mono, fontSize: 14, fontWeight: 600, color: T.text, marginTop: 4, letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums' }}>{b.slash}</div>
          </div>
        </div>
      ))}
      <div style={{ marginTop: 'auto', fontFamily: T.sans, fontSize: 11.5, fontStyle: 'italic', color: T.textMuted }}>
        Waiting for first pitch
      </div>
    </div>
  );
}
window.MatchupLeft = MatchupLeft;
function MatchupLeft({ lineupsOpen, onToggleLineups, gap }) {
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
      types: ['Four-Seam', 'Slider', 'Four-Seam'],
      last: { type: 'Four-Seam Fastball', mph: 95.7, call: 'SINGLE', tone: 'positive', note: 'lined up the middle' } },
    { inn: '3rd', code: 'K', kind: 'out', reached: 0,
      result: 'Strikeout swinging',
      dots: [{ x: 50, y: 24, label: 1, color: C.strike }, { x: 18, y: 52, label: 2, color: C.ball }, { x: 44, y: 40, label: 3, color: C.foul }, { x: 78, y: 60, label: 4, color: C.strike }],
      types: ['Four-Seam', 'Changeup', 'Slider', 'Slider'],
      last: { type: 'Slider', mph: 86.1, call: 'STRIKEOUT', tone: 'soft', note: 'chased it away' } },
    { inn: '6th', code: 'F8', kind: 'out', reached: 0,
      result: 'Flyout to center',
      dots: [{ x: 50, y: 38, label: 1, color: C.strike }, { x: 58, y: 47, label: 2, color: C.play }],
      types: ['Sinker', 'Four-Seam'],
      last: { type: 'Four-Seam Fastball', mph: 95.0, call: 'FLYOUT', tone: 'soft', note: 'got under it' } },
    { inn: '8th', code: 'BB', kind: 'walk', reachedOnPA: 1, finalBase: 2, stranded: true,
      result: 'Walk',
      dots: [{ x: 79, y: 40, label: 1, color: C.ball }, { x: 50, y: 41, label: 2, color: C.strike }, { x: 50, y: 84, label: 3, color: C.ball }, { x: 20, y: 60, label: 4, color: C.ball }, { x: 82, y: 46, label: 5, color: C.ball }],
      types: ['Four-Seam', 'Changeup', 'Four-Seam', 'Slider', 'Slider'],
      last: { type: 'Slider', mph: 85.5, call: 'WALK', tone: 'info', note: 'just missed away' } },
  ];

  // The live at-bat (in progress) — the default hero view.
  const liveAB = {
    inn: '9th', code: '1-1', live: true,
    dots: [{ x: 48, y: 40, label: 1, color: C.foul }, { x: 84, y: 34, label: 2, color: C.ball }],
    types: ['Changeup', 'Four-Seam'],
    last: { type: 'Four-Seam Fastball', mph: 100, call: 'BALL', tone: 'live', note: 'missed away', seq: '#2 of at-bat' },
  };

  const isLive = sel == null;
  const viewing = isLive ? liveAB : day[sel];
  // Unique pitch types of the displayed at-bat, first-seen order.
  const legendTypes = (viewing.types || []).filter((t, i, a) => a.indexOf(t) === i);

  // At-bats row: chevrons replace the scrollbar, fading in over a gradient only when
  // the row overflows, and scrolling to the exact edge on click (app behaviour).
  const abRef = React.useRef(null);
  const [abCanL, setAbCanL] = React.useState(false);
  const [abCanR, setAbCanR] = React.useState(false);
  React.useEffect(() => {
    const el = abRef.current;
    if (!el) return;
    const sync = () => {
      setAbCanL(el.scrollLeft > 1);
      setAbCanR(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
    };
    sync();
    el.addEventListener('scroll', sync, { passive: true });
    return () => el.removeEventListener('scroll', sync);
  }, []);
  const AbChevron = ({ side }) => (
    <button
      onClick={() => { const el = abRef.current; if (el) el.scrollTo({ left: side === 'left' ? 0 : el.scrollWidth, behavior: 'smooth' }); }}
      aria-label={`Scroll at-bats ${side}`}
      style={{ position: 'absolute', top: 0, bottom: 0, [side]: -4, width: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', padding: 0, cursor: 'pointer', fontSize: 24, lineHeight: 1, color: T.textMuted, zIndex: 1, background: `linear-gradient(to ${side === 'left' ? 'right' : 'left'}, ${T.surface} 55%, transparent)` }}
    >{side === 'left' ? '\u2039' : '\u203a'}</button>
  );

  // Zone legend lists the PITCH TYPES seen in this at-bat (synced from the app) —
  // the legend describes the at-bat, not the pitcher's season arsenal. Full names,
  // not abbreviations; the row reserves two lines so wrapping never shifts the zone.
  // (derived below from the at-bat on screen, so it changes when you rewind)
  // Outcome swatches retained for reference (dot colors still encode outcome).
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
          <Bases on={gap ? [false, false, false] : [true, true, false]} size={26} fill={T.accent} empty={T.borderStrong} strokeWidth={2} />
          <div style={{ display: 'flex', gap: 18, alignItems: 'flex-end' }}>
            {[
              { l: 'Balls',   count: gap ? 0 : 1, total: 3, color: T.info },
              { l: 'Strikes', count: gap ? 0 : 1, total: 2, color: T.text },
              { l: 'Outs',    count: gap ? 0 : 2, total: 2, color: T.accent },
            ].map(p => (
              <span key={p.l} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                <span style={{ fontFamily: T.sans, fontSize: 11.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: T.textMuted }}>{p.l}</span>
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
          padding: '18px 16px 14px',
          borderRight: `1px solid ${T.border}`,
          display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 12,
        }}>
          {/* Rewind context strip — stable height so the zone never jumps */}
          {gap ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 30, padding: '0 4px' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', border: `2px solid ${T.textFaint}` }} />
              <span style={{ fontFamily: T.sans, fontSize: 11.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.textMuted }}>Between innings</span>
            </div>
          ) : isLive ? (
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
            <StrikeZone size={232} dots={gap ? [] : viewing.dots} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 10px', justifyContent: 'center', alignContent: 'flex-start', minHeight: 36, fontSize: 11, color: T.textMuted, fontFamily: T.sans }}>
              {gap ? (
                <span style={{ fontStyle: 'italic', color: T.textFaint }}>No pitches yet this half</span>
              ) : legendTypes.map(name => (
                <span key={name} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: pitchColorV2(name), flexShrink: 0 }} />
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Batter card — or, between halves, who's coming up for the incoming team */}
        {gap ? <DueUpTile /> : (
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
              <div style={{ position: 'relative', minWidth: 0 }}>
              {abCanL && <AbChevron side="left" />}
              {abCanR && <AbChevron side="right" />}
              <div ref={abRef} style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', padding: '3px 5px 6px', margin: '-3px -5px 0', minWidth: 0 }}>
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
            </div>
            <div style={{
              padding: '8px 10px', border: `1px solid ${T.border}`, borderRadius: T.r.sm,
              display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8,
            }}>
              <span style={{ fontSize: 11.5, color: T.textMuted, fontFamily: T.sans, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>vs Pearson</span>
              <span style={{ fontFamily: T.mono, fontSize: 12, color: T.text, fontWeight: 600 }}>
                4-for-12 <span style={{ color: T.textFaint }}>· career</span>
              </span>
            </div>
          </div>
        </div>
        )}
      </div>
    </Card>
  );
}

// ---------- Below the matchup: head-to-head + due-up (fills the left column) ----------

function MatchupContext({ gap }) {
  const dueUp = [
    { label: 'On deck',     order: 4, num: 29, name: 'Michael Busch', pos: '1B', line: '2-4' },
    { label: 'In the hole', order: 5, num: 11, name: 'Cam Smith',     pos: 'DH', line: '1-3' },
  ];
  // Between halves this whole card re-points at the NEXT matchup instead of the one
  // that just ended. Open question 2 from the handoff (the strip showed the OUTGOING
  // pitcher until his replacement threw) is answered here — but in THIS game there is
  // no change to show: Pearson has 3 IP through the 8th, so he is RETURNING for the
  // 9th, not arriving. That is the common case, and it is the one the mock shows;
  // the pitching-change variant swaps the eyebrow to "Coming in" and names the new
  // arm. His line stays monotonic across the break (3 IP / 46 P here, 3 2/3 / 58 in
  // the live state that follows) — the same pitcher cannot throw fewer pitches later.
  const returning = { team: TEAMS.HOU, name: 'Nate Pearson', mlbId: 663554, num: 29, hand: 'RHP', initials: 'NP',
    ip: '3', pitches: '46', line: '2 H · 0 R · 3 K · 1 BB' };
  return (
    <Card padless>
      {/* On the mound — the standalone PitcherCard's content, condensed to one row and
          moved above the fold. It heads this card because the head-to-head below is
          "batter vs THIS pitcher", so the strip names the subject of both halves. */}
      <div style={{ padding: '9px 16px', borderBottom: `1px solid ${T.border}`, background: T.surfaceAlt, display: 'grid', gridTemplateColumns: 'auto minmax(0,1fr) auto', gap: 10, alignItems: 'center' }}>
        {gap ? (
          <React.Fragment>
            <Headshot team={returning.team} initials={returning.initials} mlbId={returning.mlbId} size={30} ratio={1.15} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
              {/* Eyebrow only — no pill on this row. A pill is taller than the eyebrow
                  text and grew the strip by ~5px, so the card jumped every time the
                  gap opened. */}
              <Eyebrow style={{ fontSize: 11 }}>Returning · HOU</Eyebrow>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, minWidth: 0 }}>
                <span onClick={() => window.openPlayerOverview()} style={{ fontFamily: T.sans, fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em', cursor: 'pointer', textDecoration: 'underline dotted', textDecorationColor: T.borderStrong, textUnderlineOffset: 3, whiteSpace: 'nowrap' }}>{returning.name}</span>
                <span style={{ fontFamily: T.mono, fontSize: 11, color: T.textFaint, whiteSpace: 'nowrap' }}>{returning.hand} · #{returning.num}</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-end', fontFamily: T.mono, fontSize: 12.5, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontWeight: 700, color: T.text }}>{returning.ip} <span style={{ fontSize: 11, fontWeight: 500, color: T.textFaint }}>IP</span></span>
                <span style={{ color: T.textMuted }}>{returning.line}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, color: T.textMuted, fontSize: 11.5 }}>
                <span>{returning.pitches} <span style={{ color: T.textFaint }}>P</span></span>
                <span style={{ color: T.textFaint }}>·</span>
                <span><span style={{ color: T.textFaint }}>ERA</span> 0.00</span>
              </div>
            </div>
          </React.Fragment>
        ) : (
          <React.Fragment>
        <Headshot team={TEAMS.HOU} initials="NP" mlbId={663554} size={30} ratio={1.15} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
          <Eyebrow style={{ fontSize: 11 }}>Pitching · HOU</Eyebrow>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, minWidth: 0 }}>
            <span onClick={() => window.openPlayerOverview()} style={{ fontFamily: T.sans, fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em', cursor: 'pointer', textDecoration: 'underline dotted', textDecorationColor: T.borderStrong, textUnderlineOffset: 3, whiteSpace: 'nowrap' }}>Nate Pearson</span>
            <span style={{ fontFamily: T.mono, fontSize: 11, color: T.textFaint, whiteSpace: 'nowrap' }}>RHP · #29</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-end', fontFamily: T.mono, fontSize: 12.5, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontWeight: 700, color: T.text }}>3 2/3 <span style={{ fontSize: 11, fontWeight: 500, color: T.textFaint }}>IP</span></span>
            <span style={{ color: T.textMuted }}>3 H · 0 R · 4 K · 2 BB</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, color: T.textMuted, fontSize: 11.5 }}>
            <span>58 <span style={{ color: T.textFaint }}>P</span></span>
            <span style={{ color: T.textFaint }}>·</span>
            <span><span style={{ color: T.textFaint }}>ERA</span> 0.00</span>
            <span style={{ color: T.textFaint }}>·</span>
            <span><span style={{ color: T.textFaint }}>WHIP</span> 0.96</span>
          </div>
        </div>
          </React.Fragment>
        )}
      </div>
      {/* HEIGHT LOCK: the live and between-innings branches below have different
          content, and the gap branch was 8px shorter — enough to shift MatchupContext
          and everything under it twice per half-inning. The row is pinned to the taller
          (live) height so nothing on the page moves when the gap opens or closes. */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: 138 }}>
        {/* Head-to-head: batter vs the pitcher currently on the mound */}
        <div style={{ padding: '13px 16px 15px', borderRight: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: 11 }}>
          <Eyebrow>{gap ? 'Next matchup' : 'This matchup'}</Eyebrow>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: T.sans, fontSize: 13.5, fontWeight: 700, color: T.text, minWidth: 0 }}>
            <span onClick={() => window.openPlayerOverview()} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer', textDecoration: 'underline dotted', textDecorationColor: T.borderStrong, textUnderlineOffset: 3 }}>{gap ? 'Hoerner' : 'Bregman'}</span>
            <span style={{ color: T.textFaint, fontSize: 11, fontWeight: 600 }}>vs</span>
            <span onClick={() => window.openPlayerOverview()} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer', textDecoration: 'underline dotted', textDecorationColor: T.borderStrong, textUnderlineOffset: 3 }}>Pearson</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.textFaint, width: 46, flexShrink: 0 }}>Today</span>
              <span style={{ fontFamily: T.mono, fontSize: 11.5, fontWeight: 600, color: T.text, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{gap ? <React.Fragment>0-1 <span style={{ color: T.textFaint, fontWeight: 500 }}>· F8</span></React.Fragment> : <React.Fragment>0-1 <span style={{ color: T.textFaint, fontWeight: 500 }}>· K</span></React.Fragment>}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.textFaint, width: 46, flexShrink: 0 }}>Career</span>
              <span style={{ fontFamily: T.mono, fontSize: 11.5, fontWeight: 600, color: T.textMuted, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{gap ? <React.Fragment>2-6 <span style={{ color: T.textFaint, fontWeight: 500 }}>· .333</span></React.Fragment> : <React.Fragment>4-12 <span style={{ color: T.textFaint, fontWeight: 500 }}>· .333 · 1 HR</span></React.Fragment>}</span>
            </div>
          </div>
        </div>

        {/* Due up — or, between halves, the half that just ended (the incoming
            batters live in the Due Up tile above, the pitcher in the strip) */}
        <div style={{ padding: '13px 16px 15px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {gap ? (
            <React.Fragment>
              {/* No pitching change in this game — the strip says Pearson is RETURNING,
                  so a "Leaving the game" block here would name him twice as both the
                  man coming back out and the man being pulled. This half reports the
                  half that just ended instead, which the feed already supports (TOP 9:
                  Dubón K → Vázquez 6-3 → Meyers F8). When there IS a change, this is
                  where the outgoing arm's final line goes. */}
              <Eyebrow>Half just ended</Eyebrow>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <TeamDot team={TEAMS.HOU} size={18} />
                  <span style={{ fontFamily: T.sans, fontSize: 13.5, fontWeight: 700, color: T.text, whiteSpace: 'nowrap' }}>Astros · top 9th</span>
                </div>
                {[
                  { l: 'Result', v: 'Retired in order', sans: true },
                  { l: 'Line', v: '0 R · 0 H · 0 BB' },
                  { l: 'Pitches', v: '11 · 3 batters' },
                ].map(r => (
                  <div key={r.l} style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.textFaint, width: 46, flexShrink: 0 }}>{r.l}</span>
                    <span style={{ fontFamily: r.sans ? T.sans : T.mono, fontSize: 11.5, fontWeight: 600, color: T.textMuted, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{r.v}</span>
                  </div>
                ))}
              </div>
            </React.Fragment>
          ) : (
            <React.Fragment>
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
            </React.Fragment>
          )}
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
// instead of a flat colored circle. Feed carries the PA's OWN result (reachedOnPA); if a
// LATER teammate's hit advanced this runner further (or scored him), the PA object carries
// explicit finalBase/scored overrides (set where the advancement is known — see TOP 8
// Altuve/Tucker on Paredes' slam) so the cell draws the extra light segment past reachedOnPA.
function sbFromCode(pa) {
  const code = typeof pa === 'string' ? pa : pa.icon;
  const base = { '1B': 1, '2B': 2, '3B': 3, 'HR': 4 };
  const overrides = typeof pa === 'string' ? {} : { finalBase: pa.finalBase, scored: pa.scored === true || (pa.scored && pa.scored.runs > 0), advances: pa.advances };
  if (code in base) return { code, kind: 'hit', reachedOnPA: base[code], finalBase: base[code], scored: code === 'HR', ...overrides };
  if (code === 'BB' || code === 'IBB') return { code, kind: 'walk', reachedOnPA: 1, finalBase: 1, ...overrides };
  if (code === 'HBP') return { code, kind: 'hbp', reachedOnPA: 1, finalBase: 1, ...overrides };
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
  const sb = sbFromCode(pa);
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

function PitchByPitchV2({ initialBehind = 0, gap } = {}) {
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
      // Count arithmetic: pitch 1 is a foul, which is a strike, so pitch 2 is thrown
      // at 0-1 and the at-bat now stands 1-1 — matching the play-state eyebrow's pips
      // and the scorebook row's live cell. ("In play, foul" was also self-contradictory
      // wording; a foul is not a ball in play.)
      summary: 'At bat · 1-1',
      pitches: [
        { n: 1, type: 'Changeup',  mph: 93.5, zone: 5, result: 'Foul', count: '0-0' },
        { n: 2, type: 'Four-Seam', mph: 100,  zone: 1, result: 'Ball', tone: 'live', count: '0-1' },
      ],
    },
    // BOT 9 as it actually played: Hoerner (8) K, Amaya (9) groundout — two outs —
    // then Happ (1) walks and Suzuki (2) singles, putting runners on 1st & 2nd for
    // Bregman (3). That is exactly the state the play-state eyebrow and the leverage
    // copy describe, and it makes the BETWEEN-INNINGS boundary honest too: CHC's 8th
    // ended at Swanson (slot 7), so the 9th leads off at slot 8 — Hoerner, who is
    // therefore the batter both the Due Up tile and the pre-staged feed name.
    { id: 'suzuki',  order: 2, inning: 'BOT 9', team: TEAMS.CHC, batter: 'Seiya Suzuki',    summary: 'Single to RF · 1-1',         icon: '1B', color: T.positive },
    { id: 'happ',    order: 1, inning: 'BOT 9', team: TEAMS.CHC, batter: 'Ian Happ',        summary: 'Walk · 3-2',                 icon: 'BB', color: T.info },
    { id: 'amaya',   order: 9, inning: 'BOT 9', team: TEAMS.CHC, batter: 'Miguel Amaya',    summary: 'Groundout to short · 0-2',   icon: '6-3', color: T.textFaint },
    { id: 'hoerner', order: 8, inning: 'BOT 9', team: TEAMS.CHC, batter: 'Nico Hoerner',    summary: 'Strikeout swinging · 2-2',   icon: 'K',  color: T.textFaint },
    { id: 'dubon',   order: 9, inning: 'TOP 9', team: TEAMS.HOU, batter: 'Mauricio Dubón',    summary: 'Strikeout looking · 0-2',     icon: 'K',   color: T.textFaint },
    { id: 'vazquez', order: 8, inning: 'TOP 9', team: TEAMS.HOU, batter: 'Christian Vázquez', summary: 'Groundout to short · 1-2',    icon: '6-3', color: T.textFaint },
    { id: 'meyers',  order: 7, inning: 'TOP 9', team: TEAMS.HOU, batter: 'Jake Meyers',       summary: 'Flyout to center',           icon: 'F8',  color: T.textFaint },
    { id: 'swanson', order: 7, inning: 'BOT 8', team: TEAMS.CHC, batter: 'Dansby Swanson',    summary: 'Groundout to third · 0-1',    icon: '5-3', color: T.textFaint },
    { id: 'cma',     order: 6, inning: 'BOT 8', team: TEAMS.CHC, batter: 'Pete Crow-Armstrong', summary: 'Flyout to right',          icon: 'F9',  color: T.textFaint },
    { id: 'paredes', order: 6, inning: 'TOP 8', team: TEAMS.HOU, batter: 'Isaac Paredes',     summary: 'Grand slam to LF · 425 ft',   icon: 'HR',  color: T.accent, scored: { runs: 4, score: 'HOU 8 – 5 CHC' } },
    { id: 'tucker',  order: 4, inning: 'TOP 8', team: TEAMS.HOU, batter: 'Kyle Tucker',       summary: 'Walk · 3-1',                  icon: 'BB',  color: T.info, finalBase: 4, scored: true, advances: [{ base: 4, label: '#6' }] },
    { id: 'altuve',  order: 1, inning: 'TOP 8', team: TEAMS.HOU, batter: 'Jose Altuve',       summary: 'Single to center · 1-1',      icon: '1B',  color: T.positive, finalBase: 4, scored: true, advances: [{ base: 4, label: '#6' }] },
  ];

  const livePA = PAs.find((p) => p.live);
  // BETWEEN INNINGS: the incoming half has not started, so none of its plate
  // appearances can be in the history yet. Without this filter the feed contradicts
  // itself — "waiting for the first pitch of the bottom of the 9th" sitting directly
  // above three completed BOT 9 at-bats, one of them a single. The gap view cuts the
  // feed at the half boundary; the app's equivalent is "drop plays whose half-inning
  // equals the incoming half", which is a no-op on real data (they don't exist yet)
  // and only matters because this mock is authored mid-half.
  const INCOMING_HALF = 'BOT 9';
  const visiblePAs = gap ? PAs.filter((p) => p.inning !== INCOMING_HALF) : PAs;
  const pastPAs = visiblePAs.filter((p) => !p.live);

  // Pitch table for the live AB (chronological). Lives in the anchored top canvas.
  // Feed state synced from the app: draggable split height + how far behind live
  // the reader has scrolled (drives the Jump-to-live pill).
  const [earlierH, setEarlierH] = React.useState(250);
  // 0 in the resting state: the pill only appears once auto-follow is broken by
  // scrolling away from the live edge (app: sticky in the PAGE scroll context).
  const [behind, setBehind] = React.useState(initialBehind);

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

  // ── Deconstructed card (Aug 25) ──────────────────────────────────────────────
  // The 3D flip is gone. The card is two sections: CHROME (header row + timeline)
  // which is pinned in both modes, and CONTENT which swaps — the pitch feed, or the
  // scorecard sliding up from beneath the timeline. One control cluster serves both
  // modes; the old All/Runs/K/HR/BB filters are removed.
  const scorecardOpen = !!flipped;
  return (
    <div style={{
      position: 'relative',
      height: 640,
      background: T.surface,
      border: `1px solid ${T.border}`,
      borderRadius: T.r.lg,
      boxShadow: T.sh.sm,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* ── Section 1 · chrome: header row ── */}
      <div style={{
        padding: '11px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        borderBottom: `1px solid ${T.border}`,
        background: T.surface,
        flexShrink: 0, minWidth: 0,
      }}>
        {scorecardOpen ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <svg width="15" height="15" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 1.5 18.5 10 10 18.5 1.5 10Z" fill="none" stroke={T.accent} strokeWidth="1.7" /><rect x="7.9" y="14.4" width="4.2" height="4.2" transform="rotate(45 10 16.5)" fill={T.accent} /></svg>
            <span style={{ fontFamily: T.mono, fontSize: 13, fontWeight: 800, letterSpacing: '0.1em', color: T.ink }}>SCOREBOOK</span>
          </span>
        ) : (
          <span style={{ fontFamily: T.sans, fontSize: 15, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>
            {gap
              ? <React.Fragment><span style={{ fontFamily: T.mono, color: T.textMuted, marginRight: 8 }}>▼9</span>Between innings</React.Fragment>
              : <React.Fragment><span style={{ fontFamily: T.mono, color: T.textMuted, marginRight: 8 }}>▼9</span>{livePA.batter}</React.Fragment>}
          </span>
        )}
        {/* one control cluster, both modes */}
        <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexShrink: 0 }}>
          <select defaultValue="9" title="Jump to inning" style={ctlSel}>
            {['1','2','3','4','5','6','7','8','9'].map(i => <option key={i} value={i}>▼{i}</option>)}
          </select>
          <select defaultValue="1" title="Playback speed" style={ctlSel}>
            {['0.5','1','2','4'].map(v => <option key={v} value={v}>{v}×</option>)}
          </select>
          <span style={{ width: 1, height: 20, background: T.border, margin: '0 2px' }} />
          <button title="Previous at-bat" style={ctlBtn}>⏮</button>
          <button title="Play" style={{ ...ctlBtn, width: 'auto', padding: '0 12px', gap: 6, fontFamily: T.sans, fontSize: 11, fontWeight: 700 }}><span style={{ fontSize: 10 }}>▶</span>Play</button>
          <button title="Next at-bat" style={ctlBtn}>⏭</button>
          <span style={{ width: 1, height: 20, background: T.border, margin: '0 2px' }} />
          {scorecardOpen && (
            <Segmented items={[TEAMS.HOU.abbr, TEAMS.CHC.abbr]} active={scorecardTeam === TEAMS.CHC ? 1 : 0} size="sm" onClick={(i) => setScorecardTeam(i === 0 ? TEAMS.HOU : TEAMS.CHC)} />
          )}
          {/* Opening goes through onFlipToBack so the team is seeded and the pan/zoom
              reset runs — bypassing it left the sheet and the toggle disagreeing. */}
          <Segmented items={['Feed', 'Scorecard']} active={scorecardOpen ? 1 : 0} size="sm" onClick={(i) => (i === 1 ? onFlipToBack() : setFlipped(false))} />
        </div>
      </div>

      {/* ── Section 1 · chrome: timeline (pinned in both modes) ── */}
      <div style={{ flexShrink: 0, borderBottom: `1px solid ${T.border}`, background: T.surface }}>
        <FeedTimeline PAs={visiblePAs} />
      </div>

      {/* ── Section 2 · content. position:relative so the scorecard panel can slide
          up inside THIS region (no magic offset for the pinned chrome above). ── */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>

      {/* Current AB canvas — batter pinned at top, pitches scroll below.
          The live AB owns the main space; new pitches grow/scroll HERE only.
          C: 166px floor = batter header + thead + 2 pitch rows always visible, so
          the zone never collapses when the AB has just started.
          BETWEEN INNINGS: there is no live AB, so the canvas cannot keep a batter
          pinned with a LIVE pill — that was the same staleness bug the left card
          just fixed, one column over. Instead of a retrospective "half over" panel
          it PRE-STAGES the at-bat we already know is coming: the leading batter,
          his order spot, an 0-0 count and an empty pitch region waiting for the
          first pitch. Same batter the Due Up tile leads with — one answer, two
          places, agreeing. Rust drops to neutral because nothing is live yet. */}
      <div style={{ flex: 1, minHeight: 166, display: 'flex', flexDirection: 'column', background: gap ? T.surfaceAlt : T.accentSoft + '22', borderLeft: `3px solid ${gap ? T.borderStrong : T.accent}` }}>
        {gap ? (
          <React.Fragment>
            <div style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: '74px 46px 1fr auto', gap: 12, alignItems: 'center', padding: '12px 16px', background: T.surfaceAlt, borderBottom: `1px solid ${T.border}` }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
                <span style={{ fontFamily: T.mono, fontSize: 11.5, color: T.textMuted, fontWeight: 700, letterSpacing: '0.06em' }}>BOT 9</span>
                <TeamDot team={TEAMS.CHC} size={22} />
              </div>
              {/* empty cell keeps the 46px marker column, so the header grid does not reflow */}
              <span />
              <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, fontSize: 14, fontWeight: 600, lineHeight: 1.3 }}>
                <OrderSpot n={8} />
                <span>
                  <span onClick={() => window.openPlayerOverview()} style={{ textDecoration: 'underline dotted', textUnderlineOffset: 2, cursor: 'pointer' }}>Nico Hoerner</span>{' '}
                  <span style={{ color: T.textMuted, fontWeight: 500, whiteSpace: 'nowrap' }}>· leading off · 0-0</span>
                </span>
                <Pill tone="soft" style={{ fontSize: 10 }}>DUE UP</Pill>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '16px 16px 16px 74px' }}>
              <div style={{ fontFamily: T.sans, fontSize: 12.5, fontStyle: 'italic', color: T.textMuted }}>
                Waiting for the first pitch of the bottom of the 9th.
              </div>
            </div>
          </React.Fragment>
        ) : (
          <React.Fragment>
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
          {/* B — Jump-to-live pill. Sticky above the feed; the badge counts how many
              at-bats you are behind the live edge (the visible half of the signed-off
              follow/break behaviour). Renders only when following has been broken. */}
          {behind > 0 && (
            <div style={{ position: 'sticky', top: 8, zIndex: 20, height: 0, overflow: 'visible', textAlign: 'center', pointerEvents: 'none' }}>
              <button onClick={() => setBehind(0)} style={{ pointerEvents: 'all', display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: T.accent, color: '#fff', border: 'none', borderRadius: T.r.pill, fontFamily: T.sans, fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 6px 18px -4px rgba(184,66,30,0.5)', whiteSpace: 'nowrap' }}>
                <span style={{ fontSize: 11 }}>↓</span>Jump to live
                <span style={{ fontFamily: T.mono, fontSize: 11, fontVariantNumeric: 'tabular-nums', background: 'rgba(255,255,255,0.22)', borderRadius: 999, padding: '1px 7px' }}>{behind}</span>
              </button>
            </div>
          )}

          <LivePitchTable />
        </div>
          </React.Fragment>
        )}
      </div>

      {/* A — Draggable split handle. Earlier's height is user-controlled (drag to
          rebalance canvas vs history); 96px floor = header + one collapsed row. */}
      <div
        onPointerDown={(e) => {
          e.preventDefault();
          const startY = e.clientY, startH = earlierH;
          const move = (ev) => setEarlierH(Math.max(96, Math.min(420, startH - (ev.clientY - startY))));
          const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
          window.addEventListener('pointermove', move);
          window.addEventListener('pointerup', up);
        }}
        title="Drag to resize"
        style={{ flexShrink: 0, height: 8, cursor: 'row-resize', background: T.surfaceAlt, borderTop: `2px solid ${T.borderStrong}`, borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', userSelect: 'none', touchAction: 'none' }}
      >
        <span style={{ width: 40, height: 3, borderRadius: 2, background: T.borderStrong, pointerEvents: 'none' }} />
      </div>

      {/* Earlier at-bats — anchored at the bottom with its own scroll, so new pitches
          arriving in the live AB never shift or crowd the finished at-bats. */}
      <div style={{ flexShrink: 0, height: earlierH, minHeight: 96, overflowY: 'auto', background: T.surface }}>
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
                <ScorebookCell inn="" {...sbFromCode(pa)} width={44} codeIn />
              )}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  {pa.order && <OrderSpot n={pa.order} />}
                  <span>
                    <span onClick={() => window.openPlayerOverview()} style={{ textDecoration: 'underline dotted', textUnderlineOffset: 2, cursor: 'pointer' }}>{pa.batter}</span>{' '}
                    <span style={{ color: T.textMuted, fontWeight: 500 }}>· {pa.summary}</span>
                  </span>
                  {pa.live && <Pill tone="live">LIVE</Pill>}
                  {/* `scored` carries TWO shapes in the feed: an object {runs, score}
                      for run-producing PAs (renders this chip) and a bare boolean on
                      PAs where the batter himself later scored (a scorebook-diamond
                      flag, no run count). Gate on the count, or the boolean case
                      interpolates as "undefined runs score". */}
                  {pa.scored && pa.scored.runs != null && (
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

    {/* Scorecard — slides up from beneath the timeline, inside the content region. */}
    <div style={{
      position: 'absolute', inset: 0,
      background: T.surface,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      transform: scorecardOpen ? 'translateY(0)' : 'translateY(101%)',
      transition: 'transform 0.45s cubic-bezier(.22,.7,.3,1)',
      pointerEvents: scorecardOpen ? 'auto' : 'none',
    }}>
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
          <ScorecardGrid pas={visiblePAs} team={scorecardTeam || livePA.team} />
        </div>
      </div>
    </div>
    </div>
    </div>
  );
}

// Header control styles for the deconstructed feed card.
const ctlSel = { flexShrink: 0, fontFamily: T.mono, fontSize: 11, fontWeight: 700, color: T.text, background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: T.r.pill, padding: '5px 4px', cursor: 'pointer', width: 46 };
const ctlBtn = { width: 28, height: 28, display: 'grid', placeItems: 'center', background: T.surface, color: T.text, border: `1px solid ${T.border}`, borderRadius: T.r.pill, cursor: 'pointer', fontSize: 12 };
// FeedTimeline — the whole game as one rail, pinned under the header in both modes.
// Half-inning segments sized by pitches thrown; two run lanes (away above, home
// below) labelled by team logo; the marker owns gold.
function FeedTimeline({ PAs }) {
  const segs = React.useMemo(() => {
    const order = PAs.slice().reverse(); // chronological
    const out = [];
    order.forEach(pa => {
      const n = (pa.pitches && pa.pitches.length) || 4;
      const key = pa.inning;
      const cur = out[out.length - 1];
      if (cur && cur.key === key) cur.count += n;
      else out.push({ key, count: n, top: /^TOP/.test(pa.inning), inn: (pa.inning.match(/\d+/) || ['9'])[0] });
    });
    return out;
  }, [PAs]);
  const total = segs.reduce((a, s2) => a + s2.count, 0);
  const runs = React.useMemo(() => {
    const order = PAs.slice().reverse();
    let acc = 0; const out = [];
    order.forEach(pa => {
      const n = (pa.pitches && pa.pitches.length) || 4;
      acc += n;
      const r = pa.scored && (pa.scored.runs || (pa.scored === true ? 1 : 0));
      if (r) out.push({ pct: (acc / total) * 100, away: pa.team === TEAMS.HOU, n: r, label: `${pa.inning} · ${pa.summary}` });
    });
    return out;
  }, [PAs, total]);
  const lane = (away) => (
    <div style={{ position: 'relative', height: 11 }}>
      {runs.filter(r => r.away === away).map((r, i) => (
        <span key={i} title={`${r.n} run${r.n > 1 ? 's' : ''} · ${r.label}`} style={{
          position: 'absolute', left: `${r.pct}%`, transform: 'translateX(-50%)',
          width: r.n > 1 ? 9 : 6, height: r.n > 1 ? 9 : 6, borderRadius: '50%',
          background: away ? T.info : T.accent,
          top: away ? 'auto' : 1, bottom: away ? 1 : 'auto',
        }} />
      ))}
    </div>
  );
  return (
    <div style={{ padding: '9px 16px 10px', display: 'grid', gridTemplateColumns: '24px 1fr', columnGap: 10, alignItems: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <span style={{ height: 11, display: 'grid', placeItems: 'center' }}><TeamDot team={TEAMS.HOU} size={13} /></span>
        <span style={{ height: 12 }} />
        <span style={{ height: 11, display: 'grid', placeItems: 'center' }}><TeamDot team={TEAMS.CHC} size={13} /></span>
      </div>
      <div>
        {lane(true)}
        <div style={{ position: 'relative', height: 12, display: 'flex', gap: 1, cursor: 'pointer' }}>
          {segs.map((sg, i) => (
            <div key={i} title={`${sg.top ? '▲' : '▼'}${sg.inn} · ${sg.count} pitches`}
              style={{ flex: sg.count, background: sg.top ? T.surfaceAlt : T.border, borderRadius: 2 }} />
          ))}
          {/* marker — gold, distinct from the run pips */}
          <span style={{ position: 'absolute', top: -6, bottom: -6, right: 0, width: 2, background: T.highlight }} />
          <span style={{ position: 'absolute', top: -11, right: -5, width: 11, height: 11, borderRadius: '50%', background: T.highlight, border: `2px solid ${T.surface}` }} />
        </div>
        {lane(false)}
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

function LeverageCard({ gap }) {
  // Leverage scale: 0 → 3.5, marker at current 2.4, avg at 1.0
  const cur = 2.4, avg = 1.0, peak = 3.1;
  // App thresholds: >=2.0 HIGH, >=1.0 MED, else LOW. Scale expands past 3.5 if the
  // peak demands it, so a wild game doesn't clip.
  const label = cur >= 2.0 ? 'HIGH' : cur >= 1.0 ? 'MED' : 'LOW';
  const maxLev = Math.max(3.5, Math.ceil(peak * 2) / 2);
  const pct = v => (v / maxLev) * 100;
  return (
    <Card padless>
      <div style={{ padding: '14px 18px 10px', borderBottom: `1px solid ${T.border}` }}>
        <Eyebrow>Leverage index</Eyebrow>
      </div>
      <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontFamily: T.mono, fontSize: 34, fontWeight: 700, color: T.accent, letterSpacing: '-0.02em', lineHeight: 1 }}>{cur.toFixed(1)}×</span>
          <Pill tone="accent">{label}</Pill>
        </div>
        <div style={{ fontSize: 12, color: T.textMuted, lineHeight: 1.5 }}>
          How much this moment can swing the outcome vs. an average play.{' '}
          {gap
            ? 'Between innings — recalculates on the first pitch of the next half.'
            : 'Runners on 1st & 2nd, 2 outs, tying run aboard.'}
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

// PREGAME BAND — now the same 48px sticky bar + overlay drawer as the live view
// (Sep 6, 2026). It used to be its own 164px three-zone block, which is exactly the
// fixed chrome the Sep 5 pass removed from the live band; keeping it here meant the
// game view changed shape at first pitch. Differences from live, all data not design:
//   · runs read as dashes and neither side is dimmed — nobody is ahead yet
//   · the trigger says "Line score & probables"
//   · the drawer's right side carries probable pitchers + season form instead of
//     game leaders (there are no leaders before a pitch is thrown)
function PregameLineScoreBand({ gameInnings = 9 }) {
  // Innings count is a prop, not a literal, so a scheduled 7-inning game (the
  // doubleheader case) renders correctly — matching the live band, where the count
  // is DERIVED rather than fixed at 9.
  const empty = Array.from({ length: gameInnings }, () => null);
  const ZoneHead = ({ children }) => (
    <div style={{ fontSize: 12, color: '#b0b0b8', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 12 }}>{children}</div>
  );
  const Prob = ({ p, label }) => (
    <div style={{ display: 'flex', gap: 10, marginBottom: 13, alignItems: 'center' }}>
      <TeamDot team={p.team} size={22} onDark />
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
  const zones = (
    <div style={{ display: 'flex' }}>
      <div style={{ padding: '0 20px', borderLeft: '1px solid #27272a', minWidth: 260 }}>
        <ZoneHead>Probable pitchers</ZoneHead>
        <Prob p={PROBABLES.away} label="Away" />
        <Prob p={PROBABLES.home} label="Home" />
      </div>
      <div style={{ padding: '0 0 0 20px', borderLeft: '1px solid #27272a', minWidth: 200 }}>
        <ZoneHead>Coming in</ZoneHead>
        {form.map((f, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'center' }}>
            <TeamDot team={f.team} size={22} onDark />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: T.mono, fontSize: 13, fontWeight: 700, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{f.rec}</div>
              <div style={{ fontFamily: T.sans, fontSize: 11.5, color: '#a1a1aa' }}>L10 <span style={{ fontFamily: T.mono }}>{f.l10}</span> · Streak <span style={{ fontFamily: T.mono, color: f.strk[0] === 'W' ? '#86efac' : '#fca5a5' }}>{f.strk}</span></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
  return (
    <LineScoreBand
      mode="pregame"
      isLive={false}
      curInning={0}
      runsAway={empty}
      runsHome={empty}
      totals={{ away: ['–', '–', '–'], home: ['–', '–', '–'] }}
      zones={zones}
    />
  );
}
// Content column. 1240 is the app-wide default; the game view is the ONE declared
// exception at 1600 (content 1544) because it is a genuine two-column app screen —
// at 1240 the pitch feed drops to 568px beside the fixed 600px left column.
// Border-box, so the token means exactly one thing wherever it is applied.
// Module scope: BOTH the live and pregame variants use it, so they share one definition.
const colV2 = { maxWidth: 1600, margin: '0 auto', width: '100%', padding: '0 28px', boxSizing: 'border-box' };

window.GameScreenV2Pregame = function GameScreenV2Pregame() {
  const firstPitchAt = React.useRef(Date.now() + 2 * 3600000 + 14 * 60000).current;
  const countdown = window.useLiveTimer({ mode: 'countdown', target: firstPitchAt });
  const [lineupsOpen, setLineupsOpen] = React.useState(false);
  const [lineupsClosing, setLineupsClosing] = React.useState(false);
  const [view, setView] = React.useState('preview'); // 'preview' | 'h2h'
  const [navOpen, setNavOpen] = React.useState(false);
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
    <Page width={1600}>
      <window.BrandHeader back="Games" active="games" onMenu={() => setNavOpen(true)} colStyle={colV2} />
            <PageTitle
        title={<window.MatchupTitle away={TEAMS.HOU} home={TEAMS.CHC} />}
        subtitle={<React.Fragment>Wrigley Field · Sun May 24 · 8:05p ET</React.Fragment>}
        subtitleRight={<Segmented items={['Preview', 'Head-to-head']} active={view === 'h2h' ? 1 : 0} onClick={(i) => setView(i === 0 ? 'preview' : 'h2h')} />}
        right={<Pill tone="soft" style={{ fontFamily: T.mono }}>{countdown}</Pill>}
      />

      <div style={{ ...colV2, paddingTop: 0, paddingBottom: 36, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <PregameLineScoreBand />

        {view === 'h2h' ? (
          <window.HeadToHeadScreen lineups={LINEUPS} probables={PROBABLES} />
        ) : (
        <Card padless>
          <div style={{ padding: '11px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${T.border}`, background: T.surfaceAlt }}>
            <Eyebrow style={{ fontSize: 11 }}>Matchup</Eyebrow>
            <button onClick={toggleLineups} style={{
              display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 12px',
              background: (lineupsOpen && !lineupsClosing) ? T.ink : T.surface,
              border: `1px solid ${(lineupsOpen && !lineupsClosing) ? T.ink : T.borderStrong}`,
              borderRadius: T.r.pill, cursor: 'pointer',
              fontFamily: T.sans, fontSize: 12, fontWeight: 600, color: (lineupsOpen && !lineupsClosing) ? '#fff' : T.text,
            }}>
              Lineups
              <span style={{ color: (lineupsOpen && !lineupsClosing) ? '#d4d4d8' : T.textFaint, fontSize: 11 }}>{(lineupsOpen && !lineupsClosing) ? '▸' : '▾'}</span>
            </button>
          </div>
          <div style={{ padding: '48px 24px 56px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', border: `2px solid ${T.border}`, display: 'grid', placeItems: 'center', color: T.textFaint, fontSize: 22 }}>⚾</div>
            <div style={{ fontFamily: T.sans, fontSize: 16, fontWeight: 700, color: T.text }}>Game hasn't started</div>
            <div style={{ fontFamily: T.sans, fontSize: 13, color: T.textMuted, maxWidth: 380, lineHeight: 1.5 }}>
              The batter matchup, strike zone, and pitch-by-pitch feed appear here once the lineup posts and the first pitch is thrown — usually about an hour before <span style={{ fontFamily: T.mono, fontWeight: 600, color: T.text }}>8:05p ET</span>. Bench and bullpen are available now in Lineups →.
            </div>
          </div>
        </Card>
        )}
      </div>
    </Page>
    {lineupsOpen && (
      <React.Fragment>
        <div onClick={closeLineups} style={{ position: 'absolute', inset: 0, zIndex: 45, background: 'rgba(20,16,12,0.28)', animation: lineupsClosing ? 'lineupFadeOut 0.22s ease forwards' : 'lineupFadeIn 0.24s ease' }} />
        <style>{`@keyframes lineupFadeIn { from { opacity: 0; } to { opacity: 1; } } @keyframes lineupFadeOut { from { opacity: 1; } to { opacity: 0; } }`}</style>
        <LineupsTray closing={lineupsClosing} onClose={closeLineups} lineupPosted={false} />
      </React.Fragment>
    )}
    <window.NavDrawer open={navOpen} onClose={() => setNavOpen(false)} active="games" />
    </div>
  );
};

// ---------- Assembly ----------

// Expose pieces the postgame state reuses (win-prob arc + leverage are complete-game
// views and read correctly post-final; the tray is shared chrome).
Object.assign(window, { WinProbTimeline, LeverageCard, LineupsTray, LINEUPS, PROBABLES, LineScoreBand, PitchByPitchV2 });

window.GameScreenV2 = function GameScreenV2() {
  const gameStartedAt = React.useRef(Date.now() - (2 * 60 + 47) * 1000).current;
  const elapsed = window.useLiveTimer({ mode: 'countup', since: gameStartedAt });
  const [lineupsOpen, setLineupsOpen] = React.useState(false);
  const [lineupsClosing, setLineupsClosing] = React.useState(false);
  const [view, setView] = React.useState('preview'); // 'preview' | 'h2h' — kept around post-first-pitch too
  const [navOpen, setNavOpen] = React.useState(false);
  // MOCK CONTROL ONLY — do not port. The half-inning gap is driven by `outs === 3`
  // in the app; a static mock has no feed, so a switch stands in for the signal.
  const [gap, setGap] = React.useState(false);
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
    <Page width={1600}>
      <window.BrandHeader back="Games" active="games" onMenu={() => setNavOpen(true)} colStyle={colV2} />
      {/* Demo default. Port: backLabel/target must reflect the ACTUAL screen the user
          navigated from (game list, a player page, etc.) via router history — not a
          hardcoded per-screen string. This mock can only render one example. */}
      <div style={colV2}>
      <PageTitle
        flush
        title={<window.MatchupTitle away={TEAMS.HOU} home={TEAMS.CHC} />}
        subtitle={<React.Fragment>Wrigley Field · Sun May 24 · ▼ 9th</React.Fragment>}
        subtitleRight={<Segmented items={['Live', 'Head-to-head']} active={view === 'h2h' ? 1 : 0} onClick={(i) => setView(i === 0 ? 'preview' : 'h2h')} />}
        right={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <LivePill />
            <Pill tone="soft" style={{ fontFamily: T.mono }}>{elapsed}</Pill>
          </div>
        }
      />
      </div>

      <div style={{ ...colV2, paddingTop: 16, paddingBottom: 36, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <LineScoreBand />

        {view === 'h2h' ? (
          <window.HeadToHeadScreen lineups={LINEUPS} probables={PROBABLES} initial={{ side: 'CHC', slot: 3 }} />
        ) : (
        <React.Fragment>
        {/* MOCK CONTROL — not part of the design.
            The app only moves forward: outs===3 fires, the gap opens, first pitch
            closes it. A static mock has no clock, so this toggle REWINDS the same
            game to the break just before the half now in progress — the live view
            is Bregman batting with two outs in the ▼9th, the gap is that same ▼9th
            four minutes earlier, before Hoerner led it off. Two moments of one
            timeline, not two simultaneous truths. */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
          <button onClick={() => setGap(g => !g)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 11px',
            background: 'transparent', border: `1px dashed ${T.borderStrong}`, borderRadius: T.r.pill,
            cursor: 'pointer', fontFamily: T.sans, fontSize: 11, fontWeight: 600, color: T.textMuted,
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: gap ? T.accent : 'transparent', border: `1px solid ${gap ? T.accent : T.textFaint}` }} />
            Mock: rewind to between innings
          </button>
          <span style={{ fontFamily: T.sans, fontSize: 11, fontStyle: 'italic', color: T.textFaint }}>
            {gap
              ? 'Same game, before the ▼9th started — Hoerner due up. Toggle off to return to Bregman’s at-bat.'
              : 'Live: ▼9th in progress, two outs. Toggle to see the break that preceded it.'}
          </span>
        </div>

        {/* Above-the-fold two-column row */}
        <div style={{ display: 'grid', gridTemplateColumns: '600px 1fr', gap: 16, alignItems: 'start' }}>
          <div style={{ position: 'sticky', top: 16, alignSelf: 'start', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <MatchupLeft gap={gap} lineupsOpen={lineupsOpen && !lineupsClosing} onToggleLineups={toggleLineups} />
            <MatchupContext gap={gap} />
          </div>
          <PitchByPitchV2 gap={gap} />
        </div>

        {/* Below the fold. The standalone <PitcherCard /> used to sit here; its content
            now rides above the fold as the MatchupContext header (Aug 26, 2026) — 190px
            of full-width card for six numbers wasn't earning its place below the fold.
            The component is kept, unmounted, in case the fuller treatment is wanted. */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'stretch' }}>
          <WinProbTimeline />
          <LeverageCard gap={gap} />
        </div>
        </React.Fragment>
        )}
      </div>
    </Page>
    {lineupsOpen && (
      <React.Fragment>
        <div onClick={closeLineups} style={{ position: 'absolute', inset: 0, zIndex: 45, background: 'rgba(20,16,12,0.28)', animation: lineupsClosing ? 'lineupFadeOut 0.22s ease forwards' : 'lineupFadeIn 0.24s ease' }} />
        <style>{`@keyframes lineupFadeIn { from { opacity: 0; } to { opacity: 1; } } @keyframes lineupFadeOut { from { opacity: 1; } to { opacity: 0; } }`}</style>
        <LineupsTray closing={lineupsClosing} onClose={closeLineups} />
      </React.Fragment>
    )}
    <window.NavDrawer open={navOpen} onClose={() => setNavOpen(false)} active="games" />
    </div>
  );
};
