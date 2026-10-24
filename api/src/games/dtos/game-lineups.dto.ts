import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LineupLast7Dto {
  @ApiProperty({ example: 9 })
  h!: number;

  @ApiProperty({ example: 27 })
  ab!: number;
}

export class LineupBatterDto {
  @ApiProperty({ example: 1, description: 'Batting-order spot, 1–9' })
  slot!: number;

  @ApiProperty({ example: 514888 })
  mlbId!: number;

  @ApiProperty({ example: 'Jose Altuve' })
  name!: string;

  @ApiPropertyOptional({ type: String, nullable: true, example: '2B' })
  position!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'R' })
  bats!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'R' })
  throws!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: '27' })
  jerseyNumber!: string | null;

  @ApiPropertyOptional({
    type: LineupLast7Dto,
    nullable: true,
    description: 'Hits / at-bats over his last 7 games (leadoff batter only)',
  })
  last7!: LineupLast7Dto | null;
}

export class LineupProbableDto {
  @ApiProperty({ example: 684007 })
  mlbId!: number;

  @ApiProperty({ example: 'Shota Imanaga' })
  name!: string;

  @ApiPropertyOptional({ type: String, nullable: true, enum: ['L', 'R'] })
  hand!: 'L' | 'R' | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: '18' })
  jerseyNumber!: string | null;
}

export class LineupSourceDto {
  @ApiProperty({ example: '849799' })
  providerGameId!: string;

  @ApiProperty({ example: '2026-10-19' })
  gameDate!: string;

  @ApiProperty({ example: 'Framber Valdez' })
  oppStarterName!: string;

  @ApiProperty({ enum: ['L', 'R'] })
  oppStarterHand!: 'L' | 'R';
}

export class LineupSideDto {
  @ApiProperty({ example: 'HOU' })
  teamAbbr!: string;

  @ApiProperty({
    enum: ['official', 'projected', 'none'],
    description:
      "official = MLB's posted lineup; projected = the club's last lineup against a starter of the same hand as today's opposing probable; none = neither is known",
  })
  status!: 'official' | 'projected' | 'none';

  @ApiPropertyOptional({
    type: LineupProbableDto,
    nullable: true,
    description: 'The OPPOSING probable starter this lineup faces',
  })
  opposingProbable!: LineupProbableDto | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description:
      'When the official lineup was first seen (ISO). Null when it was already posted when the server first looked.',
  })
  postedAt!: string | null;

  @ApiPropertyOptional({
    type: LineupSourceDto,
    nullable: true,
    description: 'The game a projected lineup comes from',
  })
  source!: LineupSourceDto | null;

  @ApiProperty({ type: [LineupBatterDto] })
  batters!: LineupBatterDto[];
}

export class GameLineupsDto {
  @ApiProperty({ example: '849805' })
  providerGameId!: string;

  @ApiProperty({ type: LineupSideDto })
  away!: LineupSideDto;

  @ApiProperty({ type: LineupSideDto })
  home!: LineupSideDto;
}
