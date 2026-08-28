import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { LeadersService } from './leaders.service';
import { LeagueLeadersDto } from './dtos/league-leaders.dto';

@ApiTags('Leaders')
@Controller('leaders')
export class LeadersController {
  constructor(private readonly leadersService: LeadersService) {}

  @Get()
  @ApiOkResponse({ type: LeagueLeadersDto })
  async getLeagueLeaders(
    @Query('season') season?: string,
    @Query('league') league?: string,
    @Query('teamId') teamId?: string,
  ): Promise<LeagueLeadersDto> {
    const resolvedSeason =
      season != null && season.trim() !== '' ? season.trim() : String(new Date().getFullYear());
    const resolvedLeague = league === 'AL' || league === 'NL' ? league : 'all';
    const resolvedTeamId = teamId != null && /^\d+$/.test(teamId.trim()) ? parseInt(teamId.trim(), 10) : undefined;
    return this.leadersService.getLeagueLeaders(resolvedSeason, resolvedLeague, resolvedTeamId);
  }
}
