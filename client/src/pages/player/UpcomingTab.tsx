/* MOCK DATA — all numbers in this file are placeholder until the following APIs ship:
 *   • schedule lookahead (next N games + probable starters)
 *   • pitcher arsenal breakdown per game
 *   • batter × pitch-type splits (current season) — shared with the Pitching tab data source
 *   • batter-vs-pitcher head-to-head log
 * Until then the tab renders mock data clearly flagged in the card subtitles.
 * Do NOT gate or hide the other five tabs — this renders independently.
 */

import { useState, type ReactElement } from 'react';
import { Card } from '../../components/primitives/Card';
import { Pill } from '../../components/primitives/Pill';
import { Headshot } from '../../components/primitives/Headshot';
import { TeamDot } from '../../components/primitives/TeamDot';
import { StrikeZone } from '../../components/primitives/StrikeZone';
import { Th, Td } from '../../components/primitives/Table';
import { TEAMS } from '../../utils/teams';
import type { TeamInfo } from '../../utils/teams';
import './UpcomingTab.css';

// ── types ─────────────────────────────────────────────────────────────────────

interface PitchStat {
  avg: string;
  slg: string;
  whiff: string;
  n: number;
}

interface ArsenalEntry {
  type: string;
  share: number;
  velo: string;
}

interface MeetingEntry {
  date: string;
  res: string;
  detail: string;
  tone: 'positive' | 'neutral' | 'negative';
}

interface H2H {
  pa: number; ab: number; h: number; hr: number; rbi: number; bb: number; k: number;
  avg: string; obp: string; slg: string; ops: string;
  lastFaced: string;
  log: MeetingEntry[];
}

interface Pitcher {
  name: string;
  throws: 'R' | 'L';
  num: number;
  initials: string;
  mlbId: number | null;
  rookie?: true;
  record: string; era: string; whip: string; k9: string; ip: string;
  arsenal: ArsenalEntry[];
  heat: number[];
  attack: string;
}

interface UpcomingGame {
  id: string;
  date: string;
  time: string;
  home: boolean;
  opp: TeamInfo;
  venue: string;
  pitcher: Pitcher;
  h2h: H2H | null;
  lean: 'batter' | 'pitcher' | 'even';
  read: string;
}

// ── mock data ─────────────────────────────────────────────────────────────────

// MOCK — Peña's 2026 performance by pitch type (mirrors the Pitching tab source).
const MOCK_VS_PITCH: Record<string, PitchStat> = {
  'Four-seam': { avg: '.250', slg: '.292', whiff: '17%', n: 0.58 },
  'Sinker':    { avg: '.286', slg: '.357', whiff:  '9%', n: 0.71 },
  'Cutter':    { avg: '.000', slg: '.000', whiff: '50%', n: 0.0  },
  'Slider':    { avg: '.143', slg: '.214', whiff: '38%', n: 0.43 },
  'Sweeper':   { avg: '.118', slg: '.176', whiff: '41%', n: 0.35 },
  'Curveball': { avg: '.200', slg: '.200', whiff: '24%', n: 0.40 },
  'Splitter':  { avg: '.190', slg: '.238', whiff: '33%', n: 0.48 },
  'Changeup':  { avg: '.333', slg: '.500', whiff: '14%', n: 1.0  },
};

// MOCK — Peña's hot-zone damage by location (SLG, normalized, same array as Pitching tab).
const MOCK_DAMAGE: number[] = [0.18, 0.42, 0.12, 0.28, 0.84, 0.58, 0.04, 0.21, 0.15];

// MOCK — handedness splits.
const MOCK_VS_HAND: Record<'R' | 'L', { line: string; ops: string; delta: string; hot: boolean }> = {
  R: { line: '.226 / .250 / .283', ops: '.533', delta: '−.044', hot: false },
  L: { line: '.286 / .375 / .357', ops: '.732', delta: '+.155',       hot: true  },
};

// MOCK — pitch-class splits.
const MOCK_VS_CLASS = [
  { label: 'vs Fastball', line: '.289 / .368', ops: '.693', delta: '+.116', hot: true  },
  { label: 'vs Breaking', line: '.143 / .190', ops: '.372', delta: '−.205', hot: false },
  { label: 'vs Offspeed', line: '.250 / .375', ops: '.625', delta: '+.048', hot: true  },
];

// MOCK — next 3 scheduled games + probable starters + H2H history.
const MOCK_GAMES: UpcomingGame[] = [
  {
    id: 'g1', date: 'Sat · Jun 6', time: '7:10p ET', home: true,
    opp: TEAMS.DET!, venue: 'Daikin Park',
    pitcher: {
      name: 'Casey Mize', throws: 'R', num: 12, initials: 'CM', mlbId: 663554,
      record: '5–2', era: '3.18', whip: '1.09', k9: '8.4', ip: '76.1',
      arsenal: [
        { type: 'Four-seam', share: 32, velo: '95.6' },
        { type: 'Splitter',  share: 24, velo: '86.1' },
        { type: 'Slider',    share: 22, velo: '84.8' },
        { type: 'Sinker',    share: 15, velo: '94.2' },
        { type: 'Cutter',    share:  7, velo: '89.0' },
      ],
      heat: [0.22, 0.30, 0.20, 0.45, 0.40, 0.55, 0.70, 0.62, 0.78],
      attack: 'Works the bottom third with the splitter–slider pair.',
    },
    h2h: {
      pa: 15, ab: 13, h: 4, hr: 1, rbi: 1, bb: 2, k: 5,
      avg: '.308', obp: '.400', slg: '.538', ops: '.938', lastFaced: 'Aug 2024',
      log: [
        { date: '2024-08-18', res: 'HR',      detail: 'Solo HR (407 ft) · 2 K · BB', tone: 'positive' },
        { date: '2024-05-02', res: '1-for-3', detail: 'Single · K · F8',             tone: 'neutral'  },
        { date: '2023-09-11', res: '2-for-4', detail: '2 singles · BB',                   tone: 'positive' },
        { date: '2023-04-20', res: '0-for-3', detail: '2 K · G6',                         tone: 'negative' },
      ],
    },
    lean: 'batter',
    read: "Peña owns a .938 OPS in 15 career PA, but Mize now leans on a splitter (24%) Peña whiffs on 33% of the time. History favors Peña — the splitter is the swing factor.",
  },
  {
    id: 'g2', date: 'Sun · Jun 7', time: '1:10p ET', home: true,
    opp: TEAMS.DET!, venue: 'Daikin Park',
    pitcher: {
      name: 'Marco Salas', throws: 'L', num: 48, initials: 'MS', mlbId: null, rookie: true,
      record: '1–0', era: '2.45', whip: '1.12', k9: '9.1', ip: '22.0',
      arsenal: [
        { type: 'Sinker',    share: 38, velo: '93.1' },
        { type: 'Sweeper',   share: 29, velo: '81.4' },
        { type: 'Changeup',  share: 21, velo: '85.0' },
        { type: 'Four-seam', share: 12, velo: '93.8' },
      ],
      heat: [0.30, 0.28, 0.18, 0.58, 0.42, 0.30, 0.74, 0.55, 0.32],
      attack: 'Sinker–sweeper lefty who lives down-and-in to righties.',
    },
    h2h: null,
    lean: 'batter',
    read: "First look at a rookie lefty — no book either way. Peña mashes lefties (.732 OPS vs LHP), but Salas’s sweeper (29%) attacks Peña’s coldest pitch (.118, 41% whiff). Platoon edge to Peña; the sweeper to watch.",
  },
  {
    id: 'g3', date: 'Tue · Jun 9', time: '6:40p ET', home: false,
    opp: TEAMS.TBR!, venue: 'Tropicana Field',
    pitcher: {
      name: 'Taj Bradley', throws: 'R', num: 45, initials: 'TB', mlbId: 671737,
      record: '4–4', era: '4.02', whip: '1.21', k9: '9.8', ip: '69.0',
      arsenal: [
        { type: 'Four-seam', share: 41, velo: '96.3' },
        { type: 'Splitter',  share: 23, velo: '88.7' },
        { type: 'Cutter',    share: 19, velo: '90.5' },
        { type: 'Curveball', share: 17, velo: '82.1' },
      ],
      heat: [0.72, 0.80, 0.68, 0.45, 0.40, 0.50, 0.18, 0.22, 0.20],
      attack: 'Elevates a 96+ four-seam, then buries the splitter.',
    },
    h2h: {
      pa: 6, ab: 6, h: 1, hr: 0, rbi: 0, bb: 0, k: 3,
      avg: '.167', obp: '.167', slg: '.167', ops: '.333', lastFaced: 'Jun 2024',
      log: [
        { date: '2024-06-14', res: '1-for-3', detail: 'Single · 2 K', tone: 'neutral'  },
        { date: '2024-04-07', res: '0-for-3', detail: 'K · F7 · G4', tone: 'negative' },
      ],
    },
    lean: 'pitcher',
    read: "Bradley has Peña’s number — 1-for-6 with 3 K. A 96+ four-seam up plays into Peña’s flat path, and 9.8 K/9 against a sub-.280 OBP bat tilts this one to the mound.",
  },
];

// ── small local usage bar ─────────────────────────────────────────────────────

interface UBarProps { value: number; max: number; color?: string; }

function UBar({ value, max, color }: UBarProps): ReactElement {
  const pct = Math.min(100, max > 0 ? (value / max) * 100 : 0);
  return (
    <div className="ubar">
      <div className="ubar__fill" style={{ width: `${pct}%`, background: color ?? 'var(--color-ink)' }} />
    </div>
  );
}

// ── game selector card ────────────────────────────────────────────────────────

interface GameSelectCardProps { g: UpcomingGame; active: boolean; onClick: () => void; }

function GameSelectCard({ g, active, onClick }: GameSelectCardProps): ReactElement {
  const oppLabel = (g.home ? 'vs ' : '@ ') + g.opp.short;
  const verdict = g.h2h
    ? { text: `${g.h2h.ops} OPS · ${g.h2h.pa} PA`, tone: parseFloat(g.h2h.ops) >= 0.7 ? 'positive' : 'accent' as const }
    : { text: 'First meeting', tone: 'soft' as const };

  return (
    <button
      type="button"
      className={`gsc${active ? ' gsc--active' : ''}`}
      onClick={onClick}
    >
      {active && <div className="gsc__accent-bar" />}
      <div className="gsc__top">
        <div className="gsc__opp">
          <TeamDot team={g.opp} size={26} />
          <div className="gsc__opp-text">
            <div className="gsc__opp-name">{oppLabel}</div>
            <div className="gsc__opp-date">{g.date}</div>
          </div>
        </div>
        <span className={`gsc__time num${active ? ' gsc__time--active' : ''}`}>{g.time}</span>
      </div>
      <div className="gsc__pitcher">
        <Headshot mlbId={g.pitcher.mlbId} initials={g.pitcher.initials} teamColor={g.opp.primary} size={36} ratio={1.5} />
        <div className="gsc__p-info">
          <div className="gsc__p-name-row">
            <span className="gsc__p-name">{g.pitcher.name}</span>
            <span className="gsc__p-hand num">{g.pitcher.throws}HP</span>
            {g.pitcher.rookie && <Pill tone="info" style={{ padding: '0 6px', fontSize: 9 }}>ROOKIE</Pill>}
          </div>
          <div className="gsc__p-line num">{g.pitcher.record} · {g.pitcher.era} ERA</div>
        </div>
      </div>
      <div className="gsc__verdict">
        <Pill tone={verdict.tone} style={{ width: '100%', justifyContent: 'center' }} className="num">
          {verdict.text}
        </Pill>
      </div>
    </button>
  );
}

// ── head-to-head card ─────────────────────────────────────────────────────────

function H2HCard({ g }: { g: UpcomingGame }): ReactElement {
  const p = g.pitcher;

  if (!g.h2h) {
    return (
      <Card title="Head-to-head" subtitle="Career vs this pitcher">
        <div className="h2h__empty">
          <div className="h2h__empty-icon">⚾</div>
          <div className="h2h__empty-title">Never faced {p.name}</div>
          <div className="h2h__empty-sub">
            No prior plate appearances. The projection below leans on handedness, arsenal, and pitch-type history.
          </div>
          <div className="h2h__empty-action">
            <Pill tone="info" className="num">Projection-only matchup</Pill>
          </div>
        </div>
      </Card>
    );
  }

  const h = g.h2h;
  const opsColor = parseFloat(h.ops) >= 0.7 ? 'var(--color-positive)' : 'var(--color-accent)';

  return (
    <Card title="Head-to-head" subtitle={`Career vs ${p.name} · last faced ${h.lastFaced}`}>
      <div className="h2h__slash">
        <div>
          <span className="up__eyebrow" style={{ display: 'block', marginBottom: 5 }}>Slash line</span>
          <div className="h2h__slash-line num">{h.avg} / {h.obp} / {h.slg}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span className="up__eyebrow" style={{ display: 'block', marginBottom: 5 }}>OPS</span>
          <div className="h2h__ops num" style={{ color: opsColor }}>{h.ops}</div>
        </div>
      </div>
      <div className="h2h__counters">
        {([['PA', h.pa], ['H', h.h], ['HR', h.hr], ['RBI', h.rbi], ['BB', h.bb], ['K', h.k]] as [string, number][]).map(([l, v]) => (
          <div key={l} className="h2h__counter">
            <div className="h2h__counter-val num">{v}</div>
            <span className="up__eyebrow" style={{ fontSize: 9 }}>{l}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── pitcher snapshot ──────────────────────────────────────────────────────────

function PitcherSnapshot({ g }: { g: UpcomingGame }): ReactElement {
  const p = g.pitcher;
  const maxShare = Math.max(...p.arsenal.map(a => a.share));

  return (
    <Card title="What he throws" subtitle={`${p.name} · ${p.throws}HP`}>
      <div className="ps__head">
        <Headshot mlbId={p.mlbId} initials={p.initials} teamColor={g.opp.primary} size={56} ratio={1.5} />
        <div className="ps__stats">
          {([['W–L', p.record], ['ERA', p.era], ['WHIP', p.whip], ['K/9', p.k9]] as [string, string][]).map(([l, v]) => (
            <div key={l}>
              <span className="up__eyebrow" style={{ fontSize: 9, display: 'block' }}>{l}</span>
              <div className="ps__stat-val num">{v}</div>
            </div>
          ))}
        </div>
      </div>
      <span className="up__eyebrow" style={{ display: 'block', marginBottom: 8 }}>Arsenal · usage</span>
      <div className="ps__arsenal">
        {p.arsenal.map(a => (
          <div key={a.type} className="ps__arsenal-row">
            <span className="ps__p-name">{a.type}</span>
            <UBar value={a.share} max={maxShare} color="var(--color-ink)" />
            <span className="ps__p-pct num">{a.share}%</span>
            <span className="ps__p-velo num">{a.velo}</span>
          </div>
        ))}
      </div>
      <div className="ps__attack">{p.attack}</div>
    </Card>
  );
}

// ── verdict / read card ───────────────────────────────────────────────────────

function ReadCard({ g }: { g: UpcomingGame }): ReactElement {
  const leanMap = {
    batter:  { label: 'Edge: Peña',  dotColor: 'var(--color-positive)', batterFlex: 1,    pitcherFlex: 0.28 },
    pitcher: { label: 'Edge: pitcher',    dotColor: 'var(--color-accent)',   batterFlex: 0.28, pitcherFlex: 1    },
    even:    { label: 'Even matchup',     dotColor: 'var(--color-border-strong)', batterFlex: 0.5, pitcherFlex: 0.5 },
  };
  const lean = leanMap[g.lean];

  return (
    <Card title="The read" subtitle="Pre-game projection">
      <div className="rc__verdict-row">
        <span className="rc__verdict-dot" style={{ background: lean.dotColor }} />
        <span className="rc__verdict-label">{lean.label}</span>
      </div>
      <div className="rc__meter">
        <div className="rc__meter-batter" style={{ flex: lean.batterFlex }} />
        <div className="rc__meter-sep" />
        <div className="rc__meter-pitcher" style={{ flex: lean.pitcherFlex }} />
      </div>
      <div className="rc__meter-labels num">
        <span>BATTER</span><span>PITCHER</span>
      </div>
      <p className="rc__read-text">{g.read}</p>
    </Card>
  );
}

// ── arsenal × batter cross-table ──────────────────────────────────────────────

function ArsenalCross({ g }: { g: UpcomingGame }): ReactElement {
  const rows = g.pitcher.arsenal.map(a => ({ ...a, stat: MOCK_VS_PITCH[a.type] ?? null }));

  // KEY THREAT: pitcher's most-used pitch where batter SLG < .250
  const threat = [...rows]
    .filter(r => r.stat != null && parseFloat(r.stat.slg) < 0.25)
    .sort((a, b) => b.share - a.share)[0] ?? null;

  return (
    <Card title="Arsenal vs your bat" subtitle="What he throws × how Peña hits it · 2026" padless>
      <table className="ac__table">
        <thead>
          <tr>
            <Th align="left" style={{ paddingLeft: 18 }}>Pitch</Th>
            <Th>He throws</Th>
            <Th>Velo</Th>
            <Th>AVG</Th>
            <Th>SLG</Th>
            <Th style={{ paddingRight: 18 }}>Whiff</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => {
            const isThreat = threat != null && r.type === threat.type;
            const slgN = r.stat ? parseFloat(r.stat.slg) : 0;
            const slgHot = slgN >= 0.35;
            return (
              <tr key={r.type} style={isThreat ? { background: 'var(--color-accent-soft)' } : undefined}>
                <Td align="left" mono={false} style={{ paddingLeft: 18, fontWeight: 600 }}>
                  <span className="ac__pitch-cell">
                    {r.type}
                    {isThreat && <Pill tone="accent" style={{ padding: '0 7px', fontSize: 9 }}>KEY THREAT</Pill>}
                  </span>
                </Td>
                <Td style={{ fontWeight: 700 }}>{r.share}%</Td>
                <Td dim>{r.velo}</Td>
                <Td>{r.stat?.avg ?? '—'}</Td>
                <Td hot={slgHot} dim={!slgHot && slgN < 0.2}>{r.stat?.slg ?? '—'}</Td>
                <Td style={{ paddingRight: 18 }} hot={r.stat != null && parseInt(r.stat.whiff) >= 35}>
                  {r.stat?.whiff ?? '—'}
                </Td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="ac__note">
        {threat?.stat != null ? (
          <>
            His most-used put-away pitch Peña struggles with is the{' '}
            <strong style={{ color: 'var(--color-text)' }}>{threat.type.toLowerCase()}</strong>
            {' — '}
            <span className="num" style={{ color: 'var(--color-accent)', fontWeight: 700 }}>{threat.stat.slg} SLG</span>
            {', '}
            <span className="num" style={{ fontWeight: 600 }}>{threat.stat.whiff}</span>
            {' whiff. Expect to see it in two-strike counts.'}
          </>
        ) : (
          <>Peña handles this mix well — no single offering projects as a clear put-away weapon.</>
        )}
      </div>
    </Card>
  );
}

// ── matchup splits ────────────────────────────────────────────────────────────

function MatchupSplits({ g }: { g: UpcomingGame }): ReactElement {
  const hand = MOCK_VS_HAND[g.pitcher.throws];
  const rows = [
    { label: `vs ${g.pitcher.throws}HP`, line: hand.line, ops: hand.ops, delta: hand.delta, hot: hand.hot },
    ...MOCK_VS_CLASS,
  ];

  return (
    <Card title="Matchup splits" subtitle={`${g.pitcher.throws === 'R' ? 'Right' : 'Left'}-handers & pitch classes · OPS · vs Lg`}>
      <div className="ms__rows">
        {rows.map((r, i) => (
          <div key={r.label} className={`ms__row${i > 0 ? ' ms__row--border' : ''}`}>
            <div>
              <div className="ms__label">{r.label}</div>
              <div className="ms__line num">{r.line}</div>
            </div>
            <div className="ms__right">
              <span className="ms__ops num" style={{ color: r.hot ? 'var(--color-positive)' : 'var(--color-text)' }}>{r.ops}</span>
              <span className="ms__delta num" style={{ color: r.hot ? 'var(--color-positive)' : 'var(--color-accent)' }}>{r.delta}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="ms__note">
        {g.pitcher.throws === 'L' ? (
          <>The platoon split is real — Peña jumps{' '}
            <span className="num" style={{ color: 'var(--color-positive)', fontWeight: 700 }}>+.199 OPS</span> against lefties.
          </>
        ) : (
          <>Peña is{' '}
            <span className="num" style={{ color: 'var(--color-accent)', fontWeight: 700 }}>{hand.delta}</span>
            {' '}below league vs righties — the breaking ball is where this matchup is won or lost.
          </>
        )}
      </div>
    </Card>
  );
}

// ── location overlap ──────────────────────────────────────────────────────────

function LocationOverlap({ g }: { g: UpcomingGame }): ReactElement {
  const lastName = g.pitcher.name.split(' ').pop() ?? g.pitcher.name;
  return (
    <Card title="Location" subtitle="Where Peña does damage vs where pitcher attacks">
      <div className="lo__inner">
        <div className="lo__zone">
          <span className="up__eyebrow" style={{ display: 'block', marginBottom: 8 }}>Peña damage · SLG</span>
          <StrikeZone size={132} heat={MOCK_DAMAGE} />
        </div>
        <div className="lo__zone">
          <span className="up__eyebrow" style={{ display: 'block', marginBottom: 8 }}>{g.pitcher.name} · pitch %</span>
          <StrikeZone size={132} heat={g.pitcher.heat} />
        </div>
        <div className="lo__note">
          <div className="lo__note-stat">
            <span className="num lo__note-val">.840</span>
            {' — Peña’s damage lives '}
            <strong>middle-middle</strong>.
          </div>
          <div>
            {lastName}{' '}
            {g.lean === 'pitcher'
              ? 'elevates away from it; little overlap with the hot zone.'
              : 'has to live in or near that zone, which is where mistakes get punished.'
            }
          </div>
        </div>
      </div>
    </Card>
  );
}

// ── recent meetings ───────────────────────────────────────────────────────────

function RecentMeetings({ g }: { g: UpcomingGame }): ReactElement {
  if (!g.h2h) {
    return (
      <Card title="Recent meetings">
        <div className="rm__empty">
          <div className="rm__empty-title">No prior meetings</div>
          <div className="rm__empty-sub">
            This is the first scheduled matchup. Plate appearances will populate here once they’ve faced each other.
          </div>
        </div>
      </Card>
    );
  }

  const toneColor: Record<MeetingEntry['tone'], string> = {
    positive: 'var(--color-positive)',
    negative: 'var(--color-accent)',
    neutral:  'var(--color-text-muted)',
  };

  return (
    <Card title="Recent meetings" subtitle={`${g.h2h.log.length} most recent · career`} padless>
      {g.h2h.log.map((m, i) => (
        <div key={i} className={`rm__row${i > 0 ? ' rm__row--border' : ''}`}>
          <span className="rm__date num">{m.date}</span>
          <span className="rm__res num" style={{ color: toneColor[m.tone] }}>{m.res}</span>
          <span className="rm__detail">{m.detail}</span>
        </div>
      ))}
    </Card>
  );
}

// ── UpcomingTab ───────────────────────────────────────────────────────────────

export function UpcomingTab(): ReactElement {
  const [sel, setSel] = useState(0);
  const g = MOCK_GAMES[sel]!;

  return (
    <div className="up">
      {/* header */}
      <div className="up__header">
        <div>
          <h2 className="up__title">Next 3 games</h2>
          <div className="up__subtitle">Pick a game to see how Peña projects against the probable starter.</div>
        </div>
        <div className="up__header-pills">
          <Pill tone="highlight" style={{ fontFamily: 'var(--font-sans)' }}>
            <span className="up__sample-dot" />
            Sample data · live feed pending
          </Pill>
          <Pill tone="soft" className="num">Probables · subject to change</Pill>
        </div>
      </div>

      {/* game selector rail */}
      <div className="up__rail">
        {MOCK_GAMES.map((gm, i) => (
          <GameSelectCard key={gm.id} g={gm} active={i === sel} onClick={() => setSel(i)} />
        ))}
      </div>

      {/* deep-dive header */}
      <div className="up__dive-hdr">
        <TeamDot team={g.opp} size={22} />
        <span className="up__dive-label">Peña vs {g.pitcher.name}</span>
        <span className="up__dive-meta num">· {g.date} · {g.time} · {g.venue}</span>
      </div>

      {/* row 1: h2h · pitcher snapshot · read */}
      <div className="up__row-1">
        <H2HCard g={g} />
        <PitcherSnapshot g={g} />
        <ReadCard g={g} />
      </div>

      {/* row 2: arsenal cross · matchup splits */}
      <div className="up__row-2">
        <ArsenalCross g={g} />
        <MatchupSplits g={g} />
      </div>

      {/* row 3: location · recent meetings */}
      <div className="up__row-3">
        <LocationOverlap g={g} />
        <RecentMeetings g={g} />
      </div>
    </div>
  );
}
