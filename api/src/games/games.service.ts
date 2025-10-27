// src/games/games.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Game } from '../persistence/entities/game.entity';

@Injectable()
export class GamesService {
  constructor(
    @InjectRepository(Game)
    private readonly repo: Repository<Game>,
  ) {}

  async upsertSnapshot(gameId: string, snapshot: any, meta: Partial<Game>) {
    const base = {
      providerGameId: gameId,
      ...meta,
      snapshot,
    };
    await this.repo.upsert(base, ['providerGameId']);
  }

  async findByProviderId(gameId: string) {
    return this.repo.findOne({ where: { id: gameId } });
  }

  async listByDate(date: string) {
    return this.repo.find({
      where: { gameDate: date },
      order: { startTimeUtc: 'ASC' },
    });
  }
}
