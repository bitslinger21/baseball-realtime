import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { PlayersService } from './players.service';

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
}
