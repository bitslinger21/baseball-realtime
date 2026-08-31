import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { PlayersService } from './players.service';
import { PlayersSearchService } from './players-search.service';
import { BatterOverviewDto } from './dtos/batter-overview.dto';
import { PlayerSplitsDto } from './dtos/player-splits.dto';
import { PlayerPitchingDto } from './dtos/player-pitching.dto';
import { PlayerDrilldownDto } from './dtos/player-drilldown.dto';
import { VsPlayerDto } from './dtos/vs-player.dto';
import { PlayerSearchResultDto } from './dtos/player-search-result.dto';

@ApiTags('Players')
@Controller('players')
export class PlayersController {
  constructor(
    private readonly playersService: PlayersService,
    private readonly playersSearchService: PlayersSearchService,
  ) { }

  // Must precede ':mlbId' — otherwise "search" is parsed as an mlbId and 400s.
  @Get('search')
  @ApiOkResponse({ type: [PlayerSearchResultDto] })
  async searchPlayers(
    @Query('q') q?: string,
    @Query('season') season?: string,
  ): Promise<PlayerSearchResultDto[]> {
    const resolvedSeason =
      season != null && season.trim() !== '' ? season.trim() : String(new Date().getFullYear());
    return this.playersSearchService.search(q ?? '', resolvedSeason);
  }

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

  @Get(':mlbId/splits')
  @ApiOkResponse({ type: PlayerSplitsDto })
  async getPlayerSplits(
    @Param('mlbId', ParseIntPipe) mlbId: number,
    @Query('season') season?: string,
    @Query('timeframe') timeframe?: string,
  ): Promise<PlayerSplitsDto> {
    const resolvedSeason =
      season != null && season.trim() !== '' ? season.trim() : String(new Date().getFullYear());
    const resolvedTimeframe: 'season' | 'career' =
      timeframe === 'career' ? 'career' : 'season';
    return this.playersService.getPlayerSplits(mlbId.toString(10), resolvedSeason, resolvedTimeframe);
  }

  @Get(':mlbId/drilldown')
  @ApiOkResponse({ type: PlayerDrilldownDto })
  async getPlayerDrilldown(
    @Param('mlbId', ParseIntPipe) mlbId: number,
    @Query('season') season?: string,
  ): Promise<PlayerDrilldownDto> {
    const resolvedSeason =
      season != null && season.trim() !== '' ? season.trim() : String(new Date().getFullYear());
    return this.playersService.getPlayerDrilldown(mlbId.toString(10), resolvedSeason);
  }

  @Get(':mlbId/pitching')
  @ApiOkResponse({ type: PlayerPitchingDto })
  async getPlayerPitching(
    @Param('mlbId', ParseIntPipe) mlbId: number,
    @Query('season') season?: string,
  ): Promise<PlayerPitchingDto> {
    const resolvedSeason =
      season != null && season.trim() !== '' ? season.trim() : String(new Date().getFullYear());
    return this.playersService.getPlayerPitching(mlbId.toString(10), resolvedSeason);
  }

  @Get(':batterId/vs/:pitcherId')
  @ApiOkResponse({ type: VsPlayerDto })
  async getVsPlayer(
    @Param('batterId', ParseIntPipe) batterId: number,
    @Param('pitcherId', ParseIntPipe) pitcherId: number,
  ): Promise<VsPlayerDto> {
    return this.playersService.getVsPlayer(batterId, pitcherId);
  }
}
