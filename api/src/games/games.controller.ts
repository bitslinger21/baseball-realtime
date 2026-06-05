import { Controller, Get, Logger, Param, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Game } from '../persistence/entities/game.entity';
import { GamesService } from './games.service';
import { MlbApiService } from '../providers/mlb/mlb.service';
import { GameDto } from './dtos/game.dto';
// import { ApiInternalServerErrorResponse, ApiNotFoundResponse, ApiOkResponse } from '@nestjs/swagger/dist/decorators/api-response.decorator';
import {
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { GameViewDto } from './dtos/game-view.dto';
import { SeriesDto } from './dtos/series.dto';
import { TeamsMetaService } from '../teams/teams-meta.service';

const toYmd = (d: Date): string => {
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${d.getUTCFullYear()}-${mm}-${dd}`;
};

@ApiTags('games')
@Controller('games')
export class GamesController {
  logger = new Logger('GamesController');
  constructor(
    private readonly gamesService: GamesService,
    private readonly mlbService: MlbApiService,
    private readonly teamsMeta: TeamsMetaService,
  ) { }

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

  @Get('providerId/:providerGameId')
  @ApiOkResponse({ type: GameViewDto })
  @ApiOperation({ summary: 'List games by provider ID' })
  @ApiNotFoundResponse()
  async findByProviderId(@Param('providerGameId') providerGameId: string) {
    const dto: GameDto = await this.gamesService.findByProviderId(providerGameId);
    return {
      ...dto,
      homeTeamMeta: dto.homeAbbr ? this.teamsMeta.getByAbbr(dto.homeAbbr) : null,
      awayTeamMeta: dto.awayAbbr ? this.teamsMeta.getByAbbr(dto.awayAbbr) : null,
    };
  }

  @Get('series/:providerGameId')
  @ApiOkResponse({ type: SeriesDto })
  @ApiOperation({ summary: 'Season series between the two teams in a given game' })
  @ApiNotFoundResponse()
  async getSeries(@Param('providerGameId') providerGameId: string): Promise<SeriesDto> {
    return this.gamesService.getSeries(providerGameId);
  }

  @Get()
  @ApiOkResponse({ type: GameViewDto, isArray: true })
  @ApiOperation({ summary: 'List games for specific date' })
  @ApiInternalServerErrorResponse()
  async listByDate(@Query('date') date?: string): Promise<GameViewDto[]> {
    const ymd = date || toYmd(new Date());
    this.logger.debug(`Fetching games for date: ${ymd}`);
    const rows = await this.gamesService.listByDate(ymd);
    return rows.map((row) => ({
      ...row,
      homeTeamMeta: row.homeAbbr ? this.teamsMeta.getByAbbr(row.homeAbbr) : null,
      awayTeamMeta: row.awayAbbr ? this.teamsMeta.getByAbbr(row.awayAbbr) : null,
    })) as GameViewDto[];
  }
}
