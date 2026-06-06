import './PlayerPage.css';
import type { ReactElement } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { track } from '../utils/track';

import type { BatterOverviewDto, BatterOverviewTodayDto } from './player/batterOverview';
import type { PlayerDrilldownDto, GameLogRowDto } from './player/playerDrilldown';

import { useTopbarReturn } from '../App';
import { PageTitle } from '../components/primitives/PageTitle';
import { Card } from '../components/primitives/Card';
import { Headshot } from '../components/primitives/Headshot';
import { Pill, LivePill } from '../components/primitives/Pill';
import { Stat, StatBlock } from '../components/primitives/Stat';
import { Segmented } from '../components/primitives/Segmented';
import { StatInfo } from '../components/primitives/StatInfo';
import { Tabs } from '../components/primitives/Tabs';
import { Th, Td } from '../components/primitives/Table';
import { Donut } from '../components/primitives/Donut';
import { StrikeZone } from '../components/primitives/StrikeZone';
import { TeamDot } from '../components/primitives/TeamDot';
import { TEAMS } from '../utils/teams';
import { UpcomingTab } from './player/UpcomingTab';

// ── helpers ───────────────────────────────────────────────────────────────────

type AnyObj = Record<string, unknown>;

function asStr(v: unknown): string | null {
  return typeof v === 'string' && v.trim() !== '' ? v : null;
}

function asNum(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'P';
  if (parts.length === 1) return parts[0]!.slice(0, 1).toUpperCase();
  return (parts[0]!.slice(0, 1) + parts[parts.length - 1]!.slice(0, 1)).toUpperCase();
}

function formatDebut(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}


function teamLogoUrl(teamId: number): string {
  return `https://www.mlbstatic.com/team-logos/${teamId}.svg`;
}

function formatDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  if (isNaN(d.getTime())) return iso;
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${m}-${day}`;
}

// ── FormGuide ─────────────────────────────────────────────────────────────────

interface FormGame { tb: number; hr?: boolean; }

function FormGuide({ games, width = 210, height = 56 }: { games: FormGame[]; width?: number; height?: number }): ReactElement {
  const maxTb = Math.max(4, ...games.map(g => g.tb));
  return (
    <div style={{ width }}>
      <div className="fg__bars" style={{ height }}>
        {games.map((g, i) => {
          const hit = g.tb > 0;
          const barH = hit ? Math.round((g.tb / maxTb) * (height - 10)) + 6 : 3;
          return (
            <div key={i} className="fg__bar-col">
              {g.hr && <span className="fg__hr-dot" />}
              <div
                className="fg__bar"
                style={{
                  height: barH,
                  background: hit ? 'var(--color-accent)' : 'var(--color-border)',
                  opacity: hit ? 0.45 + 0.55 * (g.tb / maxTb) : 1,
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="fg__footer">
        <span>Total bases / game</span>
        <span>last night →</span>
      </div>
    </div>
  );
}

// ── HotZone ───────────────────────────────────────────────────────────────────
// Thin wrapper — renders heat values inside the shared StrikeZone frame
// (same tall frame + home plate + perspective used on the game page).

function HotZone({ data, size = 150 }: { data: number[]; size?: number }): ReactElement {
  return <StrikeZone size={size} heat={data} />;
}

// ── VBar ──────────────────────────────────────────────────────────────────────

function VBar({ value, max = 1, color, width = 70 }: { value: number; max?: number; color?: string; width?: number }): ReactElement {
  const w = Math.min(100, (value / max) * 100);
  return (
    <div className="vbar" style={{ width }}>
      <div className="vbar__fill" style={{ width: `${w}%`, background: color ?? 'var(--color-accent)' }} />
    </div>
  );
}

// ── Percentile bar ─────────────────────────────────────────────────────────────

function PctBar({ pct }: { pct: number | undefined }): ReactElement {
  if (pct === undefined) return <span className="pct-bar--empty">—</span>;
  const color = pct >= 60 ? 'var(--color-positive)' : pct >= 40 ? 'var(--color-highlight)' : 'var(--color-accent)';
  return (
    <div className="pct-bar">
      <div className="pct-bar__track">
        <div className="pct-bar__fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="pct-bar__label">{pct}<span className="pct-bar__suffix">th</span></span>
    </div>
  );
}

// ── PlayerHero ────────────────────────────────────────────────────────────────

const TAB_LABELS = ['Overview', 'Stats', 'Splits', 'Pitching', 'History', 'Upcoming'];

interface CompareCandidate {
  id: string;
  name: string;
  team: string;
  teamColor: string;
  pos: string;
  line: string;
}

const COMPARE_CANDIDATES: CompareCandidate[] = [
  { id: '683002', name: 'Gunnar Henderson', team: 'BAL', teamColor: '#df4601', pos: 'SS', line: '.281 / .350 / .478' },
  { id: '683011', name: 'Anthony Volpe',    team: 'NYY', teamColor: '#003087', pos: 'SS', line: '.248 / .309 / .415' },
  { id: '608324', name: 'Alex Bregman',     team: 'HOU', teamColor: '#eb6e1f', pos: '3B', line: '.262 / .342 / .441' },
];

interface HeroProps {
  mlbId: string;
  name: string;
  teamId: number | null;
  teamFull: string | null;
  position: string | null;
  jerseyNumber: string | null;
  bats: string | null;
  throws: string | null;
  age: number | null;
  fromCity: string | null;
  debut: string | null;
  height: string | null;
  weight: number | null;
  slashLine: string;
  ops: string | null;
  season: number | null;
  gamesPlayed: number | null;
  today: BatterOverviewTodayDto | null;
  activeTab: number;
  onTab: (i: number) => void;
}

function PlayerHero(props: HeroProps): ReactElement {
  const { mlbId, name, teamId, teamFull, position, jerseyNumber, bats, throws, age,
    fromCity, debut, height, weight, slashLine, ops, season, gamesPlayed,
    today, activeTab, onTab } = props;

  const navigate = useNavigate();
  const [logoOk, setLogoOk] = useState(true);
  const [cmpOpen, setCmpOpen] = useState(false);
  const [cmpSel, setCmpSel] = useState<string | null>(null);
  const [notified, setNotified] = useState(false);
  const cmpRef = useRef<HTMLDivElement>(null);

  const todayGameId = today?.gameId ?? null;
  const lastName = name.split(/\s+/).pop() ?? name;
  const selCandidate = COMPARE_CANDIDATES.find(c => c.id === cmpSel) ?? null;

  function openCompare() {
    if (!cmpOpen) track('compare_opened', { player: name });
    setCmpOpen(o => !o);
  }

  function selectCompare(id: string) {
    setCmpSel(id);
    const c = COMPARE_CANDIDATES.find(cand => cand.id === id);
    track('compare_player_selected', { player: name, vs: c?.name ?? id });
  }

  useEffect(() => {
    if (!cmpOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (cmpRef.current && !cmpRef.current.contains(e.target as Node)) {
        setCmpOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setCmpOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [cmpOpen]);

  const ini = initials(name);
  const mlbIdNum = useMemo((): number | null => {
    const n = parseInt(mlbId, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [mlbId]);
  const teamColor = useMemo((): string => {
    if (teamId == null) return 'hsl(210 15% 55%)';
    const hue = Math.abs(teamId * 37) % 360;
    return `hsl(${hue} 65% 45%)`;
  }, [teamId]);

  const battingLabel = bats && throws ? `${bats}/${throws}` : null;
  const eyebrowParts = [position, jerseyNumber ? `#${jerseyNumber}` : null, battingLabel, age ? `${age} yrs` : null].filter(Boolean);

  const bioFields: [string, string][] = [
    ['From', fromCity ?? '—'],
    ['Debut', debut ?? '—'],
    ['Height', height ?? '—'],
    ['Weight', weight != null ? `${weight} lbs` : '—'],
    ['Bats / Throws', bats && throws ? `${bats} / ${throws}` : '—'],
  ];

  const todayLabel = today?.label ?? 'Today';
  const todayOpp = today?.opponent ? ` · vs ${today.opponent}` : '';
  const todayLine = today != null && today.hits != null && today.atBats != null
    ? `${today.hits}-for-${today.atBats}`
    : today?.statLine ?? null;

  return (
    <div className="ph">
      <div className="ph__card">
        {/* Top row: photo | headline | today */}
        <div className="ph__top">
          <Headshot
            mlbId={mlbIdNum}
            initials={ini}
            teamColor={teamColor}
            size={124}
            ratio={1.32}
          />

          {/* Headline */}
          <div>
            <div className="ph__team-row">
              {teamId != null && logoOk ? (
                <img
                  className="ph__team-logo"
                  src={teamLogoUrl(teamId)}
                  alt={teamFull ?? ''}
                  onError={() => setLogoOk(false)}
                />
              ) : (
                <div className="ph__team-dot" style={{ background: teamColor }}>
                  {(teamFull ?? '?').slice(0, 1).toUpperCase()}
                </div>
              )}
              <span className="ph__team-name">{teamFull ?? '—'}</span>
              <span className="ph__dot-sep" />
              <span className="ph__eyebrow">{eyebrowParts.join(' · ')}</span>
            </div>
            <h1 className="ph__name">{name}</h1>
            <div className="ph__slash-row">
              <span className="ph__slash num">{slashLine}</span>
              {ops && <span className="ph__ops">{ops} OPS</span>}
              <span className="ph__line-sep" />
              <span className="ph__gp">{season != null ? `${season}` : ''}{gamesPlayed != null ? ` · ${gamesPlayed} GP` : ''}</span>
            </div>
          </div>

          {/* Today widget — clickable to game page when a game exists */}
          <div
            className={`ph__today${todayGameId != null ? ' ph__today--clickable' : ''}`}
            onClick={todayGameId != null ? () => navigate(`/game/${todayGameId}`) : undefined}
            role={todayGameId != null ? 'button' : undefined}
            tabIndex={todayGameId != null ? 0 : undefined}
            onKeyDown={todayGameId != null ? (e) => { if (e.key === 'Enter' || e.key === ' ') navigate(`/game/${todayGameId}`); } : undefined}
          >
            <div className="ph__today-header">
              <span className="ph__today-eyebrow">{todayLabel}{todayOpp}</span>
              {today?.isLive && <LivePill label="LIVE" />}
            </div>
            {todayLine != null ? (
              <>
                <div className="ph__today-line num">{todayLine}</div>
                {today?.statLine && today.statLine !== todayLine && (
                  <div className="ph__today-pa num">{today.statLine}</div>
                )}
              </>
            ) : (
              <div className="ph__today-empty">No game today</div>
            )}
          </div>
        </div>

        {/* Bio strip */}
        <div className="ph__bio">
          <div className="ph__bio-fields">
            {bioFields.map(([l, v]) => (
              <div key={l} className="ph__bio-field">
                <span className="ph__bio-label">{l}</span>
                <span className="ph__bio-value">{v}</span>
              </div>
            ))}
          </div>
          <div className="ph__bio-actions" ref={cmpRef}>
            <button
              type="button"
              className="ph__bio-btn"
              disabled={!todayGameId}
              onClick={() => todayGameId && navigate(`/game/${todayGameId}`)}
            >
              <svg width="10" height="11" viewBox="0 0 10 11" fill="currentColor" aria-hidden="true">
                <path d="M0 1.5v8L9 5.5z" />
              </svg>
              Watch live
            </button>
            <button
              type="button"
              className={`ph__bio-btn${cmpOpen ? ' ph__bio-btn--active' : ''}`}
              onClick={openCompare}
            >
              Compare
              <svg
                width="10"
                height="6"
                viewBox="0 0 10 6"
                fill="currentColor"
                aria-hidden="true"
                style={{ transform: cmpOpen ? 'rotate(180deg)' : undefined, transition: 'transform 150ms' }}
              >
                <path d="M0 0l5 6 5-6z" />
              </svg>
            </button>

            {cmpOpen && (
              <div className="ph__cmp-dropdown">
                <div className="ph__cmp-header">
                  <span className="ph__cmp-eyebrow">Compare {lastName} with</span>
                  <input
                    type="text"
                    className="ph__cmp-search"
                    placeholder="Search players…"
                    readOnly
                  />
                </div>
                <div className="ph__cmp-list">
                  {COMPARE_CANDIDATES.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      className={`ph__cmp-row${cmpSel === c.id ? ' ph__cmp-row--selected' : ''}`}
                      onClick={() => selectCompare(c.id)}
                    >
                      <span className="ph__cmp-team-dot" style={{ background: c.teamColor }}>
                        {c.team.slice(0, 1)}
                      </span>
                      <div className="ph__cmp-row-info">
                        <span className="ph__cmp-row-name">{c.name}</span>
                        <span className="ph__cmp-row-meta">{c.team} · {c.pos} · {c.line}</span>
                      </div>
                      {cmpSel === c.id && <span className="ph__cmp-row-check">✓</span>}
                    </button>
                  ))}
                </div>
                <div className="ph__cmp-footer">
                  {notified ? (
                    <div className="ph__cmp-confirmed">
                      <span>✓</span>
                      <span>Thanks — we'll let you know when Compare ships.</span>
                    </div>
                  ) : selCandidate ? (
                    <>
                      <p className="ph__cmp-description">
                        A side-by-side <strong>{lastName} vs {selCandidate.name}</strong> breakdown is in the works.
                      </p>
                      <button
                        type="button"
                        className="ph__cmp-notify-btn"
                        onClick={() => {
                          track('compare_notify_requested', { player: name, vs: selCandidate.name });
                          setNotified(true);
                        }}
                      >
                        Notify me when this ships
                      </button>
                    </>
                  ) : (
                    <p className="ph__cmp-instruction">Pick a player to see the matchup.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="ph__tabs">
          <Tabs items={TAB_LABELS} active={activeTab} onClick={onTab} />
        </div>
      </div>
    </div>
  );
}

// ── OverviewTab ───────────────────────────────────────────────────────────────

interface OverviewTabProps {
  overview: BatterOverviewDto;
  drilldown: PlayerDrilldownDto | null;
}

function OverviewTab({ overview, drilldown }: OverviewTabProps): ReactElement {
  const { headline, secondary } = overview;

  // Recent form: derive per-game total bases from game log (oldest → newest, last 15)
  const formGames = useMemo((): FormGame[] => {
    if (drilldown == null) return [];
    return drilldown.gameLog
      .slice(0, 15)
      .reverse()
      .map(g => {
        const h = g.hits ?? 0;
        const hr = g.homeRuns ?? 0;
        // TB lower bound: singles + HR*4 (we don't have 2B/3B per game)
        const tb = Math.max(0, (h - hr)) + hr * 4;
        return { tb, hr: hr > 0 };
      });
  }, [drilldown]);

  // Now card: compute streak and recent AVG
  const hitStreak = useMemo((): number => {
    if (!drilldown) return 0;
    let s = 0;
    for (const g of drilldown.gameLog) {
      if ((g.hits ?? 0) > 0) s++;
      else break;
    }
    return s;
  }, [drilldown]);

  const last7Avg = useMemo((): string | null => {
    if (!drilldown) return null;
    const rows = drilldown.gameLog.slice(0, 7);
    const h = rows.reduce((s, g) => s + (g.hits ?? 0), 0);
    const ab = rows.reduce((s, g) => s + (g.atBats ?? 0), 0);
    if (ab === 0) return null;
    const avg = h / ab;
    return avg.toFixed(3).replace('0.', '.');
  }, [drilldown]);

  const pa = secondary.atBats + secondary.walks;
  const kPct = pa > 0 ? `${((secondary.strikeouts / pa) * 100).toFixed(1)}%` : '—';

  // Last 5 games
  const last5 = drilldown?.gameLog.slice(0, 5) ?? [];

  return (
    <div>
      <div className="ov__grid">
        {/* Recent form */}
        <Card
          title="Recent form"
          subtitle={`Last ${formGames.length > 0 ? formGames.length : 15} games`}
          action={<Pill tone="positive">▲ season avg</Pill>}
        >
          <div className="ov__form-top">
            <Stat
              label={`Last ${formGames.length > 0 ? formGames.length : 15} · AVG`}
              value={headline.battingAverage}
              sub={`${secondary.hits}-for-${secondary.atBats}`}
              size="hero"
            />
            {formGames.length > 0 && <FormGuide games={formGames} width={210} height={56} />}
          </div>
          <div className="ov__stat-blocks">
            <StatBlock label="OPS" value={headline.onBasePlusSlugging} size="sm" />
            <StatBlock label="HR" value={String(headline.homeRuns)} size="sm" />
            <StatBlock label="RBI" value={String(headline.runsBattedIn)} size="sm" />
            <StatBlock label="K%" value={kPct} size="sm" />
          </div>
        </Card>

        {/* Hot zones — stub data, real grid structure */}
        <Card title="Hot zones" subtitle="Batting average by location · season">
          <div className="ov__hot-inner">
            <HotZone
              data={[0.12, 0.42, 0.18, 0.31, 0.72, 0.55, 0.08, 0.24, 0.19]}
              size={150}
            />
            <div className="ov__hot-insights">
              <div>
                <span className="ov__hot-value">.720</span>
                {' '}on middle-middle
              </div>
              <div>Cold low/away: <span className="ov__hot-text">.083</span></div>
              <div>Launch angle: <span className="ov__hot-text">{secondary.hits > 0 ? 'contact hitter' : '—'}</span></div>
            </div>
          </div>
        </Card>

        {/* Now / context */}
        <Card title="Now" subtitle="Trends + notable">
          <div className="ov__now-rows">
            <div className="ov__now-row">
              <span className="ov__now-label">Hitting streak</span>
              <Pill tone={hitStreak >= 5 ? 'highlight' : hitStreak >= 1 ? 'positive' : 'soft'}>
                {hitStreak >= 1 ? `${hitStreak} game` : 'None active'}
              </Pill>
            </div>
            <div className="ov__now-row">
              <span className="ov__now-label">AVG last 7 games</span>
              <Pill tone="info">
                {last7Avg ?? '—'}
              </Pill>
            </div>
            <div className="ov__now-row">
              <span className="ov__now-label">Season OPS</span>
              <Pill tone="neutral">
                {headline.onBasePlusSlugging}
              </Pill>
            </div>
            <div className="ov__now-row">
              <span className="ov__now-label">Strikeout rate</span>
              <Pill tone={parseFloat(kPct) < 20 ? 'positive' : 'accent'}>
                {kPct}
              </Pill>
            </div>
          </div>
        </Card>

        {/* Last 5 games */}
        <div className="ov__full">
          <Card title="Last 5 games" subtitle="At-bat outcomes by game" padless>
            {last5.length === 0 ? (
              <div style={{ padding: '24px', color: 'var(--color-text-muted)', fontSize: 13 }}>
                Loading game log…
              </div>
            ) : (
              <div className="l5g">
                {last5.map((g, i) => (
                  <Last5Cell key={i} game={g} isLast={i === last5.length - 1} />
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Notable milestones */}
        <div className="ov__full">
          <NotableCard secondary={secondary} headline={headline} />
        </div>
      </div>
    </div>
  );
}

function Last5Cell({ game, isLast }: { game: GameLogRowDto; isLast: boolean }): ReactElement {
  const h = game.hits ?? 0;
  const ab = game.atBats ?? 0;
  const line = `${h}-for-${ab}`;
  const detail = game.summary;
  const date = formatDate(game.date);
  const opp = (game.isHome ? 'vs ' : '@ ') + game.opponent;
  const win = game.isWin;

  return (
    <div className="l5g__cell" style={isLast ? { borderRight: 'none' } : undefined}>
      <div className="l5g__date-row">
        <span className="l5g__date">{date}</span>
        {win != null && (
          <Pill tone={win ? 'positive' : 'live'} className="l5g__pill">
            {win ? 'W' : 'L'}
          </Pill>
        )}
      </div>
      <div className="l5g__opp">{opp}</div>
      <div>
        <div className="l5g__line num">{line}</div>
        {detail && <div className="l5g__detail num">{detail}</div>}
      </div>
    </div>
  );
}

interface NotableCardProps {
  secondary: BatterOverviewDto['secondary'];
  headline: BatterOverviewDto['headline'];
}

function NotableCard({ secondary, headline }: NotableCardProps): ReactElement {
  const xbh = secondary.doubles + secondary.triples + headline.homeRuns;
  const milestones = [
    {
      eyebrow: 'Season',
      heading: `${secondary.hits} hits`,
      detail: `${secondary.atBats} at-bats · ${secondary.games} games`,
      progress: Math.min(1, secondary.hits / 150),
      color: 'var(--color-positive)',
    },
    {
      eyebrow: 'Power',
      heading: `${headline.homeRuns} HR`,
      detail: `${xbh} extra-base hits · ${headline.runsBattedIn} RBI`,
      progress: Math.min(1, headline.homeRuns / 30),
      color: 'var(--color-highlight)',
    },
    {
      eyebrow: 'Speed',
      heading: `${secondary.stolenBases} SB`,
      detail: `${secondary.runs} runs scored`,
      progress: Math.min(1, secondary.stolenBases / 20),
      color: 'var(--color-info)',
    },
    {
      eyebrow: 'Contact',
      heading: `${secondary.strikeouts} K`,
      detail: `${secondary.walks} walks · ${((secondary.walks / Math.max(1, secondary.atBats + secondary.walks)) * 100).toFixed(1)}% BB rate`,
      progress: Math.min(1, 1 - secondary.strikeouts / 120),
      color: 'var(--color-accent)',
    },
  ];

  return (
    <Card title="Notable" subtitle="Season milestones">
      <div className="notable__grid">
        {milestones.map((n) => (
          <div key={n.eyebrow} className="notable__card">
            <span className="notable__eyebrow">{n.eyebrow}</span>
            <div className="notable__heading">{n.heading}</div>
            <div className="notable__progress">
              <div className="notable__bar" style={{ width: `${n.progress * 100}%`, background: n.color }} />
            </div>
            <div className="notable__detail">{n.detail}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── StatsTab ──────────────────────────────────────────────────────────────────

interface StatRow {
  label: string;
  note?: string;
  info?: { title: string; body: string; scale?: string };
  value: string;
  hot?: boolean;
  lg?: string;
  delta?: string;
  deltaTone?: 'positive' | 'negative' | 'neutral' | 'none';
  pct?: number;
}

interface StatsTabProps {
  overview: BatterOverviewDto;
}

function StatsTab({ overview }: StatsTabProps): ReactElement {
  const [rangeIdx, setRangeIdx] = useState(0);
  const [compareIdx, setCompareIdx] = useState(0);

  const { headline, secondary, season } = overview;

  const pa = secondary.atBats + secondary.walks;
  const xbh = secondary.doubles + secondary.triples + headline.homeRuns;
  const tb = secondary.hits + secondary.doubles + 2 * secondary.triples + 3 * headline.homeRuns;
  const kPct = pa > 0 ? `${((secondary.strikeouts / pa) * 100).toFixed(1)}%` : '—';
  const bbPct = pa > 0 ? `${((secondary.walks / pa) * 100).toFixed(1)}%` : '—';

  const rateRows: StatRow[] = [
    { label: 'Batting Average', value: headline.battingAverage, hot: false },
    { label: 'On-Base %',       value: headline.onBasePercentage },
    { label: 'Slugging %',      value: headline.sluggingPercentage },
    { label: 'OPS',             value: headline.onBasePlusSlugging, hot: true },
    { label: 'wOBA',            value: '—', note: 'not available',
      info: { title: 'Weighted On-Base Avg', body: 'Like OBP, but each way of reaching base is weighted by how much it actually helps you score — a homer counts far more than a walk. Scaled to look like OBP.', scale: '.320 ≈ average · .370+ great · .290 poor' } },
    { label: 'wRC+',            value: '—', note: 'park-adjusted, not available',
      info: { title: 'Weighted Runs Created +', body: 'Total offense rolled into one number, adjusted for ballpark and era. The single cleanest "is this hitter good?" stat.', scale: '100 = league average · each point = 1% better / worse' } },
  ];

  const productionRows: StatRow[] = [
    { label: 'Runs',            value: String(secondary.runs),  note: secondary.games > 0 ? `${(secondary.runs / secondary.games).toFixed(2)} / game` : undefined },
    { label: 'RBI',             value: String(headline.runsBattedIn) },
    { label: 'Home Runs',       value: String(headline.homeRuns), note: `${secondary.doubles}D, ${secondary.triples}T` },
    { label: 'Extra-base hits', value: String(xbh),              note: `${secondary.doubles}D · ${secondary.triples}T · ${headline.homeRuns} HR` },
    { label: 'Total bases',     value: String(tb),               note: `${(tb / Math.max(1, secondary.games)).toFixed(2)} / game` },
  ];

  const disciplineRows: StatRow[] = [
    { label: 'Walk %',      value: bbPct },
    { label: 'Strikeout %', value: kPct },
    { label: 'Chase %',     value: '—', note: 'Statcast, not available',
      info: { title: 'Chase Rate', body: 'How often he swings at pitches OUTSIDE the strike zone. Lower is better — chasing bad pitches leads to weak contact and strikeouts.', scale: 'Lower = more disciplined · ~28% is average' } },
    { label: 'Whiff %',     value: '—', note: 'Statcast, not available',
      info: { title: 'Whiff Rate', body: 'Share of swings that miss entirely. A swing-and-miss measure of bat-to-ball skill — lower means more contact.', scale: 'Lower = more contact · ~25% is average' } },
    { label: 'Contact %',   value: '—', note: 'Statcast, not available' },
    { label: 'Swing %',     value: '—', note: 'Statcast, not available' },
  ];

  const contactRows: StatRow[] = [
    { label: 'Exit Velocity (avg)', value: '—', note: 'mph, Statcast' },
    { label: 'Exit Velocity (max)', value: '—', note: 'mph, Statcast' },
    { label: 'Hard Hit %',          value: '—', note: 'Statcast',
      info: { title: 'Hard-Hit Rate', body: 'Share of batted balls hit at 95+ mph exit velocity. Hard contact turns into hits and extra bases far more often — higher is better.', scale: 'Higher = better · ~38% is average' } },
    { label: 'Barrel %',            value: '—', note: 'Statcast',
      info: { title: 'Barrel Rate', body: 'Share of batted balls hit in the ideal exit-velocity + launch-angle combo — the "barrel." Barrels become extra-base hits and homers most often. The gold standard for damage.', scale: 'Higher = better · ~7–8% is average' } },
    { label: 'Launch Angle',        value: '—', note: 'degrees, Statcast' },
  ];

  const volumeRows: StatRow[] = [
    { label: 'Games',              value: String(secondary.games),  note: `starts: ${secondary.games}` },
    { label: 'At-Bats',            value: String(secondary.atBats) },
    { label: 'Plate Appearances',  value: String(pa), note: 'est. AB + BB' },
    { label: 'Stolen Bases',       value: String(secondary.stolenBases), note: secondary.stolenBases > 0 ? `${secondary.stolenBases} attempt${secondary.stolenBases === 1 ? '' : 's'}` : undefined },
    { label: 'BsR',                value: '—', note: 'baserunning runs, not available',
      info: { title: 'Base Running Runs', body: 'Total runs added or lost from baserunning — steals, taking extra bases, avoiding outs on the basepaths — vs. an average runner.', scale: '0 = average · positive = above-average baserunner' } },
  ];

  const seasonLabel = season != null ? String(season) : '2026';

  return (
    <div className="st">
      {/* Range + compare filter row */}
      <div className="st__filter-row">
        <Segmented
          items={[`${seasonLabel} season`, 'Last 30d', 'Last 7d', 'Today', 'Career']}
          active={rangeIdx}
          onClick={setRangeIdx}
        />
        <div className="st__compare-group">
          <span className="st__compare-label">Compare</span>
          <Segmented items={['League avg', 'Position', 'Team']} active={compareIdx} onClick={setCompareIdx} size="sm" />
        </div>
      </div>

      <SectionTable title="Rate" seasonLabel={seasonLabel} rows={rateRows} />
      <SectionTable title="Production" seasonLabel={seasonLabel} rows={productionRows} />
      <SectionTable title="Plate discipline" seasonLabel={seasonLabel} rows={disciplineRows} />
      <SectionTable title="Contact quality · Statcast" seasonLabel={seasonLabel} rows={contactRows} />
      <SectionTable title="Volume + speed" seasonLabel={seasonLabel} rows={volumeRows} />
    </div>
  );
}

function SectionTable({ title, seasonLabel, rows }: { title: string; seasonLabel: string; rows: StatRow[] }): ReactElement {
  return (
    <div className="st__section">
      <Card title={title} padless>
        <table className="st__table">
          <thead>
            <tr className="st__thead-row">
              <Th align="left" style={{ paddingLeft: 20, paddingTop: 12, paddingBottom: 12 }}>Statistic</Th>
              <Th align="right" style={{ paddingTop: 12, paddingBottom: 12 }}>{seasonLabel}</Th>
              <Th align="right" style={{ paddingTop: 12, paddingBottom: 12 }}>League</Th>
              <Th align="right" style={{ paddingTop: 12, paddingBottom: 12 }}>Δ</Th>
              <Th align="left" style={{ paddingRight: 20, paddingTop: 12, paddingBottom: 12, width: 220 }}>Percentile</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <td className="st__td-stat">
                  {row.label}
                  {row.info && <StatInfo title={row.info.title} body={row.info.body} scale={row.info.scale} />}
                  {row.note && <span className="st__td-note">{row.note}</span>}
                </td>
                <td className={`st__td-value${row.hot ? ' st__td-value--hot' : ''}`}>
                  {row.value}
                </td>
                <td className="st__td-lg">{row.lg ?? '—'}</td>
                <td className={`st__td-delta st__td-delta--${row.deltaTone ?? 'none'}`}>
                  {row.delta ?? '—'}
                </td>
                <td className="st__td-pct">
                  <PctBar pct={row.pct} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ── SplitsTab ─────────────────────────────────────────────────────────────────

interface SplitRow {
  label: string;
  G: number;
  AB: number;
  H: number;
  HR: string;
  RBI: number;
  BB: number;
  K: number;
  AVG: string;
  OBP: string;
  SLG: string;
  OPS: string;
  hot?: boolean;
  delta: string;
}

function SplitTable({ title, rows }: { title: string; rows: SplitRow[] }): ReactElement {
  return (
    <div className="spt__section">
      <Card title={title} padless>
        <table className="spt__table">
          <thead>
            <tr>
              <Th align="left" style={{ paddingLeft: 18 }}>Split</Th>
              {['G', 'AB', 'H', 'HR', 'RBI', 'BB', 'K', 'AVG', 'OBP', 'SLG', 'OPS'].map(c => (
                <Th key={c}>{c}</Th>
              ))}
              <Th style={{ paddingRight: 18 }}>vs Lg</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const opsNum = parseFloat(r.OPS.replace('.', '0.'));
              const isAbove = r.hot === true;
              return (
                <tr key={i}>
                  <Td align="left" mono={false} style={{ paddingLeft: 18, fontWeight: 600 }}>{r.label}</Td>
                  <Td>{String(r.G)}</Td>
                  <Td>{String(r.AB)}</Td>
                  <Td>{String(r.H)}</Td>
                  <Td dim={r.HR === '0'}>{r.HR}</Td>
                  <Td>{String(r.RBI)}</Td>
                  <Td>{String(r.BB)}</Td>
                  <Td>{String(r.K)}</Td>
                  <Td hot>{r.AVG}</Td>
                  <Td>{r.OBP}</Td>
                  <Td>{r.SLG}</Td>
                  <Td hot>{r.OPS}</Td>
                  <Td style={{ paddingRight: 18 }}>
                    <div className="spt__vslg">
                      <VBar
                        value={opsNum}
                        max={1}
                        color={isAbove ? 'var(--color-positive)' : 'var(--color-accent)'}
                        width={50}
                      />
                      <span
                        className="spt__delta"
                        style={{ color: isAbove ? 'var(--color-positive)' : 'var(--color-text-muted)' }}
                      >
                        {r.delta}
                      </span>
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

const CATS = ['All splits', 'Handedness', 'Venue', 'Day/Night', 'Bases', 'Count', 'Pitch type'];

const SPLIT_TABLES: Array<{ cat: string; title: string; rows: SplitRow[] }> = [
  {
    cat: 'Handedness',
    title: 'Pitcher handedness',
    rows: [
      { label: 'vs LHP', G: 7,  AB: 14, H: 4,  HR: '0', RBI: 2, BB: 1, K: 3,  AVG: '.286', OBP: '.375', SLG: '.357', OPS: '.732', hot: true, delta: '+.155' },
      { label: 'vs RHP', G: 16, AB: 53, H: 12, HR: '0', RBI: 1, BB: 2, K: 10, AVG: '.226', OBP: '.250', SLG: '.283', OPS: '.533',            delta: '−.044' },
    ],
  },
  {
    cat: 'Venue',
    title: 'Venue',
    rows: [
      { label: 'Home', G: 3,  AB: 15, H: 3,  HR: '0', RBI: 0, BB: 0, K: 3,  AVG: '.200', OBP: '.200', SLG: '.200', OPS: '.400',            delta: '−.177' },
      { label: 'Away', G: 13, AB: 52, H: 13, HR: '0', RBI: 3, BB: 3, K: 10, AVG: '.250', OBP: '.298', SLG: '.327', OPS: '.625', hot: true, delta: '+.048' },
    ],
  },
  {
    cat: 'Day/Night',
    title: 'Day / Night',
    rows: [
      { label: 'Day',   G: 7, AB: 30, H: 6,  HR: '0', RBI: 2, BB: 1, K: 10, AVG: '.200', OBP: '.226', SLG: '.267', OPS: '.493',            delta: '−.084' },
      { label: 'Night', G: 9, AB: 37, H: 10, HR: '0', RBI: 1, BB: 2, K: 3,  AVG: '.270', OBP: '.317', SLG: '.324', OPS: '.641', hot: true, delta: '+.064' },
    ],
  },
  {
    cat: 'Bases',
    title: 'Baserunners',
    rows: [
      { label: 'Bases empty', G: 16, AB: 40, H: 10, HR: '0', RBI: 0, BB: 1, K: 8, AVG: '.250', OBP: '.268', SLG: '.300', OPS: '.568', delta: '−.009' },
      { label: 'Runners on',  G: 14, AB: 27, H: 6,  HR: '0', RBI: 3, BB: 2, K: 5, AVG: '.222', OBP: '.276', SLG: '.296', OPS: '.572', delta: '−.005' },
      { label: 'RISP',        G: 12, AB: 18, H: 3,  HR: '0', RBI: 3, BB: 2, K: 4, AVG: '.167', OBP: '.250', SLG: '.222', OPS: '.472', delta: '−.105' },
    ],
  },
  {
    cat: 'Count',
    title: 'Count leverage',
    rows: [
      { label: 'Ahead in count', G: 16, AB: 22, H: 8, HR: '0', RBI: 1, BB: 0, K: 1, AVG: '.364', OBP: '.364', SLG: '.500', OPS: '.864', hot: true, delta: '+.287' },
      { label: 'Even',           G: 16, AB: 28, H: 6, HR: '0', RBI: 1, BB: 0, K: 4, AVG: '.214', OBP: '.214', SLG: '.286', OPS: '.500',            delta: '−.077' },
      { label: 'Behind',         G: 14, AB: 17, H: 2, HR: '0', RBI: 1, BB: 0, K: 8, AVG: '.118', OBP: '.118', SLG: '.176', OPS: '.294',            delta: '−.283' },
    ],
  },
  {
    cat: 'Pitch type',
    title: 'Pitch type',
    rows: [
      { label: 'vs Fastball', G: 16, AB: 38, H: 11, HR: '0', RBI: 2, BB: 1, K: 4, AVG: '.289', OBP: '.325', SLG: '.368', OPS: '.693', hot: true, delta: '+.116' },
      { label: 'vs Breaking', G: 16, AB: 21, H: 3,  HR: '0', RBI: 1, BB: 1, K: 7, AVG: '.143', OBP: '.182', SLG: '.190', OPS: '.372',            delta: '−.205' },
      { label: 'vs Offspeed', G: 13, AB: 8,  H: 2,  HR: '0', RBI: 0, BB: 0, K: 2, AVG: '.250', OBP: '.250', SLG: '.375', OPS: '.625',            delta: '+.048' },
    ],
  },
];

function SplitsTab(): ReactElement {
  const [cat, setCat] = useState(0);
  const [rangeIdx, setRangeIdx] = useState(0);

  const RANGES = ['2026', 'Career', 'Last 30d'];
  const activeCat = CATS[cat] ?? 'All splits';
  const rangeLabel = RANGES[rangeIdx] ?? '2026';
  const timeframeText = rangeLabel === '2026' ? '2026 season' : rangeLabel;
  const visible = activeCat === 'All splits'
    ? SPLIT_TABLES
    : SPLIT_TABLES.filter(t => t.cat === activeCat);
  const statusText = activeCat === 'All splits'
    ? `Showing all 6 split groups · ${timeframeText}`
    : `Showing ${activeCat} · ${timeframeText}`;

  return (
    <div className="spt">
      <div className="spt__filter-row">
        <Segmented items={CATS} active={cat} onClick={setCat} />
        <Segmented items={['2026', 'Career', 'Last 30d']} active={rangeIdx} onClick={setRangeIdx} size="sm" />
      </div>
      <div className="spt__status">{statusText}</div>
      {visible.map(t => (
        <SplitTable key={t.cat} title={t.title} rows={t.rows} />
      ))}
    </div>
  );
}

// ── PitchingTab ───────────────────────────────────────────────────────────────

const PITCHES = [
  { type: 'Four-seam', share: 38, avg: '.250', slg: '.292', whiff: '17%', color: '#dc2626' },
  { type: 'Sinker',    share: 17, avg: '.286', slg: '.357', whiff: '9%',  color: '#ea580c' },
  { type: 'Slider',    share: 19, avg: '.143', slg: '.214', whiff: '38%', color: '#0891b2' },
  { type: 'Curveball', share: 9,  avg: '.200', slg: '.200', whiff: '24%', color: '#3b82f6' },
  { type: 'Changeup',  share: 11, avg: '.333', slg: '.500', whiff: '14%', color: '#16a34a' },
  { type: 'Cutter',    share: 6,  avg: '.000', slg: '.000', whiff: '50%', color: '#a3a3a3' },
];

const ZONE_DATA  = [0.18, 0.42, 0.12, 0.28, 0.84, 0.58, 0.04, 0.21, 0.15];
const ZONE_NAMES = ['up & in', 'up', 'up & away', 'middle in', 'middle-middle', 'middle away', 'down & in', 'down', 'down & away'];
const ZONE_HI = ZONE_DATA.reduce((hi, v, i) => (v > ZONE_DATA[hi] ? i : hi), 0);
const ZONE_LO = ZONE_DATA.reduce((lo, v, i) => (v < ZONE_DATA[lo] ? i : lo), 0);
function fmtSlg(v: number): string { return v.toFixed(3).replace(/^0/, ''); }

const COUNTS_ATTACKED = [
  { c: '0-2',    p: 'Slider',  thrown: '38%', k: '31%',     state: false },
  { c: '1-2',    p: 'Slider',  thrown: '34%', k: '27%',     state: false },
  { c: 'Ahead',  p: 'Sinker',  thrown: '24%', k: undefined, state: true  },
  { c: '2-2',    p: '4-Seam',  thrown: '29%', k: '22%',     state: false },
  { c: '3-2',    p: '4-Seam',  thrown: '41%', k: '24%',     state: false },
  { c: 'Behind', p: '4-Seam',  thrown: '52%', k: undefined, state: true  },
];

function PitchingTab({ name, pos }: { name: string; pos?: string | null }): ReactElement {
  const [filterIdx, setFilterIdx] = useState(0);

  if (pos === 'P') {
    return (
      <div className="coming-soon">
        <span className="coming-soon__label">Pitching</span>
        <span className="coming-soon__sub">Pitcher arsenal — coming separately</span>
      </div>
    );
  }

  return (
    <div className="pt">
      <div className="pt__header">
        <div>
          <h2 className="pt__title">How pitchers attack {name}</h2>
          <div className="pt__subtitle">314 pitches seen · 2026 season</div>
        </div>
        <Segmented
          items={['All', 'vs LHP', 'vs RHP', 'In strike zone', 'Outside zone']}
          active={filterIdx}
          onClick={setFilterIdx}
        />
      </div>

      {/* Top row: Pitch mix · Performance · Damage by location */}
      <div className="pt__top-grid">
        <Card title="Pitch mix">
          <div className="pt__mix-inner">
            <Donut
              data={PITCHES.map(p => ({ value: p.share, color: p.color }))}
              total={314}
              size={170}
            />
            <div className="pt__legend">
              {PITCHES.map(p => (
                <div key={p.type} className="pt__legend-row">
                  <span className="pt__legend-dot" style={{ background: p.color }} />
                  <span className="pt__legend-name">{p.type}</span>
                  <span className="pt__legend-pct">{p.share}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card title="Performance vs pitch type" padless>
          <table className="pt__table">
            <thead>
              <tr>
                <Th align="left" style={{ paddingLeft: 16 }}>Pitch</Th>
                <Th>AVG</Th>
                <Th style={{ width: 140 }}>SLG</Th>
                <Th style={{ paddingRight: 16 }}>Whiff</Th>
              </tr>
            </thead>
            <tbody>
              {PITCHES.map(p => {
                const avgNum = parseFloat(p.avg.replace('.', '0.'));
                const slgNum = parseFloat(p.slg.replace('.', '0.'));
                return (
                  <tr key={p.type}>
                    <Td align="left" mono={false} style={{ paddingLeft: 16, fontWeight: 600 }}>
                      <span className="pt__pitch-label">
                        <span className="pt__pitch-dot" style={{ background: p.color }} />
                        {p.type}
                      </span>
                    </Td>
                    <Td hot={avgNum > 0.25}>{p.avg}</Td>
                    <Td style={{ width: 140 }}>
                      <div className="pt__slg-cell">
                        <span className="pt__slg-val">{p.slg}</span>
                        <div className="pt__slg-bar-track">
                          <div
                            className="pt__slg-bar-fill"
                            style={{
                              width: `${Math.min(100, (slgNum / 0.5) * 100)}%`,
                              background: p.color,
                            }}
                          />
                        </div>
                      </div>
                    </Td>
                    <Td style={{ paddingRight: 16 }}>{p.whiff}</Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>

        <Card title="Damage by location" subtitle="SLG · 2026">
          <div className="pt__damage-row">
            <HotZone data={ZONE_DATA} size={150} />
            <div className="pt__damage-right">
              <div>
                <span className="pt__damage-scale-label">SLG scale</span>
                <div className="pt__slg-scale" />
                <div className="pt__slg-scale-labels">
                  <span>.000</span><span>.840+</span>
                </div>
              </div>
              <div className="pt__extremes">
                <div className="pt__extreme-row">
                  <span className="pt__extreme-label">Hottest</span>
                  <span className="pt__extreme-vals">
                    <span className="pt__extreme-val pt__extreme-val--hot">{fmtSlg(ZONE_DATA[ZONE_HI])}</span>
                    <span className="pt__extreme-zone">{ZONE_NAMES[ZONE_HI]}</span>
                  </span>
                </div>
                <div className="pt__extreme-row">
                  <span className="pt__extreme-label">Coldest</span>
                  <span className="pt__extreme-vals">
                    <span className="pt__extreme-val pt__extreme-val--cold">{fmtSlg(ZONE_DATA[ZONE_LO])}</span>
                    <span className="pt__extreme-zone">{ZONE_NAMES[ZONE_LO]}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="pt__zone-note">
            Pitchers throw <span className="pt__zone-num">62%</span> outside the strike zone, exploiting low/away weakness.
          </div>
        </Card>
      </div>

      {/* Bottom row: Handedness · Counts attacked */}
      <div className="pt__bottom-grid">
        <Card title="By pitcher handedness" padless>
          <table className="pt__table">
            <thead>
              <tr>
                <Th align="left" style={{ paddingLeft: 16 }}>vs</Th>
                <Th>FB%<StatInfo title="Fastball %" body="Share of pitches that are fastballs — four-seam, sinker, cutter. FB% + BRK% + OS% add up to 100%." scale="Higher = more fastballs" /></Th>
                <Th>BRK%<StatInfo title="Breaking-ball %" body="Share that are breaking balls — sliders and curveballs, pitches with sharp lateral or downward break." scale="Higher = more breaking stuff" /></Th>
                <Th>OS%<StatInfo title="Offspeed %" body="Share that are offspeed — changeups and splitters, thrown slower to disrupt timing." scale="Higher = more offspeed" /></Th>
                <Th>Zone%<StatInfo align="right" title="Zone %" body="Share of pitches thrown inside the strike zone — how often pitchers challenge him versus working the edges." scale="Higher = more in-zone" /></Th>
                <Th>First-pitch strike<StatInfo align="right" title="First-pitch strike %" body="Share of plate appearances where pitch one is a strike (called, swinging, or in play). Getting ahead 0-1 tilts the count to the pitcher." scale="Higher = pitcher ahead more often" /></Th>
                <Th style={{ paddingRight: 16 }}>Put-away<StatInfo align="right" title="Put-away %" body="Of two-strike counts, the share that end in a strikeout — how often pitchers finish him off once they reach two strikes." scale="Higher = more two-strike K's" /></Th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <Td align="left" mono={false} style={{ paddingLeft: 16, fontWeight: 600 }}>LHP</Td>
                <Td>49%</Td>
                <Td>27%</Td>
                <Td>24%</Td>
                <Td>52%</Td>
                <Td>65%</Td>
                <Td style={{ paddingRight: 16 }}>22%</Td>
              </tr>
              <tr>
                <Td align="left" mono={false} style={{ paddingLeft: 16, fontWeight: 600 }}>RHP</Td>
                <Td>57%</Td>
                <Td>28%</Td>
                <Td>15%</Td>
                <Td>47%</Td>
                <Td>61%</Td>
                <Td style={{ paddingRight: 16 }}>28%</Td>
              </tr>
            </tbody>
          </table>
        </Card>

        <Card title="Counts attacked" subtitle="Two-strike put-away (solid) · go-to by count state (dashed)">
          <div className="pt__attack-grid">
            {COUNTS_ATTACKED.map(({ c, p, thrown, k, state }) => (
              <div key={c} className={`pt__count-cell${state ? ' pt__count-cell--state' : ''}`}>
                <div className="pt__count-header">
                  <span className="pt__count-label">{c}</span>
                  <span className="pt__count-name">{p}</span>
                </div>
                <div className="pt__count-stats">
                  <div>
                    <div className="pt__count-stat-val">{thrown}</div>
                    <span className="pt__count-stat-sub">thrown</span>
                  </div>
                  {!state && k != null && (
                    <div>
                      <div className="pt__count-stat-val pt__count-stat-val--k">{k}</div>
                      <span className="pt__count-stat-sub">put-away K</span>
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

// ── HistoryTab data (mock — wire real API after design sign-off) ──────────────

const HIST_SEASONS = ['2026', '2025', '2024', '2023', '2022'];

const HIST_GAMES: Record<string, string[][]> = {
  '2026': [
    ['05-24','W','@ Cubs',    '1-4','0','2','0','3','.239','1-for-4 with K'],
    ['05-23','W','@ Cubs',    '0-4','0','0','0','0','.238','Hit by pitch · 0-for-4'],
    ['05-22','W','@ Cubs',    '1-5','0','0','0','1','.254','Single · K'],
    ['05-20','L','@ Twins',   '1-4','0','0','0','3','.259','3 K · cold'],
    ['05-19','W','@ Twins',   '2-4','0','0','0','0','.260','2 hits'],
    ['05-18','L','@ Twins',   '0-3','0','1','0','0','.239','RBI groundout'],
    ['04-11','L','@ Mariners','1-3','0','0','0','0','.256',''],
    ['04-10','L','@ Mariners','1-5','0','0','0','1','.250','IL stint started'],
    ['04-08','L','@ Rockies', '1-5','0','0','0','1','.257',''],
    ['04-07','L','@ Rockies', '0-3','0','0','1','0','.267','Walk · 2 fly outs'],
  ],
  '2025': [
    ['09-28','W','vs Mariners','2-4','1','3','0','1','.295','HR · 2 RBI'],
    ['09-27','W','vs Mariners','1-4','0','1','0','0','.294','RBI single'],
    ['09-26','L','vs Mariners','2-5','0','0','1','1','.295','2 hits'],
    ['09-24','W','@ Angels',  '3-5','1','2','0','0','.296','3-hit night'],
    ['09-23','W','@ Angels',  '1-4','0','0','1','1','.293',''],
    ['09-22','L','@ Angels',  '0-4','0','0','0','2','.292','0-for-4'],
    ['09-20','W','vs Rangers','2-3','0','1','1','0','.294','2 hits · BB'],
    ['09-19','W','vs Rangers','1-4','1','2','0','1','.293','solo HR'],
    ['09-18','L','vs Rangers','1-5','0','1','0','2','.292',''],
    ['09-16','W','@ Athletics','2-4','0','0','0','0','.293','2 singles'],
  ],
  '2024': [
    ['09-29','W','vs Guardians','1-4','0','1','0','1','.285',''],
    ['09-28','L','vs Guardians','0-3','0','0','1','1','.284','quiet night'],
    ['09-27','W','vs Guardians','2-4','1','3','0','0','.286','HR · 3 RBI'],
    ['09-25','W','@ Yankees',  '1-4','0','0','0','2','.285',''],
    ['09-24','L','@ Yankees',  '1-5','0','1','0','1','.284','RBI double'],
    ['09-22','W','@ Orioles',  '2-4','0','0','0','0','.285','2 hits'],
    ['09-21','W','@ Orioles',  '3-5','1','2','0','1','.287','3 hits'],
    ['09-20','L','@ Orioles',  '0-4','0','0','1','2','.285',''],
    ['09-18','W','vs Rangers', '1-3','0','1','1','0','.285','RBI single'],
    ['09-17','W','vs Rangers', '2-4','0','0','0','1','.286',''],
  ],
  '2023': [
    ['09-30','L','vs Mariners','1-4','0','0','0','1','.263',''],
    ['09-29','W','vs Mariners','0-4','0','0','0','2','.262','0-for-4'],
    ['09-27','L','@ Royals',  '1-5','0','1','0','1','.263',''],
    ['09-26','W','@ Royals',  '2-4','1','2','0','0','.265','HR'],
    ['09-24','L','@ D-backs', '1-4','0','0','1','1','.264',''],
    ['09-23','W','@ D-backs', '1-3','0','1','1','0','.264','RBI single'],
    ['09-21','L','vs Royals', '0-4','0','0','0','2','.262','cold'],
    ['09-20','W','vs Royals', '2-5','0','1','0','1','.263','2 hits'],
    ['09-18','W','vs Angels', '1-4','1','3','0','0','.264','3 RBI'],
    ['09-17','L','vs Angels', '1-4','0','0','0','1','.263',''],
  ],
  '2022': [
    ['10-05','W','vs Phillies','2-4','1','2','0','1','.253','rookie HR'],
    ['10-04','W','vs Phillies','1-4','0','0','0','0','.252',''],
    ['10-02','L','@ Rays',    '1-5','0','1','0','2','.253',''],
    ['10-01','W','@ Rays',    '2-4','0','0','1','0','.254','2 hits · BB'],
    ['09-29','W','@ Orioles', '1-4','0','1','0','1','.253','RBI'],
    ['09-28','L','@ Orioles', '0-3','0','0','1','1','.252',''],
    ['09-26','W','vs D-backs','3-5','1','3','0','0','.255','3-hit · HR'],
    ['09-25','L','vs D-backs','1-4','0','0','0','2','.253',''],
    ['09-23','W','vs Orioles','2-4','0','1','0','0','.254','2 singles'],
    ['09-22','W','vs Orioles','1-3','0','0','1','1','.253',''],
  ],
};

interface MilestoneRow { date: string; text: string; sub: string; tag: 'Award' | 'Record' | 'Injury' | null; }
const HIST_MILESTONES: MilestoneRow[] = [
  { date: 'Apr 6, 2022',  text: 'MLB debut',                                      sub: 'Houston Astros · shortstop',    tag: null },
  { date: 'Nov 5, 2022',  text: 'World Series MVP',                               sub: 'vs Philadelphia · .400 series', tag: 'Award' },
  { date: 'Oct 2022',     text: 'Most hits by a rookie in a single postseason',   sub: 'MLB record',                    tag: 'Record' },
  { date: '2022',         text: 'AL Gold Glove — Shortstop',                      sub: 'Rookie campaign',               tag: 'Award' },
  { date: '2024',         text: 'First 20-steal season',                          sub: '20 SB · career high',           tag: null },
  { date: 'Apr 18, 2026', text: 'Placed on 10-day IL',                            sub: 'Left oblique strain',           tag: 'Injury' },
  { date: '2026',         text: '14 hits from 500 career',                        sub: 'On pace by midseason',          tag: null },
];

interface CareerRow { yr: string; g: number; ab: number; h: number; hr: number; rbi: number; sb: number; bb: number; k: number; avg: string; obp: string; slg: string; ops: string; opsN: number; live?: boolean; }
const HIST_CAREER: CareerRow[] = [
  { yr:'2022', g:136, ab:558, h:141, hr:22, rbi:63,  sb:11, bb:22, k:135, avg:'.253', obp:'.289', slg:'.426', ops:'.715', opsN:0.715 },
  { yr:'2023', g:158, ab:634, h:167, hr:10, rbi:52,  sb:13, bb:36, k:136, avg:'.263', obp:'.324', slg:'.381', ops:'.705', opsN:0.705 },
  { yr:'2024', g:152, ab:597, h:170, hr:15, rbi:70,  sb:20, bb:40, k:128, avg:'.285', obp:'.336', slg:'.396', ops:'.732', opsN:0.732 },
  { yr:'2025', g:151, ab:580, h:171, hr:17, rbi:75,  sb:18, bb:44, k:120, avg:'.295', obp:'.348', slg:'.420', ops:'.768', opsN:0.768 },
  { yr:'2026', g:16,  ab:67,  h:16,  hr:1,  rbi:6,   sb:2,  bb:3,  k:13,  avg:'.239', obp:'.278', slg:'.299', ops:'.577', opsN:0.577, live:true },
];
const HIST_CAREER_TOT = { g:613, ab:2436, h:665, hr:65, rbi:266, sb:64, bb:145, k:532, avg:'.273', obp:'.315', slg:'.398', ops:'.713' };

interface VsRow { tm: string; g: number; ab: number; h: number; hr: number; rbi: number; avg: string; obp: string; slg: string; ops: string; }
const HIST_VS: VsRow[] = [
  { tm:'NYY', g:24, ab:92,  h:27, hr:4, rbi:14, avg:'.293', obp:'.340', slg:'.500', ops:'.840' },
  { tm:'CLE', g:28, ab:104, h:31, hr:3, rbi:13, avg:'.298', obp:'.337', slg:'.452', ops:'.789' },
  { tm:'TOR', g:30, ab:118, h:34, hr:4, rbi:16, avg:'.288', obp:'.331', slg:'.458', ops:'.789' },
  { tm:'BAL', g:34, ab:131, h:35, hr:5, rbi:18, avg:'.267', obp:'.312', slg:'.443', ops:'.755' },
  { tm:'TBR', g:32, ab:121, h:30, hr:3, rbi:14, avg:'.248', obp:'.301', slg:'.388', ops:'.689' },
  { tm:'DET', g:26, ab:98,  h:24, hr:2, rbi:10, avg:'.245', obp:'.296', slg:'.378', ops:'.674' },
  { tm:'PHI', g:9,  ab:35,  h:11, hr:2, rbi:7,  avg:'.314', obp:'.359', slg:'.571', ops:'.930' },
  { tm:'LAD', g:7,  ab:27,  h:9,  hr:2, rbi:6,  avg:'.333', obp:'.379', slg:'.630', ops:'1.009' },
  { tm:'ATL', g:6,  ab:23,  h:6,  hr:1, rbi:3,  avg:'.261', obp:'.296', slg:'.435', ops:'.731' },
  { tm:'CHC', g:7,  ab:26,  h:7,  hr:0, rbi:2,  avg:'.269', obp:'.310', slg:'.346', ops:'.656' },
  { tm:'PIT', g:6,  ab:22,  h:5,  hr:1, rbi:3,  avg:'.227', obp:'.292', slg:'.409', ops:'.701' },
];

interface PostRow { yr: string; round: string; tm: string; g: number; ab: number; h: number; hr: number; rbi: number; avg: string; ops: string; honor?: string; }
const HIST_POST: PostRow[] = [
  { yr:'2022', round:'ALDS', tm:'CLE', g:3, ab:11, h:4,  hr:1, rbi:2, avg:'.364', ops:'.971' },
  { yr:'2022', round:'ALCS', tm:'NYY', g:4, ab:15, h:5,  hr:1, rbi:3, avg:'.333', ops:'.882', honor:'ALCS MVP' },
  { yr:'2022', round:'WS',   tm:'PHI', g:6, ab:25, h:10, hr:1, rbi:3, avg:'.400', ops:'.913', honor:'WS MVP' },
  { yr:'2024', round:'ALDS', tm:'DET', g:4, ab:16, h:4,  hr:0, rbi:1, avg:'.250', ops:'.611' },
];
const HIST_POST_TOT = { g:17, ab:67, h:23, hr:3, rbi:9, avg:'.343', ops:'.870' };

// ── HistoryTab ────────────────────────────────────────────────────────────────

function HistoryTab(): ReactElement {
  const [sub,     setSub]     = useState(0);
  const [season,  setSeason]  = useState(0);
  const [vsSort,  setVsSort]  = useState(0);

  const games = HIST_GAMES[HIST_SEASONS[season]];

  const vsSorted = HIST_VS.slice().sort((a, b) => {
    if (vsSort === 1) return b.g - a.g;
    if (vsSort === 2) return (TEAMS[a.tm]?.short ?? a.tm).localeCompare(TEAMS[b.tm]?.short ?? b.tm);
    return parseFloat(b.ops) - parseFloat(a.ops);
  });

  function Honor({ children }: { children: string }): ReactElement {
    return <Pill tone="highlight" style={{ padding: '2px 9px', fontSize: 10 }}>{children}</Pill>;
  }

  function PStat({ label, value, hot }: { label: string; value: string | number; hot?: boolean }): ReactElement {
    return (
      <div className="ht__pstat">
        <span className="ht__pstat-label">{label}</span>
        <div className={`ht__pstat-val${hot ? ' ht__pstat-val--hot' : ''}`}>{value}</div>
      </div>
    );
  }

  // ── Game log ──────────────────────────────────────────────────────────────
  const gameLog = (
    <Card title="Game log" subtitle={`Last 10 games · ${HIST_SEASONS[season]} season`} padless>
      <table className="pt__table">
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
              <Td align="left" mono={false} style={{ paddingRight: 18, color: 'var(--color-text-muted)', fontSize: 12 }}>{g[9]}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );

  // ── Career ────────────────────────────────────────────────────────────────
  const careerView = (
    <div>
      <Card title="Career arc" subtitle="OPS by year" className="ht__arc-card-wrap">
        <div className="ht__arc-grid">
          {HIST_CAREER.map(y => (
            <div key={y.yr} className={`ht__arc-card${y.live ? ' ht__arc-card--live' : ''}`}>
              <div className="ht__arc-card-top">
                <span className="ht__eyebrow">{y.yr}</span>
                {y.live && <Pill tone="live" style={{ padding: '1px 7px', fontSize: 9 }}>CURRENT</Pill>}
              </div>
              <div className={`ht__arc-ops${y.live ? ' ht__arc-ops--live' : ''}`}>{y.ops}</div>
              <div className="ht__arc-bar-track">
                <div
                  className={`ht__arc-bar-fill${y.live ? ' ht__arc-bar-fill--live' : ''}`}
                  style={{ width: `${(y.opsN / 0.9) * 100}%` }}
                />
              </div>
              <div className="ht__arc-slash">{`${y.avg}/${y.obp}/${y.slg}`}</div>
              <div className="ht__arc-gp">{y.g} GP</div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Season by season" subtitle="Regular season · with career totals" padless className="ht__season-table">
        <table className="pt__table">
          <thead>
            <tr>
              <Th align="left" style={{ paddingLeft: 18 }}>Season</Th>
              <Th>G</Th><Th>AB</Th><Th>H</Th><Th>HR</Th><Th>RBI</Th><Th>SB</Th><Th>BB</Th><Th>K</Th>
              <Th>AVG</Th><Th>OBP</Th><Th>SLG</Th><Th style={{ paddingRight: 18 }}>OPS</Th>
            </tr>
          </thead>
          <tbody>
            {HIST_CAREER.map(y => (
              <tr key={y.yr}>
                <Td align="left" style={{ paddingLeft: 18, fontWeight: 600 }} mono={false}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    {y.yr}
                    {y.live && <Pill tone="live" style={{ padding: '1px 7px', fontSize: 9 }}>NOW</Pill>}
                  </span>
                </Td>
                <Td>{y.g}</Td><Td>{y.ab}</Td><Td>{y.h}</Td>
                <Td dim={y.hr === 0}>{y.hr}</Td><Td>{y.rbi}</Td>
                <Td dim={y.sb === 0}>{y.sb}</Td><Td>{y.bb}</Td><Td>{y.k}</Td>
                <Td>{y.avg}</Td><Td>{y.obp}</Td><Td>{y.slg}</Td>
                <Td hot={y.opsN >= 0.75} style={{ paddingRight: 18 }}>{y.ops}</Td>
              </tr>
            ))}
            <tr className="ht__totals-row">
              <Td align="left" style={{ paddingLeft: 18, fontWeight: 700 }} mono={false}>Career</Td>
              <Td style={{ fontWeight: 700 }}>{HIST_CAREER_TOT.g}</Td>
              <Td style={{ fontWeight: 700 }}>{HIST_CAREER_TOT.ab}</Td>
              <Td style={{ fontWeight: 700 }}>{HIST_CAREER_TOT.h}</Td>
              <Td style={{ fontWeight: 700 }}>{HIST_CAREER_TOT.hr}</Td>
              <Td style={{ fontWeight: 700 }}>{HIST_CAREER_TOT.rbi}</Td>
              <Td style={{ fontWeight: 700 }}>{HIST_CAREER_TOT.sb}</Td>
              <Td style={{ fontWeight: 700 }}>{HIST_CAREER_TOT.bb}</Td>
              <Td style={{ fontWeight: 700 }}>{HIST_CAREER_TOT.k}</Td>
              <Td style={{ fontWeight: 700 }}>{HIST_CAREER_TOT.avg}</Td>
              <Td style={{ fontWeight: 700 }}>{HIST_CAREER_TOT.obp}</Td>
              <Td style={{ fontWeight: 700 }}>{HIST_CAREER_TOT.slg}</Td>
              <Td style={{ fontWeight: 700, paddingRight: 18 }}>{HIST_CAREER_TOT.ops}</Td>
            </tr>
          </tbody>
        </table>
      </Card>

      <Card title="Milestones & transactions" subtitle="Career timeline" className="ht__milestone-card">
        <div>
          {HIST_MILESTONES.map((m, i) => (
            <div key={i} className={`ht__milestone-row${i > 0 ? ' ht__milestone-row--border' : ''}`}>
              <div className="ht__milestone-date">{m.date}</div>
              <div>
                <div className="ht__milestone-text">{m.text}</div>
                <div className="ht__milestone-sub">{m.sub}</div>
              </div>
              {m.tag != null
                ? <Pill
                    tone={m.tag === 'Injury' ? 'live' : m.tag === 'Record' ? 'info' : 'highlight'}
                    style={{ padding: '2px 9px', fontSize: 10 }}
                  >{m.tag}</Pill>
                : <span className="ht__milestone-dash">—</span>}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );

  // ── vs Team ───────────────────────────────────────────────────────────────
  const vsTeamView = (
    <Card
      title="Career vs opponent"
      subtitle={`Regular season · ${HIST_VS.length} opponents`}
      action={<Segmented items={['OPS', 'Games', 'Team']} active={vsSort} onClick={setVsSort} size="sm" />}
      padless
    >
      <table className="pt__table">
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
                  {TEAMS[t.tm] && <TeamDot team={TEAMS[t.tm]} size={20} />}
                  {TEAMS[t.tm]?.short ?? t.tm}
                </span>
              </Td>
              <Td>{t.g}</Td><Td>{t.ab}</Td><Td>{t.h}</Td>
              <Td dim={t.hr === 0}>{t.hr}</Td><Td>{t.rbi}</Td>
              <Td>{t.avg}</Td><Td>{t.obp}</Td><Td>{t.slg}</Td>
              <Td hot={parseFloat(t.ops) >= 0.8} style={{ paddingRight: 18 }}>{t.ops}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );

  // ── Postseason ────────────────────────────────────────────────────────────
  const postEmpty = (
    <Card title="Postseason career">
      <div className="ht__post-empty">
        <div className="ht__post-empty-title">No postseason appearances</div>
        <div className="ht__post-empty-sub">This player's clubs haven't reached the playoffs in a season on record.</div>
      </div>
    </Card>
  );

  const postView = HIST_POST.length === 0 ? postEmpty : (
    <div>
      <Card title="Postseason career" subtitle="Houston Astros · 4 series" className="ht__post-card">
        <div className="ht__honors">
          <Honor>2022 World Series MVP</Honor>
          <Honor>2022 ALCS MVP</Honor>
        </div>
        <div className="ht__pstat-row">
          <PStat label="Games"  value={HIST_POST_TOT.g} />
          <PStat label="AVG"    value={HIST_POST_TOT.avg} hot />
          <PStat label="HR"     value={HIST_POST_TOT.hr} />
          <PStat label="RBI"    value={HIST_POST_TOT.rbi} />
          <PStat label="OPS"    value={HIST_POST_TOT.ops} hot />
        </div>
      </Card>

      <Card title="By series" padless>
        <table className="pt__table">
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
            {HIST_POST.map((p, i) => (
              <tr key={i}>
                <Td align="left" style={{ paddingLeft: 18 }} dim>{p.yr}</Td>
                <Td align="left" mono={false} style={{ fontWeight: 600 }}>{p.round}</Td>
                <Td align="left" mono={false}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    {TEAMS[p.tm] && <TeamDot team={TEAMS[p.tm]} size={18} />}
                    {TEAMS[p.tm]?.short ?? p.tm}
                  </span>
                </Td>
                <Td>{p.g}</Td><Td>{p.ab}</Td><Td>{p.h}</Td>
                <Td dim={p.hr === 0}>{p.hr}</Td><Td>{p.rbi}</Td>
                <Td hot={parseFloat(p.avg) >= 0.3}>{p.avg}</Td><Td>{p.ops}</Td>
                <Td align="left" mono={false} style={{ paddingRight: 18 }}>
                  {p.honor != null
                    ? <Honor>{p.honor}</Honor>
                    : <span style={{ color: 'var(--color-text-faint)' }}>—</span>}
                </Td>
              </tr>
            ))}
            <tr className="ht__totals-row">
              <Td align="left" style={{ paddingLeft: 18, fontWeight: 700 }} mono={false}>Career</Td>
              <Td /><Td />
              <Td style={{ fontWeight: 700 }}>{HIST_POST_TOT.g}</Td>
              <Td style={{ fontWeight: 700 }}>{HIST_POST_TOT.ab}</Td>
              <Td style={{ fontWeight: 700 }}>{HIST_POST_TOT.h}</Td>
              <Td style={{ fontWeight: 700 }}>{HIST_POST_TOT.hr}</Td>
              <Td style={{ fontWeight: 700 }}>{HIST_POST_TOT.rbi}</Td>
              <Td style={{ fontWeight: 700 }}>{HIST_POST_TOT.avg}</Td>
              <Td style={{ fontWeight: 700 }}>{HIST_POST_TOT.ops}</Td>
              <Td style={{ paddingRight: 18 }} />
            </tr>
          </tbody>
        </table>
      </Card>
    </div>
  );

  return (
    <div className="ht">
      <div className="ht__header">
        <Segmented items={['Game log', 'Career', 'vs Team', 'Postseason']} active={sub} onClick={setSub} />
        {sub === 0 && (
          <Segmented items={HIST_SEASONS} active={season} onClick={setSeason} size="sm" />
        )}
      </div>
      {sub === 0 && gameLog}
      {sub === 1 && careerView}
      {sub === 2 && vsTeamView}
      {sub === 3 && postView}
    </div>
  );
}

// ── Coming soon placeholder ───────────────────────────────────────────────────

function ComingSoon({ tab }: { tab: string }): ReactElement {
  return (
    <div className="coming-soon">
      <span className="coming-soon__label">{tab}</span>
      <span className="coming-soon__sub">Coming soon</span>
    </div>
  );
}

// ── PlayerPage ────────────────────────────────────────────────────────────────

type Params = { mlbId?: string };
type PlayerTab = 0 | 1 | 2 | 3 | 4 | 5;

export default function PlayerPage(): ReactElement {
  const { mlbId } = useParams<Params>();
  const navigate = useNavigate();
  const location = useLocation();
  const fromGame = (location.state as { fromGame?: string } | null)?.fromGame ?? null;

  const [player, setPlayer] = useState<AnyObj | null>(null);
  const [overview, setOverview] = useState<BatterOverviewDto | null>(null);
  const [drilldown, setDrilldown] = useState<PlayerDrilldownDto | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<PlayerTab>(0);

  const decodedId = useMemo(() => {
    if (mlbId == null) return '';
    try { return decodeURIComponent(mlbId); } catch { return mlbId; }
  }, [mlbId]);

  // Inject context-aware return button into global topbar
  const { set: setTopbarReturn } = useTopbarReturn();
  useEffect(() => {
    const label = fromGame != null ? '← Back to game' : '← Today\'s games';
    const target = fromGame != null ? `/game/${fromGame}` : '/';
    setTopbarReturn(
      <button type="button" className="app-back-button" onClick={() => navigate(target)}>
        {label}
      </button>
    );
    return () => setTopbarReturn(null);
  }, [navigate, setTopbarReturn, fromGame]);

  // Fetch player bio
  useEffect(() => {
    if (decodedId === '') return;
    const run = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/players/${decodedId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setPlayer((await res.json()) as AnyObj);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed');
      } finally {
        setIsLoading(false);
      }
    };
    void run();
  }, [decodedId]);

  // Fetch batter overview (headline stats, today)
  useEffect(() => {
    if (decodedId === '') return;
    const run = async () => {
      try {
        const res = await fetch(`/api/players/${decodedId}/overview/batter`);
        if (!res.ok) return;
        setOverview((await res.json()) as BatterOverviewDto);
      } catch { /* show —'s */ }
    };
    void run();
  }, [decodedId]);

  // Fetch drilldown eagerly (needed for Overview "Last 5 games" and History)
  useEffect(() => {
    if (decodedId === '') return;
    const run = async () => {
      try {
        const res = await fetch(`/api/players/${decodedId}/drilldown`);
        if (!res.ok) return;
        setDrilldown((await res.json()) as PlayerDrilldownDto);
      } catch { /* optional */ }
    };
    void run();
  }, [decodedId]);

  // Derive person view from player payload
  const view = useMemo(() => {
    const p = pickPerson(player);
    if (p == null) return null;

    const pos    = (p.primaryPosition as AnyObj | null) ?? null;
    const team   = (p.currentTeam    as AnyObj | null) ?? null;
    const batSide = (p.batSide       as AnyObj | null) ?? null;
    const pitch   = (p.pitchHand     as AnyObj | null) ?? null;

    return {
      name:    asStr(p.fullName)  ?? '—',
      number:  asStr(p.primaryNumber),
      pos:     asStr(pos?.abbreviation) ?? asStr(pos?.name),
      teamFull: asStr(team?.name),
      teamId:  asNum(team?.id),
      fromCity: asStr(p.birthCity) && asStr(p.birthCountry)
        ? `${asStr(p.birthCity)}, ${asStr(p.birthCountry)}`
        : asStr(p.birthCity) ?? asStr(p.birthCountry),
      age:     asNum(p.currentAge),
      bats:    asStr(batSide?.description) ?? asStr(batSide?.code),
      throws:  asStr(pitch?.description) ?? asStr(pitch?.code),
      height:  asStr(p.height),
      weight:  asNum(p.weight),
      debut:   formatDebut(asStr(p.mlbDebutDate)),
    };
  }, [player]);

  // Roster subtitle for PageTitle
  const rosterSubtitle = useMemo(() => {
    if (view == null) return '';
    return [
      'Roster',
      view.number ? `#${view.number}` : null,
      view.teamFull,
    ].filter(Boolean).join(' · ');
  }, [view]);

  const batterIdNum = useMemo(() => {
    const n = parseInt(decodedId, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [decodedId]);

  // Slash line from overview or season stats
  const slashLine = overview != null
    ? `${overview.headline.battingAverage} / ${overview.headline.onBasePercentage} / ${overview.headline.sluggingPercentage}`
    : '— / — / —';

  if (decodedId === '') {
    return <section className="player-page"><p className="player-page__error">Missing player id.</p></section>;
  }

  if (isLoading) {
    return <section className="player-page"><p className="player-page__status">Loading…</p></section>;
  }

  if (error) {
    return <section className="player-page"><p className="player-page__error">Error: {error}</p></section>;
  }

  if (view == null) {
    return <section className="player-page"><p className="player-page__status">No data.</p></section>;
  }

  const tabContent = (): ReactElement => {
    if (activeTab === 5) return <UpcomingTab batterId={batterIdNum} batterName={view.name} />;
    if (overview == null) {
      return <p className="player-page__status">Loading stats…</p>;
    }
    switch (activeTab) {
      case 0: return <OverviewTab overview={overview} drilldown={drilldown} />;
      case 1: return <StatsTab overview={overview} />;
      case 2: return <SplitsTab />;
      case 3: return <PitchingTab name={view.name} pos={view.pos} />;
      case 4: return <HistoryTab />;
      default: return <ComingSoon tab="—" />;
    }
  };

  return (
    <section className="player-page">
      <PageTitle
        title="Player"
        subtitle={rosterSubtitle}
        className="game-page__title"
      />

      <PlayerHero
        mlbId={decodedId}
        name={view.name}
        teamId={view.teamId}
        teamFull={view.teamFull}
        position={view.pos}
        jerseyNumber={view.number}
        bats={view.bats}
        throws={view.throws}
        age={view.age}
        fromCity={view.fromCity}
        debut={view.debut}
        height={view.height}
        weight={view.weight}
        slashLine={slashLine}
        ops={overview?.headline.onBasePlusSlugging ?? null}
        season={overview?.season ?? null}
        gamesPlayed={overview?.secondary.games ?? null}
        today={overview?.today ?? null}
        activeTab={activeTab}
        onTab={(i) => setActiveTab(i as PlayerTab)}
      />

      <div className="player-page__tab-content">
        {tabContent()}
      </div>
    </section>
  );
}

// ── helpers (module-level) ────────────────────────────────────────────────────

function pickPerson(payload: AnyObj | null): AnyObj | null {
  if (payload == null) return null;
  const data = payload.data as unknown;
  if (data != null && typeof data === 'object') {
    const people = (data as AnyObj).people as unknown;
    if (Array.isArray(people) && people.length > 0) {
      const p0 = people[0] as unknown;
      if (p0 != null && typeof p0 === 'object') return p0 as AnyObj;
    }
  }
  const people = payload.people as unknown;
  if (Array.isArray(people) && people.length > 0) {
    const p0 = people[0] as unknown;
    if (p0 != null && typeof p0 === 'object') return p0 as AnyObj;
  }
  return null;
}
