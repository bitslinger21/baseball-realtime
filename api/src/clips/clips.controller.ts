import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ClipsService } from './clips.service';
import { ClipDto, ClipsDayGameDto } from './dtos/clip.dto';

function parseIdList(raw: string | undefined): number[] {
  return (raw ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s !== '') // "" → Number("") is 0, which minted a bogus "player:0" key
    .map(Number)
    .filter((n) => Number.isFinite(n));
}

@ApiTags('clips')
@Controller()
export class ClipsController {
  constructor(private readonly clips: ClipsService) {}

  @Get('games/:gameId/clips')
  @ApiOperation({ summary: "All of a game's clips, ordered by at-bat index (unmatched ones last)." })
  @ApiOkResponse({ type: ClipDto, isArray: true })
  async forGame(@Param('gameId') gameId: string): Promise<ClipDto[]> {
    return this.clips.getClipsForGame(gameId);
  }

  @Get('clips')
  @ApiQuery({ name: 'date', required: true, example: '2026-09-30' })
  @ApiOperation({
    summary:
      "Every game on a date that has clips (Highlights page): live first, then finals by start " +
      'time; each game\'s clips newest first. Failure or no clips → [].',
  })
  @ApiOkResponse({ type: ClipsDayGameDto, isArray: true })
  async forDate(@Query('date') date: string): Promise<ClipsDayGameDto[]> {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? '')) return [];
    return this.clips.getClipsForDate(date);
  }

  @Get('clips/following')
  @ApiQuery({ name: 'players', required: false })
  @ApiQuery({ name: 'teams', required: false })
  @ApiOperation({ summary: "Today's clips for followed players/teams, keyed by entity." })
  async following(
    @Query('players') players?: string,
    @Query('teams') teams?: string,
  ): Promise<Record<string, ClipDto[]>> {
    return this.clips.getClipsForFollowing(parseIdList(players), parseIdList(teams));
  }
}
