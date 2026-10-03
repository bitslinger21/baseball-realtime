import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { HotEventsService } from './hot-events.service';
import { FollowingService } from './following.service';
import { RacesService } from './races.service';
import { DayAheadService } from './day-ahead.service';
import { PostseasonService } from './postseason.service';
import { UpcomingStatusService } from './upcoming-status.service';
import { HotEventsResponseDto } from './dtos/hot-event.dto';
import { FollowingResponseDto } from './dtos/follow-row.dto';
import { RacesResponseDto } from './dtos/races.dto';
import { DayAheadResponseDto } from './dtos/day-ahead.dto';
import { PostseasonResponseDto } from './dtos/postseason.dto';
import { UpcomingStatusDto } from './dtos/upcoming-status.dto';

function currentSeasonYear(): string {
  return String(new Date().getFullYear());
}

// Following identity is device-local (localStorage) per PROMPT_home_page.md
// §6.4 — the server has no accounts, so the client sends its own follow list
// on every request rather than the server storing one. Cap raised from 8 to
// 20 (PROMPT_home_layout.md §A5): "a dashboard of eight is a design; twenty
// is a list, and a user with twenty interests is not misusing the feature."
const MAX_FOLLOWED = 20;

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
    private readonly races: RacesService,
    private readonly dayAhead: DayAheadService,
    private readonly postseason: PostseasonService,
    private readonly upcomingStatus: UpcomingStatusService,
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
  @ApiQuery({
    name: 'tz',
    required: false,
    example: 'America/Chicago',
    description: "The viewer's IANA timezone; game times are written in it (default America/New_York).",
  })
  @ApiOkResponse({ type: FollowingResponseDto })
  async getFollowing(
    @Query('teams') teamsParam?: string,
    @Query('players') playersParam?: string,
    @Query('tz') tz?: string,
  ): Promise<FollowingResponseDto> {
    const teamAbbrs = parseCsv(teamsParam)
      .map((t) => t.toUpperCase())
      .slice(0, MAX_FOLLOWED);
    const playerIds = parseCsv(playersParam)
      .map((p) => Number(p))
      .filter((n) => Number.isFinite(n))
      .slice(0, MAX_FOLLOWED);

    const rows = await this.following.getFollowing(teamAbbrs, playerIds, tz);
    return { rows: rows.slice(0, MAX_FOLLOWED) };
  }

  @Get('races')
  @ApiOperation({
    summary:
      'Races — divisions and wild card, a fixed set of eight team races every day, each ' +
      'compressed to a clinched leader once decided. Chases (individual leaders) travel in ' +
      'the same response but render as their own section. Six division one-liners only in ' +
      'early season (a games-remaining condition, not a date).',
  })
  @ApiOkResponse({ type: RacesResponseDto })
  async getRaces(): Promise<RacesResponseDto> {
    return this.races.getRaces(currentSeasonYear());
  }

  @Get('postseason')
  @ApiOperation({
    summary:
      'Postseason bracket — replaces Races once all 12 berths are clinched (a condition, not a ' +
      'date). Seven rounds with seeds, series wins and card state, plus every game of each ' +
      'started series for the series drawer (score, W/L/SV, notable line, recap video).',
  })
  @ApiOkResponse({ type: PostseasonResponseDto })
  async getPostseason(): Promise<PostseasonResponseDto> {
    return this.postseason.getPostseason(currentSeasonYear());
  }

  @Get('upcoming-status/:teamId')
  @ApiOperation({
    summary:
      "Which state a player's Upcoming tab is in for this club: games, waiting (next opponent " +
      'undecided), eliminated, or offseason — with a why sentence and only the known facts.',
  })
  @ApiQuery({ name: 'tz', required: false, example: 'America/Chicago' })
  @ApiOkResponse({ type: UpcomingStatusDto })
  async getUpcomingStatus(
    @Param('teamId', ParseIntPipe) teamId: number,
    @Query('tz') tz?: string,
  ): Promise<UpcomingStatusDto> {
    return this.upcomingStatus.getStatus(teamId, tz);
  }

  @Get('day-ahead')
  @ApiOperation({
    summary:
      "Today's shortlist — up to four games picked by a lower-bar significance heuristic " +
      '(race stakes, rivalry), never the first four by start time. Real totalCount for ' +
      '"All N games today".',
  })
  @ApiOkResponse({ type: DayAheadResponseDto })
  async getDayAhead(): Promise<DayAheadResponseDto> {
    return this.dayAhead.getDayAhead(currentSeasonYear());
  }
}
