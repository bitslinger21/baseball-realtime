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

  @ApiProperty({ enum: ['live', 'final', 'scheduled', 'idle'], example: 'live' })
  state!: 'live' | 'final' | 'scheduled' | 'idle';

  @ApiProperty({ example: '2-for-4, HR, RBI' }) line!: string;
  @ApiProperty({ example: 'vs ATL · live' }) meta!: string;

  @ApiPropertyOptional({ nullable: true, example: '776543' })
  gameId?: string | null;

  @ApiPropertyOptional({ nullable: true, example: 665161 })
  mlbId?: number | null;
}

export class FollowingResponseDto {
  @ApiProperty({ type: FollowRowDto, isArray: true, maxItems: 8 })
  rows!: FollowRowDto[];
}
