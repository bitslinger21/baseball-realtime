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
import { TEAM_VENUES } from '../utils/teamVenues';

const CURRENT_SEASON = String(new Date().getFullYear());

// ── types ─────────────────────────────────────────────────────────────────────

// Minimal season-game shape returned by /api/games/season
interface SeasonGame {
  providerGameId: string | null;
  gameDate: string;
  status: 'scheduled' | 'live' | 'final';
  teamScore: number | null;
  oppScore: number | null;
  winnerName: string | null;
  loserName: string | null;
}

// ── helpers ───────────────────────────────────────────────────────────────────

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

function getInningParts(g: GameViewDto): { inning: number | null; isTop: boolean | null; outs: number | null; bases: { on1: boolean; on2: boolean; on3: boolean } | null } {
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
  const snap = g.snapshot as Record<string, unknown> | null | undefined;
  const linescore = snap?.linescore as Record<string, unknown> | null | undefined;
  const basesRaw = (linescore?.offense as Record<string, unknown> | null | undefined) ?? (snap?.bases as Record<string, unknown> | null | undefined);
  const bases = basesRaw != null ? {
    on1: basesRaw.on1 === true || basesRaw['1B'] === true,
    on2: basesRaw.on2 === true || basesRaw['2B'] === true,
    on3: basesRaw.on3 === true || basesRaw['3B'] === true,
  } : null;
  return { inning, isTop, outs, bases };
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

// Build count-based chips from "8-2" lastTen string: W's first, then L's.
// Used as interim while real game-log chips are loading — no implied order.
function buildCountChips(lastTen: string): ('W' | 'L')[] {
  const m = lastTen.match(/^(\d+)-(\d+)$/);
  if (!m) return [];
  const w = parseInt(m[1]!, 10);
  const l = parseInt(m[2]!, 10);
  return [
    ...Array<'W'>(Math.max(0, w)).fill('W'),
    ...Array<'L'>(Math.max(0, l)).fill('L'),
  ].slice(0, 10) as ('W' | 'L')[];
}

interface RosterPlayer {
  mlbId: number;
  name: string;
  jersey: string;
  position: string;
  avg: string | null;
  hr: number | null;
  rbi: number | null;
  ops: string | null;
}

const POSITION_GROUP: Record<string, string> = {
  C: 'Catcher',
  '1B': 'Infield', '2B': 'Infield', '3B': 'Infield', SS: 'Infield',
  DH: 'Infield', IF: 'Infield', UT: 'Infield',
  LF: 'Outfield', CF: 'Outfield', RF: 'Outfield', OF: 'Outfield',
};

function posGroup(pos: string): string {
  return POSITION_GROUP[pos] ?? 'Infield';
}

async function fetchRoster(teamId: number): Promise<RosterPlayer[]> {
  try {
    const url = `/api/teams/${teamId}/roster?season=${encodeURIComponent(CURRENT_SEASON)}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    return (await res.json()) as RosterPlayer[];
  } catch {
    return [];
  }
}

async function fetchTeamSeason(teamId: number): Promise<SeasonGame[]> {
  try {
    const url = `/api/games/season?teamId=${teamId}&season=${encodeURIComponent(CURRENT_SEASON)}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    return (await res.json()) as SeasonGame[];
  } catch {
    return [];
  }
}

// ── TeamLogo ──────────────────────────────────────────────────────────────────

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
  winnerName: string | null;
  loserName: string | null;
  onEnter: () => void;
}

function TodayCard({ game, teamAbbr, allStandings, winnerName, loserName, onEnter }: TodayCardProps): ReactElement {
  const status = game.status as 'live' | 'final' | 'scheduled';

  const { away, home } = getScores(game);
  const { inning, isTop, outs, bases } = getInningParts(game);
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

  // BUG 2 fix: dim only the loser's score, and only for a final game.
  // Live games (both flags false) and tie finals keep both scores at full ink.
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
    cardTag = (
      <span className="tp__tag">
        {weekday} <span className="num">{time}</span>
      </span>
    );
  }

  // BUG 3 — live: base state in center; footer shows starters.
  // Final: footer shows W/L decisions when available.
  const basesLabel = bases != null
    ? [bases.on1 && '1B', bases.on2 && '2B', bases.on3 && '3B'].filter(Boolean).join(', ')
    : null;

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
            <div className={`tp__gscore num${status === 'final' && !awayWon ? ' tp__gscore--dim' : ''}`}>{away ?? '–'}</div>
          )}

          {/* Center */}
          <div className={`tp__gmid${status === 'scheduled' ? ' tp__gmid--wide' : ''}`}>
            {status === 'live' && (
              <>
                <div className="tp__gmid-i">
                  {inning != null ? `${isTop === true ? '▲' : isTop === false ? '▼' : ''} ${ordinal(inning)}` : 'LIVE'}
                </div>
                <div className="tp__gmid-s num">
                  {outs != null ? `${outs} out` : ''}
                  {basesLabel ? `${outs != null ? ' · ' : ''}${basesLabel}` : ''}
                </div>
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
            <div className={`tp__gscore num${status === 'final' && !homeWon ? ' tp__gscore--dim' : ''}`}>{home ?? '–'}</div>
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
          {status === 'live' && (
            <span className="tp__gfoot-starters">
              {game.awayAbbr}: {awayProbable ?? '—'} · {game.homeAbbr}: {homeProbable ?? '—'}
            </span>
          )}
          {status === 'final' && (winnerName != null || loserName != null) && (
            <span className="tp__gfoot-decisions">
              {winnerName != null && (
                <><span className="tp__gfoot-w">W</span> {winnerName}</>
              )}
              {winnerName != null && loserName != null && <span className="tp__gfoot-sep"> · </span>}
              {loserName != null && (
                <><span className="tp__gfoot-l">L</span> {loserName}</>
              )}
            </span>
          )}
          {status === 'final' && winnerName == null && loserName == null && <span />}
          <button className="tp__enter-btn" onClick={onEnter}>Enter game →</button>
        </div>
      </div>
    </div>
  );
}

// ── RecentFormCard ────────────────────────────────────────────────────────────

interface RecentFormCardProps {
  standing: StandingTeamDto;
  /** null = season schedule not yet loaded; show count-based interim with "order not shown" label */
  formChips: ('W' | 'L')[] | null;
}

function RecentFormCard({ standing, formChips }: RecentFormCardProps): ReactElement {
  // formChips null → still loading → show count chips (all W then all L) — no implied order.
  const displayChips = formChips ?? buildCountChips(standing.lastTen);
  const orderKnown = formChips != null;

  return (
    <div className="tp__card">
      <div className="tp__card-hd">
        <span className="tp__card-t">Recent form</span>
      </div>
      <div className="tp__card-b">
        <div className="tp__form-row">
          {displayChips.map((chip, i) => (
            <div key={i} className={`tp__fchip ${chip === 'W' ? 'tp__fchip--w' : 'tp__fchip--l'}`}>{chip}</div>
          ))}
        </div>
        <div className={`tp__form-legend${orderKnown ? '' : ' tp__form-legend--center'}`}>
          {orderKnown ? (
            <>
              <span>10 games ago</span>
              <span>Most recent</span>
            </>
          ) : (
            <span>last {displayChips.length} · order not shown</span>
          )}
        </div>
        <div className="tp__form-splits">
          <div className="tp__fs">
            <div className="tp__fs-l">Home</div>
            <div className="tp__fs-v num">{standing.homeRecord ?? '—'}</div>
          </div>
          <div className="tp__fs">
            <div className="tp__fs-l">Away</div>
            <div className="tp__fs-v num">{standing.awayRecord ?? '—'}</div>
          </div>
          <div className="tp__fs">
            <div className="tp__fs-l">1-Run</div>
            <div className="tp__fs-v num">{standing.oneRunRecord ?? '—'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── RosterCard ────────────────────────────────────────────────────────────────

function RosterCard({ teamId }: { teamId: number }): ReactElement {
  const [players, setPlayers] = useState<RosterPlayer[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchRoster(teamId).then((data) => {
      if (!cancelled) { setPlayers(data); setLoaded(true); }
    }).catch(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, [teamId]);

  const GROUP_ORDER = ['Catcher', 'Infield', 'Outfield'];
  const grouped = GROUP_ORDER.map((group) => ({
    group,
    players: players.filter((p) => posGroup(p.position) === group),
  })).filter((g) => g.players.length > 0);

  return (
    <div className="tp__card">
      <div className="tp__card-hd">
        <span className="tp__card-t">Roster</span>
        <Segmented items={['Batters', 'Pitchers']} active={0} size="sm" />
      </div>
      {!loaded && (
        <div className="tp__card-b tp__card-b--stub">
          <span className="tp__stub-msg">Loading…</span>
        </div>
      )}
      {loaded && players.length === 0 && (
        <div className="tp__card-b tp__card-b--stub">
          <span className="tp__stub-msg">No roster data available</span>
        </div>
      )}
      {loaded && players.length > 0 && (
        <div className="tp__roster-wrap">
          <table className="tp__roster-table">
            <thead>
              <tr>
                <th className="tp__roster-th tp__roster-th--num">#</th>
                <th className="tp__roster-th">Name</th>
                <th className="tp__roster-th tp__roster-th--pos">Pos</th>
                <th className="tp__roster-th tp__roster-th--stat">AVG</th>
                <th className="tp__roster-th tp__roster-th--stat">HR</th>
                <th className="tp__roster-th tp__roster-th--stat">RBI</th>
                <th className="tp__roster-th tp__roster-th--stat">OPS</th>
              </tr>
            </thead>
            <tbody>
              {grouped.map(({ group, players: gp }) => (
                <>
                  <tr key={group} className="tp__roster-group">
                    <td colSpan={7}>{group}</td>
                  </tr>
                  {gp.map((p) => (
                    <tr key={p.mlbId} className="tp__roster-row">
                      <td className="tp__roster-td tp__roster-td--num num">{p.jersey}</td>
                      <td className="tp__roster-td">
                        <Link to={`/player/${p.mlbId}`} className="tp__roster-name">{p.name}</Link>
                      </td>
                      <td className="tp__roster-td tp__roster-td--pos">{p.position}</td>
                      <td className="tp__roster-td tp__roster-td--stat num">{p.avg ?? '—'}</td>
                      <td className="tp__roster-td tp__roster-td--stat num">{p.hr ?? '—'}</td>
                      <td className="tp__roster-td tp__roster-td--stat num">{p.rbi ?? '—'}</td>
                      <td className="tp__roster-td tp__roster-td--stat num">{p.ops ?? '—'}</td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
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

// ── TeamLeadersCard ───────────────────────────────────────────────────────────

interface LeaderEntry {
  playerId: number;
  playerName: string;
  teamId: number;
  value: string;
}

interface LeaderCategory {
  category: string;
  label: string;
  leaders: LeaderEntry[];
}

interface LeadersPayload {
  batting: LeaderCategory[];
  pitching: LeaderCategory[];
}

function LeaderRow({ rank, entry }: { rank: number; entry: LeaderEntry }): ReactElement {
  return (
    <div className="tp__tl-row">
      <span className="tp__tl-rank num">{rank}</span>
      <Link to={`/player/${entry.playerId}`} className="tp__tl-name">{entry.playerName}</Link>
      <span className="tp__tl-val num">{entry.value}</span>
    </div>
  );
}

function TeamLeadersCard({ teamMlbId }: { teamMlbId: number }): ReactElement {
  const [hr, setHr] = useState<LeaderEntry[]>([]);
  const [avg, setAvg] = useState<LeaderEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      try {
        const res = await fetch(`/api/leaders?teamId=${teamMlbId}`);
        if (!res.ok) return;
        const data = (await res.json()) as LeadersPayload;
        if (cancelled) return;
        const top3 = (key: string): LeaderEntry[] =>
          (data.batting.find(c => c.category === key)?.leaders ?? []).slice(0, 3);
        setHr(top3('homeRuns'));
        setAvg(top3('battingAverage'));
      } finally {
        if (!cancelled) setLoaded(true);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [teamMlbId]);

  const hasAny = hr.length > 0 || avg.length > 0;

  return (
    <div className="tp__card">
      <div className="tp__card-hd">
        <span className="tp__card-t">Team leaders</span>
        <Segmented items={['Bat', 'Pitch']} active={0} size="sm" />
      </div>
      <div className="tp__card-b tp__tl-body">
        {!loaded && <div className="tp__stub-msg">Loading…</div>}
        {loaded && !hasAny && <div className="tp__stub-msg">No leaders ranked in top 10</div>}
        {loaded && hasAny && (
          <>
            {hr.length > 0 && (
              <div className="tp__tl-section">
                <div className="tp__tl-label">Home Runs</div>
                {hr.map((e, i) => <LeaderRow key={e.playerId} rank={i + 1} entry={e} />)}
              </div>
            )}
            {hr.length > 0 && avg.length > 0 && <div className="tp__tl-divider" />}
            {avg.length > 0 && (
              <div className="tp__tl-section">
                <div className="tp__tl-label">Batting Avg</div>
                {avg.map((e, i) => <LeaderRow key={e.playerId} rank={i + 1} entry={e} />)}
              </div>
            )}
          </>
        )}
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
  const [formChips, setFormChips] = useState<('W' | 'L')[] | null>(null);
  const [todaySeasonGame, setTodaySeasonGame] = useState<SeasonGame | null>(null);

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

        // Resolve numeric team ID
        const myStanding = allStandings.find(s => s.abbr === abbr);
        const teamId = TEAMS[abbr]?.id
          ?? teamIdFromLogoUrl(logoUrlStr(myStanding?.logoUrl))
          ?? (myGame
            ? (myGame.homeAbbr?.toUpperCase() === abbr
              ? (typeof (myGame.homeTeamId as unknown) === 'number' ? (myGame.homeTeamId as unknown as number) : null)
              : (typeof (myGame.awayTeamId as unknown) === 'number' ? (myGame.awayTeamId as unknown as number) : null))
            : null);

        if (teamId != null) {
          // Fetch upcoming games and season schedule concurrently
          const [upResp, seasonGames] = await Promise.all([
            gamesApi.gamesUpcoming(String(teamId), '3').catch(() => null),
            fetchTeamSeason(teamId),
          ]);

          if (cancelled) return;

          if (upResp != null) {
            setUpcomingGames((upResp.data as unknown as GameDto[]) ?? []);
          }

          // BUG 1 fix: derive real W/L order from the game log
          const completed = seasonGames
            .filter(g => g.status === 'final' && g.teamScore !== null && g.oppScore !== null)
            .sort((a, b) => a.gameDate.localeCompare(b.gameDate));
          const last10 = completed.slice(-10);
          setFormChips(last10.map(g => (g.teamScore! > g.oppScore! ? 'W' : 'L')));

          // BUG 3 fix: stash today's game's decisions for the final footer
          const todayId = myGame?.providerGameId;
          if (todayId != null) {
            const found = seasonGames.find(g => g.providerGameId === todayId) ?? null;
            setTodaySeasonGame(found);
          }
        } else {
          // No teamId — can't fetch season schedule; use empty chips so count-interim shows
          setFormChips([]);
        }
      } catch (e) {
        console.error('TeamPage load error', e);
        setFormChips([]);
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

  // Hero eyebrow: read leagueName + division part directly — no abbreviate-then-expand.
  const divPart = (myStanding.divisionName.match(/East|Central|West/) ?? [''])[0];
  const heroEyebrow = `${myStanding.leagueName} ${divPart}`;

  // Abbreviation used only for the StandingsCard header (still needs AL/NL short form).
  const divisionLeagueAbbr = myStanding.leagueName === 'American League' ? 'AL' : 'NL';
  void divisionLeagueAbbr; // consumed by StandingsCard which builds its own label

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
            <div className="tp__eyebrow">{heroEyebrow}</div>
            <h1 className="tp__hero-name">{myStanding.displayName}</h1>
            <div className="tp__hero-meta">
              {TEAM_VENUES[abbr] != null ? (
                <>
                  <span>{TEAM_VENUES[abbr].venue} · {TEAM_VENUES[abbr].city}</span>
                  <span>Est. <span className="num">{TEAM_VENUES[abbr].founded}</span></span>
                </>
              ) : (
                <span>Est. —</span>
              )}
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
            {cardGame != null && (
              <TodayCard
                game={cardGame}
                teamAbbr={abbr}
                allStandings={standings}
                winnerName={todaySeasonGame?.winnerName ?? null}
                loserName={todaySeasonGame?.loserName ?? null}
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

            <RecentFormCard standing={myStanding} formChips={formChips} />

            {TEAMS[abbr]?.id != null && <RosterCard teamId={TEAMS[abbr].id} />}
          </div>

          {/* Right column */}
          <div className="tp__stack">
            {division.length > 0 && (
              <StandingsCard division={division} abbr={abbr} navigate={navigate} />
            )}
            {TEAMS[abbr]?.id != null && (
              <TeamLeadersCard teamMlbId={TEAMS[abbr].id} />
            )}
            <NextUpCard games={upcomingGames} teamAbbr={abbr} allStandings={standings} />
          </div>
        </div>
      </div>
    </div>
  );
}
