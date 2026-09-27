import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ClipsService } from './clips.service';
import { ClipDto } from './dtos/clip.dto';

function parseIdList(raw: string | undefined): number[] {
  return (raw ?? '')
    .split(',')
    .map((s) => Number(s.trim()))
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

  @Get('clips/following')
  @ApiOperation({ summary: "Today's clips for followed players/teams, keyed by entity." })
  async following(
    @Query('players') players?: string,
    @Query('teams') teams?: string,
  ): Promise<Record<string, ClipDto[]>> {
    return this.clips.getClipsForFollowing(parseIdList(players), parseIdList(teams));
  }
}
