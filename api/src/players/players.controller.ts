import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { PlayersService } from './players.service';
import { BatterOverviewDto } from './dtos/batter-overview.dto';

@ApiTags('Players')
@Controller('players')
export class PlayersController {
  constructor(private readonly playersService: PlayersService) { }

  @Get(':mlbId')
  async getPlayer(
    @Param('mlbId', ParseIntPipe) mlbId: number,
    @Query('season') season?: string,
  ): Promise<Record<string, unknown>> {
    return await this.playersService.getPlayer(mlbId, season);
  }

  @Get(':mlbId/team')
  async getPlayerTeam(
    @Param('mlbId', ParseIntPipe) mlbId: number,
  ): Promise<Record<string, unknown>> {
    return await this.playersService.getPlayerTeam(mlbId);
  }

  @Get(':mlbId/overview/batter')
  @ApiOkResponse({ type: BatterOverviewDto })
  async getBatterOverview(
    @Param('mlbId', ParseIntPipe) mlbId: number,
  ): Promise<BatterOverviewDto> {
    return this.playersService.getBatterOverview(mlbId.toString(10));
  }
}
