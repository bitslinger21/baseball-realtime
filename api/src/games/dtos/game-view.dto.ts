import { ApiProperty } from '@nestjs/swagger';
import { GameDto } from './game.dto';
import type { TeamMeta } from '../../teams/teams-meta.types'; // adjust

export class GameViewDto extends GameDto {
  @ApiProperty({ required: false, nullable: true })
  homeTeamMeta: TeamMeta | null;

  @ApiProperty({ required: false, nullable: true })
  awayTeamMeta: TeamMeta | null;
}
