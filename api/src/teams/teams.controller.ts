import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { TeamsRosterService, RosterPlayerDto } from './teams-roster.service';

@ApiTags('Teams')
@Controller('teams')
export class TeamsController {
  constructor(private readonly rosterService: TeamsRosterService) {}

  @Get(':teamId/roster')
  @ApiOkResponse({ type: [Object] })
  async getRoster(
    @Param('teamId', ParseIntPipe) teamId: number,
    @Query('season') season?: string,
  ): Promise<RosterPlayerDto[]> {
    const resolvedSeason =
      season != null && season.trim() !== '' ? season.trim() : String(new Date().getFullYear());
    return this.rosterService.getRoster(teamId, resolvedSeason);
  }
}
