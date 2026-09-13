import './TeamPage.css';
import type { ReactElement } from 'react';
import { Fragment, useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom';
import type { StandingTeamDto, GameViewDto, GameDto, BoxScoreDto, PitcherLineDto } from '@bitslinger21/baseball-realtime-client';
import { standingsApi, gamesApi, playersApi } from '../api/baseballApiClient';
import { PageTitle } from '../components/primitives/PageTitle';
import { BrandHeader } from '../components/primitives/BrandHeader';
import { getReturnLabel } from '../utils/backLabel';
import { LivePill, Pill } from '../components/primitives/Pill';
import { ResultChip } from '../components/primitives/ResultChip';
import { RouteTabs } from '../components/primitives/RouteTabs';
import { PlayerThumb } from '../components/primitives/PlayerThumb';
import { Segmented } from '../components/primitives/Segmented';
import { TEAM_NICKNAMES } from '../utils/teamNicknames';
import { TEAMS } from '../utils/teams';

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
  winnerId: number | null;
  loserId: number | null;
  oppAbbr: string;
  oppName: string;
  isHome: boolean;
}

// A Recent-form chip, bound to the game it represents. Only the count-based
// interim (buildCountChips) omits the game fields — a chip that cannot name
// its game must not claim an order.
interface FormChip {
  result: 'W' | 'L';
  date?: string;
  oppAbbr?: string;
  oppName?: string;
  isHome?: boolean;
  teamScore?: number;
  oppScore?: number;
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

// The generated SDK types these fields as `object | null` (an OpenAPI-generator
// quirk on this DTO's optional-nullable primitives) — same cast pattern as
// getProbableName above.
function getProbableMlbId(probable: unknown): number | null {
  const p = probable as Record<string, unknown> | null | undefined;
  return typeof p?.mlbId === 'number' ? p.mlbId : null;
}

function getProbableJersey(probable: unknown): string | null {
  const p = probable as Record<string, unknown> | null | undefined;
  return typeof p?.jerseyNumber === 'string' ? p.jerseyNumber : null;
}

function getProbableHand(probable: unknown): 'L' | 'R' | null {
  const p = probable as Record<string, unknown> | null | undefined;
  return p?.pitchHand === 'L' || p?.pitchHand === 'R' ? p.pitchHand : null;
}

function handLabel(hand: 'L' | 'R' | 'LHP' | 'RHP' | null | undefined): string {
  if (hand === 'L' || hand === 'LHP') return 'LHP';
  if (hand === 'R' || hand === 'RHP') return 'RHP';
  return 'P';
}

async function fetchPitcherSeasonLine(mlbId: number): Promise<string | null> {
  try {
    const res = await playersApi.playersGetPlayerPitching(mlbId, CURRENT_SEASON);
    const totals = res.data.seasonTotals;
    if (totals == null || totals.wins == null || totals.losses == null) return null;
    const record = `${totals.wins}–${totals.losses}`;
    return totals.era != null ? `${record} · ${totals.era} ERA` : record;
  } catch {
    return null;
  }
}

async function fetchGameBoxScore(providerGameId: string): Promise<BoxScoreDto | null> {
  try {
    const res = await fetch(`/api/boxscore/${providerGameId}`);
    if (!res.ok) return null;
    return (await res.json()) as BoxScoreDto;
  } catch {
    return null;
  }
}

// Build count-based chips from "8-2" lastTen string: W's first, then L's.
// Used as interim while real game-log chips are loading — no implied order,
// so these chips carry no game binding (no date/opponent/score).
function buildCountChips(lastTen: string): FormChip[] {
  const m = lastTen.match(/^(\d+)-(\d+)$/);
  if (!m) return [];
  const w = parseInt(m[1]!, 10);
  const l = parseInt(m[2]!, 10);
  return [
    ...Array<FormChip>(Math.max(0, w)).fill({ result: 'W' }),
    ...Array<FormChip>(Math.max(0, l)).fill({ result: 'L' }),
  ].slice(0, 10);
}

// "Aug 15" — short date for the chip legend and tooltip, no year (season-scoped).
function fmtChipDate(gameDate: string): string {
  const d = new Date(`${gameDate}T12:00:00Z`);
  const month = d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
  return `${month} ${d.getUTCDate()}`;
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
  '1B': 'Infield', '2B': 'Infield', '3B': 'Infield', SS: 'Infield', IF: 'Infield', UT: 'Infield',
  LF: 'Outfield', CF: 'Outfield', RF: 'Outfield', OF: 'Outfield',
  DH: 'Designated hitter',
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

// ── Probable/current pitcher block ───────────────────────────────────────────
// "One frame, three fills" (Team Page - Today card states.html): the same
// facing-blocks layout shows probables (scheduled), the current mound arm
// (live), or the decision pitchers (final).

interface ProbSide {
  mlbId: number | null;
  name: string;
  teamAbbr: string;
  hand: string;
  jerseyNumber: string | null;
  statLine: string | null;
  badge: 'W' | 'L' | null;
}

function ProbBlock({ side, reversed }: { side: ProbSide; reversed?: boolean }): ReactElement {
  return (
    <div className={`tp__prob${reversed ? ' tp__prob--r' : ''}`}>
      <PlayerThumb mlbId={side.mlbId} className="tp__prob-shot" />
      <div>
        <div className="tp__prob-n">{side.name}</div>
        <div className="tp__prob-m">{side.hand}{side.jerseyNumber ? ` #${side.jerseyNumber}` : ''} · {side.teamAbbr}</div>
        {side.statLine != null && (
          <div className="tp__prob-s num">
            {side.badge != null && <span className={`tp__prob-wl tp__prob-wl--${side.badge.toLowerCase()}`}>{side.badge}</span>}
            {side.badge != null ? ' ' : ''}{side.statLine}
          </div>
        )}
      </div>
    </div>
  );
}

// ── TodayCard ─────────────────────────────────────────────────────────────────

interface TodayCardProps {
  game: GameViewDto;
  allStandings: StandingTeamDto[];
  winnerName: string | null;
  loserName: string | null;
  winnerId: number | null;
  loserId: number | null;
  onEnter: () => void;
}

function TodayCard({ game, allStandings, winnerName, loserName, winnerId, loserId, onEnter }: TodayCardProps): ReactElement {
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

  const { time } = fmtTime(game.startTimeUtc);

  let cardTitle: string;
  let cardTag: ReactElement | null = null;
  if (status === 'live') {
    cardTitle = 'Today';
    cardTag = <LivePill />;
  } else if (status === 'final') {
    cardTitle = 'Last game';
    cardTag = <Pill tone="soft">Final</Pill>;
  } else {
    // Scheduled: no header tag — the date/time already anchors the wide
    // center column below; the header carries venue alone (design source).
    cardTitle = 'Next game';
  }

  const basesLabel = bases != null
    ? [bases.on1 && '1B', bases.on2 && '2B', bases.on3 && '3B'].filter(Boolean).join(', ')
    : null;

  // Facing pitcher blocks: probables (scheduled), current mound arm (live),
  // or decision pitchers (final) — one fetch, three fills.
  const [awayProb, setAwayProb] = useState<ProbSide | null>(null);
  const [homeProb, setHomeProb] = useState<ProbSide | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      if (status === 'scheduled') {
        const awayId = getProbableMlbId(game.awayProbable);
        const homeId = getProbableMlbId(game.homeProbable);
        const awayName = getProbableName(game.awayProbable);
        const homeName = getProbableName(game.homeProbable);
        const [awayLine, homeLine] = await Promise.all([
          awayId != null ? fetchPitcherSeasonLine(awayId) : Promise.resolve(null),
          homeId != null ? fetchPitcherSeasonLine(homeId) : Promise.resolve(null),
        ]);
        if (cancelled) return;
        setAwayProb(awayName != null ? {
          mlbId: awayId, name: awayName, teamAbbr: game.awayAbbr,
          hand: handLabel(getProbableHand(game.awayProbable)),
          jerseyNumber: getProbableJersey(game.awayProbable),
          statLine: awayLine, badge: null,
        } : null);
        setHomeProb(homeName != null ? {
          mlbId: homeId, name: homeName, teamAbbr: game.homeAbbr,
          hand: handLabel(getProbableHand(game.homeProbable)),
          jerseyNumber: getProbableJersey(game.homeProbable),
          statLine: homeLine, badge: null,
        } : null);
        return;
      }

      const providerGameId = game.providerGameId;
      if (providerGameId == null) {
        if (!cancelled) { setAwayProb(null); setHomeProb(null); }
        return;
      }
      const box = await fetchGameBoxScore(providerGameId);
      if (cancelled) return;
      if (box == null) { setAwayProb(null); setHomeProb(null); return; }

      if (status === 'live') {
        const awayPitcher = box.away.pitching[box.away.pitching.length - 1] ?? null;
        const homePitcher = box.home.pitching[box.home.pitching.length - 1] ?? null;
        const toLiveSide = (p: PitcherLineDto | null, teamAbbr: string): ProbSide | null =>
          p == null ? null : {
            mlbId: p.playerId, name: p.name, teamAbbr,
            hand: handLabel(p.handedness), jerseyNumber: p.jerseyNumber ?? null,
            statLine: `${p.ip} IP · ${p.so} K · ${p.er} ER`, badge: null,
          };
        setAwayProb(toLiveSide(awayPitcher, game.awayAbbr));
        setHomeProb(toLiveSide(homePitcher, game.homeAbbr));
        return;
      }

      // Final — decision pitchers. jersey/hand come from this game's own
      // boxscore line; record/ERA are the pitcher's season totals.
      const allPitchers = [...box.away.pitching, ...box.home.pitching];
      const winnerBox = winnerId != null ? allPitchers.find(p => p.playerId === winnerId) ?? null : null;
      const loserBox = loserId != null ? allPitchers.find(p => p.playerId === loserId) ?? null : null;
      const [winnerLine, loserLine] = await Promise.all([
        winnerId != null ? fetchPitcherSeasonLine(winnerId) : Promise.resolve(null),
        loserId != null ? fetchPitcherSeasonLine(loserId) : Promise.resolve(null),
      ]);
      if (cancelled) return;

      const winnerSide: ProbSide | null = winnerName != null ? {
        mlbId: winnerId, name: winnerName, teamAbbr: awayWon ? game.awayAbbr : game.homeAbbr,
        hand: handLabel(winnerBox?.handedness), jerseyNumber: winnerBox?.jerseyNumber ?? null,
        statLine: winnerLine, badge: 'W',
      } : null;
      const loserSide: ProbSide | null = loserName != null ? {
        mlbId: loserId, name: loserName, teamAbbr: awayWon ? game.homeAbbr : game.awayAbbr,
        hand: handLabel(loserBox?.handedness), jerseyNumber: loserBox?.jerseyNumber ?? null,
        statLine: loserLine, badge: 'L',
      } : null;

      if (awayWon) { setAwayProb(winnerSide); setHomeProb(loserSide); }
      else { setAwayProb(loserSide); setHomeProb(winnerSide); }
    }

    void load();
    return () => { cancelled = true; };
  }, [status, game, winnerId, loserId, winnerName, loserName, awayWon]);

  return (
    <div className="tp__card">
      <div className="tp__card-hd">
        <span className="tp__card-t">{cardTitle}</span>
        <div className="tp__hd-r">
          {venue && (
            <span className="tp__venue">
              <svg width="13" height="11" viewBox="0 0 13 11" aria-hidden="true">
                <path d="M1 10V4.6L6.5 1 12 4.6V10" fill="none" stroke="var(--color-border-strong)" strokeWidth="1.4" strokeLinejoin="round" />
              </svg>
              {venue}
            </span>
          )}
          {cardTag}
        </div>
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

        {/* Facing pitcher blocks — probables / current arm / decisions */}
        {awayProb != null && homeProb != null && (
          <div className="tp__probs">
            <ProbBlock side={awayProb} />
            <span className="tp__prob-vs">vs</span>
            <ProbBlock side={homeProb} reversed />
          </div>
        )}

        {/* Footer */}
        <div className="tp__gfoot tp__gfoot--end">
          <button className="tp__enter-btn" onClick={onEnter}>Enter game →</button>
        </div>
      </div>
    </div>
  );
}

// ── RecentFormCard ────────────────────────────────────────────────────────────

interface RecentFormGame {
  providerGameId: string;
  gameDate: string;
  scored: number;
  allowed: number;
  result: 'W' | 'L';
}

interface RecentFormStats {
  wins: number;
  losses: number;
  runsPerGame: number;
  teamEra: number | null;
  bullpenEra: number | null;
  homeRuns: number;
  strikeouts: number;
  walks: number;
  games: RecentFormGame[];
}

async function fetchRecentFormStats(teamId: number): Promise<RecentFormStats | null> {
  try {
    const res = await fetch(`/api/teams/${teamId}/recent-form?count=10`);
    if (!res.ok) return null;
    return (await res.json()) as RecentFormStats;
  } catch {
    return null;
  }
}

interface RecentFormCardProps {
  standing: StandingTeamDto;
  /** null = season schedule not yet loaded; show count-based interim with "order not shown" label */
  formChips: FormChip[] | null;
  teamId: number | null;
}

function chipTitle(chip: FormChip): string | undefined {
  if (chip.date == null || chip.oppAbbr == null || chip.teamScore == null || chip.oppScore == null) {
    return undefined;
  }
  const vsAt = chip.isHome ? 'vs' : '@';
  const oppNick = TEAM_NICKNAMES[chip.oppAbbr] ?? chip.oppName ?? chip.oppAbbr;
  return `${fmtChipDate(chip.date)} · ${vsAt} ${oppNick} · ${chip.result} ${chip.teamScore}–${chip.oppScore}`;
}

// Two decimal places, or an em dash when there's no innings-pitched data to
// divide by (rather than showing "0.00", which would read as a real number).
function fmtEra(era: number | null): string {
  return era != null ? era.toFixed(2) : '—';
}

function RunsChart({ games }: { games: RecentFormGame[] }): ReactElement | null {
  if (games.length === 0) return null;

  const max = Math.max(10, ...games.map((g) => Math.max(g.scored, g.allowed)));
  const W = 304;
  const H = 118;
  const n = games.length;
  const x = (i: number): number => (n === 1 ? W / 2 : (i / (n - 1)) * W);
  const y = (v: number): number => H - (v / max) * H;

  const scoredPts = games.map((g, i) => `${x(i)},${y(g.scored)}`).join(' ');
  const allowedPts = games.map((g, i) => `${x(i)},${y(g.allowed)}`).join(' ');

  return (
    <div className="tp__chart">
      <div className="tp__chart-y num">
        <span>{max}</span>
        <span>{Math.round(max / 2)}</span>
        <span>0</span>
      </div>
      <div className="tp__chart-plot">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Runs scored versus runs allowed over recent games">
          <g stroke="var(--color-border-light, #e0dccd)" strokeWidth={1} vectorEffect="non-scaling-stroke">
            <line x1={0} y1={y(max)} x2={W} y2={y(max)} />
            <line x1={0} y1={y(max / 2)} x2={W} y2={y(max / 2)} />
            <line x1={0} y1={y(0)} x2={W} y2={y(0)} />
          </g>
          <polyline fill="none" stroke="var(--color-info)" strokeWidth={1.8} strokeLinejoin="round" vectorEffect="non-scaling-stroke" points={allowedPts} />
          <polyline fill="none" stroke="var(--color-accent)" strokeWidth={2.4} strokeLinejoin="round" vectorEffect="non-scaling-stroke" points={scoredPts} />
        </svg>
        {games.map((g, i) => (
          <span key={`a-${g.providerGameId}`} className="tp__chart-pt tp__chart-pt--allowed" style={{ left: `${(x(i) / W) * 100}%`, top: `${(y(g.allowed) / H) * 100}%` }} />
        ))}
        {games.map((g, i) => (
          <span key={`s-${g.providerGameId}`} className="tp__chart-pt tp__chart-pt--scored" style={{ left: `${(x(i) / W) * 100}%`, top: `${(y(g.scored) / H) * 100}%` }} />
        ))}
      </div>
    </div>
  );
}

function RecentFormCard({ standing, formChips, teamId }: RecentFormCardProps): ReactElement {
  // formChips null → still loading → show count chips (all W then all L) — no implied order.
  const displayChips = formChips ?? buildCountChips(standing.lastTen);
  const orderKnown = formChips != null;
  const firstDate = displayChips[0]?.date;
  const lastDate = displayChips[displayChips.length - 1]?.date;

  const [stats, setStats] = useState<RecentFormStats | null>(null);
  useEffect(() => {
    if (teamId == null) return;
    let cancelled = false;
    fetchRecentFormStats(teamId).then((data) => { if (!cancelled) setStats(data); });
    return () => { cancelled = true; };
  }, [teamId]);

  return (
    <div className="tp__card">
      <div className="tp__card-hd">
        <span className="tp__card-t">Recent form <span className="tp__card-t-sub">· last 10 games</span></span>
      </div>
      <div className="tp__card-b">
        <div className="tp__form-grid">
          <div className="tp__form-stats">
            <div className="tp__frow">
              <span className="tp__frow-l">Record</span>
              <span className="tp__frow-v num tp__frow-v--pos">{stats ? `${stats.wins}-${stats.losses}` : '—'}</span>
            </div>
            <div className="tp__frow">
              <span className="tp__frow-l">Runs per game</span>
              <span className="tp__frow-v num">{stats ? stats.runsPerGame.toFixed(1) : '—'}</span>
            </div>
            <div className="tp__frow">
              <span className="tp__frow-l">Team ERA</span>
              <span className="tp__frow-v num">{stats ? fmtEra(stats.teamEra) : '—'}</span>
            </div>
            <div className="tp__frow">
              <span className="tp__frow-l">Bullpen ERA</span>
              <span className="tp__frow-v num">{stats ? fmtEra(stats.bullpenEra) : '—'}</span>
            </div>
            <div className="tp__frow">
              <span className="tp__frow-l">Team OPS</span>
              <span className="tp__frow-v num tp__frow-v--muted">Needs data</span>
            </div>
            <div className="tp__frow">
              <span className="tp__frow-l">Home runs</span>
              <span className="tp__frow-v num">{stats ? stats.homeRuns : '—'}</span>
            </div>
            <div className="tp__frow">
              <span className="tp__frow-l">K / BB</span>
              <span className="tp__frow-v num">{stats ? `${stats.strikeouts} / ${stats.walks}` : '—'}</span>
            </div>
            <div className="tp__frow">
              <span className="tp__frow-l">Fielding %</span>
              <span className="tp__frow-v num tp__frow-v--muted">Needs data</span>
            </div>
          </div>

          <div>
            <div className="tp__sub-t">Game results</div>
            <div className="tp__form-row">
              {displayChips.map((chip, i) => (
                <div key={i} className="tp__fchip-cell" title={chipTitle(chip)}>
                  <ResultChip result={chip.result} variant="circle" />
                </div>
              ))}
            </div>
            <div className={`tp__form-legend${orderKnown ? '' : ' tp__form-legend--center'}`}>
              {orderKnown && firstDate != null && lastDate != null ? (
                <>
                  <span>{fmtChipDate(firstDate)}</span>
                  <span>Most recent · {fmtChipDate(lastDate)}</span>
                </>
              ) : orderKnown ? (
                <>
                  <span>10 games ago</span>
                  <span>Most recent</span>
                </>
              ) : (
                <span>last {displayChips.length} · order not shown</span>
              )}
            </div>

            {stats != null && stats.games.length > 0 && (
              <>
                <div className="tp__chart-hd">
                  <div className="tp__sub-t">Runs scored vs allowed</div>
                  <div className="tp__legend">
                    <span><i className="tp__legend-swatch" style={{ background: 'var(--color-accent)' }} />Scored</span>
                    <span><i className="tp__legend-swatch" style={{ background: 'var(--color-info)' }} />Allowed</span>
                  </div>
                </div>
                <RunsChart games={stats.games} />
                <div className="tp__chart-x">
                  <span>10 games ago</span>
                  <span>Most recent</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── SeasonPulseCard ─────────────────────────────────────────────────────────

interface SeasonPulsePhase {
  key: string;
  label: string;
  statLabel: string;
  statValue: number;
  rank: number;
  prevRank: number;
}

interface SeasonPulseData {
  computedAt: string;
  overallLabel: string;
  overall: { rank: number; prevRank: number; movement: number; narrative: string };
  weeklyRanks: number[];
  phases: SeasonPulsePhase[];
}

async function fetchSeasonPulse(teamId: number): Promise<SeasonPulseData | null> {
  try {
    const res = await fetch(`/api/season-pulse/${teamId}`);
    if (!res.ok) return null;
    const data = (await res.json()) as Partial<SeasonPulseData>;
    return data.overall != null ? (data as SeasonPulseData) : null;
  } catch {
    return null;
  }
}

function fmtPhaseStat(p: SeasonPulsePhase): string {
  return p.statLabel === 'ERA' ? p.statValue.toFixed(2) : p.statValue.toFixed(1);
}

// Rank axis is inverted — 1st at the top. Getting this backwards inverts the
// meaning of the whole card (PROMPT_season_pulse.md §1).
function SeasonPulseChart({ weeklyRanks }: { weeklyRanks: number[] }): ReactElement | null {
  if (weeklyRanks.length === 0) return null;

  const W = 220;
  const H = 96;
  const n = weeklyRanks.length;
  const x = (i: number): number => (n === 1 ? W / 2 : (i / (n - 1)) * W);
  const y = (rank: number): number => ((rank - 1) / 29) * H;

  const pts = weeklyRanks.map((r, i) => `${x(i)},${y(r)}`).join(' ');
  const areaPts = `0,${H} ${pts} ${x(n - 1)},${H}`;
  const lastX = x(n - 1);
  const lastY = y(weeklyRanks[n - 1]);

  return (
    <div className="tp__pulse-chart">
      <div className="tp__pulse-chart-y">
        <span>1st</span>
        <span>30th</span>
      </div>
      <div className="tp__pulse-chart-plot">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Overall rank over the last 12 weeks">
          <line x1={0} y1={H / 2} x2={W} y2={H / 2} stroke="var(--color-border-light, #e0dccd)" strokeWidth={1} strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
          <polygon points={areaPts} fill="var(--color-accent)" opacity={0.12} />
          <polyline points={pts} fill="none" stroke="var(--color-accent)" strokeWidth={2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
        <span className="tp__pulse-chart-dot" style={{ left: `${(lastX / W) * 100}%`, top: `${(lastY / H) * 100}%` }} />
      </div>
    </div>
  );
}

// Bar fill is rank-as-proportion; the league-median tick sits at a constant
// 50% (median of 1..30 is always 15.5) — no median stat value needed.
function SeasonPulsePhaseRow({ phase }: { phase: SeasonPulsePhase }): ReactElement {
  const fillPct = ((31 - phase.rank) / 30) * 100;
  const improved = phase.rank < phase.prevRank;
  const worsened = phase.rank > phase.prevRank;
  return (
    <div className="tp__pulse-row">
      <span className="tp__pulse-row-l">{phase.label}</span>
      <span className="tp__pulse-row-stat num">
        {fmtPhaseStat(phase)} <span className="tp__pulse-row-unit">{phase.statLabel}</span>
      </span>
      <div className="tp__pulse-bar">
        <div className="tp__pulse-bar-fill" style={{ width: `${fillPct}%` }} />
        <div className="tp__pulse-bar-tick" />
      </div>
      <span className="tp__pulse-col num">{ordinal(phase.prevRank)}</span>
      <span className={`tp__pulse-col num${improved ? ' tp__pulse-col--pos' : worsened ? ' tp__pulse-col--neg' : ''}`}>
        {ordinal(phase.rank)}
      </span>
    </div>
  );
}

function SeasonPulseCard({ teamId }: { teamId: number | null }): ReactElement {
  const [data, setData] = useState<SeasonPulseData | null>(null);
  useEffect(() => {
    if (teamId == null) return;
    let cancelled = false;
    fetchSeasonPulse(teamId).then((d) => { if (!cancelled) setData(d); });
    return () => { cancelled = true; };
  }, [teamId]);

  if (data == null) {
    return (
      <div className="tp__card">
        <div className="tp__card-hd">
          <span className="tp__card-t">Season pulse</span>
        </div>
        <div className="tp__card-b tp__card-b--stub">
          <span className="tp__stub-msg">Loading…</span>
        </div>
      </div>
    );
  }

  const { overall, weeklyRanks, phases } = data;
  const improved = overall.movement > 0;

  return (
    <div className="tp__card">
      <div className="tp__card-hd">
        <span className="tp__card-t">Season pulse</span>
      </div>
      <div className="tp__card-b tp__pulse-b">
        <div className="tp__pulse-head">
          <div>
            <div className="tp__pulse-rank-row">
              <span className="tp__pulse-rank num">{ordinal(overall.rank)}</span>
              {overall.movement !== 0 && (
                <span className={`tp__pulse-chip${improved ? ' tp__pulse-chip--pos' : ' tp__pulse-chip--neg'}`}>
                  {improved ? '▲' : '▼'}{Math.abs(overall.movement)}
                </span>
              )}
            </div>
            {overall.narrative !== '' && <div className="tp__pulse-narrative">{overall.narrative}</div>}
          </div>
          <SeasonPulseChart weeklyRanks={weeklyRanks} />
        </div>

        <div className="tp__pulse-phases">
          <div className="tp__pulse-phases-hd">
            <span />
            <span />
            <span />
            <span className="tp__pulse-col-h">PREV</span>
            <span className="tp__pulse-col-h">NOW</span>
          </div>
          {phases.map((p) => <SeasonPulsePhaseRow key={p.key} phase={p} />)}
        </div>

        <div className="tp__pulse-foot">
          Rank among 30 clubs · tick marks the league median · Prev is the 30 days before last · Overall = {data.overallLabel.toLowerCase()}.
        </div>
      </div>
    </div>
  );
}

// ── BullpenCard ───────────────────────────────────────────────────────────────

interface BullpenPitcher {
  mlbId: number;
  name: string;
  hand: 'L' | 'R';
  evidence: string;
  state: 'ready' | 'available' | 'rest';
}

interface BullpenStatus {
  availableCount: number;
  totalCount: number;
  pitchers: BullpenPitcher[];
}

async function fetchBullpenStatus(teamId: number): Promise<BullpenStatus | null> {
  try {
    const res = await fetch(`/api/teams/${teamId}/bullpen`);
    if (!res.ok) return null;
    return (await res.json()) as BullpenStatus;
  } catch {
    return null;
  }
}

const BULLPEN_STATE_LABEL: Record<BullpenPitcher['state'], string> = {
  ready: 'Ready',
  available: 'Available',
  rest: 'Rest',
};

// Every numeral is mono/tabular (PROMPT_bullpen_injuries.md §5.10) — the
// evidence string is a server-formatted sentence, so wrap just its digit
// runs rather than the whole thing.
function renderEvidence(evidence: string): ReactElement[] {
  return evidence.split(/(\d+)/).map((part, i) =>
    /^\d+$/.test(part) ? <span key={i} className="num">{part}</span> : <Fragment key={i}>{part}</Fragment>,
  );
}

function BullpenRow({ p }: { p: BullpenPitcher }): ReactElement {
  return (
    <div className="bp">
      <div>
        <div className="bp-n"><Link to={`/player/${p.mlbId}`}>{p.name}</Link></div>
        <div className="bp-m">{p.hand === 'L' ? 'LHP' : 'RHP'} · {renderEvidence(p.evidence)}</div>
      </div>
      <span className={`bp-s ${p.state === 'ready' ? 'rdy' : p.state === 'available' ? 'av' : 'un'}`}>
        {BULLPEN_STATE_LABEL[p.state]}
      </span>
    </div>
  );
}

function BullpenCard({ teamId }: { teamId: number | null }): ReactElement {
  const [data, setData] = useState<BullpenStatus | null>(null);
  useEffect(() => {
    if (teamId == null) return;
    let cancelled = false;
    fetchBullpenStatus(teamId).then((d) => { if (!cancelled) setData(d); });
    return () => { cancelled = true; };
  }, [teamId]);

  if (data == null) {
    return (
      <div className="tp__card">
        <div className="tp__card-hd">
          <span className="tp__card-t">Bullpen status</span>
        </div>
        <div className="tp__card-b tp__card-b--stub">
          <span className="tp__stub-msg">Loading…</span>
        </div>
      </div>
    );
  }

  // The "Unavailable" group label appears once, right before the first rest-
  // state row, and is dropped entirely when nobody is resting — a label over
  // no rows reads as a loading failure (PROMPT_bullpen_injuries.md §2).
  const firstRestIdx = data.pitchers.findIndex((p) => p.state === 'rest');

  return (
    <div className="tp__card">
      <div className="tp__card-hd">
        <span className="tp__card-t">Bullpen status</span>
        <span className="tp__card-note">
          <span className="num">{data.availableCount}</span> of <span className="num">{data.totalCount}</span> available
        </span>
      </div>
      <div className="tp__card-b tp__card-b--col">
        {data.pitchers.map((p, i) => (
          <Fragment key={p.mlbId}>
            {i === firstRestIdx && <div className="bp-grp">Unavailable</div>}
            <BullpenRow p={p} />
          </Fragment>
        ))}
        <div className="bp-f">
          Unavailable = pitched on consecutive days, or <span className="num">25</span>+ pitches in the last two. Starters and injured arms are not listed.
        </div>
      </div>
    </div>
  );
}

// ── InjuriesCard ──────────────────────────────────────────────────────────────

interface InjuryEntry {
  mlbId: number;
  name: string;
  position: string;
  ilType: '60-day' | '15-day' | '10-day';
  injuryDescription: string | null;
  sinceDate: string;
  expectedReturn: string;
}

interface InjuriesData {
  players: InjuryEntry[];
}

async function fetchInjuries(teamId: number): Promise<InjuriesData | null> {
  try {
    const res = await fetch(`/api/teams/${teamId}/injuries`);
    if (!res.ok) return null;
    return (await res.json()) as InjuriesData;
  } catch {
    return null;
  }
}

function fmtSinceDate(dateStr: string): { month: string; day: string } | null {
  if (dateStr === '') return null;
  const d = new Date(`${dateStr}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return {
    month: d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }),
    day: String(d.getUTCDate()),
  };
}

function InjuryRow({ p }: { p: InjuryEntry }): ReactElement {
  const since = fmtSinceDate(p.sinceDate);
  return (
    <div className="inj">
      <PlayerThumb mlbId={p.mlbId} className="lshot" />
      <div>
        <div className="inj-n"><Link to={`/player/${p.mlbId}`}>{p.name}</Link></div>
        <div className="inj-m">
          {p.position} · {p.ilType} IL{p.injuryDescription ? ` (${p.injuryDescription})` : ''}
          {since && <> · since {since.month} <span className="num">{since.day}</span></>}
        </div>
      </div>
      <span className="inj-d">{p.expectedReturn}</span>
    </div>
  );
}

function InjuriesCard({ teamId }: { teamId: number | null }): ReactElement {
  const [data, setData] = useState<InjuriesData | null>(null);
  useEffect(() => {
    if (teamId == null) return;
    let cancelled = false;
    fetchInjuries(teamId).then((d) => { if (!cancelled) setData(d); });
    return () => { cancelled = true; };
  }, [teamId]);

  const loaded = data != null;
  const players = data?.players ?? [];

  return (
    <div className="tp__card">
      <div className="tp__card-hd">
        <span className="tp__card-t">Injuries</span>
        {/* Destination not designed yet (PROMPT_bullpen_injuries.md §7) — inert
            by intent, not a bug. */}
        <span className="tp__card-a tp__card-a--inert">All transactions →</span>
      </div>
      <div className="tp__card-b">
        {!loaded && <span className="tp__stub-msg">Loading…</span>}
        {loaded && players.length === 0 && (
          <div className="inj-e">
            No players on the injured list. Recent call-ups, options and other moves are in{' '}
            <span className="tp__card-a--inert">all transactions</span>.
          </div>
        )}
        {loaded && players.length > 0 && (
          <>
            <div className="inj-hd"><span>Injured list</span><span>Est. return</span></div>
            {players.map((p) => <InjuryRow key={p.mlbId} p={p} />)}
          </>
        )}
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

  const GROUP_ORDER = ['Infield', 'Outfield', 'Catcher', 'Designated hitter'];
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
        <span className="tp__card-t">Next 5 games</span>
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

          const rowCls = `tp__nextup-row${i < games.length - 1 ? ' tp__nextup-row--border' : ''}`;
          const rowContent = (
            <>
              <TeamLogo abbr={oppAbbr} src={oppLogo} size={22} />
              <div className="tp__nextup-opp">{vsAt} {oppNick}</div>
              <div className="tp__nextup-time num">{weekday} <span>{time}</span></div>
            </>
          );

          return game.providerGameId ? (
            <Link key={i} to={`/game/${game.providerGameId}`} className={rowCls}>
              {rowContent}
            </Link>
          ) : (
            <div key={i} className={rowCls}>{rowContent}</div>
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
    <Link to={`/player/${entry.playerId}`} className="tp__tl-row">
      <span className="tp__tl-rank num">{rank}</span>
      <span className="tp__tl-name">{entry.playerName}</span>
      <span className="tp__tl-val num">{entry.value}</span>
    </Link>
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
  const returnLabel = getReturnLabel(locState?.from, locState?.fromLabel);
  const handleBack = useCallback((): void => {
    const from = locState?.from;
    if (from) navigate(from);
    else navigate('/');
  }, [navigate, locState?.from]);

  const [standings, setStandings] = useState<StandingTeamDto[]>([]);
  const [todayGame, setTodayGame] = useState<GameViewDto | null>(null);
  const [upcomingGames, setUpcomingGames] = useState<GameDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [formChips, setFormChips] = useState<FormChip[] | null>(null);
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
            gamesApi.gamesUpcoming(String(teamId), '5').catch(() => null),
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
          setFormChips(last10.map(g => ({
            result: g.teamScore! > g.oppScore! ? 'W' : 'L',
            date: g.gameDate,
            oppAbbr: g.oppAbbr,
            oppName: g.oppName,
            isHome: g.isHome,
            teamScore: g.teamScore!,
            oppScore: g.oppScore!,
          })));

          // BUG 3 fix: stash today's game's decisions (TodayCard fetches the
          // pitchers' own season lines + boxscore jersey/hand itself).
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
        <BrandHeader active="teams" />
        <div className="tp__wrap">
          <PageTitle title="Team" returnTo={returnLabel != null ? { label: returnLabel, onClick: handleBack } : undefined} />
          <div className="tp__loading">Loading…</div>
        </div>
      </div>
    );
  }

  if (myStanding == null) {
    return (
      <div className="tp-page">
        <BrandHeader active="teams" />
        <div className="tp__wrap">
          <PageTitle title="Team" returnTo={returnLabel != null ? { label: returnLabel, onClick: handleBack } : undefined} />
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
      <BrandHeader active="teams" />
      <div className="tp__wrap">
        {/* Hero — this screen's h1 + eyebrow; no separate top PageTitle, so the
            contextual return (when present) sits directly above the hero row,
            reusing PageTitle's own return-link styling for consistency. */}
        {returnLabel != null && (
          <button type="button" className="page-title-row__return" onClick={handleBack}>
            ← {returnLabel}
          </button>
        )}
        <div className="tp__hero">
          <div className="tp__hero-logo">
            {heroLogoSrc
              ? <img src={heroLogoSrc} alt={myStanding.displayName} width={96} height={96} style={{ width: 96, height: 96, objectFit: 'contain' }} />
              : <span className="tp__logo-fb" style={{ width: 96, height: 96, fontSize: 42 }}>{abbr.charAt(0)}</span>
            }
          </div>
          <div className="tp__hero-id">
            <h1 className="tp__hero-name">{myStanding.displayName}</h1>
            <div className="tp__hero-meta">
              <span className="tp__eyebrow">{heroEyebrow}</span>
              {myStanding.venue != null && myStanding.city != null && (
                <span> · {myStanding.venue} · {myStanding.city}</span>
              )}
              <span> · Est. <span className="num">{myStanding.founded ?? '—'}</span></span>
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
              <div className={`tp__hstat-v num${streakIsWin ? ' tp__hstat-v--pos' : ' tp__hstat-v--neg'}`}>
                {myStanding.streak}
              </div>
              <div className="tp__hstat-sub num">{myStanding.lastTen} L10</div>
            </div>
          </div>
        </div>

        <RouteTabs
          items={[
            { label: 'Overview', to: `/team/${abbr}` },
            { label: 'Schedule', to: `/team/${abbr}/schedule` },
            { label: 'Transactions', to: `/team/${abbr}/transactions` },
          ]}
          activeIndex={0}
        />

        {/* Two-column grid */}
        <div className="tp__cols">
          {/* Left column */}
          <div className="tp__stack">
            {/* Next game + Season pulse sit side by side, matching the design —
                they're the two "top strip" cards, not a vertical stack. */}
            <div className="tp__row">
              {cardGame != null ? (
                <TodayCard
                  game={cardGame}
                  allStandings={standings}
                  winnerName={todaySeasonGame?.winnerName ?? null}
                  loserName={todaySeasonGame?.loserName ?? null}
                  winnerId={todaySeasonGame?.winnerId ?? null}
                  loserId={todaySeasonGame?.loserId ?? null}
                  onEnter={() => {
                    const id = cardGame.providerGameId;
                    if (id) navigate(`/game/${id}`);
                  }}
                />
              ) : (
                <div className="tp__card">
                  <div className="tp__card-hd">
                    <span className="tp__card-t">Schedule</span>
                  </div>
                  <div className="tp__card-b tp__card-b--stub">
                    <span className="tp__stub-msg">No game today or upcoming</span>
                  </div>
                </div>
              )}

              <SeasonPulseCard teamId={TEAMS[abbr]?.id ?? null} />
            </div>

            <RecentFormCard standing={myStanding} formChips={formChips} teamId={TEAMS[abbr]?.id ?? null} />

            {TEAMS[abbr]?.id != null && <RosterCard teamId={TEAMS[abbr].id} />}
          </div>

          {/* Right column */}
          <div className="tp__stack">
            {division.length > 0 && (
              <StandingsCard division={division} abbr={abbr} navigate={navigate} />
            )}

            <NextUpCard games={upcomingGames} teamAbbr={abbr} allStandings={standings} />

            {TEAMS[abbr]?.id != null && (
              <TeamLeadersCard teamMlbId={TEAMS[abbr].id} />
            )}

            <BullpenCard teamId={TEAMS[abbr]?.id ?? null} />

            <InjuriesCard teamId={TEAMS[abbr]?.id ?? null} />
          </div>
        </div>
      </div>
    </div>
  );
}
