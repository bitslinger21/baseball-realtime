// src/games/games.controller.ts (or in poller)
import { Controller, Get, Param, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Game } from '../persistence/entities/game.entity';
import { GamesService } from './games.service';
import { MlbApiService } from 'src/providers/mlb/mlb.service';
import { GameDto } from './dtos/games.dto';
import { ApiInternalServerErrorResponse, ApiNotFoundResponse, ApiOkResponse } from '@nestjs/swagger/dist/decorators/api-response.decorator';

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
  @ApiOkResponse({ type: GameDto, isArray: true })
  @ApiInternalServerErrorResponse()
  async today(): Promise<GameDto[]> {
    const ymd: string = toYmd(new Date());
    const rows = await this.mlbService.getScheduleByDate(ymd);
    return rows;
  }

  @Get('id/:id')
  @ApiOkResponse({ type: GameDto })
  @ApiNotFoundResponse()
  async findByMyId(@Param('id') myId: string) {
    return this.gamesService.findByInternalId(myId);
  }
  
  @Get('providerId/:id')
  @ApiOkResponse({ type: GameDto })
  @ApiNotFoundResponse()
  async findByProviderId(@Param('id') providerGameId: string) {
    return this.gamesService.findByProviderId(providerGameId);
  }

  @Get()
  @ApiOkResponse({ type: GameDto, isArray: true })
  @ApiInternalServerErrorResponse()
  async listByDate(@Query('date') date?: string) {
    const ymd = date || toYmd(new Date());
    const rows = await this.mlbService.getScheduleByDate(ymd);
    return rows ?? [];
  }
}
