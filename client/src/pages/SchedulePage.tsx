import './SchedulePage.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import type { StandingTeamDto } from '@bitslinger21/baseball-realtime-client';
import { standingsApi } from '../api/baseballApiClient';
import { TEAMS } from '../utils/teams';
import { PageTitle } from '../components/primitives/PageTitle';
import { PageMenu } from '../components/primitives/PageMenu';

const CURRENT_SEASON = String(new Date().getFullYear());

// ── Types ──────────────────────────────────────────────────────────────────────

interface SeasonGame {
  providerGameId: string | null;
  gameDate: string;
  startTimeUtc: string | null;
  isHome: boolean;
  oppAbbr: string;
  oppName: string;
  oppTeamId: number | null;
  status: 'scheduled' | 'live' | 'final';
  detailedState: string | null;
  teamScore: number | null;
  oppScore: number | null;
  winnerName: string | null;
  loserName: string | null;
  homeProbableName: string | null;
  awayProbableName: string | null;
  currentInning: number | null;
  halfInning: string | null;
}

interface GameWithRecord extends SeasonGame {
  recW: number | null;
  recL: number | null;
}

type Filter = 'all' | 'results' | 'upcoming' | 'home' | 'away';

// ── Helpers ──────────────────────────────────────────────────────────────────

async function fetchSeasonSchedule(teamId: number, season: string): Promise<SeasonGame[]> {
  const url = `/api/games/season?teamId=${teamId}&season=${encodeURIComponent(season)}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  return (await res.json()) as SeasonGame[];
}

function attachRunningRecord(games: SeasonGame[]): GameWithRecord[] {
  const sorted = [...games].sort((a, b) => a.gameDate.localeCompare(b.gameDate));
  let w = 0;
  let l = 0;
  return sorted.map((g) => {
    let recW: number | null = null;
    let recL: number | null = null;
    if (g.status === 'final' && g.teamScore !== null && g.oppScore !== null) {
      if (g.teamScore > g.oppScore) w++;
      else if (g.teamScore < g.oppScore) l++;
      recW = w;
      recL = l;
    }
    return { ...g, recW, recL };
  });
}

function fmtGameDate(gameDate: string): { weekday: string; monthDay: string } {
  const d = new Date(gameDate + 'T12:00:00');
  const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
  const month = d.toLocaleDateString('en-US', { month: 'short' });
  const day = d.getDate();
  return { weekday, monthDay: `${month} ${day}` };
}

function fmtFirstPitch(utc: string | null): string {
  if (!utc) return 'TBD';
  const d = new Date(utc);
  if (isNaN(d.getTime())) return 'TBD';
  return d.toLocaleTimeString('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function toMonthKey(gameDate: string): string {
  return gameDate.slice(0, 7);
}

function monthLong(key: string): string {
  return new Date(`${key}-01T12:00:00`).toLocaleDateString('en-US', { month: 'long' });
}

function monthShort(key: string): string {
  return new Date(`${key}-01T12:00:00`).toLocaleDateString('en-US', { month: 'short' });
}

function applyFilter(games: GameWithRecord[], filter: Filter): GameWithRecord[] {
  if (filter === 'results') return games.filter(g => g.status === 'final');
  if (filter === 'upcoming') return games.filter(g => g.status !== 'final');
  if (filter === 'home') return games.filter(g => g.isHome);
  if (filter === 'away') return games.filter(g => !g.isHome);
  return games;
}

function monthSummary(games: GameWithRecord[]): string {
  const finals = games.filter(g => g.status === 'final');
  const total = games.length;
  if (finals.length === 0) {
    const home = games.filter(g => g.isHome).length;
    return `${total} game${total !== 1 ? 's' : ''} · ${home} home`;
  }
  const w = finals.filter(
    g => g.teamScore !== null && g.oppScore !== null && g.teamScore > g.oppScore,
  ).length;
  const l = finals.length - w;
  return `${w}–${l} · ${total} game${total !== 1 ? 's' : ''}`;
}

interface SummaryStats {
  totalW: number; totalL: number;
  homeW: number; homeL: number;
  awayW: number; awayL: number;
  remaining: number;
}

function computeStats(games: GameWithRecord[]): SummaryStats {
  let totalW = 0; let totalL = 0;
  let homeW = 0; let homeL = 0;
  let awayW = 0; let awayL = 0;
  let remaining = 0;
  for (const g of games) {
    if (g.status === 'final' && g.teamScore !== null && g.oppScore !== null) {
      const win = g.teamScore > g.oppScore;
      if (win) { totalW++; if (g.isHome) homeW++; else awayW++; }
      else { totalL++; if (g.isHome) homeL++; else awayL++; }
    } else {
      remaining++;
    }
  }
  return { totalW, totalL, homeW, homeL, awayW, awayL, remaining };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function OppLogo({ teamId, abbr }: { teamId: number | null; abbr: string }): ReactElement {
  if (!teamId) {
    return (
      <div className="sp__opp-logo sp__opp-logo--fallback">
        {abbr.slice(0, 2)}
      </div>
    );
  }
  return (
    <img
      className="sp__opp-logo"
      src={`https://www.mlbstatic.com/team-logos/${teamId}.svg`}
      alt={abbr}
      width={24}
      height={24}
    />
  );
}

function ResultCell({ game }: { game: GameWithRecord }): ReactElement {
  if (game.status === 'live') {
    const innText =
      game.halfInning && game.currentInning
        ? `${game.halfInning === 'Top' ? '▲' : '▼'} ${ordinalInn(game.currentInning)}`
        : 'LIVE';
    return (
      <div className="sp__res">
        <span className="sp__live-pill">{innText}</span>
        {game.teamScore !== null && game.oppScore !== null && (
          <span className="sp__score num">{game.teamScore}–{game.oppScore}</span>
        )}
      </div>
    );
  }
  if (game.status === 'final' && game.teamScore !== null && game.oppScore !== null) {
    const win = game.teamScore > game.oppScore;
    return (
      <div className="sp__res">
        <span className={`sp__wl sp__wl--${win ? 'w' : 'l'}`}>{win ? 'W' : 'L'}</span>
        <span className="sp__score num">{game.teamScore}–{game.oppScore}</span>
      </div>
    );
  }
  return <span className="sp__time">{fmtFirstPitch(game.startTimeUtc)}</span>;
}

function ordinalInn(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

function DecisionCell({ game }: { game: GameWithRecord }): ReactElement {
  if (game.status === 'final') {
    if (game.teamScore === null || game.oppScore === null) return <></>;
    const win = game.teamScore > game.oppScore;
    const pitcher = win ? game.winnerName : game.loserName;
    if (!pitcher) return <></>;
    return <span className="sp__decision">{win ? 'W' : 'L'}: {pitcher}</span>;
  }
  const myProb = game.isHome ? game.homeProbableName : game.awayProbableName;
  const oppProb = game.isHome ? game.awayProbableName : game.homeProbableName;
  if (!myProb && !oppProb) {
    return <span className="sp__decision sp__decision--tbd">TBD</span>;
  }
  const parts: string[] = [];
  if (myProb) parts.push(myProb);
  if (oppProb) parts.push(`vs. ${oppProb}`);
  return <span className="sp__decision">{parts.join(' ')}</span>;
}

function GameRow({ game }: { game: GameWithRecord }): ReactElement {
  const { weekday, monthDay } = fmtGameDate(game.gameDate);
  const today = new Date().toISOString().slice(0, 10);
  const isToday = game.gameDate === today;
  const isLive = game.status === 'live';
  const isFut = game.status !== 'final';

  const rowCls = [
    'sp__tr',
    isLive ? 'sp__tr--live' : '',
    isFut && !isLive ? 'sp__tr--fut' : '',
  ].filter(Boolean).join(' ');

  const actionLabel = game.status === 'final' ? 'Box →' : 'Enter game →';

  return (
    <tr className={rowCls}>
      <td className="sp__td sp__td--date num">
        <span className="sp__weekday">{weekday}</span>{' '}
        <b>{monthDay}</b>
        {isToday && !isLive && (
          <span className="sp__today-mark">Today</span>
        )}
      </td>
      <td className="sp__td sp__td--opp">
        <div className="sp__opp">
          <span className="sp__vs-at">{game.isHome ? 'vs' : '@'}</span>
          <OppLogo teamId={game.oppTeamId} abbr={game.oppAbbr} />
          <span className="sp__opp-name">{game.oppName}</span>
        </div>
      </td>
      <td className="sp__td sp__td--res">
        <ResultCell game={game} />
      </td>
      <td className="sp__td sp__td--rec num">
        {game.recW !== null && game.recL !== null ? `${game.recW}–${game.recL}` : '—'}
      </td>
      <td className="sp__td sp__td--note">
        <DecisionCell game={game} />
      </td>
      <td className="sp__td sp__td--act">
        {game.providerGameId && (
          <Link to={`/game/${game.providerGameId}`} className="sp__act-link">
            {actionLabel}
          </Link>
        )}
      </td>
    </tr>
  );
}

interface MonthSectionProps {
  mk: string;
  games: GameWithRecord[];
  filteredGames: GameWithRecord[];
  isOpen: boolean;
  onToggle: (key: string) => void;
  sectionRef: (el: HTMLElement | null) => void;
}

function MonthSection({
  mk, games, filteredGames, isOpen, onToggle, sectionRef,
}: MonthSectionProps): ReactElement {
  return (
    <section
      className={`sp__mo${isOpen ? ' sp__mo--open' : ''}`}
      id={`m-${mk}`}
      ref={sectionRef}
    >
      <button
        type="button"
        className="sp__mo-hd"
        aria-expanded={isOpen}
        onClick={() => onToggle(mk)}
      >
        <span className="sp__mo-caret">▸</span>
        <h2 className="sp__mo-title">{monthLong(mk)}</h2>
        <span className="sp__mo-sub num">{monthSummary(games)}</span>
      </button>
      {isOpen && (
        <div className="sp__mo-body">
          {filteredGames.length === 0 ? (
            <p className="sp__mo-empty">No games match the current filter.</p>
          ) : (
            <div className="sp__table-wrap">
              <table className="sp__table">
                <thead>
                  <tr>
                    <th className="sp__th sp__th--date">Date</th>
                    <th className="sp__th">Opponent</th>
                    <th className="sp__th sp__th--res">Result</th>
                    <th className="sp__th sp__th--rec">Record</th>
                    <th className="sp__th sp__th--note">Decision</th>
                    <th className="sp__th sp__th--act"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGames.map((g, i) => (
                    <GameRow key={`${g.gameDate}-${g.oppAbbr}-${i}`} game={g} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SchedulePage(): ReactElement {
  const { teamAbbr = '' } = useParams<{ teamAbbr: string }>();
  const navigate = useNavigate();
  const abbr = teamAbbr.toUpperCase();

  const handleBack = useCallback(() => {
    navigate(`/team/${abbr}`);
  }, [navigate, abbr]);

  const [myTeam, setMyTeam] = useState<StandingTeamDto | null>(null);
  const [games, setGames] = useState<GameWithRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [openMonths, setOpenMonths] = useState<Set<string>>(new Set());

  const todayMonthKey = new Date().toISOString().slice(0, 7);
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());
  const didScrollRef = useRef(false);
  const hdrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const standingsResp = await standingsApi.standingsGetStandings(CURRENT_SEASON);
        if (cancelled) return;
        const allStandings = standingsResp.data ?? [];
        const team = allStandings.find(s => s.abbr === abbr) ?? null;
        setMyTeam(team);

        const teamId = TEAMS[abbr]?.id ?? null;

        if (teamId) {
          const rawGames = await fetchSeasonSchedule(teamId, CURRENT_SEASON);
          if (cancelled) return;
          setGames(attachRunningRecord(rawGames));
        }

        if (!cancelled) setOpenMonths(new Set([todayMonthKey]));
      } catch {
        // silently handle load errors
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [abbr]);

  // Measure sticky header height → --hh custom property
  useEffect(() => {
    const hdr = hdrRef.current;
    if (!hdr) return;
    const measure = () => {
      document.documentElement.style.setProperty('--hh', `${hdr.offsetHeight}px`);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(hdr);
    return () => ro.disconnect();
  }, []);

  // Scroll to current month once on load
  useEffect(() => {
    if (loading || didScrollRef.current) return;
    didScrollRef.current = true;
    requestAnimationFrame(() => {
      const el = sectionRefs.current.get(todayMonthKey);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [loading]);

  const monthKeys = Array.from(
    new Map(games.map(g => [toMonthKey(g.gameDate), true])).keys(),
  ).sort();

  const stats = computeStats(games);

  const toggleMonth = useCallback((key: string) => {
    setOpenMonths(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleChipClick = useCallback((key: string) => {
    setOpenMonths(prev => new Set([...prev, key]));
    requestAnimationFrame(() => {
      const el = sectionRefs.current.get(key);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, []);

  const displayName = myTeam?.displayName ?? abbr;
  const mlbTeamId = TEAMS[abbr]?.id ?? null;
  const mlbLogoUrl = mlbTeamId ? `https://www.mlbstatic.com/team-logos/${mlbTeamId}.svg` : null;

  return (
    <div className="sp__page">
      <header className="sp__hdr" ref={hdrRef}>
        <div className="sp__hdr-inner">
          <PageTitle
            navMenu={<PageMenu backLabel={displayName} onBack={handleBack} />}
            title={displayName}
          />

          <div className="sp__phead">
            <div className="sp__phead-id">
              {mlbLogoUrl && (
                <img
                  className="sp__team-logo"
                  src={mlbLogoUrl}
                  alt={displayName}
                  width={42}
                  height={42}
                />
              )}
              <div>
                <div className="sp__eyebrow">{displayName} · {CURRENT_SEASON}</div>
                <h1 className="sp__page-title">Schedule</h1>
              </div>
            </div>
            <div className="sp__psum">
              <div className="sp__ps">
                <div className="sp__ps-l">Record</div>
                <div className="sp__ps-v num">{stats.totalW}–{stats.totalL}</div>
              </div>
              <div className="sp__ps">
                <div className="sp__ps-l">Home</div>
                <div className="sp__ps-v num">{stats.homeW}–{stats.homeL}</div>
              </div>
              <div className="sp__ps">
                <div className="sp__ps-l">Away</div>
                <div className="sp__ps-v num">{stats.awayW}–{stats.awayL}</div>
              </div>
              <div className="sp__ps">
                <div className="sp__ps-l">Remaining</div>
                <div className="sp__ps-v num">{stats.remaining}</div>
              </div>
            </div>
          </div>

          <div className="sp__bar">
            <div className="sp__seg">
              {(['all', 'results', 'upcoming', 'home', 'away'] as Filter[]).map(f => (
                <button
                  key={f}
                  type="button"
                  className={`sp__seg-btn${filter === f ? ' sp__seg-btn--on' : ''}`}
                  onClick={() => setFilter(f)}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
            <div className="sp__month-chips">
              {monthKeys.map(key => (
                <button
                  key={key}
                  type="button"
                  className={`sp__month-chip num${key === todayMonthKey ? ' sp__month-chip--now' : ''}`}
                  onClick={() => handleChipClick(key)}
                >
                  {monthShort(key)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="sp__wrap">
        {loading ? (
          <div className="sp__skel">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="sp__skel-row" />
            ))}
          </div>
        ) : games.length === 0 ? (
          <div className="sp__empty">
            <p className="sp__empty-msg">No games found for this season.</p>
          </div>
        ) : (
          <div className="sp__sections">
            {monthKeys.map(key => {
              const monthGames = games.filter(g => toMonthKey(g.gameDate) === key);
              const filteredMonthGames = applyFilter(monthGames, filter);
              return (
                <MonthSection
                  key={key}
                  mk={key}
                  games={monthGames}
                  filteredGames={filteredMonthGames}
                  isOpen={openMonths.has(key)}
                  onToggle={toggleMonth}
                  sectionRef={(el) => {
                    if (el) sectionRefs.current.set(key, el);
                    else sectionRefs.current.delete(key);
                  }}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
