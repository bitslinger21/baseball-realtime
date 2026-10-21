/* global React, T, TEAMS, TeamDot, Card, Eyebrow, Th, Td, Tr, StrikeZone, Headshot, Pill */

// ============================================================
// HEAD-TO-HEAD v2 (Oct 19, 2026) — iteration on game-headtohead.jsx.
// 1. No team toggle and no Batter/Pitcher mode toggle. The two pitcher cards ARE the
//    selector: pick a pitcher, the rail below becomes the OTHER team's lineup.
//    Selected = full colour + rust top rule; other = grayscale headshot + muted text,
//    still clickable (that's how you switch).
// 2. The old Pitcher mode's only extra — bullpen "what if" — lives as an "Or try" chip
//    row inside the selected card. Picking one flags the matchup as a what-if.
// 3. Deep-dive header: career line moves next to the name as one labelled group
//    ("Career vs Hader · 12 PA"); the one-sentence read moves up into the freed space.
// ============================================================

const H2 = () => window.h2hHelpers;
const lastName = (n) => n.split(' ').pop();
// Same link treatment as game-v2's player names (dotted underline → player page).
const nameLink = { cursor: 'pointer', textDecoration: 'underline dotted', textDecorationColor: T.borderStrong, textUnderlineOffset: 3, width: 'fit-content' };
const openPlayer = (e) => { e.stopPropagation(); window.openPlayerOverview(); };

function H2Stats({ line, muted }) {
  return (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
      {line.map(([k, v]) => (
        <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={{ fontSize: 11, color: T.textMuted, fontFamily: T.sans, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{k}</span>
          <span style={{ fontFamily: T.mono, fontSize: 14, fontWeight: 700, color: muted ? T.textMuted : T.text, fontVariantNumeric: 'tabular-nums' }}>{v}</span>
        </div>
      ))}
    </div>
  );
}

function AltChip({ label, sub, active, onClick }) {
  return (
    <button onClick={(e) => { e.stopPropagation(); onClick(); }} style={{
      display: 'flex', alignItems: 'baseline', gap: 6, padding: '5px 9px', borderRadius: T.r.sm, cursor: 'pointer',
      border: `1px solid ${active ? T.accent : T.border}`, background: active ? T.accentSoft : T.surface,
    }}>
      <span style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 600, color: T.text, whiteSpace: 'nowrap' }}>{label}</span>
      {sub && <span style={{ fontFamily: T.mono, fontSize: 11, color: T.textMuted, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{sub}</span>}
    </button>
  );
}

function PitcherSelectCard({ k, probables, lineups, pitching, selected, onSelect, alt, onAlt, border }) {
  const { initialsOf, ordinal, seasonShort } = H2();
  const [hover, setHover] = React.useState(false);
  const starter = probables[k];
  const live = pitching && pitching[k];
  const cur = live && live.current;
  const who = cur || starter;
  const line = !live ? starter.line : cur ? cur.today : live.today;
  const season = live ? seasonShort(who) : '';
  const r = cur && cur.relieved;
  const team = who.team;
  const opp = probables[k === 'away' ? 'home' : 'away'].team;
  const bullpen = lineups[team.abbr].bullpen || [];
  const dim = !selected;
  return (
    <div role="button" tabIndex={0} onClick={selected ? undefined : onSelect} onKeyDown={(e) => { if (!selected && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onSelect(); } }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        padding: '17px 20px 18px', display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0,
        borderTop: `3px solid ${selected ? T.accent : 'transparent'}`, borderRight: border ? `1px solid ${T.border}` : 'none',
        background: dim && hover ? T.surfaceAlt : 'transparent', cursor: selected ? 'default' : 'pointer', transition: 'background .15s',
      }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <div style={{ filter: dim ? 'grayscale(1)' : 'none', opacity: dim ? (hover ? 0.8 : 0.6) : 1, transition: 'opacity .15s, filter .15s', flexShrink: 0 }}>
          <Headshot team={team} initials={initialsOf(who.name)} mlbId={who.mlbId} size={64} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
            <Eyebrow style={{ fontSize: 11 }}>{live ? 'Pitching' : 'Starter'} · {team.abbr}</Eyebrow>
            {selected
              ? <span style={{ fontFamily: T.sans, fontSize: 11.5, fontWeight: 700, color: T.accent, whiteSpace: 'nowrap' }}>Facing the {opp.short} ↓</span>
              : <span style={{ fontFamily: T.sans, fontSize: 11.5, fontWeight: 600, color: T.textMuted, whiteSpace: 'nowrap', opacity: hover ? 1 : 0, transition: 'opacity .15s' }}>Show his matchups</span>}
          </div>
          <div onClick={openPlayer} style={{ ...nameLink, fontSize: 17, fontWeight: 700, letterSpacing: '-0.01em', marginTop: 2, color: dim ? T.textMuted : T.text }}>{who.name}</div>
          <div style={{ fontFamily: T.mono, fontSize: 12, color: T.textMuted, marginBottom: 8, fontVariantNumeric: 'tabular-nums' }}>{who.hand} · #{who.num}{season ? ` · ${season}` : ''}</div>
          <H2Stats line={line} muted={dim} />
          {live && (
            <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px solid ${T.border}`, fontSize: 12, color: T.textMuted, minHeight: 17, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {r ? (
                <React.Fragment>
                  {r.order > 2 ? `${ordinal(r.order)} pitcher · relieved ` : 'Relieved '}
                  <span onClick={openPlayer} style={{ ...nameLink, fontWeight: 600, color: dim ? T.textMuted : T.text }}>{lastName(r.name)}</span>
                  {' · '}{r.inning}{' · '}
                  <span style={{ fontFamily: T.mono, fontVariantNumeric: 'tabular-nums' }}>{r.line}</span>
                </React.Fragment>
              ) : 'Starter · still in'}
            </div>
          )}
        </div>
      </div>
      {selected && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', paddingTop: 12, borderTop: `1px solid ${T.border}` }}>
          <span style={{ fontSize: 11, color: T.textMuted, fontFamily: T.sans, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginRight: 4 }}>Or try</span>
          <AltChip label={lastName(who.name)} sub={live ? 'pitching' : 'starter'} active={alt === 'mound'} onClick={() => onAlt('mound')} />
          {cur && <AltChip label={lastName(starter.name)} sub="pulled" active={alt === 'starter'} onClick={() => onAlt('starter')} />}
          {bullpen.map(b => <AltChip key={b.name} label={lastName(b.name)} sub={`${b.hand}${b.era ? ' · ' + b.era : ''}`} active={alt === b.name} onClick={() => onAlt(b.name)} />)}
        </div>
      )}
    </div>
  );
}

function DeepDiveV2({ batter, batterTeam, pitcher }) {
  const { mockH2H, PLAYER_MLB_IDS } = H2();
  const d = React.useMemo(() => mockH2H(batter.name, pitcher.name), [batter.name, pitcher.name]);
  const pl = lastName(pitcher.name);
  const groupStyle = { paddingLeft: 22, borderLeft: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 };
  return (
    <Card padless>
      <div style={{ padding: '16px 18px', borderBottom: `1px solid ${T.border}`, display: 'grid', gridTemplateColumns: 'auto auto minmax(0,1fr)', gap: 22, alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
          <Headshot team={batterTeam} initials={batter.name.split(' ').map(w => w[0]).join('')} mlbId={PLAYER_MLB_IDS[batter.name]} size={44} />
          <div>
            <div onClick={openPlayer} style={{ ...nameLink, fontSize: 15, fontWeight: 700, whiteSpace: 'nowrap' }}>{batter.name}</div>
            <div style={{ fontFamily: T.mono, fontSize: 11.5, color: T.textMuted, whiteSpace: 'nowrap' }}>{batter.pos} · vs {pitcher.name} ({pitcher.hand})</div>
          </div>
        </div>
        <div style={groupStyle}>
          <Eyebrow style={{ fontSize: 11 }}>Career vs {pl}{d.firstMeeting ? '' : ` · ${d.pa} PA`}</Eyebrow>
          {d.firstMeeting ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 32 }}>
              <Pill tone="soft">First meeting</Pill>
              <span style={{ fontSize: 12, color: T.textMuted, whiteSpace: 'nowrap' }}>No history yet</span>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 16 }}>
              {[['AVG', d.avg], ['OBP', d.obp], ['SLG', d.slg], ['HR', d.hr], ['K', d.k]].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <span style={{ fontSize: 11, color: T.textMuted, fontFamily: T.sans, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{k}</span>
                  <span style={{ fontFamily: T.mono, fontSize: 14, fontWeight: 700, color: T.text, fontVariantNumeric: 'tabular-nums' }}>{v}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={groupStyle}>
          <Eyebrow style={{ fontSize: 11 }}>The read</Eyebrow>
          <div style={{ fontSize: 13.5, color: T.text, lineHeight: 1.45, textWrap: 'pretty', maxWidth: 460 }}>{d.read}</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 220px' }}>
        <div style={{ padding: 18 }}>
          <Eyebrow style={{ marginBottom: 2 }}>Arsenal vs this bat</Eyebrow>
          <div style={{ fontSize: 11.5, color: T.textMuted, marginBottom: 8 }}>How {lastName(batter.name)} has hit each pitch type {pl} throws</div>
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
        </div>
        <div style={{ padding: 18, borderLeft: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <Eyebrow>Damage zone</Eyebrow>
          <StrikeZone size={110} heat={d.heat} />
        </div>
      </div>
    </Card>
  );
}

window.HeadToHeadScreenV2 = function HeadToHeadScreenV2({ lineups, probables, pitching, initial }) {
  const { sideKey, BatterChip } = H2();
  // initial.side = the BATTING team (v1 contract); the selected pitcher is the other club's.
  const initPitcherK = initial && initial.side ? (sideKey(probables, initial.side) === 'away' ? 'home' : 'away') : 'away';
  const [pk, setPk] = React.useState(initPitcherK);
  const [alt, setAlt] = React.useState('mound');
  const [slot, setSlot] = React.useState((initial && initial.slot) || 2);

  const starter = probables[pk];
  const cur = pitching && pitching[pk] && pitching[pk].current;
  const mound = cur || starter;
  const pTeam = mound.team;
  const bullpen = lineups[pTeam.abbr].bullpen || [];
  const pitcher = alt === 'mound' ? mound : alt === 'starter' ? starter : (bullpen.find(b => b.name === alt) || mound);
  const isWhatIf = alt !== 'mound';
  const oppK = pk === 'away' ? 'home' : 'away';
  const oppTeam = probables[oppK].team;
  const batters = lineups[oppTeam.abbr].lineup.filter(p => !p.isPitcher);
  const batter = batters.find(p => p.slot === slot) || batters[0];
  const pick = (k) => { setPk(k); setAlt('mound'); setSlot(2); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card padless>
        <div style={{ padding: '10px 18px', borderBottom: `1px solid ${T.border}`, background: T.surfaceAlt }}>
          <Eyebrow>{pitching ? 'On the mound' : 'Starting pitchers'}</Eyebrow>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', alignItems: 'stretch' }}>
          {['away', 'home'].map((k, i) => (
            <PitcherSelectCard key={k} k={k} probables={probables} lineups={lineups} pitching={pitching}
              selected={pk === k} onSelect={() => pick(k)} alt={alt} onAlt={setAlt} border={i === 0} />
          ))}
        </div>
      </Card>
      <Card padless>
        <div style={{ padding: '10px 18px', borderBottom: `1px solid ${T.border}`, background: T.surfaceAlt, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <TeamDot team={oppTeam} size={20} />
            <Eyebrow>{oppTeam.short} lineup vs {pitcher.name}</Eyebrow>
          </div>
          {isWhatIf && (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span style={{ fontFamily: T.sans, fontSize: 12, fontStyle: 'italic', color: T.textMuted, whiteSpace: 'nowrap' }}>What-if matchup — {lastName(pitcher.name)} isn’t pitching</span>
              <button onClick={() => setAlt('mound')} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontFamily: T.sans, fontSize: 12, fontWeight: 600, color: T.accent }}>Back to {lastName(mound.name)}</button>
            </div>
          )}
        </div>
        <div style={{ padding: '12px 16px', display: 'flex', gap: 8, overflowX: 'auto' }}>
          {batters.map(p => <BatterChip key={p.slot} p={p} active={batter.slot === p.slot} onClick={() => setSlot(p.slot)} />)}
        </div>
      </Card>
      <DeepDiveV2 batter={batter} batterTeam={oppTeam} pitcher={pitcher} />
    </div>
  );
};
