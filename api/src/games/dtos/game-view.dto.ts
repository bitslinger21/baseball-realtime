import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GameDto } from './game.dto';
import type { TeamMeta } from '../../teams/teams-meta.types';

// Mirrors TeamMeta so the spec (and the generated SDK) carry its real shape —
// an untyped nullable property is emitted as a bare `object`.
export class TeamMetaDto implements TeamMeta {
  @ApiProperty({ example: 'HOU' }) abbr!: string;
  @ApiProperty({ example: 'Astros' }) name!: string;
  @ApiProperty({ example: 'Houston Astros' }) displayName!: string;
  @ApiPropertyOptional({ type: String, nullable: true }) primaryColorHex!: string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) alternateColorHex!: string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) logoUrl!: string | null;
  @ApiPropertyOptional({ type: String, nullable: true, example: 'Daikin Park' }) venue!: string | null;
  @ApiPropertyOptional({ type: String, nullable: true, example: 'Houston, TX' }) city!: string | null;
  @ApiPropertyOptional({ type: Number, nullable: true, example: 1962 }) founded!: number | null;
}

export class GameViewDto extends GameDto {
  @ApiProperty({ type: TeamMetaDto, required: false, nullable: true })
  homeTeamMeta: TeamMeta | null;

  @ApiProperty({ type: TeamMetaDto, required: false, nullable: true })
  awayTeamMeta: TeamMeta | null;
}
