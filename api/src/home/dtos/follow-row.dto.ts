import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FollowRowDto {
  @ApiProperty({ enum: ['team', 'player'], example: 'player' })
  kind!: 'team' | 'player';

  @ApiProperty({
    example: '665161',
    description: 'Team abbreviation, or player mlbId as a string.',
  })
  id!: string;

  @ApiProperty({ example: 'Jeremy Peña' }) name!: string;

  @ApiPropertyOptional({ nullable: true, example: 'HOU' })
  teamAbbr?: string | null;

  @ApiProperty({
    enum: ['live', 'final', 'scheduled', 'idle'],
    example: 'live',
    description: 'Decides the tile\'s leading-edge color only — the state itself is folded into each face.',
  })
  state!: 'live' | 'final' | 'scheduled' | 'idle';

  @ApiProperty({
    type: String,
    isArray: true,
    example: ['Live vs ATL · 2-for-4, HR, RBI', '.291 AVG, 18 HR, 62 RBI'],
    description: '1-3 self-describing sentences; the client cycles them with a shared EdgeButton.',
  })
  faces!: string[];

  @ApiPropertyOptional({ nullable: true, example: '776543' })
  gameId?: string | null;

  @ApiPropertyOptional({ nullable: true, example: 665161 })
  mlbId?: number | null;
}

export class FollowingResponseDto {
  @ApiProperty({ type: FollowRowDto, isArray: true, maxItems: 8 })
  rows!: FollowRowDto[];
}
