// SNAPSHOT: copied from the live design workspace (holistic/leaders.jsx) on Sep 10, 2026.
// This is a FROZEN COPY for handoff. If the date above is old, the live file may have
// moved on — check before treating this as current.
/* global React, T, TeamDot, Card, Eyebrow, Segmented, AppHeader, Page, PageTitle, btn */

// ============================================================
// LEAGUE LEADERS — restyled to the editorial-scorebook system.
// Batting / Pitching toggle · MLB | AL | NL filter (re-ranks live).
// exports window.LeadersScreen
// ============================================================

// Team lookup used by the leaderboards (id → real MLB logo; lg → AL/NL filter).
const LTEAMS = {
  ARI: { abbr: 'ARI', id: 109, primary: '#A71930', lg: 'NL' },
  ATL: { abbr: 'ATL', id: 144, primary: '#13274F', lg: 'NL' },
  ATH: { abbr: 'ATH', id: 133, primary: '#003831', lg: 'AL' },
  BAL: { abbr: 'BAL', id: 110, primary: '#DF4601', lg: 'AL' },
  BOS: { abbr: 'BOS', id: 111, primary: '#BD3039', lg: 'AL' },
  CHC: { abbr: 'CHC', id: 112, primary: '#0E3386', lg: 'NL' },
  CIN: { abbr: 'CIN', id: 113, primary: '#C6011F', lg: 'NL' },
  CLE: { abbr: 'CLE', id: 114, primary: '#00385D', lg: 'AL' },
  COL: { abbr: 'COL', id: 115, primary: '#333366', lg: 'NL' },
  CWS: { abbr: 'CWS', id: 145, primary: '#27251F', lg: 'AL' },
  DET: { abbr: 'DET', id: 116, primary: '#0C2340', lg: 'AL' },
  HOU: { abbr: 'HOU', id: 117, primary: '#002D62', lg: 'AL' },
  KC:  { abbr: 'KC',  id: 118, primary: '#004687', lg: 'AL' },
  LAA: { abbr: 'LAA', id: 108, primary: '#003263', lg: 'AL' },
  LAD: { abbr: 'LAD', id: 119, primary: '#005A9C', lg: 'NL' },
  MIA: { abbr: 'MIA', id: 146, primary: '#00A3E0', lg: 'NL' },
  MIL: { abbr: 'MIL', id: 158, primary: '#12284B', lg: 'NL' },
  MIN: { abbr: 'MIN', id: 142, primary: '#002B5C', lg: 'AL' },
  NYM: { abbr: 'NYM', id: 121, primary: '#002D72', lg: 'NL' },
  NYY: { abbr: 'NYY', id: 147, primary: '#0C2340', lg: 'AL' },
  PHI: { abbr: 'PHI', id: 143, primary: '#E81828', lg: 'NL' },
  PIT: { abbr: 'PIT', id: 134, primary: '#27251F', lg: 'NL' },
  SD:  { abbr: 'SD',  id: 135, primary: '#2F241D', lg: 'NL' },
  SEA: { abbr: 'SEA', id: 136, primary: '#0C2C56', lg: 'AL' },
  SF:  { abbr: 'SF',  id: 137, primary: '#FD5A1E', lg: 'NL' },
  STL: { abbr: 'STL', id: 138, primary: '#C41E3A', lg: 'NL' },
  TB:  { abbr: 'TB',  id: 139, primary: '#092C5C', lg: 'AL' },
  TEX: { abbr: 'TEX', id: 140, primary: '#003278', lg: 'AL' },
  TOR: { abbr: 'TOR', id: 141, primary: '#134A8E', lg: 'AL' },
  WSH: { abbr: 'WSH', id: 120, primary: '#AB0003', lg: 'NL' },
};
// Unknown teamId must not crash a card. The app falls back to an abbr derived from
// teamName with a textFaint chip; mirrored here.
const tm = k => LTEAMS[k] || { abbr: String(k).slice(0, 3).toUpperCase(), id: 0, primary: T.textFaint, lg: null };

// value formatters
const fInt  = v => String(v);
const fRate = v => (v >= 1 ? v.toFixed(3) : v.toFixed(3).replace(/^0/, '')); // .337 / 1.056
const fEra  = v => v.toFixed(2);
const fWhip = v => (v >= 1 ? v.toFixed(2) : v.toFixed(2).replace(/^0/, ''));

// r(team, name, val) row helper
const r = (t, name, val, disp) => ({ t, name, val, disp });

const BATTING = [
  { key: 'hr',  label: 'Home Runs',   unit: 'HR',  fmt: fInt, rows: [
    r('PHI','Kyle Schwarber',30), r('HOU','Yordan Alvarez',27), r('COL','Hunter Goodman',27),
    r('MIN','Byron Buxton',25), r('TB','Junior Caminero',25), r('NYY','Ben Rice',24),
    r('WSH','James Wood',23), r('ATL','Matt Olson',22), r('CWS','Colson Montgomery',21),
    r('PHI','Bryce Harper',20), r('ATH','Nick Kurtz',20), r('ATH','Shea Langeliers',20),
    r('TB','Brandon Lowe',20), r('SF','Rafael Devers',20), r('CWS','Miguel Vargas',20) ] },
  { key: 'avg', label: 'Batting Avg',  unit: 'AVG', fmt: fRate, rows: [
    r('MIA','Otto Lopez',0.337), r('SD','Luis Arraez',0.326), r('TB','Yandy Díaz',0.325),
    r('SF','Jung Hoo Lee',0.319), r('HOU','Yordan Alvarez',0.319), r('MIA','Troy Johnston',0.315),
    r('PHI','Brandon Marsh',0.315), r('PIT','Nick Gonzales',0.304), r('MIA','Xavier Edwards',0.299),
    r('TEX','Josh Jung',0.298) ] },
  { key: 'rbi', label: 'RBI',          unit: 'RBI', fmt: fInt, rows: [
    r('ATH','Nick Kurtz',66), r('STL','Jordan Walker',63), r('STL','Alec Burleson',62),
    r('WSH','Luis García Jr.',62), r('LAD','Andy Pages',62), r('HOU','Yordan Alvarez',61),
    r('WSH','CJ Abrams',60), r('TB','Brandon Lowe',60), r('CIN','Sal Stewart',60),
    r('NYM','Pete Alonso',59), r('DET','Dillon Dingler',59) ] },
  { key: 'runs', label: 'Runs',        unit: 'R', fmt: fInt, rows: [
    r('WSH','James Wood',77), r('ATH','Nick Kurtz',61), r('MIL','Brice Turang',61),
    r('HOU','Yordan Alvarez',60), r('LAD','Shohei Ohtani',60), r('PIT','Bryan Reynolds',60),
    r('CHC','Ian Happ',59), r('LAA','Zach Neto',59), r('PHI','Trea Turner',59),
    r('STL','Iván Herrera',58), r('NYY','Ben Rice',58), r('CWS','Miguel Vargas',58) ] },
  { key: 'hits', label: 'Hits',        unit: 'H', fmt: fInt, rows: [
    r('MIA','Otto Lopez',117), r('SD','Luis Arraez',106), r('HOU','Yordan Alvarez',101),
    r('MIA','Xavier Edwards',100), r('PHI','Trea Turner',99), r('KC','Bobby Witt Jr.',98),
    r('PHI','Brandon Marsh',96), r('TB','Yandy Díaz',95), r('SF','Jung Hoo Lee',94),
    r('CHC','Pete Crow-Armstrong',93) ] },
  { key: 'sb',  label: 'Stolen Bases', unit: 'SB', fmt: fInt, rows: [
    r('WSH','Nasim Nuñez',32), r('KC','Bobby Witt Jr.',29), r('NYY','Jazz Chisholm Jr.',26),
    r('CHC','Pete Crow-Armstrong',25), r('CIN','Elly De La Cruz',24), r('COL','Brenton Doyle',22),
    r('ARI','Corbin Carroll',21), r('ATL','Ronald Acuña Jr.',20), r('SD','Jackson Merrill',19),
    r('MIA','Xavier Edwards',18) ] },
  { key: 'ops', label: 'OPS',          unit: 'OPS', fmt: fRate, rows: [
    r('HOU','Yordan Alvarez',1.056), r('NYM','Juan Soto',0.971), r('ATH','Nick Kurtz',0.949),
    r('SEA','Cal Raleigh',0.945), r('LAD','Shohei Ohtani',0.941), r('PHI','Kyle Schwarber',0.930),
    r('PHI','Bryce Harper',0.921), r('MIN','Byron Buxton',0.915), r('COL','Hunter Goodman',0.908),
    r('TB','Yandy Díaz',0.905) ] },
];

// Order follows the app's PITCHING_CATEGORIES (ERA, Strikeouts, Wins, Saves, WHIP).
// `Innings` is design-ahead — see the handoff; it is not in the app's category list yet.
const PITCHING = [
  { key: 'era', label: 'ERA',         unit: 'ERA', fmt: fEra, asc: true, rows: [
    r('DET','Tarik Skubal',2.14), r('PIT','Paul Skenes',2.20), r('BOS','Garrett Crochet',2.31),
    r('PHI','Zack Wheeler',2.45), r('PHI','Cristopher Sánchez',2.50), r('WSH','MacKenzie Gore',2.58),
    r('SEA','Bryan Woo',2.62), r('NYY','Max Fried',2.70), r('SEA','Logan Gilbert',2.75),
    r('HOU','Framber Valdez',2.80) ] },
  { key: 'so',  label: 'Strikeouts',  unit: 'SO', fmt: fInt, rows: [
    r('PIT','Paul Skenes',168), r('BOS','Garrett Crochet',165), r('DET','Tarik Skubal',160),
    r('PHI','Zack Wheeler',152), r('WSH','MacKenzie Gore',150), r('SEA','Logan Gilbert',140),
    r('SEA','Bryan Woo',138), r('TOR','Kevin Gausman',135), r('ATL','Chris Sale',133),
    r('SD','Dylan Cease',132) ] },
  { key: 'w',   label: 'Wins',        unit: 'W', fmt: fInt, rows: [
    r('BOS','Garrett Crochet',12), r('DET','Tarik Skubal',11), r('PHI','Zack Wheeler',11),
    r('HOU','Framber Valdez',10), r('SF','Logan Webb',10), r('WSH','MacKenzie Gore',10),
    r('STL','Sonny Gray',9), r('SEA','Bryan Woo',9), r('PHI','Cristopher Sánchez',9),
    r('TOR','Kevin Gausman',9) ] },
  { key: 'sv',  label: 'Saves',       unit: 'SV', fmt: fInt, rows: [
    r('HOU','Josh Hader',24), r('CLE','Emmanuel Clase',23), r('ATH','Mason Miller',22),
    r('NYY','Devin Williams',21), r('NYM','Edwin Díaz',20), r('STL','Ryan Helsley',19),
    r('SD','Robert Suarez',19), r('ATL','Raisel Iglesias',18), r('MIL','Trevor Megill',18),
    r('TB','Pete Fairbanks',17) ] },
  { key: 'whip', label: 'WHIP',       unit: 'WHIP', fmt: fWhip, asc: true, rows: [
    r('DET','Tarik Skubal',0.88), r('PIT','Paul Skenes',0.92), r('BOS','Garrett Crochet',0.95),
    r('PHI','Zack Wheeler',0.98), r('NYY','Max Fried',1.01), r('PHI','Cristopher Sánchez',1.03),
    r('WSH','MacKenzie Gore',1.05), r('SEA','Bryan Woo',1.06), r('SEA','Logan Gilbert',1.08),
    r('SF','Logan Webb',1.10) ] },
  { key: 'ip',  label: 'Innings',     unit: 'IP', fmt: v => v.toFixed(1), rows: [
    r('PHI','Zack Wheeler',128.1), r('SF','Logan Webb',126.2), r('DET','Tarik Skubal',124.0),
    r('BOS','Garrett Crochet',122.1), r('TOR','Kevin Gausman',120.2), r('HOU','Framber Valdez',119.1),
    r('WSH','MacKenzie Gore',118.0), r('STL','Sonny Gray',117.2), r('SD','Dylan Cease',116.1),
    r('SEA','Bryan Woo',115.0) ] },
];

// standard competition ranking (ties share a rank); keep everyone ranked ≤10.
function ranked(rows, league, asc) {
  const pool = league === 'all' ? rows : rows.filter(x => tm(x.t).lg === league);
  const s = [...pool].sort((a, b) => (asc ? a.val - b.val : b.val - a.val));
  let rank = 0, prev = null;
  const out = [];
  s.forEach((row, i) => {
    if (prev === null || row.val !== prev) { rank = i + 1; prev = row.val; }
    out.push({ ...row, rank });
  });
  return out.filter(x => x.rank <= 10);
}

const SCROLL_STEP = 120;

function LeaderCard({ cat, league }) {
  const rows = ranked(cat.rows, league, cat.asc);
  const scRef = React.useRef(null);
  const [up, setUp] = React.useState(false);
  const [down, setDown] = React.useState(false);
  // Reserved scrollbar gutter, measured. The category header sits outside the scroll
  // container, so without mirroring the gutter its unit label hangs to the right of
  // the column it labels (11px on Chrome/macOS).
  const [sbw, setSbw] = React.useState(0);
  const check = React.useCallback(() => {
    const el = scRef.current;
    if (!el) return;
    setSbw(el.offsetWidth - el.clientWidth);
    setUp(el.scrollTop > 2);
    setDown(el.scrollHeight - el.scrollTop > el.clientHeight + 2);
  }, []);
  React.useEffect(() => { check(); }, [check, cat.key, league, rows.length]);
  const step = dir => scRef.current && scRef.current.scrollBy({ top: dir * SCROLL_STEP, behavior: 'smooth' });

  // Clickable chevron buttons at BOTH edges (was a passive bottom-only fade +
  // "⌥" glyph). 60px tall, gradient to transparent at 55%, appear only when
  // there is content to reach in that direction. Same affordance as the
  // at-bats scorebook row and the dark band's inning scroller.
  const chev = dir => (
    <button type="button" onClick={() => step(dir)} aria-label={dir === 1 ? 'Scroll down' : 'Scroll up'}
      style={{
        position: 'absolute', left: 0, right: 0, height: 60, border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.textMuted,
        transition: 'color 100ms', zIndex: 1,
        ...(dir === 1
          ? { bottom: 0, background: `linear-gradient(to top, ${T.surface} 55%, transparent)` }
          : { top: 0, background: `linear-gradient(to bottom, ${T.surface} 55%, transparent)` }),
      }}
      onMouseEnter={e => { e.currentTarget.style.color = T.text; }}
      onMouseLeave={e => { e.currentTarget.style.color = T.textMuted; }}>
      <svg width="14" height="9" viewBox="0 0 14 9" fill="none" aria-hidden="true">
        <polyline points={dir === 1 ? '1,1 7,7 13,1' : '1,8 7,2 13,8'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );

  return (
    <Card padless style={{ overflow: 'hidden', alignSelf: 'start' }}>
      {/* header — same treatment as a standings section header (Aug 29, 2026): the
          navy filled band was a leftover from echoing the original app's colored
          headers, and made leaders the one page with a different table vocabulary. */}
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8,
        padding: '7px 14px', paddingRight: 14 + sbw, background: T.surfaceAlt,
        borderTop: `2px solid ${T.ink}`, borderBottom: `1px solid ${T.border}`,
      }}>
        <span style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: T.text }}>{cat.label}</span>
        <span style={{ fontFamily: T.mono, fontSize: 11, fontWeight: 600, color: T.textMuted, letterSpacing: '0.06em' }}>{cat.unit}</span>
      </div>
      {rows.length === 0 ? (
        <div style={{ padding: '22px 14px', fontFamily: T.sans, fontSize: 12.5, color: T.textFaint, textAlign: 'center' }}>No qualifiers</div>
      ) : (
        <div style={{ position: 'relative' }}>
          {up && chev(-1)}
          {/* scrollbarGutter stable keeps the reserved gutter constant whether or not the
              list overflows; the header mirrors it with matching padding (see sbw) so the
              unit label always aligns with the values it labels. */}
          <div ref={scRef} onScroll={check} style={{ maxHeight: 358, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarGutter: 'stable' }}>
            {rows.map((row, i) => {
              const lead = row.rank === 1;
              return (
                // ONE destination (this player), so the whole row is the target and shades
                // on hover — same rule as Standings, Teams and the team-page tables.
                <div key={i} onClick={() => window.openPlayerOverview && window.openPlayerOverview()} style={{
                  display: 'grid', gridTemplateColumns: '22px 22px 1fr auto', gap: 10, alignItems: 'center',
                  padding: '7px 14px', cursor: 'pointer',
                  borderTop: i === 0 ? 'none' : `1px solid ${T.border}`,
                  background: lead ? 'rgba(184,66,30,0.055)' : 'transparent',
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = lead ? 'rgba(184,66,30,0.11)' : T.surfaceAlt; }}
                  onMouseLeave={e => { e.currentTarget.style.background = lead ? 'rgba(184,66,30,0.055)' : 'transparent'; }}>
                  <span style={{ fontFamily: T.mono, fontSize: 12, fontWeight: lead ? 700 : 500, color: lead ? T.accent : T.textFaint, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{row.rank}</span>
                  <TeamDot team={tm(row.t)} size={20} />
                  <span style={{
                    fontFamily: T.sans, fontSize: 13.5, fontWeight: lead ? 700 : 500, color: T.text,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>{row.name}</span>
                  <span style={{ fontFamily: T.mono, fontSize: 13.5, fontWeight: lead ? 700 : 600, color: lead ? T.accent : T.text, fontVariantNumeric: 'tabular-nums' }}>{row.disp || cat.fmt(row.val)}</span>
                </div>
              );
            })}
          </div>
          {down && chev(1)}
        </div>
      )}
    </Card>
  );
}

window.LeadersScreen = function LeadersScreen() {
  const [side, setSide] = React.useState(0);        // 0 batting · 1 pitching
  const [lgIdx, setLgIdx] = React.useState(0);      // 0 MLB · 1 AL · 2 NL
  const [navOpen, setNavOpen] = React.useState(false);
  const league = ['all', 'AL', 'NL'][lgIdx];
  const cats = side === 0 ? BATTING : PITCHING;

  // Page-level fetch states the app has and the design was missing. Set
  // window.LEADERS_STATE to 'loading' | 'error' | 'empty' to review them.
  const state = window.LEADERS_STATE || 'ready';

  // The app's subtitle is `2026 Season · through {throughDate}` ONLY when the
  // payload carries throughDate — which it currently never does (see handoff).
  // Until the field ships, the honest subtitle is the season alone.
  const throughDate = window.LEADERS_THROUGH_DATE || null;
  const subtitle = (throughDate ? `2026 Season · through ${throughDate}` : '2026 Season') + ' · Top 10 each category';

  const status = (msg, isError) => (
    <div style={{
      padding: '32px 28px', fontFamily: T.sans, fontSize: 14,
      color: isError ? T.accent : T.textMuted,
    }}>{msg}</div>
  );

  return (
    <div style={{ width: '100%', background: T.bg, color: T.text, fontFamily: T.sans, minHeight: 900, position: 'relative', overflow: 'hidden' }}>
      <window.BrandHeader back="Games" active="leaders" onMenu={() => setNavOpen(true)} colStyle={{ maxWidth: 1240, margin: '0 auto' }} />
            {/* centered max-width content column (full-bleed header above) */}
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
      <PageTitle
        title="League Leaders"
        subtitle={subtitle}
        subtitleRight={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Eyebrow style={{ color: T.textFaint }}>League</Eyebrow>
            <Segmented items={['MLB', 'AL', 'NL']} active={lgIdx} onClick={setLgIdx} />
          </div>
        }
      />

      {/* content-level category switch; the page-level League filter lives in the page header */}
      <div style={{ padding: '0 28px 18px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <Segmented items={['Batting', 'Pitching']} active={side} onClick={setSide} />
      </div>

      {state === 'loading' ? status('Loading…') :
       state === 'error' ? status('Error: HTTP 500', true) :
       state === 'empty' ? status('No data.') : (
      <div style={{
        padding: '0 28px 44px',
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))',
        gap: 16, alignItems: 'start',
      }}>
        {cats.map(cat => <LeaderCard key={cat.key} cat={cat} league={league} />)}
      </div>
      )}
      </div>
      <window.NavDrawer open={navOpen} onClose={() => setNavOpen(false)} active="leaders" />
    </div>
  );
};
