/* global React, T, TEAMS, TeamDot, Card, Eyebrow, Segmented, Th, Td, Tr, StrikeZone, Headshot, Pill */

// ============================================================
// HEAD-TO-HEAD — standalone view, reachable from BOTH the pregame screen
// (toggle next to the line score) and the live game view (same toggle,
// since the matchup intel stays useful after first pitch). Starters are
// same-day confirmed here (per decision) — no projected/confidence UI,
// unlike the player Upcoming tab this borrows its idiom from.
//
// Structure: starting pitchers side by side (up top, always visible) →
// a batter-selector rail per team → a deep-dive for whichever batter is
// selected, vs the OPPOSING starter. Mirrors player-upcoming.jsx's
// rail-picks-a-deep-dive idiom, scaled to a whole lineup instead of one
// batter's next 3 games.
//
// Data note: per-batter arsenal/h2h numbers are deterministically
// generated (mockH2H) rather than hand-authored per player — in the real
// app this is the batter's existing season pitch-type splits crossed with
// the pitcher's real arsenal (both already modeled elsewhere), just not
// hand-mocked for all 18 players here.
// ============================================================

function hashStr(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
function seeded(seed, i) { const x = Math.sin(seed + i * 999) * 10000; return x - Math.floor(x); }

const PITCH_TYPES = ['Four-seam', 'Sinker', 'Slider', 'Curveball', 'Changeup'];

function mockH2H(batterName, pitcherName) {
  const h = hashStr(batterName + pitcherName);
  const firstMeeting = seeded(h, 0) < 0.28;
  const pitchRows = PITCH_TYPES.slice(0, 4 + (h % 2)).map((type, i) => {
    const avg = (0.150 + seeded(h, i + 1) * 0.230).toFixed(3).slice(1);
    const slg = (0.200 + seeded(h, i + 5) * 0.420).toFixed(3).slice(1);
    const whiff = Math.round(10 + seeded(h, i + 9) * 38);
    return { type, avg, slg, whiff };
  });
  const heat = Array.from({ length: 9 }, (_, i) => seeded(h, i + 20));
  const bestPitch = pitchRows.reduce((a, b) => (parseFloat(b.slg) > parseFloat(a.slg) ? b : a));
  const worstPitch = pitchRows.reduce((a, b) => (parseFloat(b.slg) < parseFloat(a.slg) ? b : a));
  const read = `Damage on the ${bestPitch.type.toLowerCase()} (.${bestPitch.slg.slice(1)} SLG), cold on the ${worstPitch.type.toLowerCase()} (${worstPitch.whiff}% whiff).`;
  if (firstMeeting) return { firstMeeting: true, pitchRows, heat, read };
  const pa = 4 + (h % 14);
  const ab = Math.max(pa - (h % 3), 1);
  const hits = Math.min(ab, Math.round(seeded(h, 40) * ab * 0.5));
  const hr = seeded(h, 41) < 0.15 ? 1 : 0;
  const bb = pa - ab;
  const k = Math.round(seeded(h, 42) * ab * 0.4);
  const avg = (hits / ab).toFixed(3).slice(1);
  const obp = ((hits + bb) / pa).toFixed(3).slice(1);
  const slgTotal = hits + hr * 3; // rough — treats extra HR bases only, singles assumed
  const slg = (slgTotal / ab).toFixed(3).slice(1);
  return { firstMeeting: false, pa, ab, h: hits, hr, bb, k, avg, obp, slg, pitchRows, heat, read };
}

const PLAYER_MLB_IDS = {
  'Jose Altuve': 514888, 'Jeremy Peña': 665161, 'Yordan Álvarez': 670541, 'Kyle Tucker': 663656,
  'Christian Walker': 572233, 'Isaac Paredes': 666969, 'Jake Meyers': 676801, 'Christian Vázquez': 543807,
  'Mauricio Dubón': 650911, 'Ian Happ': 664023, 'Seiya Suzuki': 673548, 'Alex Bregman': 608324,
  'Michael Busch': 681624, 'Cam Smith': 806837, 'Pete Crow-Armstrong': 691718, 'Dansby Swanson': 621020,
  'Nico Hoerner': 663538, 'Carson Kelly': 608348,
};

// Pitchers card. Pregame: the two probables with season lines. Live (`pitching` passed):
// each side shows the arm ON THE MOUND at full weight — this game's line + season record/ERA —
// and, if he relieved someone, ONE quiet line records the handoff ("Relieved Valdez · 6th ·
// 5 2/3 IP, 3 R", or "3rd pitcher · relieved Pressly · 8th"). Scales to any number of
// changes and keeps both halves the same shape; the full chain lives in the Lineups tray.
const sideKey = (probables, abbr) => (probables.away.team.abbr === abbr ? 'away' : 'home');
const initialsOf = (n) => n.split(' ').map(w => w[0]).join('');
const ordinal = (n) => n + (['th', 'st', 'nd', 'rd'][(n % 100 - 20) % 10] || ['th', 'st', 'nd', 'rd'][n % 100] || 'th');

function PitcherStats({ line }) {
  return (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
      {line.map(([k, v]) => (
        <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={{ fontSize: 11, color: T.textMuted, fontFamily: T.sans, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{k}</span>
          <span style={{ fontFamily: T.mono, fontSize: 14, fontWeight: 700, color: T.text, fontVariantNumeric: 'tabular-nums' }}>{v}</span>
        </div>
      ))}
    </div>
  );
}

const seasonShort = (p) => p.line ? p.line.filter(([k]) => k === 'ERA' || k === 'Record').map(([k, v]) => k === 'ERA' ? `${v} ERA` : v).join(' · ') : (p.era ? `${p.era} ERA` : '');

function StarterPair({ away, home, pitching }) {
  const Side = ({ p, k, border }) => {
    const live = pitching && pitching[k];
    const cur = live && live.current;
    const who = cur || p;
    const line = !live ? p.line : cur ? cur.today : live.today;
    const season = live ? seasonShort(who) : '';
    const r = cur && cur.relieved;
    return (
      <div style={{ padding: 20, display: 'flex', gap: 16, alignItems: 'center', borderRight: border ? `1px solid ${T.border}` : 'none', minWidth: 0 }}>
        <Headshot team={who.team} initials={initialsOf(who.name)} mlbId={who.mlbId} size={64} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <Eyebrow style={{ fontSize: 11 }}>{live ? 'Pitching' : 'Starter'} · {who.team.abbr}</Eyebrow>
          <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.01em', marginTop: 2 }}>{who.name}</div>
          <div style={{ fontFamily: T.mono, fontSize: 12, color: T.textMuted, marginBottom: 8, fontVariantNumeric: 'tabular-nums' }}>{who.hand} · #{who.num}{season ? ` · ${season}` : ''}</div>
          <PitcherStats line={line} />
          {live && (
            <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px solid ${T.border}`, fontSize: 12, color: T.textMuted, minHeight: 17, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {r ? (
                <React.Fragment>
                  {r.order > 2 ? `${ordinal(r.order)} pitcher · relieved ` : 'Relieved '}
                  <span style={{ fontWeight: 600, color: T.text }}>{r.name.split(' ').pop()}</span>
                  {' · '}{r.inning}{' · '}
                  <span style={{ fontFamily: T.mono, fontVariantNumeric: 'tabular-nums' }}>{r.line}</span>
                </React.Fragment>
              ) : 'Starter · still in'}
            </div>
          )}
        </div>
      </div>
    );
  };
  return (
    <Card padless>
      <div style={{ padding: '10px 18px', borderBottom: `1px solid ${T.border}`, background: T.surfaceAlt, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <Eyebrow>{pitching ? 'On the mound' : 'Starting pitchers'}</Eyebrow>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)' }}>
        <Side p={away} k="away" border />
        <Side p={home} k="home" />
      </div>
    </Card>
  );
}

function BatterChip({ p, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', flexShrink: 0,
      borderRadius: T.r.sm, border: `1px solid ${active ? T.accent : T.border}`,
      background: active ? T.accentSoft : T.surface, cursor: 'pointer',
    }}>
      <span style={{ fontFamily: T.mono, fontSize: 11, fontWeight: 700, color: active ? T.accent : T.textMuted, width: 15, textAlign: 'center' }}>{p.slot}</span>
      <span style={{ fontFamily: T.sans, fontSize: 12.5, fontWeight: 600, color: T.text, whiteSpace: 'nowrap' }}>{p.name}</span>
      <span style={{ fontFamily: T.mono, fontSize: 10.5, color: T.textFaint }}>{p.pos}</span>
    </button>
  );
}

function DeepDive({ batter, batterTeam, pitcher }) {
  const d = React.useMemo(() => mockH2H(batter.name, pitcher.name), [batter.name, pitcher.name]);
  return (
    <Card padless>
      <div style={{ padding: '14px 18px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 14 }}>
        <Headshot team={batterTeam} initials={batter.name.split(' ').map(w => w[0]).join('')} mlbId={PLAYER_MLB_IDS[batter.name]} size={44} />
        <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{batter.name}</div>
          <div style={{ fontFamily: T.mono, fontSize: 11.5, color: T.textMuted }}>{batter.pos} · vs {pitcher.name}'s pitches ({pitcher.hand})</div>
        </div>
        {d.firstMeeting ? (
          <Pill tone="soft">First meeting</Pill>
        ) : (
          <div style={{ display: 'flex', gap: 16 }}>
            {[['PA', d.pa], ['AVG', d.avg], ['OBP', d.obp], ['SLG', d.slg], ['HR', d.hr], ['K', d.k]].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center' }}>
                <span style={{ fontSize: 9.5, color: T.textFaint, fontFamily: T.sans, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{k}</span>
                <span style={{ fontFamily: T.mono, fontSize: 13, fontWeight: 700, color: T.text, fontVariantNumeric: 'tabular-nums' }}>{v}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: 0 }}>
        <div style={{ padding: 18 }}>
          <Eyebrow style={{ marginBottom: 2 }}>Arsenal vs this bat</Eyebrow>
          <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 8 }}>How {batter.name.split(' ').pop()} has hit each pitch type {pitcher.name.split(' ').pop()} throws</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><Th align="left">Pitch</Th><Th>AVG</Th><Th>SLG</Th><Th>Whiff%</Th></tr></thead>
            <tbody>
              {d.pitchRows.map(r => (
                <Tr key={r.type}>
                  <Td align="left" mono={false}>{r.type}</Td>
                  <Td>.{r.avg.replace('.', '')}</Td>
                  <Td>.{r.slg.replace('.', '')}</Td>
                  <Td hot={r.whiff >= 30}>{r.whiff}%</Td>
                </Tr>
              ))}
            </tbody>
          </table>
          <div style={{ fontSize: 12, color: T.textMuted, lineHeight: 1.5, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${T.border}` }}>{d.read}</div>
        </div>
        <div style={{ padding: 18, borderLeft: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <Eyebrow>Damage zone</Eyebrow>
          <StrikeZone size={110} heat={d.heat} />
        </div>
      </div>
    </Card>
  );
}

function PitcherChip({ p, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', flexShrink: 0,
      borderRadius: T.r.sm, border: `1px solid ${active ? T.accent : T.border}`,
      background: active ? T.accentSoft : T.surface, cursor: 'pointer',
    }}>
      <span style={{ fontFamily: T.sans, fontSize: 12.5, fontWeight: 600, color: T.text, whiteSpace: 'nowrap' }}>{p.name}</span>
      <span style={{ fontFamily: T.mono, fontSize: 10.5, color: T.textFaint }}>{p.hand}</span>
      {p.era && <span style={{ fontFamily: T.mono, fontSize: 10.5, color: T.textMuted }}>{p.era} ERA</span>}
    </button>
  );
}

function TeamLineupRail({ side, lineups, pitcher, selected, onSelect }) {
  const d = lineups[side];
  const batters = d.lineup.filter(p => !p.isPitcher);
  return (
    <div>
      <div style={{ padding: '12px 16px', display: 'flex', gap: 8, overflowX: 'auto' }}>
        {batters.map(p => (
          <BatterChip key={p.slot} p={p} active={selected === p.slot} onClick={() => onSelect(p.slot)} />
        ))}
      </div>
    </div>
  );
}

function TeamPicker({ label, side, onSide, disabledSide }) {
  return (
    <Segmented items={[TEAMS.HOU.short, TEAMS.CHC.short]} active={side === 'CHC' ? 1 : 0} size="sm"
      onClick={(i) => onSide(i === 0 ? 'HOU' : 'CHC')} />
  );
}

// Standalone "any pitcher vs any batter" explorer — NOT tied to today's game. Lets you
// scout a hypothetical matchup across the league. Mock data only covers the two teams
// modeled in LINEUPS (HOU/CHC); a real build would offer all 30 rosters the same way.
// Enforces the real-world constraint that a pitcher never faces his own teammates.
window.LeagueMatchupScreen = function LeagueMatchupScreen({ lineups }) {
  const [pitcherSide, setPitcherSide] = React.useState('HOU');
  const [pitcherSel, setPitcherSel] = React.useState('starter');
  const [batterSide, setBatterSide] = React.useState('CHC');
  const [batterSel, setBatterSel] = React.useState(1);

  const pd = lineups[pitcherSide];
  const starterEntry = pd.lineup.find((p) => p.isPitcher);
  const bullpen = pd.bullpen || [];
  const pitcher = pitcherSel === 'starter'
    ? { name: starterEntry.name, hand: starterEntry.pos, num: starterEntry.num }
    : (bullpen.find((b) => b.name === pitcherSel) || { name: starterEntry.name, hand: starterEntry.pos, num: starterEntry.num });

  const bd = lineups[batterSide];
  const batters = bd.lineup.filter((p) => !p.isPitcher);
  const batter = batters.find((p) => p.slot === batterSel) || batters[0];
  const sameTeam = pitcherSide === batterSide;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card padless>
          <div style={{ padding: '10px 18px', borderBottom: `1px solid ${T.border}`, background: T.surfaceAlt, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Eyebrow>Pitcher</Eyebrow>
            <TeamPicker side={pitcherSide} onSide={(s) => { setPitcherSide(s); setPitcherSel('starter'); }} />
          </div>
          <div style={{ padding: '12px 16px', display: 'flex', gap: 8, overflowX: 'auto' }}>
            <PitcherChip p={{ name: `${starterEntry.name} (starter)`, hand: starterEntry.pos }} active={pitcherSel === 'starter'} onClick={() => setPitcherSel('starter')} />
            {bullpen.map((p) => (
              <PitcherChip key={p.name} p={p} active={pitcherSel === p.name} onClick={() => setPitcherSel(p.name)} />
            ))}
          </div>
        </Card>
        <Card padless>
          <div style={{ padding: '10px 18px', borderBottom: `1px solid ${T.border}`, background: T.surfaceAlt, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Eyebrow>Batter</Eyebrow>
            <TeamPicker side={batterSide} onSide={(s) => { setBatterSide(s); setBatterSel(1); }} />
          </div>
          <div style={{ padding: '12px 16px', display: 'flex', gap: 8, overflowX: 'auto' }}>
            {batters.map((p) => (
              <BatterChip key={p.slot} p={p} active={batterSel === p.slot} onClick={() => setBatterSel(p.slot)} />
            ))}
          </div>
        </Card>
      </div>

      {sameTeam ? (
        <Card padless>
          <div style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', border: `2px dashed ${T.border}`, display: 'grid', placeItems: 'center', color: T.textFaint, fontSize: 17 }}>\u26be</div>
            <div style={{ fontFamily: T.sans, fontSize: 13.5, fontWeight: 700, color: T.text }}>Not a real matchup</div>
            <div style={{ fontFamily: T.sans, fontSize: 12, color: T.textMuted, maxWidth: 320, lineHeight: 1.5 }}>Pick a batter from a different team \u2014 pitchers don't face their own teammates.</div>
          </div>
        </Card>
      ) : (
        <DeepDive batter={batter} batterTeam={bd.team} pitcher={pitcher} />
      )}
    </div>
  );
};

window.HeadToHeadScreen = function HeadToHeadScreen({ lineups, probables, initial, pitching }) {
  // The arm on the mound for a side: the reliever if the starter was pulled, else the starter.
  const onMound = (abbr) => { const k = sideKey(probables, abbr); return (pitching && pitching[k] && pitching[k].current) || probables[k]; };
  const [mode, setMode] = React.useState('batter'); // 'batter' | 'pitcher'
  const [side, setSide] = React.useState((initial && initial.side) || 'HOU'); // 'batter' mode: the batting team
  const [selected, setSelected] = React.useState((initial && initial.slot) || 2);
  // 'pitcher' mode: which pitcher, and which of the OPPOSING team's batters
  const [pitcherSide, setPitcherSide] = React.useState('HOU'); // team the pitcher plays for
  const [pitcherSel, setPitcherSel] = React.useState('current'); // 'current' | 'starter' | a bullpen player's name
  const [oppSelected, setOppSelected] = React.useState(2);

  if (mode === 'pitcher') {
    const oppSide = pitcherSide === 'HOU' ? 'CHC' : 'HOU';
    const pk = sideKey(probables, pitcherSide);
    const starter = probables[pk];
    const cur = pitching && pitching[pk] && pitching[pk].current;
    const bullpen = lineups[pitcherSide].bullpen || [];
    const sel = pitcherSel === 'current' && !cur ? 'starter' : pitcherSel;
    const pitcher = sel === 'current' ? cur : sel === 'starter' ? starter : (bullpen.find(b => b.name === sel) || starter);
    const oppBatters = lineups[oppSide].lineup.filter(p => !p.isPitcher);
    const batter = oppBatters.find(p => p.slot === oppSelected) || oppBatters[0];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <StarterPair away={probables.away} home={probables.home} pitching={pitching} />
        <Card padless>
          <div style={{ padding: '10px 18px', borderBottom: `1px solid ${T.border}`, background: T.surfaceAlt, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Eyebrow>By pitcher</Eyebrow>
            <div style={{ display: 'flex', gap: 8 }}>
              <Segmented items={['Batter', 'Pitcher']} active={1} onClick={(i) => { if (i === 0) setMode('batter'); }} />
              <Segmented items={[TEAMS.HOU.abbr, TEAMS.CHC.abbr]} active={pitcherSide === 'CHC' ? 1 : 0} size="sm" onClick={(i) => { setPitcherSide(i === 0 ? 'HOU' : 'CHC'); setPitcherSel('current'); setOppSelected(2); }} />
            </div>
          </div>
          <div style={{ padding: '12px 16px', display: 'flex', gap: 8, overflowX: 'auto' }}>
            {cur && <PitcherChip p={{ name: `${cur.name} (pitching)`, hand: cur.hand }} active={sel === 'current'} onClick={() => setPitcherSel('current')} />}
            <PitcherChip p={{ name: `${starter.name} (starter${cur ? ', pulled' : ''})`, hand: starter.hand }} active={sel === 'starter'} onClick={() => setPitcherSel('starter')} />
            {bullpen.map(p => (
              <PitcherChip key={p.name} p={p} active={sel === p.name} onClick={() => setPitcherSel(p.name)} />
            ))}
          </div>
        </Card>
        <Card padless>
          <div style={{ padding: '10px 18px', borderBottom: `1px solid ${T.border}`, background: T.surfaceAlt }}>
            <Eyebrow>{pitcher.name} vs the {TEAMS[oppSide].short} lineup</Eyebrow>
          </div>
          <div style={{ padding: '12px 16px', display: 'flex', gap: 8, overflowX: 'auto' }}>
            {oppBatters.map(p => (
              <BatterChip key={p.slot} p={p} active={oppSelected === p.slot} onClick={() => setOppSelected(p.slot)} />
            ))}
          </div>
        </Card>
        <DeepDive batter={batter} batterTeam={TEAMS[oppSide]} pitcher={pitcher} />
      </div>
    );
  }

  const d = lineups[side];
  const oppSide = side === 'HOU' ? 'CHC' : 'HOU';
  const pitcher = onMound(oppSide);
  const batter = d.lineup.find(p => p.slot === selected) || d.lineup.find(p => !p.isPitcher);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <StarterPair away={probables.away} home={probables.home} pitching={pitching} />
      <Card padless>
        <div style={{ padding: '10px 18px', borderBottom: `1px solid ${T.border}`, background: T.surfaceAlt, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Eyebrow>{pitching ? `Lineup vs ${pitcher.name}, on the mound` : 'Lineup vs the opposing starter'}</Eyebrow>
          <div style={{ display: 'flex', gap: 8 }}>
            <Segmented items={['Batter', 'Pitcher']} active={0} onClick={(i) => { if (i === 1) setMode('pitcher'); }} />
            <Segmented items={[TEAMS.HOU.abbr, TEAMS.CHC.abbr]} active={side === 'CHC' ? 1 : 0} size="sm" onClick={(i) => { setSide(i === 0 ? 'HOU' : 'CHC'); setSelected(2); }} />
          </div>
        </div>
        <TeamLineupRail side={side} lineups={lineups} pitcher={pitcher} selected={selected} onSelect={setSelected} />
      </Card>
      <DeepDive batter={batter} batterTeam={TEAMS[side]} pitcher={pitcher} />
    </div>
  );
};
