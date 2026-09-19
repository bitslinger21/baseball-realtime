import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SeptemberTeamRowDto {
  @ApiProperty({ example: 'HOU' }) abbr!: string;
  @ApiProperty({ example: '86-67' }) record!: string;
  @ApiProperty({ example: '2.0', description: '"-" for the leader/clinched team.' })
  gamesBack!: string;
  @ApiPropertyOptional({ description: 'Wild card only — inside the cut line.' })
  holdingSpot?: boolean;
}

export class SeptemberChaseRowDto {
  @ApiProperty({ example: 'Bobby Witt Jr.' }) playerName!: string;
  @ApiProperty({ example: '.332' }) value!: string;
}

export class SeptemberRaceDto {
  @ApiProperty({ example: 'AL West' }) title!: string;
  @ApiProperty({ example: '9 left' }) note!: string;
  @ApiPropertyOptional({ nullable: true, example: null }) clinchedAbbr?: string | null;
  @ApiProperty({ enum: ['division', 'wildcard', 'chase'] }) kind!: 'division' | 'wildcard' | 'chase';
  @ApiProperty({ type: SeptemberTeamRowDto, isArray: true }) teamRows!: SeptemberTeamRowDto[];
  @ApiProperty({ type: SeptemberChaseRowDto, isArray: true }) chaseRows!: SeptemberChaseRowDto[];
}

export class SeptemberResponseDto {
  @ApiProperty({
    enum: ['full', 'early'],
    description: 'early = six division one-liners only, no wild card/chases (condition-gated, not calendar-gated).',
  })
  mode!: 'full' | 'early';
  @ApiProperty({ type: SeptemberRaceDto, isArray: true }) divisions!: SeptemberRaceDto[];
  @ApiProperty({ type: SeptemberRaceDto, isArray: true }) wildCards!: SeptemberRaceDto[];
  @ApiProperty({ type: SeptemberRaceDto, isArray: true }) chases!: SeptemberRaceDto[];
}
