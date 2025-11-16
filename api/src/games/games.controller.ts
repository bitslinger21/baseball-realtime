// src/games/games.controller.ts (or in poller)
import { Controller, Get, Logger, Param, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Game } from '../persistence/entities/game.entity';
import { GamesService } from './games.service';
import { MlbApiService } from 'src/providers/mlb/mlb.service';
import { GameDto } from './dtos/games.dto';
// import { ApiInternalServerErrorResponse, ApiNotFoundResponse, ApiOkResponse } from '@nestjs/swagger/dist/decorators/api-response.decorator';
import { ApiInternalServerErrorResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

const toYmd = (d: Date): string => {
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${d.getUTCFullYear()}-${mm}-${dd}`;
}

@ApiTags('games')
@Controller('games')
export class GamesController {
  logger = new Logger('GamesController')
  constructor(
    private readonly gamesService: GamesService,
    private readonly mlbService: MlbApiService,
  ) {}

  @Get('today')
  @ApiOperation({ summary: 'List games for today' })
  @ApiOkResponse({ type: GameDto, isArray: true })
  @ApiInternalServerErrorResponse()
  async today(): Promise<GameDto[]> {
    const ymd: string = toYmd(new Date());
    const rows = await this.mlbService.getScheduleByDate(ymd);
    return rows;
  }

  @Get('id/:id')
  @ApiOperation({ summary: 'List games by internal ID' })
  @ApiOkResponse({ type: GameDto })
  @ApiNotFoundResponse()
  async findByMyId(@Param('id') myId: string) {
    return this.gamesService.findByInternalId(myId);
  }
  
  @Get('providerId/:id')
  @ApiOkResponse({ type: GameDto })
  @ApiOperation({ summary: 'List games by provider ID' })
  @ApiNotFoundResponse()
  async findByProviderId(@Param('id') providerGameId: string) {
    return this.gamesService.findByProviderId(providerGameId);
  }

  @Get()
  @ApiOkResponse({ type: GameDto, isArray: true })
  @ApiOperation({ summary: 'List games for specific date' })
  @ApiInternalServerErrorResponse()
  async listByDate(@Query('date') date?: string) {
    const ymd = date || toYmd(new Date());
    this.logger.debug(`Fetching games for date: ${ymd}`);
    const rows = await this.mlbService.getScheduleByDate(ymd);
    return rows ?? [];
  }
}
