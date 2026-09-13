import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { TeamsRosterService, RosterPlayerDto } from './teams-roster.service';
import { TeamsRecentFormService } from './teams-recent-form.service';
import { TeamsBullpenService } from './teams-bullpen.service';
import { TeamsTransactionsService } from './teams-transactions.service';
import { TeamRecentFormDto } from './dtos/team-recent-form.dto';
import { TeamBullpenDto } from './dtos/team-bullpen.dto';
import { TeamTransactionsDto } from './dtos/team-transactions.dto';

@ApiTags('Teams')
@Controller('teams')
export class TeamsController {
  constructor(
    private readonly rosterService: TeamsRosterService,
    private readonly recentFormService: TeamsRecentFormService,
    private readonly bullpenService: TeamsBullpenService,
    private readonly transactionsService: TeamsTransactionsService,
  ) {}

  @Get(':teamId/roster')
  @ApiOkResponse({ type: [Object] })
  async getRoster(
    @Param('teamId', ParseIntPipe) teamId: number,
    @Query('season') season?: string,
  ): Promise<RosterPlayerDto[]> {
    const resolvedSeason =
      season != null && season.trim() !== ''
        ? season.trim()
        : String(new Date().getFullYear());
    return this.rosterService.getRoster(teamId, resolvedSeason);
  }

  @Get(':teamId/recent-form')
  @ApiOkResponse({ type: TeamRecentFormDto })
  async getRecentForm(
    @Param('teamId', ParseIntPipe) teamId: number,
    @Query('count') count?: string,
  ): Promise<TeamRecentFormDto> {
    const n = count != null ? parseInt(count, 10) : 10;
    const resolvedCount = Number.isFinite(n)
      ? Math.max(1, Math.min(n, 20))
      : 10;
    return this.recentFormService.getRecentForm(teamId, resolvedCount);
  }

  @Get(':teamId/bullpen')
  @ApiOkResponse({ type: TeamBullpenDto })
  async getBullpen(
    @Param('teamId', ParseIntPipe) teamId: number,
  ): Promise<TeamBullpenDto> {
    return this.bullpenService.getBullpenStatus(teamId);
  }

  @Get(':teamId/transactions')
  @ApiOkResponse({ type: TeamTransactionsDto })
  async getTransactions(
    @Param('teamId', ParseIntPipe) teamId: number,
  ): Promise<TeamTransactionsDto> {
    return this.transactionsService.getTransactions(teamId);
  }
}
