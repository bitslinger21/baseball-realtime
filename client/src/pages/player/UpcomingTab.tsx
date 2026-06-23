import { useState, type ReactElement } from 'react';
import { Card } from '../../components/primitives/Card';
import { Pill } from '../../components/primitives/Pill';
import { Headshot } from '../../components/primitives/Headshot';
import { TeamDot } from '../../components/primitives/TeamDot';
import { StrikeZone } from '../../components/primitives/StrikeZone';
import { Th, Td } from '../../components/primitives/Table';
import { TEAMS } from '../../utils/teams';
import { useUpcomingGames } from '../../hooks/useUpcomingGames';
import type { UpcomingGame, Pitcher, H2H, PitchStat, LiveSplits, SplitDisplayRow, StarterInfo } from './upcomingTypes';
import type { SplitRowDto } from '@bitslinger21/baseball-realtime-client';
import type { TeamInfo } from '../../utils/teams';
import './UpcomingTab.css';

// ── projection config ─────────────────────────────────────────────────────────

const CONF_W: Record<'High' | 'Medium' | 'Low', number> = {
  High: 0.92,
  Medium: 0.58,
  Low: 0.30,
};
const CONF_FILL: Record<'High' | 'Medium' | 'Low', string> = {
  High: 'var(--color-positive)',
  Medium: 'var(--color-highlight)',
  Low: 'var(--color-accent)',
};

// ── MOCK_SECTION: statcast (groups 3 + 4) ─────────────────────────────────────
// These sections stay on sample data until PR 9.5b lands.
// Set `statcast: false` once live Statcast ingestion is wired.
const MOCK_SECTION = { statcast: true } as const;

// MOCK (group 3) — batter performance by pitch type · 2026 sample
const MOCK_VS_PITCH: Record<string, PitchStat> = {
  'Four-Seam FB': { avg: '.250', slg: '.292', whiff: '17%', n: 0.58 },
  'Sinker':       { avg: '.286', slg: '.357', whiff:  '9%', n: 0.71 },
  'Cutter':       { avg: '.000', slg: '.000', whiff: '50%', n: 0.0  },
  'Slider':       { avg: '.143', slg: '.214', whiff: '38%', n: 0.43 },
  'Sweeper':      { avg: '.118', slg: '.176', whiff: '41%', n: 0.35 },
  'Curveball':    { avg: '.200', slg: '.200', whiff: '24%', n: 0.40 },
  'Splitter':     { avg: '.190', slg: '.238', whiff: '33%', n: 0.48 },
  'Changeup':     { avg: '.333', slg: '.500', whiff: '14%', n: 1.0  },
  'Two-Seam FB':  { avg: '.260', slg: '.320', whiff: '12%', n: 0.65 },
};

// MOCK (group 4) — batter hot-zone damage by location · SLG, normalized
const MOCK_DAMAGE: number[] = [0.18, 0.42, 0.12, 0.28, 0.84, 0.58, 0.04, 0.21, 0.15];

// MOCK (group 6 fallback) — handedness splits (used when live splits not yet loaded)
const MOCK_VS_HAND: Record<'R' | 'L', SplitDisplayRow> = {
  R: { label: 'vs RHP', line: '.226 / .250 / .283', ops: '.533', delta: '−.167', hot: false },
  L: { label: 'vs LHP', line: '.286 / .375 / .357', ops: '.732', delta: '+.032', hot: true  },
};

// MOCK (group 6 fallback) — pitch-class splits
const MOCK_VS_CLASS: SplitDisplayRow[] = [
  { label: 'vs Fastball', line: '.289 / .368', ops: '.693', delta: '−.007', hot: false },
  { label: 'vs Breaking', line: '.143 / .190', ops: '.372', delta: '−.328', hot: false },
  { label: 'vs Offspeed', line: '.250 / .375', ops: '.625', delta: '−.075', hot: false },
];

// ── fallback games (shown while loading or if API returns nothing) ─────────────
const FALLBACK_OPP: TeamInfo = TEAMS.DET!;
const LOADING_GAME: UpcomingGame = {
  id: 'loading', date: '—', time: '—', home: true, opp: FALLBACK_OPP, venue: '—',
  pitcher: {
    name: '—', throws: 'R', num: 0, initials: '—', mlbId: null,
    record: '—', era: '—', whip: '—', k9: '—', ip: '—',
    arsenal: [], heat: [], attack: '',
  },
  h2h: null, lean: 'even', read: '', starter: { status: 'tbd' },
};

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

// ── StarterChip ───────────────────────────────────────────────────────────────

function StarterChip({ starter }: { starter: StarterInfo }): ReactElement {
  if (starter.status === 'confirmed') {
    return (
      <span className="sc sc--confirmed">
        <span className="sc__dot" style={{ background: 'var(--color-positive)' }} />
        Confirmed
      </span>
    );
  }
  if (starter.status === 'projected') {
    const fill = CONF_FILL[starter.confidence];
    return (
      <span className="sc sc--projected">
        <span className="sc__dot" style={{ background: 'var(--color-info)' }} />
        Projected · <span className="num" style={{ color: fill, fontWeight: 700 }}>{starter.confidence}</span>
      </span>
    );
  }
  return (
    <span className="sc sc--tbd">
      <span className="sc__dot" style={{ background: 'var(--color-text-faint)' }} />
      TBD
    </span>
  );
}

// ── ProjectionBanner ──────────────────────────────────────────────────────────

function ProjectionBanner({ starter }: { starter: StarterInfo }): ReactElement | null {
  if (starter.status === 'confirmed') return null;

  if (starter.status === 'tbd') {
    return (
      <div className="pb pb--tbd">
        <div className="pb__label">STARTER TBD</div>
        <div className="pb__basis">Rotation not yet set — projection can't be made from available data.</div>
      </div>
    );
  }

  const { confidence, basis, lastStart } = starter;
  const w = CONF_W[confidence];
  const fill = CONF_FILL[confidence];

  return (
    <div className="pb pb--projected">
      <div className="pb__header">
        <span className="pb__label">PROJECTED STARTER</span>
        <span className="pb__caption">not an announced probable</span>
      </div>
      {lastStart && <div className="pb__last-start num">Last start: {lastStart}</div>}
      <div className="pb__basis">{basis}</div>
      <div className="pb__meter-row">
        <span className="pb__meter-label num">{confidence} confidence</span>
        <div className="pb__meter">
          <div className="pb__meter-fill" style={{ width: `${Math.round(w * 100)}%`, background: fill }} />
        </div>
        <span className="pb__meter-pct num">{Math.round(w * 100)}%</span>
      </div>
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
        <span style={g.starter.status === 'projected' ? { outline: '1.5px dashed var(--color-info)', borderRadius: 4, display: 'inline-flex' } : undefined}>
          <Headshot mlbId={g.pitcher.mlbId} initials={g.pitcher.initials} teamColor={g.opp.primary} size={36} ratio={1.5} />
        </span>
        <div className="gsc__p-info">
          <div className="gsc__p-name-row">
            <span className="gsc__p-name">{g.pitcher.name}</span>
            <span className="gsc__p-hand num">{g.pitcher.throws}HP</span>
            {g.pitcher.rookie && <Pill tone="info" style={{ padding: '0 6px', fontSize: 9 }}>ROOKIE</Pill>}
          </div>
          <div className="gsc__p-line num">{g.pitcher.record} · {g.pitcher.era} ERA</div>
          <StarterChip starter={g.starter} />
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
  const subtitle = h.lastFaced != null
    ? `Career vs ${p.name} · last faced ${h.lastFaced}`
    : `Career vs ${p.name}`;
  const opsColor = parseFloat(h.ops) >= 0.7 ? 'var(--color-positive)' : 'var(--color-accent)';

  return (
    <Card title="Head-to-head" subtitle={subtitle}>
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
  const maxShare = p.arsenal.length > 0 ? Math.max(...p.arsenal.map(a => a.share)) : 1;

  return (
    <Card title="What he throws" subtitle={`${p.name} · ${p.throws}HP`}>
      <div className="ps__head">
        <span style={g.starter.status === 'projected' ? { outline: '1.5px dashed var(--color-info)', borderRadius: 4, display: 'inline-flex' } : undefined}>
          <Headshot mlbId={p.mlbId} initials={p.initials} teamColor={g.opp.primary} size={56} ratio={1.5} />
        </span>
        <div className="ps__stats">
          <div className="ps__starter-chip"><StarterChip starter={g.starter} /></div>
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
      {p.attack && <div className="ps__attack">{p.attack}</div>}
    </Card>
  );
}

// ── verdict / read card ───────────────────────────────────────────────────────

function ReadCard({ g, batterLastName, starter }: { g: UpcomingGame; batterLastName: string; starter: StarterInfo }): ReactElement {
  const leanMap = {
    batter:  { label: `Edge: ${batterLastName}`,  dotColor: 'var(--color-positive)', batterFlex: 1,    pitcherFlex: 0.28 },
    pitcher: { label: 'Edge: pitcher',              dotColor: 'var(--color-accent)',   batterFlex: 0.28, pitcherFlex: 1    },
    even:    { label: 'Even matchup',               dotColor: 'var(--color-border-strong)', batterFlex: 0.5, pitcherFlex: 0.5 },
  };
  const lean = leanMap[g.lean];

  return (
    <Card title="The read" subtitle={starter.status === 'projected' ? 'Projection · if he takes his turn' : 'Pre-game projection'}>
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

// ── arsenal × batter cross-table (group 3: AVG/SLG/OPS real; whiff% sample) ──

function ArsenalCross({
  g, batterLastName, pitchType,
}: { g: UpcomingGame; batterLastName: string; pitchType: SplitRowDto[] }): ReactElement {
  if (g.pitcher.arsenal.length === 0) return <></>;

  // Build a lookup from pitch label → real SplitRowDto
  const byLabel = new Map(pitchType.map(r => [r.label.toLowerCase(), r]));

  const rows = g.pitcher.arsenal.map(a => {
    const real = byLabel.get(a.type.toLowerCase()) ?? null;
    // whiff% stays mock/sample
    const mockWhiff = MOCK_VS_PITCH[a.type]?.whiff ?? null;
    return { ...a, real, mockWhiff };
  });

  // KEY THREAT: most-used pitch where batter SLG < .250 (from real data if available)
  const threat = [...rows]
    .filter(r => {
      if (r.real == null) return false;
      return parseFloat(r.real.slg) < 0.250;
    })
    .sort((a, b) => b.share - a.share)[0] ?? null;

  const hasReal = rows.some(r => r.real != null);

  return (
    <Card
      title="Arsenal vs your bat"
      subtitle={`What he throws × how ${batterLastName} hits it · 2026${hasReal ? '' : ' · sample'}`}
      padless
    >
      <table className="ac__table">
        <thead>
          <tr>
            <Th align="left" style={{ paddingLeft: 18 }}>Pitch</Th>
            <Th>He throws</Th>
            <Th>Velo</Th>
            <Th>AVG</Th>
            <Th>OPS</Th>
            <Th style={{ paddingRight: 18 }}>Whiff · sample</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => {
            const isThreat = threat != null && r.type === threat.type;
            const slgN = r.real ? parseFloat(r.real.slg) : 0;
            const slgHot = slgN >= 0.35;
            const avg = r.real?.avg ?? '—';
            const ops = r.real?.ops ?? '—';
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
                <Td hot={r.real != null && parseFloat(avg) > 0.250}>{avg}</Td>
                <Td hot={slgHot} dim={!slgHot && slgN < 0.2}>{ops}</Td>
                <Td style={{ paddingRight: 18 }} dim>
                  {r.mockWhiff ?? '—'}
                </Td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="ac__note">
        {threat?.real != null ? (
          <>
            His most-used put-away pitch {batterLastName} struggles with is the{' '}
            <strong style={{ color: 'var(--color-text)' }}>{threat.type.toLowerCase()}</strong>
            {' — '}
            <span className="num" style={{ color: 'var(--color-accent)', fontWeight: 700 }}>{threat.real.slg} SLG</span>
            {'. Expect to see it in two-strike counts.'}
          </>
        ) : (
          <>{batterLastName} handles this mix well — no single offering projects as a clear put-away weapon.</>
        )}
      </div>
    </Card>
  );
}

// ── matchup splits (group 6: live) ────────────────────────────────────────────

function MatchupSplits({
  g, liveSplits, batterLastName,
}: { g: UpcomingGame; liveSplits: LiveSplits | null; batterLastName: string }): ReactElement {
  const hand = g.pitcher.throws;
  const handRow = liveSplits?.vsHand[hand] ?? MOCK_VS_HAND[hand];
  const classRows = liveSplits?.vsClass.length ? liveSplits.vsClass : MOCK_VS_CLASS;

  const rows: SplitDisplayRow[] = [
    { ...handRow, label: `vs ${hand}HP` },
    ...classRows,
  ];

  const lhDelta = liveSplits?.vsHand.L?.delta ?? MOCK_VS_HAND.L.delta;
  const rhDelta = liveSplits?.vsHand.R?.delta ?? MOCK_VS_HAND.R.delta;

  return (
    <Card title="Matchup splits" subtitle={`${hand === 'R' ? 'Right' : 'Left'}-handers & pitch classes · OPS · vs Lg avg`}>
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
        {hand === 'L' ? (
          <>{batterLastName} jumps{' '}
            <span className="num" style={{ color: 'var(--color-positive)', fontWeight: 700 }}>{lhDelta}</span>
            {' '}OPS against lefties.
          </>
        ) : (
          <>{batterLastName} is{' '}
            <span className="num" style={{ color: 'var(--color-accent)', fontWeight: 700 }}>{rhDelta}</span>
            {' '}vs league OPS against righties — the breaking ball is where this matchup is won or lost.
          </>
        )}
      </div>
    </Card>
  );
}

// ── location overlap (group 4: statcast-pending) ──────────────────────────────

function LocationOverlap({ g, batterLastName }: { g: UpcomingGame; batterLastName: string }): ReactElement {
  if (!MOCK_SECTION.statcast) return <></>;

  const lastName = g.pitcher.name.split(' ').pop() ?? g.pitcher.name;
  return (
    <Card title="Location" subtitle={`Where ${batterLastName} does damage vs where pitcher attacks · sample`}>
      <div className="lo__inner">
        <div className="lo__zone">
          <span className="up__eyebrow" style={{ display: 'block', marginBottom: 8 }}>{batterLastName} damage · SLG</span>
          <StrikeZone size={132} heat={MOCK_DAMAGE} />
        </div>
        <div className="lo__zone">
          <span className="up__eyebrow" style={{ display: 'block', marginBottom: 8 }}>{g.pitcher.name} · pitch %</span>
          <StrikeZone size={132} heat={g.pitcher.heat} />
        </div>
        <div className="lo__note">
          <div className="lo__note-stat">
            <span className="num lo__note-val">.840</span>
            {` — ${batterLastName}'s damage lives `}
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
            This is the first scheduled matchup. Plate appearances will populate here once they've faced each other.
          </div>
        </div>
      </Card>
    );
  }

  if (g.h2h.log.length === 0) {
    return (
      <Card title="Recent meetings" subtitle={`Career vs ${g.pitcher.name}`}>
        <div className="rm__empty">
          <div className="rm__empty-title">Career stats available</div>
          <div className="rm__empty-sub">
            {g.h2h.pa} PA on record. Game-by-game history will appear here in a future update.
          </div>
        </div>
      </Card>
    );
  }

  const toneColor: Record<'positive' | 'neutral' | 'negative', string> = {
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

interface UpcomingTabProps {
  batterId: number | null;
  batterName: string;
}

export function UpcomingTab({ batterId, batterName }: UpcomingTabProps): ReactElement {
  const [sel, setSel] = useState(0);
  const { games, splits, loading } = useUpcomingGames(batterId);

  const lastName = batterName.split(/\s+/).pop() ?? batterName;
  const displayGames = loading || games.length === 0 ? [LOADING_GAME] : games;
  const safeIdx = Math.min(sel, displayGames.length - 1);
  const g = displayGames[safeIdx]!;
  const isLive = !loading && games.length > 0;

  return (
    <div className="up">
      {/* header */}
      <div className="up__header">
        <div>
          <h2 className="up__title">Next {isLive ? games.length : 3} games</h2>
          <div className="up__subtitle">Pick a game to see how {lastName} projects against the probable starter.</div>
        </div>
        <div className="up__header-pills">
          {MOCK_SECTION.statcast && (
            <Pill tone="highlight" style={{ fontFamily: 'var(--font-sans)' }}>
              <span className="up__sample-dot" />
              Sample data · location pending
            </Pill>
          )}
          <Pill tone="soft" className="num">Probables · subject to change</Pill>
        </div>
      </div>

      {/* game selector rail */}
      <div className="up__rail">
        {displayGames.map((gm, i) => (
          <GameSelectCard key={gm.id} g={gm} active={i === safeIdx} onClick={() => setSel(i)} />
        ))}
      </div>

      {/* deep-dive header */}
      <div className="up__dive-hdr">
        <TeamDot team={g.opp} size={22} />
        <span className="up__dive-label">{lastName} vs {g.pitcher.name}</span>
        <span className="up__dive-meta num">· {g.date} · {g.time} · {g.venue}</span>
      </div>

      {/* projection banner (only when not confirmed) */}
      <ProjectionBanner starter={g.starter} />

      {/* row 1: h2h · pitcher snapshot · read */}
      <div className="up__row-1">
        <H2HCard g={g} />
        <PitcherSnapshot g={g} />
        <ReadCard g={g} batterLastName={lastName} starter={g.starter} />
      </div>

      {/* row 2: arsenal cross · matchup splits */}
      <div className="up__row-2">
        <ArsenalCross g={g} batterLastName={lastName} pitchType={splits?.pitchType ?? []} />
        <MatchupSplits g={g} liveSplits={splits} batterLastName={lastName} />
      </div>

      {/* row 3: location · recent meetings */}
      <div className="up__row-3">
        <LocationOverlap g={g} batterLastName={lastName} />
        <RecentMeetings g={g} />
      </div>
    </div>
  );
}
