// src/games/games.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Game } from '../persistence/entities/game.entity';
import { GameDto } from './dtos/games.dto';
import { NotFoundError } from 'rxjs';

@Injectable()
export class GamesService {
  constructor(
    @InjectRepository(Game)
    private readonly repo: Repository<Game>,
  ) {}

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
    const games: Game[] = await this.repo.find({
      where: { gameDate: date },
      order: { startTimeUtc: 'ASC' },
    });
    return games.map(GameDto.fromEntity);
  }
}
