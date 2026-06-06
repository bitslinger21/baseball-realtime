import { useEffect, useState } from 'react';
import type { GameDto, PlayerPitchingDto, VsPlayerDto, SplitRowDto } from '@bitslinger21/baseball-realtime-client';
import { gamesApi, playersApi } from '../api/baseballApiClient';
import { TEAMS } from '../utils/teams';
import type { TeamInfo } from '../utils/teams';
import type {
  UpcomingGame, Pitcher, H2H, ArsenalEntry, LiveSplits, SplitDisplayRow,
} from '../pages/player/upcomingTypes';

const CURRENT_SEASON = String(new Date().getFullYear());
// Approximate MLB league-average OPS; used for split delta display.
const LEAGUE_OPS = 0.700;
// Default heat for statcast-pending pitcher location zone (group 4).
const PENDING_HEAT: number[] = Array(9).fill(0.28);

// ── formatters ────────────────────────────────────────────────────────────────

function fmt3(n: number): string {
  if (!isFinite(n)) return '.000';
  const s = n.toFixed(3);
  return n >= 1 ? s : s.replace('0.', '.');
}

function fmtDate(ymd: string): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  const day = d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
  const md  = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  return `${day} · ${md}`;
}

function fmtTime(utc: string | null | undefined): string {
  if (!utc) return 'TBD';
  const d = new Date(utc);
  if (isNaN(d.getTime())) return 'TBD';
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: '2-digit',
  }).formatToParts(d);
  const h    = parts.find(p => p.type === 'hour')?.value ?? '';
  const m    = parts.find(p => p.type === 'minute')?.value ?? '';
  const ampm = (parts.find(p => p.type === 'dayPeriod')?.value ?? '').toLowerCase().slice(0, 1);
  return `${h}:${m}${ampm} ET`;
}

function initials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function ipToDecimal(ip: string | null | undefined): number {
  if (!ip) return 0;
  const [whole, frac = '0'] = ip.split('.');
  return (parseInt(whole ?? '0', 10) + parseInt(frac, 10) / 3);
}

function computeK9(k: number | null | undefined, ip: string | null | undefined): string {
  const dec = ipToDecimal(ip);
  if (dec === 0 || k == null) return '—';
  return ((k / dec) * 9).toFixed(1);
}

function fallbackTeam(abbr: string): TeamInfo {
  return { abbr, id: 0, name: abbr, short: abbr, primary: 'hsl(210 15% 55%)', secondary: '#aaa' };
}

// ── H2H transform ─────────────────────────────────────────────────────────────

function toH2H(dto: VsPlayerDto): H2H | null {
  if (dto.ab === 0) return null;
  const { ab, h, hr, bb, pa, doubles, triples, rbi, k, avg } = dto;
  const obpN = pa > 0 ? (h + bb) / pa : 0;
  const slgN = ab > 0 ? (h + doubles + 2 * triples + 3 * hr) / ab : 0;
  const opsN = obpN + slgN;
  return {
    pa, ab, h, hr, rbi, bb, k,
    avg: avg ?? fmt3(ab > 0 ? h / ab : 0),
    obp: fmt3(obpN),
    slg: fmt3(slgN),
    ops: fmt3(opsN),
    lastFaced: null,
    log: [],
  };
}

// ── Pitcher transform ─────────────────────────────────────────────────────────

interface ProbableStub {
  mlbId?: number | null;
  name?: string | null;
  jerseyNumber?: string | null;
  pitchHand?: string | null;
}

function toPitcher(probable: ProbableStub, pitching: PlayerPitchingDto | null): Pitcher {
  const totals = pitching?.seasonTotals;
  const arsenal: ArsenalEntry[] = (pitching?.arsenal ?? []).map(a => ({
    type: a.pitchName,
    share: Math.round(a.usage),
    velo: a.avgVelocity != null ? a.avgVelocity.toFixed(1) : '—',
  }));

  const wins   = totals?.wins   ?? null;
  const losses = totals?.losses ?? null;
  const record = (wins != null && losses != null) ? `${wins}–${losses}` : '—';

  const pitchName = probable.name ?? 'TBD';
  const hand = (probable.pitchHand === 'L' || probable.pitchHand === 'R')
    ? probable.pitchHand as 'L' | 'R'
    : 'R';

  const top = arsenal[0];
  const attack = top
    ? `${top.type} (${top.share}% usage) is the primary pitch${hand === 'L' ? ' from the left side' : ''}.`
    : '';

  return {
    name: pitchName,
    throws: hand,
    num: probable.jerseyNumber != null ? parseInt(probable.jerseyNumber, 10) || 0 : 0,
    initials: initials(pitchName),
    mlbId: probable.mlbId ?? null,
    record,
    era:  totals?.era  ?? '—',
    whip: totals?.whip ?? '—',
    k9:   computeK9(totals?.strikeOuts, totals?.inningsPitched),
    ip:   totals?.inningsPitched ?? '—',
    arsenal: arsenal.length > 0 ? arsenal : [{ type: 'TBD', share: 100, velo: '—' }],
    heat: PENDING_HEAT,  // group 4: statcast-pending
    attack,
  };
}

function toPitcherTBD(): Pitcher {
  return {
    name: 'TBD', throws: 'R', num: 0, initials: 'TB', mlbId: null,
    record: '—', era: '—', whip: '—', k9: '—', ip: '—',
    arsenal: [{ type: 'TBD', share: 100, velo: '—' }],
    heat: PENDING_HEAT,
    attack: 'Probable starter has not yet been announced.',
  };
}

// ── lean heuristic ────────────────────────────────────────────────────────────

function computeLean(h2h: H2H | null, pitcherHand: 'R' | 'L'): 'batter' | 'pitcher' | 'even' {
  if (h2h != null && h2h.ab >= 5) {
    const ops = parseFloat(h2h.ops);
    if (ops >= 0.800) return 'batter';
    if (ops <= 0.550) return 'pitcher';
  }
  // light platoon signal: favor batter if pitcher is LHP (typical RHB advantage)
  if (h2h == null && pitcherHand === 'L') return 'batter';
  return 'even';
}

function buildRead(pitcher: Pitcher, h2h: H2H | null, lean: 'batter' | 'pitcher' | 'even'): string {
  if (h2h == null) {
    return `First meeting between these two${pitcher.name !== 'TBD' ? ` — ${pitcher.name} is a ${pitcher.throws}HP starter` : ''}. Projection leans on handedness and pitch-type history.`;
  }
  const dir = lean === 'batter' ? 'batter' : lean === 'pitcher' ? 'pitcher' : 'split evenly';
  return `Career line: ${h2h.avg} AVG · ${h2h.ops} OPS in ${h2h.pa} PA. Edge ${dir}.`;
}

// ── splits transform ──────────────────────────────────────────────────────────

function aggregateSplitRows(rows: SplitRowDto[]): SplitRowDto | null {
  if (rows.length === 0) return null;
  const ab  = rows.reduce((s, r) => s + r.atBats, 0);
  const h   = rows.reduce((s, r) => s + r.hits, 0);
  const hr  = rows.reduce((s, r) => s + r.homeRuns, 0);
  const bb  = rows.reduce((s, r) => s + r.baseOnBalls, 0);
  if (ab === 0) return null;
  const avg  = fmt3(h / ab);
  const pa   = ab + bb; // approx (no HBP/SF)
  const obp  = fmt3(pa > 0 ? (h + bb) / pa : 0);
  // Weight-average SLG since we lack 2B/3B at this level
  const slgSum = rows.reduce((s, r) => s + parseFloat(r.slg || '0') * r.atBats, 0);
  const slg  = fmt3(slgSum / ab);
  const opsN = parseFloat(obp) + parseFloat(slg);
  const ops  = fmt3(opsN);
  return { ...rows[0]!, atBats: ab, hits: h, homeRuns: hr, baseOnBalls: bb, avg, obp, slg, ops };
}

function toDisplayRow(label: string, row: SplitRowDto | null): SplitDisplayRow | null {
  if (!row) return null;
  const ops = parseFloat(row.ops || '0');
  const d   = ops - LEAGUE_OPS;
  const deltaStr = (d >= 0 ? '+' : '') + d.toFixed(3);
  return {
    label,
    line: `${row.avg} / ${row.obp} / ${row.slg}`,
    ops: row.ops,
    delta: deltaStr,
    hot: ops >= 0.720,
  };
}

function buildLiveSplits(rows: SplitRowDto[]): LiveSplits {
  const byCode = new Map(rows.map(r => [r.splitCode, r]));

  const fbRow  = aggregateSplitRows(['vs_ff', 'vs_ft', 'vs_si', 'vs_fc'].flatMap(c => byCode.has(c) ? [byCode.get(c)!] : []));
  const brkRow = aggregateSplitRows(['vs_sl', 'vs_cu'].flatMap(c => byCode.has(c) ? [byCode.get(c)!] : []));
  const osRow  = aggregateSplitRows(['vs_ch', 'vs_fs'].flatMap(c => byCode.has(c) ? [byCode.get(c)!] : []));

  return {
    vsHand: {
      R: toDisplayRow('vs RHP', byCode.get('vr') ?? null),
      L: toDisplayRow('vs LHP', byCode.get('vl') ?? null),
    },
    vsClass: [
      toDisplayRow('vs Fastball', fbRow),
      toDisplayRow('vs Breaking', brkRow),
      toDisplayRow('vs Offspeed', osRow),
    ].filter((r): r is SplitDisplayRow => r != null),
  };
}

// ── main transform ────────────────────────────────────────────────────────────

async function fetchUpcomingGames(
  batterId: number,
): Promise<{ games: UpcomingGame[]; splits: LiveSplits | null }> {
  // Step 1: team lookup
  const teamResp = await playersApi.playersGetPlayerTeam(batterId);
  const teamId = (teamResp.data as Record<string, unknown>).teamId as number | null;
  if (teamId == null) return { games: [], splits: null };

  // Step 2+3: upcoming schedule + batter splits in parallel
  const [gamesResp, splitsResp] = await Promise.all([
    gamesApi.gamesUpcoming(String(teamId), '3'),
    playersApi.playersGetPlayerSplits(batterId, CURRENT_SEASON).catch(() => null),
  ]);

  const gameList: GameDto[] = gamesResp.data ?? [];
  const splits = splitsResp != null ? buildLiveSplits(splitsResp.data.splits) : null;

  if (gameList.length === 0) return { games: [], splits };

  // Step 4: for each game, fetch pitcher pitching + H2H in parallel
  const upcomingGames = await Promise.all(
    gameList.map(async (game, idx): Promise<UpcomingGame> => {
      const gameTeamId = game.homeTeamId as unknown as number | null;
      const isHome = gameTeamId === teamId;
      const oppAbbr  = isHome ? (game.awayAbbr ?? '') : (game.homeAbbr ?? '');
      const opp: TeamInfo = TEAMS[oppAbbr] ?? fallbackTeam(oppAbbr);

      const probable = (isHome ? game.awayProbable : game.homeProbable) ?? null;
      const pitcherMlbId = probable?.mlbId ?? null;

      let pitching: PlayerPitchingDto | null = null;
      let vsDto: VsPlayerDto | null = null;

      if (pitcherMlbId != null) {
        [pitching, vsDto] = await Promise.all([
          playersApi
            .playersGetPlayerPitching(pitcherMlbId, CURRENT_SEASON)
            .then(r => r.data)
            .catch(() => null),
          playersApi
            .playersGetVsPlayer(batterId, pitcherMlbId)
            .then(r => r.data)
            .catch(() => null),
        ]);
      }

      const pitcher = probable != null ? toPitcher(probable, pitching) : toPitcherTBD();
      const h2h     = vsDto != null ? toH2H(vsDto) : null;
      const lean    = computeLean(h2h, pitcher.throws);

      return {
        id: game.providerGameId ?? `game-${idx}`,
        date: fmtDate(game.gameDate ?? ''),
        time: fmtTime(game.startTimeUtc),
        home: isHome,
        opp,
        venue: game.venue ?? (opp.name + ' Stadium'),
        pitcher,
        h2h,
        lean,
        read: buildRead(pitcher, h2h, lean),
      };
    }),
  );

  return { games: upcomingGames, splits };
}

// ── hook ──────────────────────────────────────────────────────────────────────

export function useUpcomingGames(batterId: number | null): {
  games: UpcomingGame[];
  splits: LiveSplits | null;
  loading: boolean;
  error: string | null;
} {
  const [games,   setGames]   = useState<UpcomingGame[]>([]);
  const [splits,  setSplits]  = useState<LiveSplits | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (batterId == null) {
      setGames([]);
      setSplits(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchUpcomingGames(batterId)
      .then(({ games: g, splits: s }) => {
        if (cancelled) return;
        setGames(g);
        setSplits(s);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load upcoming games');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [batterId]);

  return { games, splits, loading, error };
}
