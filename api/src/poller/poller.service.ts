import { Injectable } from '@nestjs/common';
import { MlbApiService } from '../providers/mlb/mlb.service';
import type { MlbLiveFeed } from '../providers/mlb/mlb.types';
import { TeamsMetaService } from '../teams/teams-meta.service';

// GameMeta: basic metadata and branding for a game
export type GameMeta = {
  gameId: string;
  gameDate?: string;
  status?: 'live' | 'scheduled' | 'final';
  startTimeUtc?: string | null;

  homeTeamId?: number;
  awayTeamId?: number;
  homeAbbr?: string;
  awayAbbr?: string;
  homeName?: string;
  awayName?: string;

  // Branding for score blocks
  homePrimaryColor?: string;
  awayPrimaryColor?: string;
  homeLogoUrl?: string;
  awayLogoUrl?: string;
};

export type TeamRhe = {
  runs: number;
  hits: number;
  errors: number;
};

export type Linescore = {
  away: TeamRhe;
  home: TeamRhe;
  inningRuns?: {
    away: (number | null)[];
    home: (number | null)[];
  };
};

type AboutLike = {
  inning?: number;
  halfInning?: "top" | "bottom" | string;
  outs?: number;
  atBatIndex?: number;
  playIndex?: number;
  isComplete?: boolean;
};

export type LiveUpdate = {
  gameId: string;
  inning: number;
  half: 'Top' | 'Bottom';
  outs: number;
  count: { balls: number; strikes: number };
  bases: { on1?: boolean; on2?: boolean; on3?: boolean };

  batter?: { id?: number; name?: string };
  pitcher?: { id?: number; name?: string };

  batterId?: string;
  batterName?: string;
  pitcherId?: string;
  pitcherName?: string;

  playResult?:
  | 'Single'
  | 'Double'
  | 'Triple'
  | 'HomeRun'
  | 'Walk'
  | 'Strikeout'
  | 'Out'
  | 'DoublePlay'
  | 'TriplePlay'
  | 'HBP'
  | 'Error'
  | 'Other';

  creditedHit?: 0 | 1;
  pitcherOutsRecordedThisPlay?: 0 | 1 | 2 | 3;

  homeScore?: number;
  awayScore?: number;

  description?: string;

  snapshot?: unknown;
  meta?: unknown;

  playKey?: string;

  // schedule-ish meta (optional)
  gameDate?: string;
  homeAbbr?: string;
  awayAbbr?: string;
  homeTeamId?: number;
  awayTeamId?: number;

  // Branding hints (client can map teamId->logo/color, but these let server provide directly)
  homePrimaryColor?: string;
  awayPrimaryColor?: string;
  homeLogoUrl?: string;
  awayLogoUrl?: string;

  homeName?: string;
  awayName?: string;
  status?: 'live' | 'scheduled' | 'final';
  startTimeUtc?: string | null;

  // Season stats for the current matchup (best-effort)
  pitcherEra?: number;
  batterAvg?: number;

  // NEW: lets processor/alerts decide whether to trigger “at-bat” alerts
  isFinalPitchOfAtBat?: boolean;
  scorebookCode?: string;    // e.g. 'K', 'F8', '6-3', '6-4-3'

  pitchType?: string;        // e.g. "4-Seam Fastball"
  pitchTypeCode?: string;    // e.g. "FF"
  pitchSpeedMph?: number;    // e.g. 97.4
  atBatIndex?: number;
  pitchX?: number;
  pitchZ?: number;
  strikeZoneTop?: number;
  strikeZoneBottom?: number;
  batterGameAB?: number;
  batterGameH?: number;
  batterGameR?: number;
  batterGameRBI?: number;

  linescore?: Linescore;

  homeTeamWinProbability?: number;
  leverageIndex?: number;
};

type MlbRunnerCredit = {
  position?: { code?: string };
  credit?: string; // 'f_assist' | 'f_putout' | 'f_fielded_ball'
};

type MlbRunner = {
  movement?: {
    outBase?: string | null;
    isOut?: boolean;
  };
  credits?: MlbRunnerCredit[];
};

type MlbPlay = {
  count?: { balls?: number; strikes?: number };
  matchup?: {
    batter?: { id?: number; fullName?: string };
    pitcher?: { id?: number; fullName?: string };
  };
  result?: {
    description?: string;
    event?: string;
    homeScore?: number;
    awayScore?: number;
  };
  about?: {
    halfInning?: string;
    inning?: number;
    outs?: number;
    isComplete?: boolean;
    atBatIndex?: number;
    playIndex?: number;
  };
  runners?: MlbRunner[];
  playEvents?: Array<{
    index?: number;
    isPitch?: boolean;
    type?: string;
    startTime?: string;
    endTime?: string;
    details?: {
      description?: string;
      call?: { code?: string; description?: string };
      isStrike?: boolean;
      isBall?: boolean;
      isInPlay?: boolean;
    };
    count?: { balls?: number; strikes?: number; outs?: number };
  }>;
};

type PitchFrame = {
  play: MlbPlay;
  pitch: NonNullable<MlbPlay['playEvents']>[number];
  pitchIdxWithinPlay: number;
  pitchCount: { balls?: number; strikes?: number; outs?: number };
  pitchDescription?: string;
  pitchIndex?: number;
  inning: number;
  half: 'Top' | 'Bottom';
  outs: number;
  atBatIndex?: number;
  playIndex?: number;
  isFinalPitchOfAtBat: boolean;
};

@Injectable()
export class PollerService {
  constructor(
    private readonly mlb: MlbApiService,
    private readonly teamsMeta: TeamsMetaService,
  ) { }

  /**
   * Track last known outs per game so we can compute pitcherOutsRecordedThisPlay.
   */
  private readonly lastOutsByGame = new Map<
    string,
    { inning: number; half: 'Top' | 'Bottom'; outs: number }
  >();

  private readonly gameMetaCache = new Map<
    string,
    { meta: GameMeta; cachedAtMs: number }
  >();

  private readonly GAME_META_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

  private readonly winProbCache = new Map<string, {
    data: Array<{ atBatIndex: number; homeTeamWinProbability: number; leverageIndex?: number }>;
    fetchedAt: number;
  }>();
  private readonly WIN_PROB_TTL_MS = 30_000;

  private async fetchWinProb(gameId: string): Promise<Array<{ atBatIndex: number; homeTeamWinProbability: number; leverageIndex?: number }>> {
    const cached = this.winProbCache.get(gameId);
    if (cached != null && Date.now() - cached.fetchedAt < this.WIN_PROB_TTL_MS) {
      return cached.data;
    }
    try {
      const data = await this.mlb.getWinProbability(gameId);
      this.winProbCache.set(gameId, { data, fetchedAt: Date.now() });
      return data;
    } catch {
      return cached?.data ?? [];
    }
  }

  public async fetchGameMeta(gameId: string): Promise<GameMeta> {
    const cached = this.gameMetaCache.get(gameId);
    const nowMs = Date.now();

    if (cached != null && nowMs - cached.cachedAtMs < this.GAME_META_TTL_MS) {
      return cached.meta;
    }

    const feed: MlbLiveFeed = await this.mlb.getLiveFeed(gameId);

    const gd = (feed as unknown as { gameData?: any }).gameData ?? {};
    const teams = gd.teams ?? {};
    const homeTeam = teams.home ?? {};
    const awayTeam = teams.away ?? {};

    const homeAbbr: string | undefined =
      homeTeam.abbreviation ?? homeTeam.teamName ?? undefined;

    const awayAbbr: string | undefined =
      awayTeam.abbreviation ?? awayTeam.teamName ?? undefined;

    const homeTeamId: number | undefined =
      typeof homeTeam.id === 'number' ? homeTeam.id : undefined;

    const awayTeamId: number | undefined =
      typeof awayTeam.id === 'number' ? awayTeam.id : undefined;

    const startTimeUtc: string | null =
      typeof gd.datetime?.dateTime === 'string' ? gd.datetime.dateTime : null;

    const officialDate: string | undefined = gd.datetime?.officialDate;

    const rawState: string | undefined =
      gd.status?.abstractGameState ?? gd.status?.detailedState;

    const status: 'live' | 'scheduled' | 'final' | undefined =
      rawState?.toLowerCase().includes('final')
        ? 'final'
        : rawState?.toLowerCase().includes('live') ||
          rawState?.toLowerCase().includes('in progress')
          ? 'live'
          : rawState != null
            ? 'scheduled'
            : undefined;

    const homeBranding = this.getBrandingForAbbr(homeAbbr);
    const awayBranding = this.getBrandingForAbbr(awayAbbr);

    const meta: GameMeta = {
      gameId,
      gameDate: officialDate,
      status,
      startTimeUtc,

      homeTeamId,
      awayTeamId,
      homeAbbr,
      awayAbbr,
      homeName: homeTeam.name ?? undefined,
      awayName: awayTeam.name ?? undefined,

      homePrimaryColor: homeBranding?.primaryColor,
      awayPrimaryColor: awayBranding?.primaryColor,
      homeLogoUrl: homeBranding?.logoUrl,
      awayLogoUrl: awayBranding?.logoUrl,
    };

    this.gameMetaCache.set(gameId, { meta, cachedAtMs: nowMs });
    return meta;
  }

  public async fetchLatest(gameId: string): Promise<LiveUpdate> {
    const history = await this.fetchHistory(gameId);
    if (history.length > 0) {
      return history[history.length - 1];
    }

    const feed: MlbLiveFeed = await this.mlb.getLiveFeed(gameId);

    // --- optional game metadata (best-effort; depends on your provider types) ---
    const gd = (feed as unknown as { gameData?: any }).gameData ?? {};
    const teams = gd.teams ?? {};
    const homeTeam = teams.home ?? {};
    const awayTeam = teams.away ?? {};

    const homeAbbr: string | undefined =
      homeTeam.abbreviation ?? homeTeam.teamName ?? undefined;

    const awayAbbr: string | undefined =
      awayTeam.abbreviation ?? awayTeam.teamName ?? undefined;

    const homeTeamId: number | undefined =
      typeof homeTeam.id === 'number' ? homeTeam.id : undefined;

    const awayTeamId: number | undefined =
      typeof awayTeam.id === 'number' ? awayTeam.id : undefined;

    const startTimeUtc: string | null =
      typeof gd.datetime?.dateTime === 'string' ? gd.datetime.dateTime : null;

    const officialDate: string | undefined = gd.datetime?.officialDate;

    const rawState: string | undefined =
      gd.status?.abstractGameState ?? gd.status?.detailedState;

    const status: 'live' | 'scheduled' | 'final' | undefined =
      rawState?.toLowerCase().includes('final')
        ? 'final'
        : rawState?.toLowerCase().includes('live') ||
          rawState?.toLowerCase().includes('in progress')
          ? 'live'
          : rawState != null
            ? 'scheduled'
            : undefined;

    // --- live data ---
    const liveData = (feed as unknown as { liveData?: any }).liveData ?? {};
    const boxscore = liveData.boxscore ?? {};
    const boxTeams = boxscore.teams ?? {};
    const boxHome = boxTeams.home ?? {};
    const boxAway = boxTeams.away ?? {};
    const plays = liveData.plays ?? {};
    const linescore = liveData.linescore ?? {};

    const lsTeams = (linescore as any)?.teams ?? {};
    const lsInnings: any[] = Array.isArray((linescore as any)?.innings) ? (linescore as any).innings : [];

    const rhe: Linescore = {
      away: {
        runs: Number(lsTeams.away?.runs ?? 0),
        hits: Number(lsTeams.away?.hits ?? 0),
        errors: Number(lsTeams.away?.errors ?? 0),
      },
      home: {
        runs: Number(lsTeams.home?.runs ?? 0),
        hits: Number(lsTeams.home?.hits ?? 0),
        errors: Number(lsTeams.home?.errors ?? 0),
      },
      inningRuns: {
        away: lsInnings.map((inn: any) => typeof inn?.away?.runs === 'number' ? inn.away.runs as number : null),
        home: lsInnings.map((inn: any) => typeof inn?.home?.runs === 'number' ? inn.home.runs as number : null),
      },
    };

    // Limit to recent plays so memory stays bounded
    const MAX_REPLAY_PLAYS = 250;
    const allPlays: readonly MlbPlay[] = Array.isArray(plays.allPlays)
      ? (plays.allPlays as MlbPlay[]).slice(-MAX_REPLAY_PLAYS)
      : [];

    const frames: PitchFrame[] = this.buildPitchFrames(feed, allPlays);

    // If we have pitch frames, always use the newest (prevents replay/duplication)
    const frame: PitchFrame | null = frames.length > 0 ? frames[frames.length - 1] : null;

    // Fallback: if there are no frames (weird), use currentPlay last pitch like before
    const playSource: MlbPlay =
      frame?.play ??
      ((plays.currentPlay as MlbPlay | undefined) ?? {});

    const currentPlay = playSource;
    const about = currentPlay.about ?? {};
    const result = currentPlay.result ?? {};
    const countFromPlay = currentPlay.count ?? {};

    const inning: number =
      frame?.inning ??
      (typeof about.inning === 'number'
        ? about.inning
        : Number(linescore.currentInning ?? 0) || 0);

    const half: 'Top' | 'Bottom' =
      frame?.half ??
      (about.halfInning === 'top'
        ? 'Top'
        : about.halfInning === 'bottom'
          ? 'Bottom'
          : linescore.isTopInning
            ? 'Top'
            : 'Bottom');

    const outs: number =
      frame?.outs ?? (typeof about.outs === 'number' ? about.outs : 0);

    // Compute outs recorded on this pitch (delta)
    let outsOnPlay: 0 | 1 | 2 | 3 = 0;
    const prev = this.lastOutsByGame.get(gameId);

    if (prev != null && prev.inning === inning && prev.half === half) {
      const delta = outs - prev.outs;
      outsOnPlay = delta >= 3 ? 3 : delta === 2 ? 2 : delta === 1 ? 1 : 0;
    } else {
      outsOnPlay = 0;
    }
    this.lastOutsByGame.set(gameId, { inning, half, outs });

    const pitchCount = frame?.pitchCount ?? {};
    const count = {
      balls: Number(pitchCount.balls ?? countFromPlay.balls ?? 0) || 0,
      strikes: Number(pitchCount.strikes ?? countFromPlay.strikes ?? 0) || 0,
    };

    // Bases: prefer currentPlay.runners movement; fall back to linescore.offense
    const runners = Array.isArray((currentPlay as unknown as { runners?: unknown }).runners)
      ? ((currentPlay as unknown as { runners?: Array<any> }).runners ?? [])
      : [];

    // Deduplicate runners by player ID: keep each runner's LAST movement in the array.
    // currentPlay.runners accumulates all sub-event movements across the PA (WP, SB, then hit).
    // Without dedup, a runner who ends at "third" via WP and then "score" via the hit would
    // leave on3=true even though they scored. Last-entry wins; "score" correctly vacates the base.
    const finalEndByRunner = new Map<number | string, string | null>();
    const anonymousEnds: Array<string> = [];
    for (const r of runners) {
      const runnerId = r?.details?.runner?.id;
      const end: string | null = typeof r?.movement?.end === "string" ? r.movement.end : null;
      if (runnerId != null) {
        finalEndByRunner.set(runnerId, end);
      } else if (end != null) {
        anonymousEnds.push(end);
      }
    }
    const occupied = new Set<number>();
    const addBase = (end: string | null) => {
      if (end === "first" || end === "1B") occupied.add(1);
      else if (end === "second" || end === "2B") occupied.add(2);
      else if (end === "third" || end === "3B") occupied.add(3);
      // "score" / null → runner is off the bases, nothing to add
    };
    for (const end of finalEndByRunner.values()) addBase(end);
    for (const end of anonymousEnds) addBase(end);

    // If runners[] didn't tell us anything, fall back to linescore.offense
    const offense = linescore.offense ?? {};
    const bases = {
      on1: occupied.size > 0 ? occupied.has(1) : offense.first != null,
      on2: occupied.size > 0 ? occupied.has(2) : offense.second != null,
      on3: occupied.size > 0 ? occupied.has(3) : offense.third != null,
    };

    // Batter / pitcher
    const batterInfo = currentPlay.matchup?.batter ?? {};
    const pitcherInfo = currentPlay.matchup?.pitcher ?? {};
    const batter = { id: batterInfo.id, name: batterInfo.fullName };
    const pitcher = { id: pitcherInfo.id, name: pitcherInfo.fullName };

    const batterId: string | undefined =
      batterInfo.id != null ? String(batterInfo.id) : undefined;
    const batterName: string | undefined = batterInfo.fullName;
    const pitcherId: string | undefined =
      pitcherInfo.id != null ? String(pitcherInfo.id) : undefined;
    const pitcherName: string | undefined = pitcherInfo.fullName;

    const batterIdNum: number | undefined =
      typeof batterInfo.id === 'number' ? batterInfo.id : undefined;

    const pitcherIdNum: number | undefined =
      typeof pitcherInfo.id === 'number' ? pitcherInfo.id : undefined;

    const readPlayer = (
      team: any,
      playerId: number | undefined,
    ): any | undefined => {
      if (playerId == null) return undefined;
      const players = team?.players ?? {};
      const key = `ID${playerId}`;
      const p = players?.[key];
      return p != null ? p : undefined;
    };

    const batterFromHome = readPlayer(boxHome, batterIdNum);
    const batterFromAway = readPlayer(boxAway, batterIdNum);
    const batterPlayer = batterFromHome ?? batterFromAway;

    const pitcherFromHome = readPlayer(boxHome, pitcherIdNum);
    const pitcherFromAway = readPlayer(boxAway, pitcherIdNum);
    const pitcherPlayer = pitcherFromHome ?? pitcherFromAway;

    const batterAvgRaw: unknown =
      batterPlayer?.seasonStats?.batting?.avg ??
      batterPlayer?.seasonStats?.batting?.average ??
      undefined;

    const pitcherEraRaw: unknown =
      pitcherPlayer?.seasonStats?.pitching?.era ??
      pitcherPlayer?.seasonStats?.pitching?.earnedRunAverage ??
      undefined;

    const batterAvg: number | undefined =
      typeof batterAvgRaw === 'string'
        ? Number(batterAvgRaw)
        : typeof batterAvgRaw === 'number'
          ? batterAvgRaw
          : undefined;

    const pitcherEra: number | undefined =
      typeof pitcherEraRaw === 'string'
        ? Number(pitcherEraRaw)
        : typeof pitcherEraRaw === 'number'
          ? pitcherEraRaw
          : undefined;

    // Scoreboard (won’t change pitch-by-pitch in replay, but fine for UI)
    const homeScore: number =
      typeof result.homeScore === 'number'
        ? result.homeScore
        : Number(linescore.teams?.home?.runs ?? linescore.home?.runs ?? 0) || 0;

    const awayScore: number =
      typeof result.awayScore === 'number'
        ? result.awayScore
        : Number(linescore.teams?.away?.runs ?? linescore.away?.runs ?? 0) || 0;

    // Only treat playResult as the at-bat result on the FINAL pitch of the at-bat
    const rawEvent: string | undefined =
      frame?.isFinalPitchOfAtBat === true ? (result.event ?? undefined) : undefined;

    const playResult: LiveUpdate['playResult'] = this.mapEventToPlayResult(rawEvent);

    // Compute enriched scorebook code on final pitch only
    const scorebookCode: string | undefined =
      frame?.isFinalPitchOfAtBat === true ? this.computeScorebookCode(frame.play) : undefined;

    const creditedHit: 0 | 1 =
      playResult === 'Single' ||
        playResult === 'Double' ||
        playResult === 'Triple' ||
        playResult === 'HomeRun'
        ? 1
        : 0;

    const description: string | undefined =
      frame?.pitchDescription ?? result.description ?? result.event;

    const atBatIndex: number | undefined =
      frame?.atBatIndex ??
      (typeof about.atBatIndex === 'number' ? about.atBatIndex : undefined);

    const playIndex: number | undefined =
      frame?.playIndex ??
      (typeof about.playIndex === 'number' ? about.playIndex : undefined);

    const pitchIndex: number | undefined = frame?.pitchIndex;

    // Use the pitch event index if available; fall back to the pitch's position within the at-bat
    const pitchKeyPart: string =
      pitchIndex != null
        ? String(pitchIndex)
        : frame != null
          ? String(frame.pitchIdxWithinPlay)
          : playIndex != null
            ? String(playIndex)
            : 'na';

    const playKey: string = [
      inning,
      half,
      atBatIndex ?? 'na',
      pitchKeyPart,
    ].join('-');

    if (process.env.DEBUG_BASES === "1") {
      // eslint-disable-next-line no-console
      console.log("[bases]", gameId, inning, half, bases, "runners=", runners.length);
    }
    const homeBranding = this.getBrandingForAbbr(homeAbbr);
    const awayBranding = this.getBrandingForAbbr(awayAbbr);

    // Use the actual frame pitch instead of re-scanning currentPlay
    type PitchEvent = {
      isPitch?: boolean;
      pitchData?: {
        startSpeed?: number;
        pitchType?: string;
        coordinates?: { pX?: number; pZ?: number };
        strikeZoneTop?: number;
        strikeZoneBottom?: number;
      };
      details?: {
        type?: {
          description?: string;
          code?: string;
        };
      };
    };

    // frame?.pitch is the exact pitch event we selected above
    const framePitch: PitchEvent | undefined =
      frame?.pitch as unknown as PitchEvent | undefined;

    const pitchType: string | undefined =
      framePitch?.details?.type?.description ??
      framePitch?.details?.type?.code ??
      framePitch?.pitchData?.pitchType;

    const pitchTypeCode: string | undefined =
      framePitch?.details?.type?.code ?? undefined;

    const pitchSpeedMph: number | undefined =
      typeof framePitch?.pitchData?.startSpeed === 'number'
        ? framePitch.pitchData.startSpeed
        : undefined;

    const pitchX: number | undefined =
      typeof framePitch?.pitchData?.coordinates?.pX === 'number'
        ? framePitch.pitchData.coordinates.pX : undefined;
    const pitchZ: number | undefined =
      typeof framePitch?.pitchData?.coordinates?.pZ === 'number'
        ? framePitch.pitchData.coordinates.pZ : undefined;
    const strikeZoneTop: number | undefined =
      typeof framePitch?.pitchData?.strikeZoneTop === 'number'
        ? framePitch.pitchData.strikeZoneTop : undefined;
    const strikeZoneBottom: number | undefined =
      typeof framePitch?.pitchData?.strikeZoneBottom === 'number'
        ? framePitch.pitchData.strikeZoneBottom : undefined;

    const batterGameStats = batterPlayer?.stats?.batting;
    const batterGameAB: number | undefined =
      typeof batterGameStats?.atBats === 'number' ? batterGameStats.atBats : undefined;
    const batterGameH: number | undefined =
      typeof batterGameStats?.hits === 'number' ? batterGameStats.hits : undefined;
    const batterGameR: number | undefined =
      typeof batterGameStats?.runs === 'number' ? batterGameStats.runs : undefined;
    const batterGameRBI: number | undefined =
      typeof batterGameStats?.rbi === 'number' ? batterGameStats.rbi : undefined;

    return {
      gameId,
      inning,
      half,
      outs,
      count,
      bases,

      batter,
      pitcher,

      batterId,
      batterName,
      pitcherId,
      pitcherName,
      pitcherEra,
      batterAvg,

      playResult,
      creditedHit,
      pitcherOutsRecordedThisPlay: outsOnPlay,

      homeScore,
      awayScore,
      description,

      playKey,

      snapshot: { linescore, currentPlay },
      meta: { gamePk: gameId, ts: Date.now() },

      gameDate: officialDate,
      homeAbbr,
      awayAbbr,
      homeTeamId,
      awayTeamId,
      // Branding hints
      homePrimaryColor: homeBranding?.primaryColor,
      awayPrimaryColor: awayBranding?.primaryColor,
      homeLogoUrl: homeBranding?.logoUrl,
      awayLogoUrl: awayBranding?.logoUrl,
      homeName: homeTeam.name ?? '',
      awayName: awayTeam.name ?? '',
      status,
      startTimeUtc,

      isFinalPitchOfAtBat: frame?.isFinalPitchOfAtBat ?? false,
      scorebookCode,
      pitchType,
      pitchTypeCode,
      pitchSpeedMph,
      atBatIndex,
      pitchX,
      pitchZ,
      strikeZoneTop,
      strikeZoneBottom,
      batterGameAB,
      batterGameH,
      batterGameR,
      batterGameRBI,
      linescore: rhe,
    };
  }

  private getBrandingForAbbr(abbr: string | undefined):
    | { primaryColor: string; logoUrl: string }
    | undefined {
    if (abbr == null) return undefined;
    const meta = this.teamsMeta.getByAbbr(abbr);
    if (meta == null) return undefined;
    return {
      primaryColor: meta.primaryColorHex ?? '',
      logoUrl: meta.logoUrl ?? '',
    };
  }

  /** Build a scorebook out-code from the raw MLB play, reaching the highest available tier:
   *  Tier A (fielder-coded): 'K', 'F8', '6-3', '6-4-3', etc.
   *  Tier B (type-only):     'GO', 'FO', 'LO', 'PO'
   *  Tier C (generic):       'OUT'
   *  Returns undefined for non-out events (hits, walks, etc.).
   */
  private computeScorebookCode(play: MlbPlay): string | undefined {
    const event = (play.result?.event ?? '').trim();
    const v = event.toLowerCase();

    // Non-outs — handled by existing playResult path, not here
    if (!v || v.includes('single') || v.includes('double') || v.includes('triple') ||
        v.includes('home run') || v.includes('walk') || v.includes('hit by pitch') ||
        v.includes('field error') || v.includes('fielder')) {
      return undefined;
    }

    // Strikeout — Tier A (no fielder needed for code)
    if (v.includes('strikeout')) {
      // Check last pitch's call code for called (C) vs swinging (S)
      const pitches = play.playEvents ?? [];
      const lastPitch = [...pitches].reverse().find(e => e.isPitch === true || e.type === 'pitch');
      const callCode = lastPitch?.details?.call?.code ?? '';
      // Called third strike uses 'C'; swinging uses 'S', 'T', 'W', 'F'
      return callCode === 'C' ? 'ꓘ' : 'K';
    }

    // Sacrifice fly / bunt
    if (v.includes('sac fly') || v === 'sac fly') return 'SF';
    if (v.includes('sac bunt') || v.includes('sacrifice bunt')) return 'SH';

    const runners: MlbRunner[] = play.runners ?? [];

    // Helper: build credit sequence [assist1, assist2, ..., putout] from credits array
    const creditSeq = (credits: MlbRunnerCredit[]): string[] => {
      const assists = credits.filter(c => c.credit === 'f_assist').map(c => c.position?.code ?? '').filter(Boolean);
      const putouts = credits.filter(c => c.credit === 'f_putout').map(c => c.position?.code ?? '').filter(Boolean);
      return [...assists, ...putouts];
    };

    if (v === 'groundout') {
      const out = runners.find(r => r.movement?.isOut === true);
      const seq = creditSeq(out?.credits ?? []);
      if (seq.length === 0) return 'GO';
      if (seq.length === 1) return seq[0] + 'U'; // unassisted (e.g. 3U)
      return seq.join('-');
    }

    if (v === 'grounded into dp' || v.includes('double play')) {
      const outs = runners.filter(r => r.movement?.isOut === true);
      if (outs.length >= 2) {
        // Sort: non-1B base (force out) first, batter at 1B last
        const sorted = [...outs].sort((a, b) => {
          const aBase = a.movement?.outBase ?? '';
          const bBase = b.movement?.outBase ?? '';
          if (aBase === '1B' && bBase !== '1B') return 1;
          if (bBase === '1B' && aBase !== '1B') return -1;
          return 0;
        });
        const seqs = sorted.map(r => creditSeq(r.credits ?? []));
        // Merge sequences, deduplicating the bridge position
        const merged: string[] = seqs[0] ? [...seqs[0]] : [];
        for (let i = 1; i < seqs.length; i++) {
          const next = seqs[i]!;
          if (next.length === 0) continue;
          const bridge = merged[merged.length - 1];
          const rest = bridge && next[0] === bridge ? next.slice(1) : next;
          merged.push(...rest);
        }
        if (merged.length >= 2) return merged.join('-');
      }
      // Fall back to single runner's sequence if DP structure unclear
      const out = outs[0];
      const seq = creditSeq(out?.credits ?? []);
      return seq.length >= 2 ? seq.join('-') : 'DP';
    }

    if (v === 'flyout') {
      const out = runners.find(r => r.movement?.isOut === true);
      const seq = creditSeq(out?.credits ?? []);
      const putout = seq[seq.length - 1];
      return putout ? 'F' + putout : 'FO';
    }

    if (v === 'lineout') {
      const out = runners.find(r => r.movement?.isOut === true);
      const seq = creditSeq(out?.credits ?? []);
      const putout = seq[seq.length - 1];
      return putout ? 'L' + putout : 'LO';
    }

    if (v === 'pop out') {
      const out = runners.find(r => r.movement?.isOut === true);
      const seq = creditSeq(out?.credits ?? []);
      const putout = seq[seq.length - 1];
      return putout ? 'P' + putout : 'PO';
    }

    // Foul out — `foul out` in MLB feed; treat like flyout (fielder who caught it)
    if (v.includes('foul out') || v.includes('foul-out')) {
      const out = runners.find(r => r.movement?.isOut === true);
      const seq = creditSeq(out?.credits ?? []);
      const putout = seq[seq.length - 1];
      return putout ? 'F' + putout : 'FO';
    }

    if (v.includes('out')) return 'OUT';
    return undefined;
  }

  private mapEventToPlayResult(raw: string | undefined): LiveUpdate['playResult'] {
    if (raw == null) return undefined;

    const v: string = raw.toLowerCase();
    if (v.includes('single')) return 'Single';
    // Guard "double play" / "triple play" before "double" / "triple" — "grounded into double play"
    // contains the substring "double" and would be misidentified as a hit otherwise.
    if (v.includes('double play')) return 'DoublePlay';
    if (v.includes('triple play')) return 'TriplePlay';
    if (v.includes('double')) return 'Double';
    if (v.includes('triple')) return 'Triple';
    if (v.includes('home run') || v === 'home_run' || v === 'homerun') return 'HomeRun';
    if (v.includes('walk')) return 'Walk';
    if (v.includes('strikeout') || v === 'strikeout' || v === 'strike out') return 'Strikeout';
    if (v.includes('hit by pitch') || v === 'hit_by_pitch') return 'HBP';
    if (v.includes('error')) return 'Error';
    if (v.includes('out')) return 'Out';
    return 'Other';
  }

  private buildPitchFrames(
    feed: MlbLiveFeed,
    allPlays: readonly MlbPlay[],
  ): PitchFrame[] {
    const liveData = (feed as unknown as { liveData?: any }).liveData ?? {};
    const linescore = liveData.linescore ?? {};

    const frames: PitchFrame[] = [];

    for (const p of allPlays) {
      const about: AboutLike = (p.about ?? {}) as AboutLike;

      const inning =
        typeof about.inning === "number"
          ? about.inning
          : Number(linescore.currentInning ?? 0) || 0;

      const half: "Top" | "Bottom" =
        about.halfInning === "top"
          ? "Top"
          : about.halfInning === "bottom"
            ? "Bottom"
            : linescore.isTopInning
              ? "Top"
              : "Bottom";

      const playEvents = Array.isArray(p.playEvents) ? p.playEvents : [];
      const pitchEvents = playEvents.filter(
        (e) => e?.isPitch === true || e?.type === "pitch",
      );

      for (let i = 0; i < pitchEvents.length; i += 1) {
        const pitch = pitchEvents[i];
        const pitchCount = pitch.count ?? {};
        const outs =
          typeof pitchCount.outs === "number"
            ? pitchCount.outs
            : typeof about.outs === "number"
              ? about.outs
              : 0;

        frames.push({
          play: p,
          pitch,
          pitchIdxWithinPlay: i,
          pitchCount,
          pitchDescription:
            pitch.details?.description ??
            pitch.details?.call?.description ??
            p.result?.description,
          pitchIndex: typeof pitch.index === "number" ? pitch.index : undefined,
          inning,
          half,
          outs,
          atBatIndex: typeof about.atBatIndex === "number" ? about.atBatIndex : undefined,
          playIndex: typeof about.playIndex === "number" ? about.playIndex : undefined,
          isFinalPitchOfAtBat: i === pitchEvents.length - 1 && about.isComplete === true,
        });
      }
    }

    return frames;
  }

  private mapFrameToLiveUpdate(
    gameId: string,
    feed: MlbLiveFeed,
    frame: PitchFrame,
  ): LiveUpdate {
    const gd = (feed as unknown as { gameData?: any }).gameData ?? {};
    const teams = gd.teams ?? {};
    const homeTeam = teams.home ?? {};
    const awayTeam = teams.away ?? {};

    const liveData = (feed as unknown as { liveData?: any }).liveData ?? {};
    const boxscore = liveData.boxscore ?? {};
    const boxTeams = boxscore.teams ?? {};
    const boxHome = boxTeams.home ?? {};
    const boxAway = boxTeams.away ?? {};
    const linescore = liveData.linescore ?? {};

    const result = frame.play.result ?? {};
    const about = frame.play.about ?? {};
    const countFromPlay = frame.play.count ?? {};
    const pitchCount = frame.pitchCount ?? {};

    const inning = frame.inning;
    const half = frame.half;
    const outs = frame.outs;

    const count = {
      balls: Number(pitchCount.balls ?? countFromPlay.balls ?? 0) || 0,
      strikes: Number(pitchCount.strikes ?? countFromPlay.strikes ?? 0) || 0,
    };

    const runners = Array.isArray((frame.play as unknown as { runners?: unknown }).runners)
      ? ((frame.play as unknown as { runners?: Array<any> }).runners ?? [])
      : [];

    const finalEndByRunner2 = new Map<number | string, string | null>();
    const anonymousEnds2: Array<string> = [];
    for (const r of runners) {
      const runnerId = r?.details?.runner?.id;
      const end: string | null = typeof r?.movement?.end === "string" ? r.movement.end : null;
      if (runnerId != null) {
        finalEndByRunner2.set(runnerId, end);
      } else if (end != null) {
        anonymousEnds2.push(end);
      }
    }
    const occupied = new Set<number>();
    const addBase2 = (end: string | null) => {
      if (end === "first" || end === "1B") occupied.add(1);
      else if (end === "second" || end === "2B") occupied.add(2);
      else if (end === "third" || end === "3B") occupied.add(3);
    };
    for (const end of finalEndByRunner2.values()) addBase2(end);
    for (const end of anonymousEnds2) addBase2(end);

    const offense = linescore.offense ?? {};
    const bases = {
      on1: occupied.size > 0 ? occupied.has(1) : offense.first != null,
      on2: occupied.size > 0 ? occupied.has(2) : offense.second != null,
      on3: occupied.size > 0 ? occupied.has(3) : offense.third != null,
    };

    const batterInfo = frame.play.matchup?.batter ?? {};
    const pitcherInfo = frame.play.matchup?.pitcher ?? {};

    const batter = { id: batterInfo.id, name: batterInfo.fullName };
    const pitcher = { id: pitcherInfo.id, name: pitcherInfo.fullName };

    const batterId: string | undefined =
      batterInfo.id != null ? String(batterInfo.id) : undefined;
    const batterName: string | undefined = batterInfo.fullName;
    const pitcherId: string | undefined =
      pitcherInfo.id != null ? String(pitcherInfo.id) : undefined;
    const pitcherName: string | undefined = pitcherInfo.fullName;

    const batterIdNum: number | undefined =
      typeof batterInfo.id === "number" ? batterInfo.id : undefined;
    const pitcherIdNum: number | undefined =
      typeof pitcherInfo.id === "number" ? pitcherInfo.id : undefined;

    const readPlayer = (team: any, playerId: number | undefined): any | undefined => {
      if (playerId == null) return undefined;
      const players = team?.players ?? {};
      const key = `ID${playerId}`;
      const p = players?.[key];
      return p != null ? p : undefined;
    };

    const batterPlayer = readPlayer(boxHome, batterIdNum) ?? readPlayer(boxAway, batterIdNum);
    const pitcherPlayer = readPlayer(boxHome, pitcherIdNum) ?? readPlayer(boxAway, pitcherIdNum);

    const batterAvgRaw: unknown =
      batterPlayer?.seasonStats?.batting?.avg ??
      batterPlayer?.seasonStats?.batting?.average ??
      undefined;

    const pitcherEraRaw: unknown =
      pitcherPlayer?.seasonStats?.pitching?.era ??
      pitcherPlayer?.seasonStats?.pitching?.earnedRunAverage ??
      undefined;

    const batterAvg: number | undefined =
      typeof batterAvgRaw === "string"
        ? Number(batterAvgRaw)
        : typeof batterAvgRaw === "number"
          ? batterAvgRaw
          : undefined;

    const pitcherEra: number | undefined =
      typeof pitcherEraRaw === "string"
        ? Number(pitcherEraRaw)
        : typeof pitcherEraRaw === "number"
          ? pitcherEraRaw
          : undefined;

    const homeScore: number =
      typeof result.homeScore === "number"
        ? result.homeScore
        : Number(linescore.teams?.home?.runs ?? linescore.home?.runs ?? 0) || 0;

    const awayScore: number =
      typeof result.awayScore === "number"
        ? result.awayScore
        : Number(linescore.teams?.away?.runs ?? linescore.away?.runs ?? 0) || 0;

    const description: string | undefined =
      frame.pitchDescription ?? result.description ?? result.event;

    const atBatIndex: number | undefined =
      frame.atBatIndex ??
      (typeof about.atBatIndex === "number" ? about.atBatIndex : undefined);

    const playIndex: number | undefined =
      frame.playIndex ??
      (typeof about.playIndex === "number" ? about.playIndex : undefined);

    const pitchIndex: number | undefined = frame.pitchIndex;

    const pitchKeyPart: string =
      pitchIndex != null
        ? String(pitchIndex)
        : String(frame.pitchIdxWithinPlay);

    const playKey: string = [
      inning,
      half,
      atBatIndex ?? "na",
      playIndex ?? "na",
      pitchKeyPart,
    ].join("-");

    const lsTeams = (linescore as any)?.teams ?? {};
    const lsInnings2: any[] = Array.isArray((linescore as any)?.innings) ? (linescore as any).innings : [];
    const rhe: Linescore = {
      away: {
        runs: Number(lsTeams.away?.runs ?? 0),
        hits: Number(lsTeams.away?.hits ?? 0),
        errors: Number(lsTeams.away?.errors ?? 0),
      },
      home: {
        runs: Number(lsTeams.home?.runs ?? 0),
        hits: Number(lsTeams.home?.hits ?? 0),
        errors: Number(lsTeams.home?.errors ?? 0),
      },
      inningRuns: {
        away: lsInnings2.map((inn: any) => typeof inn?.away?.runs === 'number' ? inn.away.runs as number : null),
        home: lsInnings2.map((inn: any) => typeof inn?.home?.runs === 'number' ? inn.home.runs as number : null),
      },
    };

    type PitchEvent = {
      pitchData?: {
        startSpeed?: number;
        pitchType?: string;
        coordinates?: { pX?: number; pZ?: number };
        strikeZoneTop?: number;
        strikeZoneBottom?: number;
      };
      details?: {
        type?: {
          description?: string;
          code?: string;
        };
      };
    };

    const framePitch: PitchEvent | undefined =
      frame.pitch as unknown as PitchEvent | undefined;

    const pitchType: string | undefined =
      framePitch?.details?.type?.description ??
      framePitch?.details?.type?.code ??
      framePitch?.pitchData?.pitchType;

    const pitchTypeCode: string | undefined =
      framePitch?.details?.type?.code ?? undefined;

    const pitchSpeedMph: number | undefined =
      typeof framePitch?.pitchData?.startSpeed === "number"
        ? framePitch.pitchData.startSpeed
        : undefined;

    const pitchX: number | undefined =
      typeof framePitch?.pitchData?.coordinates?.pX === "number"
        ? framePitch.pitchData.coordinates.pX : undefined;
    const pitchZ: number | undefined =
      typeof framePitch?.pitchData?.coordinates?.pZ === "number"
        ? framePitch.pitchData.coordinates.pZ : undefined;
    const strikeZoneTop: number | undefined =
      typeof framePitch?.pitchData?.strikeZoneTop === "number"
        ? framePitch.pitchData.strikeZoneTop : undefined;
    const strikeZoneBottom: number | undefined =
      typeof framePitch?.pitchData?.strikeZoneBottom === "number"
        ? framePitch.pitchData.strikeZoneBottom : undefined;

    const batterGameStats = batterPlayer?.stats?.batting;
    const batterGameAB: number | undefined =
      typeof batterGameStats?.atBats === "number" ? batterGameStats.atBats : undefined;
    const batterGameH: number | undefined =
      typeof batterGameStats?.hits === "number" ? batterGameStats.hits : undefined;
    const batterGameR: number | undefined =
      typeof batterGameStats?.runs === "number" ? batterGameStats.runs : undefined;
    const batterGameRBI: number | undefined =
      typeof batterGameStats?.rbi === "number" ? batterGameStats.rbi : undefined;

    const rawState: string | undefined =
      gd.status?.abstractGameState ?? gd.status?.detailedState;

    const status: "live" | "scheduled" | "final" | undefined =
      rawState?.toLowerCase().includes("final")
        ? "final"
        : rawState?.toLowerCase().includes("live") ||
          rawState?.toLowerCase().includes("in progress")
          ? "live"
          : rawState != null
            ? "scheduled"
            : undefined;

    const ts: string =
      typeof (frame.pitch as any)?.startTime === "string"
        ? (frame.pitch as any).startTime
        : typeof (frame.pitch as any)?.endTime === "string"
          ? (frame.pitch as any).endTime
          : new Date().toISOString();

    return {
      gameId,
      inning,
      half,
      outs,
      count,
      bases,
      batter,
      pitcher,
      batterId,
      batterName,
      pitcherId,
      pitcherName,
      pitcherEra,
      batterAvg,
      playResult: this.mapEventToPlayResult(
        frame.isFinalPitchOfAtBat === true ? (result.event ?? undefined) : undefined,
      ),
      creditedHit: 0,
      pitcherOutsRecordedThisPlay: 0,
      homeScore,
      awayScore,
      description,
      playKey,
      snapshot: { linescore, currentPlay: frame.play },
      meta: { gamePk: gameId, ts: Date.now() },
      gameDate: gd.datetime?.officialDate,
      homeAbbr: homeTeam.abbreviation ?? homeTeam.teamName ?? undefined,
      awayAbbr: awayTeam.abbreviation ?? awayTeam.teamName ?? undefined,
      homeTeamId: typeof homeTeam.id === "number" ? homeTeam.id : undefined,
      awayTeamId: typeof awayTeam.id === "number" ? awayTeam.id : undefined,
      homeName: homeTeam.name ?? "",
      awayName: awayTeam.name ?? "",
      status,
      startTimeUtc: typeof gd.datetime?.dateTime === "string" ? gd.datetime.dateTime : null,
      isFinalPitchOfAtBat: frame.isFinalPitchOfAtBat,
      scorebookCode: frame.isFinalPitchOfAtBat === true ? this.computeScorebookCode(frame.play) : undefined,
      pitchType,
      pitchTypeCode,
      pitchSpeedMph,
      atBatIndex,
      pitchX,
      pitchZ,
      strikeZoneTop,
      strikeZoneBottom,
      batterGameAB,
      batterGameH,
      batterGameR,
      batterGameRBI,
      linescore: rhe,
    };
  }

  public async fetchHistory(gameId: string): Promise<LiveUpdate[]> {
    const [feed, winProbArray] = await Promise.all([
      this.mlb.getLiveFeed(gameId),
      this.fetchWinProb(gameId),
    ]);

    const winProbByAtBat = new Map(winProbArray.map((e) => [e.atBatIndex, e]));

    const liveData = (feed as unknown as { liveData?: any }).liveData ?? {};
    const plays = liveData.plays ?? {};

    const allPlays: readonly MlbPlay[] = Array.isArray(plays.allPlays)
      ? (plays.allPlays as MlbPlay[])
      : [];

    const frames: PitchFrame[] = this.buildPitchFrames(feed, allPlays);

    return frames.map((frame) => {
      const wp = frame.atBatIndex != null ? winProbByAtBat.get(frame.atBatIndex) : undefined;
      const base = this.mapFrameToLiveUpdate(gameId, feed, frame);
      return {
        ...base,
        homeTeamWinProbability: wp?.homeTeamWinProbability,
        leverageIndex: wp?.leverageIndex,
      };
    });
  }
}
