import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { StandingsService } from './standings.service';
import { StandingTeamDto } from './dtos/standing-team.dto';

@ApiTags('standings')
@Controller('standings')
export class StandingsController {
  public constructor(private readonly standings: StandingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get MLB standings for a season' })
  @ApiOkResponse({ type: StandingTeamDto, isArray: true })
  async getStandings(@Query('season') season?: string): Promise<StandingTeamDto[]> {
    const year = season ?? String(new Date().getFullYear());
    return this.standings.getStandings(year);
  }
}
