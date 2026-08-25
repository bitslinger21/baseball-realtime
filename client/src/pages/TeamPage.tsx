import './TeamPage.css';
import type { ReactElement } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom';
import type { StandingTeamDto, GameViewDto, GameDto } from '@bitslinger21/baseball-realtime-client';
import { standingsApi, gamesApi } from '../api/baseballApiClient';
import { PageTitle } from '../components/primitives/PageTitle';
import { PageMenu } from '../components/primitives/PageMenu';
import { getBackLabel } from '../utils/backLabel';
import { LivePill } from '../components/primitives/Pill';
import { Segmented } from '../components/primitives/Segmented';
import { TEAM_NICKNAMES } from '../utils/teamNicknames';
import { TEAMS } from '../utils/teams';

const CURRENT_SEASON = String(new Date().getFullYear());

// ── helpers ──────────────────────────────────────────────────────────────────

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

function teamIdFromLogoUrl(logoUrl: unknown): number | null {
  if (typeof logoUrl !== 'string') return null;
  const match = logoUrl.match(/\/(\d+)\.svg/i);
  return match ? parseInt(match[1]!, 10) : null;
}

function logoUrlStr(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
}

function fmtTime(utc: string | null | undefined): { weekday: string; time: string } {
  if (!utc) return { weekday: '', time: 'TBD' };
  const d = new Date(utc);
  if (isNaN(d.getTime())) return { weekday: '', time: 'TBD' };
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: '2-digit',
    weekday: 'short',
  }).formatToParts(d);
  const hour = parts.find(p => p.type === 'hour')?.value ?? '';
  const min = parts.find(p => p.type === 'minute')?.value ?? '';
  const ampm = (parts.find(p => p.type === 'dayPeriod')?.value ?? '').replace(/\./g, '').trim().toUpperCase();
  const weekday = parts.find(p => p.type === 'weekday')?.value ?? '';
  return { weekday, time: `${hour}:${min} ${ampm}` };
}

function fmtDateLabel(gameDate: string): string {
  const d = new Date(`${gameDate}T12:00:00Z`);
  const weekday = d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
  const month = d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }).toUpperCase();
  const day = d.getUTCDate();
  return `${weekday.toUpperCase()} ${month} ${day}`;
}

function getScores(g: GameViewDto): { away: number | null; home: number | null } {
  const away = typeof (g.awayScore as unknown) === 'number' ? (g.awayScore as unknown as number) : null;
  const home = typeof (g.homeScore as unknown) === 'number' ? (g.homeScore as unknown as number) : null;
  const ls = g.linescore;
  return {
    away: away ?? (typeof (ls?.away?.runs as unknown) === 'number' ? (ls!.away!.runs as unknown as number) : null),
    home: home ?? (typeof (ls?.home?.runs as unknown) === 'number' ? (ls!.home!.runs as unknown as number) : null),
  };
}

function getInningParts(g: GameViewDto): { inning: number | null; isTop: boolean | null; outs: number | null } {
  const inning =
    typeof (g.inning as unknown) === 'number' ? (g.inning as unknown as number)
    : typeof (g.currentInning as unknown) === 'number' ? (g.currentInning as unknown as number)
    : typeof (g.linescore?.currentInning as unknown) === 'number' ? (g.linescore!.currentInning as unknown as number)
    : null;
  const isTop =
    typeof (g.isTopInning as unknown) === 'boolean' ? (g.isTopInning as unknown as boolean)
    : typeof (g.linescore?.isTopInning as unknown) === 'boolean' ? (g.linescore!.isTopInning as unknown as boolean)
    : g.half === 'top' ? true
    : g.half === 'bottom' ? false
    : null;
  const outs =
    typeof (g.outs as unknown) === 'number' ? (g.outs as unknown as number)
    : typeof (g.linescore?.outs as unknown) === 'number' ? (g.linescore!.outs as unknown as number)
    : null;
  return { inning, isTop, outs };
}

function getExtraInnings(g: GameViewDto): number | null {
  const { inning } = getInningParts(g);
  return inning != null && inning > 9 ? inning : null;
}

function getVenue(g: GameViewDto): string | null {
  const snap = g.snapshot as Record<string, unknown> | null | undefined;
  if (!snap) return null;
  return typeof snap.venue === 'string' ? snap.venue : null;
}

function getProbableName(probable: unknown): string | null {
  const p = probable as Record<string, unknown> | null | undefined;
  if (!p) return null;
  return typeof p.name === 'string' ? p.name : null;
}

// Build W/L chips: streak fills the right end (most recent), rest fills left.
// Order is approximate — the actual per-game sequence isn't available from standings.
function buildFormChips(streak: string, lastTen: string): ('W' | 'L')[] {
  const match = lastTen.match(/^(\d+)-(\d+)$/);
  if (!match) return [];
  const totalW = parseInt(match[1]!, 10);
  const totalL = parseInt(match[2]!, 10);
  const total = totalW + totalL;

  const sDir = streak.startsWith('W') ? 'W' : streak.startsWith('L') ? 'L' : null;
  const sCount = parseInt(streak.slice(1), 10) || 0;
  const recentCount = sDir != null ? Math.min(sCount, total) : 0;
  const recent: ('W' | 'L')[] = Array(recentCount).fill(sDir as 'W' | 'L');

  const olderW = totalW - (sDir === 'W' ? recentCount : 0);
  const olderL = totalL - (sDir === 'L' ? recentCount : 0);
  const older: ('W' | 'L')[] = [
    ...Array(Math.max(0, olderW)).fill('W' as const),
    ...Array(Math.max(0, olderL)).fill('L' as const),
  ];

  return [...older, ...recent].slice(-10) as ('W' | 'L')[];
}

// ── TeamLogo ─────────────────────────────────────────────────────────────────

function TeamLogo({ abbr, src, size }: { abbr: string; src: string | null; size: number }): ReactElement {
  if (src) {
    return (
      <img
        src={src}
        alt={abbr}
        width={size}
        height={size}
        className="tp__logo-img"
        style={{ width: size, height: size }}
        loading="lazy"
      />
    );
  }
  return (
    <span className="tp__logo-fb" style={{ width: size, height: size, fontSize: Math.round(size * 0.45) }}>
      {abbr.charAt(0)}
    </span>
  );
}

// ── TodayCard ─────────────────────────────────────────────────────────────────

interface TodayCardProps {
  game: GameViewDto;
  teamAbbr: string;
  allStandings: StandingTeamDto[];
  onEnter: () => void;
}

function TodayCard({ game, teamAbbr, allStandings, onEnter }: TodayCardProps): ReactElement {
  const status = game.status as 'live' | 'final' | 'scheduled';

  const { away, home } = getScores(game);
  const { inning, isTop, outs } = getInningParts(game);
  const extras = getExtraInnings(game);
  const venue = getVenue(game);

  const awayMeta = game.awayTeamMeta as Record<string, unknown> | null | undefined;
  const homeMeta = game.homeTeamMeta as Record<string, unknown> | null | undefined;
  const awayLogoUrl = logoUrlStr(awayMeta?.logoUrl)
    ?? (allStandings.find(s => s.abbr === game.awayAbbr)?.logoUrl as string | null ?? null);
  const homeLogoUrl = logoUrlStr(homeMeta?.logoUrl)
    ?? (allStandings.find(s => s.abbr === game.homeAbbr)?.logoUrl as string | null ?? null);

  const awayStanding = allStandings.find(s => s.abbr === game.awayAbbr);
  const homeStanding = allStandings.find(s => s.abbr === game.homeAbbr);
  const awayRecord = awayStanding ? `${awayStanding.wins}–${awayStanding.losses}` : null;
  const homeRecord = homeStanding ? `${homeStanding.wins}–${homeStanding.losses}` : null;

  const awayWon = status === 'final' && (away ?? 0) > (home ?? 0);
  const homeWon = status === 'final' && (home ?? 0) > (away ?? 0);

  const awayNick = TEAM_NICKNAMES[game.awayAbbr] ?? game.awayName;
  const homeNick = TEAM_NICKNAMES[game.homeAbbr] ?? game.homeName;

  const { weekday, time } = fmtTime(game.startTimeUtc);

  const awayProbable = getProbableName(game.awayProbable);
  const homeProbable = getProbableName(game.homeProbable);

  let cardTitle: string;
  let cardTag: ReactElement | null = null;
  if (status === 'live') {
    cardTitle = 'Today';
    cardTag = <LivePill />;
  } else if (status === 'final') {
    cardTitle = 'Last game';
    cardTag = <span className="tp__tag">Final</span>;
  } else {
    cardTitle = 'Next game';
    const tagLabel = weekday ? `${weekday} ${time}` : time;
    cardTag = (
      <span className="tp__tag">
        {weekday} <span className="num">{time}</span>
      </span>
    );
  }

  return (
    <div className="tp__card">
      <div className="tp__card-hd">
        <span className="tp__card-t">{cardTitle}</span>
        {cardTag}
      </div>
      <div className="tp__card-b">
        {/* Game row: 5-zone flex */}
        <div className="tp__game">
          {/* Away team */}
          <div className="tp__gteam tp__gteam--away">
            <TeamLogo abbr={game.awayAbbr} src={awayLogoUrl} size={28} />
            <div className="tp__gteam-info">
              <div className="tp__gt-name">{awayNick}</div>
              {awayRecord && <div className="tp__gt-rec num">{awayRecord}</div>}
            </div>
          </div>

          {/* Away score */}
          {status !== 'scheduled' && (
            <div className={`tp__gscore num${awayWon ? '' : ' tp__gscore--dim'}`}>{away ?? '–'}</div>
          )}

          {/* Center */}
          <div className={`tp__gmid${status === 'scheduled' ? ' tp__gmid--wide' : ''}`}>
            {status === 'live' && (
              <>
                <div className="tp__gmid-i">
                  {inning != null ? `${isTop === true ? '▲' : isTop === false ? '▼' : ''} ${ordinal(inning)}` : 'LIVE'}
                </div>
                {outs != null && (
                  <div className="tp__gmid-s num">{outs} out</div>
                )}
              </>
            )}
            {status === 'final' && (
              <div className="tp__gmid-f num">{extras != null ? `F/${extras}` : 'F'}</div>
            )}
            {status === 'scheduled' && (
              <div className="tp__gmid-up">
                <div className="tp__gmid-date">{fmtDateLabel(game.gameDate)}</div>
                <div className="tp__gmid-time num">{time}</div>
                {venue && <div className="tp__gmid-venue">{venue}</div>}
              </div>
            )}
          </div>

          {/* Home score */}
          {status !== 'scheduled' && (
            <div className={`tp__gscore num${homeWon ? '' : ' tp__gscore--dim'}`}>{home ?? '–'}</div>
          )}

          {/* Home team */}
          <div className="tp__gteam">
            <TeamLogo abbr={game.homeAbbr} src={homeLogoUrl} size={28} />
            <div className="tp__gteam-info">
              <div className="tp__gt-name">{homeNick}</div>
              {homeRecord && <div className="tp__gt-rec num">{homeRecord}</div>}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="tp__gfoot">
          {status === 'scheduled' && awayProbable && homeProbable && (
            <span>Probables: {awayProbable} vs. {homeProbable}</span>
          )}
          {status === 'scheduled' && (!awayProbable || !homeProbable) && (
            <span>{venue ?? ''}</span>
          )}
          {(status === 'live' || status === 'final') && <span />}
          <button className="tp__enter-btn" onClick={onEnter}>Enter game →</button>
        </div>
      </div>
    </div>
  );
}

// ── RecentFormCard ────────────────────────────────────────────────────────────

function RecentFormCard({ standing }: { standing: StandingTeamDto }): ReactElement {
  const chips = buildFormChips(standing.streak, standing.lastTen);
  const { wins: l10w, losses: l10l } = (() => {
    const m = standing.lastTen.match(/^(\d+)-(\d+)$/);
    return m ? { wins: parseInt(m[1]!, 10), losses: parseInt(m[2]!, 10) } : { wins: 0, losses: 0 };
  })();

  return (
    <div className="tp__card">
      <div className="tp__card-hd">
        <span className="tp__card-t">Recent form</span>
      </div>
      <div className="tp__card-b">
        <div className="tp__form-row">
          {chips.map((chip, i) => (
            <div key={i} className={`tp__fchip ${chip === 'W' ? 'tp__fchip--w' : 'tp__fchip--l'}`}>{chip}</div>
          ))}
        </div>
        <div className="tp__form-legend">
          <span>10 games ago</span>
          <span>Most recent</span>
        </div>
        <div className="tp__form-splits">
          <div className="tp__fs">
            <div className="tp__fs-l">Home</div>
            <div className="tp__fs-v num">—</div>
          </div>
          <div className="tp__fs">
            <div className="tp__fs-l">Away</div>
            <div className="tp__fs-v num">—</div>
          </div>
          <div className="tp__fs">
            <div className="tp__fs-l">1-Run</div>
            <div className="tp__fs-v num">—</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── RosterCard (stub) ─────────────────────────────────────────────────────────

function RosterCard(): ReactElement {
  return (
    <div className="tp__card">
      <div className="tp__card-hd">
        <span className="tp__card-t">Roster</span>
        <Segmented items={['Batters', 'Pitchers']} active={0} size="sm" />
      </div>
      <div className="tp__card-b tp__card-b--stub">
        <span className="tp__stub-msg">Roster data coming soon</span>
      </div>
    </div>
  );
}

// ── StandingsCard ─────────────────────────────────────────────────────────────

function StandingsCard({
  division,
  abbr,
  navigate,
}: {
  division: StandingTeamDto[];
  abbr: string;
  navigate: ReturnType<typeof useNavigate>;
}): ReactElement {
  const divName = division[0]?.divisionName ?? '';
  const leagueName = division[0]?.leagueName ?? '';
  const leagueAbbr = leagueName === 'American League' ? 'AL' : 'NL';
  const divPart = divName.replace(/.*?(East|Central|West).*/, '$1');
  const headerLabel = `${leagueAbbr} ${divPart}`;

  return (
    <div className="tp__card">
      <div className="tp__card-hd">
        <span className="tp__card-t">{headerLabel}</span>
        <Link to="/standings" className="tp__card-a">Standings →</Link>
      </div>
      <div className="tp__card-b tp__card-b--standings">
        <div className="tp__st-hd">
          <span />
          <span>Team</span>
          <span>W</span>
          <span>L</span>
          <span>GB</span>
        </div>
        {division.map((team) => {
          const isMe = team.abbr === abbr;
          const logoSrc = team.logoUrl as string | null;
          return (
            <Link
              key={team.abbr}
              to={`/team/${team.abbr}`}
              className={`tp__st-row${isMe ? ' tp__st-row--me' : ''}`}
            >
              <div className="tp__st-rk num">{team.rank}</div>
              <div className="tp__st-tm">
                <TeamLogo abbr={team.abbr} src={logoSrc} size={19} />
                <span>{TEAM_NICKNAMES[team.abbr] ?? team.teamName}</span>
              </div>
              <div className="tp__st-n num">{team.wins}</div>
              <div className="tp__st-n num">{team.losses}</div>
              <div className="tp__st-gb num">{team.gamesBack === '0' || team.gamesBack === '—' || team.rank === 1 ? '—' : team.gamesBack}</div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ── NextUpCard ────────────────────────────────────────────────────────────────

function NextUpCard({ games, teamAbbr, allStandings }: { games: GameDto[]; teamAbbr: string; allStandings: StandingTeamDto[] }): ReactElement {
  return (
    <div className="tp__card">
      <div className="tp__card-hd">
        <span className="tp__card-t">Next up</span>
        <Link to={`/team/${teamAbbr}/schedule`} className="tp__card-a">Full schedule →</Link>
      </div>
      <div className="tp__card-b">
        {games.length === 0 && (
          <div className="tp__stub-msg">No upcoming games scheduled</div>
        )}
        {games.map((game, i) => {
          const isHome = (game.homeAbbr ?? '').toUpperCase() === teamAbbr.toUpperCase() || false;
          const isHomeByTeamId = (() => {
            const homeId = typeof (game.homeTeamId as unknown) === 'number' ? (game.homeTeamId as unknown as number) : null;
            const myId = TEAMS[teamAbbr]?.id;
            return myId != null && homeId === myId;
          })();
          // determine perspective: is this team the home team?
          const perspHome = isHome || isHomeByTeamId;
          const oppAbbr = perspHome ? (game.awayAbbr ?? '') : (game.homeAbbr ?? '');
          const oppNick = TEAM_NICKNAMES[oppAbbr] ?? (perspHome ? game.awayName : game.homeName);
          const oppLogo = allStandings.find(s => s.abbr === oppAbbr)?.logoUrl as string | null ?? null;
          const { weekday, time } = fmtTime(game.startTimeUtc);
          const vsAt = perspHome ? 'vs' : '@';

          return (
            <div key={i} className={`tp__nextup-row${i < games.length - 1 ? ' tp__nextup-row--border' : ''}`}>
              <TeamLogo abbr={oppAbbr} src={oppLogo} size={22} />
              <div className="tp__nextup-opp">{vsAt} {oppNick}</div>
              <div className="tp__nextup-time num">{weekday} <span>{time}</span></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── TeamPage ──────────────────────────────────────────────────────────────────

export default function TeamPage(): ReactElement {
  const { teamAbbr = '' } = useParams<{ teamAbbr: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const abbr = teamAbbr.toUpperCase();

  const locState = location.state as { from?: string; fromLabel?: string } | null;
  const backLabel = getBackLabel(locState?.from, locState?.fromLabel);
  const handleBack = useCallback((): void => {
    const from = locState?.from;
    if (from) navigate(from);
    else navigate('/');
  }, [navigate, locState?.from]);

  const [standings, setStandings] = useState<StandingTeamDto[]>([]);
  const [todayGame, setTodayGame] = useState<GameViewDto | null>(null);
  const [upcomingGames, setUpcomingGames] = useState<GameDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      setLoading(true);
      try {
        const [standingsResp, todayResp] = await Promise.all([
          standingsApi.standingsGetStandings(CURRENT_SEASON),
          gamesApi.gamesToday(),
        ]);

        if (cancelled) return;

        const allStandings: StandingTeamDto[] = standingsResp.data ?? [];
        setStandings(allStandings);

        const todayGames: GameViewDto[] = todayResp.data ?? [];
        const myGame = todayGames.find(
          g => g.homeAbbr?.toUpperCase() === abbr || g.awayAbbr?.toUpperCase() === abbr,
        ) ?? null;
        setTodayGame(myGame);

        // Get numeric team ID from standings logoUrl or TEAMS map for upcoming games call
        const myStanding = allStandings.find(s => s.abbr === abbr);
        const teamId = TEAMS[abbr]?.id
          ?? teamIdFromLogoUrl(logoUrlStr(myStanding?.logoUrl))
          ?? (myGame
            ? (myGame.homeAbbr?.toUpperCase() === abbr
              ? (typeof (myGame.homeTeamId as unknown) === 'number' ? (myGame.homeTeamId as unknown as number) : null)
              : (typeof (myGame.awayTeamId as unknown) === 'number' ? (myGame.awayTeamId as unknown as number) : null))
            : null);

        if (teamId != null) {
          try {
            const upResp = await gamesApi.gamesUpcoming(String(teamId), '3');
            if (!cancelled) {
              setUpcomingGames((upResp.data as unknown as GameDto[]) ?? []);
            }
          } catch {
            // upcoming games not critical
          }
        }
      } catch (e) {
        console.error('TeamPage load error', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [abbr]);

  const myStanding = standings.find(s => s.abbr === abbr);
  const division = standings
    .filter(s => s.divisionName === myStanding?.divisionName)
    .sort((a, b) => a.rank - b.rank);

  const heroLogoSrc = logoUrlStr(myStanding?.logoUrl);

  // Determine the "today" game state for the Today card
  // If no game today, use the first upcoming game as the "next game" card
  const todayCardGame: GameViewDto | null = todayGame;
  const nextGameAsUpcoming: GameViewDto | null =
    todayCardGame == null && upcomingGames.length > 0
      ? upcomingGames[0] as unknown as GameViewDto
      : null;
  const cardGame = todayCardGame ?? nextGameAsUpcoming;

  const streakIsWin = myStanding?.streak?.startsWith('W') ?? false;

  if (loading) {
    return (
      <div className="tp-page">
        <div className="tp__wrap">
          <PageTitle
            navMenu={<PageMenu backLabel={backLabel} onBack={handleBack} />}
            title="Team"
          />
          <div className="tp__loading">Loading…</div>
        </div>
      </div>
    );
  }

  if (myStanding == null) {
    return (
      <div className="tp-page">
        <div className="tp__wrap">
          <PageTitle
            navMenu={<PageMenu backLabel={backLabel} onBack={handleBack} />}
            title="Team"
          />
          <div className="tp__loading">Team not found</div>
        </div>
      </div>
    );
  }

  const divisionAbbr = (() => {
    const lg = myStanding.leagueName === 'American League' ? 'AL' : 'NL';
    const dv = (myStanding.divisionName.match(/East|Central|West/) ?? [''])[0];
    return `${lg} ${dv}`;
  })();

  return (
    <div className="tp-page">
      <div className="tp__wrap">
        <PageTitle
          navMenu={<PageMenu backLabel={backLabel} onBack={handleBack} />}
          title={myStanding.displayName}
        />
        {/* Hero */}
        <div className="tp__hero">
          <div className="tp__hero-logo">
            {heroLogoSrc
              ? <img src={heroLogoSrc} alt={myStanding.displayName} width={96} height={96} style={{ width: 96, height: 96, objectFit: 'contain' }} />
              : <span className="tp__logo-fb" style={{ width: 96, height: 96, fontSize: 42 }}>{abbr.charAt(0)}</span>
            }
          </div>
          <div className="tp__hero-id">
            <div className="tp__eyebrow">{divisionAbbr.replace('AL ', 'American League ').replace('NL ', 'National League ')}</div>
            <h1 className="tp__hero-name">{myStanding.displayName}</h1>
            <div className="tp__hero-meta">
              <span>Est. —</span>
            </div>
          </div>
          <div className="tp__hero-stats">
            <div className="tp__hstat">
              <div className="tp__hstat-l">Record</div>
              <div className="tp__hstat-v num">{myStanding.wins}–{myStanding.losses}</div>
              <div className="tp__hstat-sub num">{myStanding.pct}</div>
            </div>
            <div className="tp__hstat">
              <div className="tp__hstat-l">Division</div>
              <div className="tp__hstat-v num">{ordinal(myStanding.rank)}</div>
              <div className="tp__hstat-sub num">
                {myStanding.rank === 1 ? `+${myStanding.gamesBack} GA` : `${myStanding.gamesBack} GB`}
              </div>
            </div>
            <div className="tp__hstat">
              <div className="tp__hstat-l">Streak</div>
              <div className={`tp__hstat-v num${streakIsWin ? ' tp__hstat-v--pos' : ' tp__hstat-v--muted'}`}>
                {myStanding.streak}
              </div>
              <div className="tp__hstat-sub num">{myStanding.lastTen} L10</div>
            </div>
          </div>
        </div>

        {/* Two-column grid */}
        <div className="tp__cols">
          {/* Left column */}
          <div className="tp__stack">
            {/* Today / Last game / Next game card */}
            {cardGame != null && (
              <TodayCard
                game={cardGame}
                teamAbbr={abbr}
                allStandings={standings}
                onEnter={() => {
                  const id = cardGame.providerGameId;
                  if (id) navigate(`/game/${id}`);
                }}
              />
            )}
            {cardGame == null && (
              <div className="tp__card">
                <div className="tp__card-hd">
                  <span className="tp__card-t">Schedule</span>
                </div>
                <div className="tp__card-b tp__card-b--stub">
                  <span className="tp__stub-msg">No game today or upcoming</span>
                </div>
              </div>
            )}

            {/* Recent form */}
            <RecentFormCard standing={myStanding} />

            {/* Roster (stub) */}
            <RosterCard />
          </div>

          {/* Right column */}
          <div className="tp__stack">
            {/* Division standings */}
            {division.length > 0 && (
              <StandingsCard division={division} abbr={abbr} navigate={navigate} />
            )}

            {/* Next up */}
            <NextUpCard games={upcomingGames} teamAbbr={abbr} allStandings={standings} />
          </div>
        </div>
      </div>
    </div>
  );
}
