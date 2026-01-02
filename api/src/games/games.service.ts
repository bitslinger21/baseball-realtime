// src/games/games.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Game } from '../persistence/entities/game.entity';
import { GameDto } from './dtos/game.dto';
import { NotFoundError } from 'rxjs';
import { MlbApiService } from 'src/providers/mlb/mlb.service';

@Injectable()
export class GamesService {
  constructor(
    @InjectRepository(Game)
    private readonly repo: Repository<Game>,
    private readonly mlb: MlbApiService,
  ) { }

  async upsertSnapshot(
    gameId: string,
    snapshot: any,
    meta: Partial<Game>,
  ): Promise<void> {
    const base = {
      providerGameId: gameId,
      ...meta,
      snapshot,
    };
    await this.repo.upsert(base, ['providerGameId']);
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

  async listByDate(date: string): Promise<GameDto[]> {
    console.log('[GamesService] listByDate CALLED', date);
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

          // ✅ critical part
          homeScore:
            status === 'final'
              ? (row as any).homeScore ?? null
              : null,
          awayScore:
            status === 'final'
              ? (row as any).awayScore ?? null
              : null,
        },
        ['providerGameId'],
      );
    }

    // 3) Read from DB (authoritative)
    const games = await this.repo.find({
      where: { gameDate: date },
      order: { startTimeUtc: 'ASC' },
    });

    return games.map(GameDto.fromEntity);
  }
}
