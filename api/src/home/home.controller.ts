import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { HotEventsService } from './hot-events.service';
import { FollowingService } from './following.service';
import { HotEventsResponseDto } from './dtos/hot-event.dto';
import { FollowingResponseDto } from './dtos/follow-row.dto';

// Following identity is device-local (localStorage) per PROMPT_home_page.md
// §6.4 — the server has no accounts, so the client sends its own follow list
// on every request rather than the server storing one.
const MAX_FOLLOWED = 8;

function parseCsv(value: string | undefined): string[] {
  if (value == null || value.trim() === '') return [];
  return value
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s !== '');
}

@ApiTags('home')
@Controller('home')
export class HomeController {
  constructor(
    private readonly hotEvents: HotEventsService,
    private readonly following: FollowingService,
  ) {}

  @Get('hot')
  @ApiOperation({
    summary:
      "What's Hot Right Now — a ranked, significance-filtered list of noteworthy MLB " +
      'events (live-game situations for now; never padded to a target count).',
  })
  @ApiOkResponse({ type: HotEventsResponseDto })
  getHot(): HotEventsResponseDto {
    return { events: this.hotEvents.getHot() };
  }

  @Get('following')
  @ApiOperation({
    summary:
      "Today's line for each followed team/player — a dashboard row, not a feed. " +
      'Identity is device-local; the client sends its own follow list every call.',
  })
  @ApiQuery({ name: 'teams', required: false, example: 'HOU,NYY' })
  @ApiQuery({ name: 'players', required: false, example: '665161,592450' })
  @ApiOkResponse({ type: FollowingResponseDto })
  async getFollowing(
    @Query('teams') teamsParam?: string,
    @Query('players') playersParam?: string,
  ): Promise<FollowingResponseDto> {
    const teamAbbrs = parseCsv(teamsParam)
      .map((t) => t.toUpperCase())
      .slice(0, MAX_FOLLOWED);
    const playerIds = parseCsv(playersParam)
      .map((p) => Number(p))
      .filter((n) => Number.isFinite(n))
      .slice(0, MAX_FOLLOWED);

    const rows = await this.following.getFollowing(teamAbbrs, playerIds);
    return { rows: rows.slice(0, MAX_FOLLOWED) };
  }
}
