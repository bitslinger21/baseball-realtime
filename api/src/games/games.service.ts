import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Game } from '../persistence/entities/game.entity';
import { GameDto } from './dtos/game.dto';
import { SeriesDto } from './dtos/series.dto';
import { MlbApiService } from '../providers/mlb/mlb.service';

const TTL_TODAY_MS = 30_000;

@Injectable()
export class GamesService {
  private readonly scheduleCache = new Map<string, { data: GameDto[]; expiresAt: number }>();

  constructor(
    @InjectRepository(Game)
    private readonly repo: Repository<Game>,
    private readonly mlb: MlbApiService,
  ) { }

  async upsertSnapshot(
    gameId: string,
    snapshot: Record<string, unknown>,
    meta: Partial<Game>,
  ): Promise<void> {
    const base = {
      providerGameId: gameId,
      ...meta,
      snapshot: snapshot as unknown,
    };
    await this.repo.upsert(base as Parameters<typeof this.repo.upsert>[0], ['providerGameId']);
  }

  async findByInternalId(myId: string): Promise<GameDto> {
    const game: Game | null = await this.repo.findOne({ where: { id: myId } });
    if (!game) {
      throw new NotFoundException(`Game not found: ${myId}`);
    }
    return GameDto.fromEntity(game);
  }

  async findByProviderId(gameId: string): Promise<GameDto> {
    const game: Game | null = await this.repo.findOne({
      where: { providerGameId: gameId },
    });
    if (!game) {
      throw new NotFoundException(`Game not found: ${gameId}`);
    }
    return GameDto.fromEntity(game);
  }

  async getSeries(providerGameId: string): Promise<SeriesDto> {
    const game = await this.findByProviderId(providerGameId);
    const snap = game.snapshot as any;
    const homeTeamId = typeof snap?.homeTeamId === 'number' ? snap.homeTeamId : null;
    const awayTeamId = typeof snap?.awayTeamId === 'number' ? snap.awayTeamId : null;

    if (homeTeamId == null || awayTeamId == null) {
      return { awayAbbr: game.awayAbbr, homeAbbr: game.homeAbbr, awayWins: 0, homeWins: 0, games: [] };
    }

    const season = game.gameDate.slice(0, 4);
    const rawGames = await this.mlb.getSeasonSeriesGames(homeTeamId, awayTeamId, season);

    let awayWins = 0;
    let homeWins = 0;
    for (const g of rawGames) {
      if (g.winner === game.awayAbbr) awayWins++;
      else if (g.winner === game.homeAbbr) homeWins++;
    }

    return {
      awayAbbr: game.awayAbbr,
      homeAbbr: game.homeAbbr,
      awayWins,
      homeWins,
      games: rawGames,
    };
  }

  async listByDate(date: string): Promise<GameDto[]> {
    const todayYmd = new Date().toISOString().slice(0, 10);
    const isToday = date === todayYmd;

    const cached = this.scheduleCache.get(date);
    if (cached != null && Date.now() < cached.expiresAt) return cached.data;

    // 1) Fetch schedule
    const schedule = await this.mlb.getScheduleByDate(date);

    // 2) Ensure DB rows exist
    for (const row of schedule) {
      const providerGameId =
        (row as any).providerGameId ??
        (row as any).gamePk ??
        (row as any).gameId;

      if (!providerGameId) continue;

      const status = (row as any).status ?? 'scheduled';

      await this.repo.upsert(
        {
          providerGameId: String(providerGameId),
          gameDate: date,
          homeAbbr: (row as any).homeAbbr ?? 'HOM',
          awayAbbr: (row as any).awayAbbr ?? 'AWY',
          homeName: (row as any).homeName ?? '?',
          awayName: (row as any).awayName ?? '?',
          status,
          startTimeUtc:
            typeof (row as any).startTimeUtc === 'string'
              ? new Date((row as any).startTimeUtc)
              : null,

          snapshot: (row as any).snapshot ?? null,
          homeScore: (row as any).homeScore ?? null,
          awayScore: (row as any).awayScore ?? null,
        },
        ['providerGameId'],
      );

    }

    // 3) Read from DB (authoritative)
    const games = await this.repo.find({
      where: { gameDate: date },
      order: { startTimeUtc: 'ASC' },
    });

    const result = games.map(GameDto.fromEntity);
    const expiresAt = isToday ? Date.now() + TTL_TODAY_MS : Infinity;
    this.scheduleCache.set(date, { data: result, expiresAt });
    return result;
  }
}
