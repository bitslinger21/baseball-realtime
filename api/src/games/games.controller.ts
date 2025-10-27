// src/games/games.controller.ts (or in poller)
import { Controller, Get, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Game } from '../persistence/entities/game.entity';

@Controller('games')
export class GamesController {
  constructor(@InjectRepository(Game) private readonly repo: Repository<Game>) {}

  @Get('today')
  async today() {
    const d = new Date().toISOString().slice(0,10);
    return this.repo.find({ where: { gameDate: d }, order: { startTimeUtc: 'ASC' } });
  }

  @Get()
  async byId(@Query('providerGameId') gameId: string) {
    return this.repo.findOne({ where: { id: gameId } });
  }
}
