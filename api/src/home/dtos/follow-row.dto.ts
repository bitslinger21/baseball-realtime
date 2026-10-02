import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FollowGameDto {
  @ApiProperty({ example: 'NYY' }) awayAbbr!: string;
  @ApiProperty({ example: 'TOR' }) homeAbbr!: string;
}

export class FollowFaceDto {
  @ApiProperty({ enum: ['TODAY', 'SEASON', 'NEXT GAME'], example: 'TODAY' })
  label!: 'TODAY' | 'SEASON' | 'NEXT GAME';

  @ApiProperty({
    type: String,
    isArray: true,
    minItems: 2,
    maxItems: 2,
    example: ['3-for-4 · 3 HR · 5 RBI', '@ TOR · ▲8th · NYY 7–2'],
    description: 'Exactly two content lines; the card renders them at a fixed height.',
  })
  lines!: [string, string];
}

export class FollowRowDto {
  @ApiProperty({ enum: ['team', 'player'], example: 'player' })
  kind!: 'team' | 'player';

  @ApiProperty({
    example: '665161',
    description: 'Team abbreviation, or player mlbId as a string.',
  })
  id!: string;

  @ApiProperty({ example: 'Jeremy Peña' }) name!: string;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'HOU' })
  teamAbbr?: string | null;

  @ApiProperty({
    enum: ['live', 'final', 'scheduled', 'idle'],
    example: 'live',
    description: 'Decides the tile\'s leading-edge color only — the state itself is folded into each face.',
  })
  state!: 'live' | 'final' | 'scheduled' | 'idle';

  @ApiProperty({
    type: FollowFaceDto,
    isArray: true,
    description: 'TODAY, SEASON, then NEXT GAME when there is a game today. The client cycles them.',
  })
  faces!: FollowFaceDto[];

  @ApiPropertyOptional({ type: String, nullable: true, example: '776543' })
  gameId?: string | null;

  @ApiPropertyOptional({ type: FollowGameDto, nullable: true, description: "Today's game's clubs, away first." })
  game?: FollowGameDto | null;

  @ApiPropertyOptional({ type: Number, nullable: true, example: 665161 })
  mlbId?: number | null;
}

export class FollowingResponseDto {
  @ApiProperty({ type: FollowRowDto, isArray: true, maxItems: 8 })
  rows!: FollowRowDto[];
}
