// src/games/games.controller.ts (or in poller)
import { Controller, Get, Param, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Game } from '../persistence/entities/game.entity';
import { GamesService } from './games.service';
import { MlbApiService } from 'src/providers/mlb/mlb.service';
import { GameDto } from './dtos/games.dto';

const toYmd = (d: Date): string => {
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${d.getUTCFullYear()}-${mm}-${dd}`;
}

@Controller('games')
export class GamesController {
  constructor(
    @InjectRepository(Game) private readonly repo: Repository<Game>,
    private readonly gamesService: GamesService,
    private readonly mlbService: MlbApiService,
  ) {}

  @Get('today')
  async today(): Promise<GameDto[]> {
    const ymd: string = toYmd(new Date());
    const rows = await this.mlbService.getScheduleByDate(ymd);
    return rows;
  }

  @Get('id/:id')
  async byMyId(@Param('id') myId: string) {
    return this.gamesService.findByInternalId(myId);
  }
  
  @Get('providerId/:id')
  async byProviderId(@Query('providerGameId') providerGameId: string): Promise<Game | null> {
    return this.repo.findOne({ where: { id: providerGameId } });
  }

  @Get()
  async listByDate(@Query('date') date?: string) {
    const ymd = date || toYmd(new Date());
    const rows = await this.mlbService.getScheduleByDate(ymd);
    return rows ?? [];
  }
}
