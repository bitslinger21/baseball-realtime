import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RaceTeamRowDto {
  @ApiProperty({ example: 'HOU' }) abbr!: string;
  @ApiProperty({ example: 'Houston Astros' }) displayName!: string;
  @ApiProperty({ example: '86-67' }) record!: string;
  @ApiPropertyOptional({ description: 'Optional win-loss note; column drops entirely when absent.' })
  wl?: string;
  @ApiProperty({
    example: '2.0',
    description: '"-" for the leader, "IN" for a clinched wild-card spot (never a bare number/glyph).',
  })
  gamesBack!: string;
  @ApiPropertyOptional({ description: 'Wild card only — inside the cut line.' })
  holdingSpot?: boolean;
}

export class ChaseRowDto {
  @ApiProperty({ example: 'Bobby Witt Jr.' }) playerName!: string;
  @ApiPropertyOptional({ nullable: true, example: 'KC' }) teamAbbr?: string | null;
  @ApiProperty({ example: '.332' }) value!: string;
}

export class RaceGroupDto {
  @ApiProperty({ example: 'AL West' }) title!: string;
  @ApiProperty({ example: '9 left' }) note!: string;
  @ApiPropertyOptional({ nullable: true, example: null }) clinchedAbbr?: string | null;
  @ApiProperty({ enum: ['division', 'wildcard'] }) kind!: 'division' | 'wildcard';
  @ApiProperty({ type: RaceTeamRowDto, isArray: true }) rows!: RaceTeamRowDto[];
}

export class ChaseGroupDto {
  @ApiProperty({ example: 'Home Runs' }) title!: string;
  @ApiProperty({ enum: ['chase'] }) kind!: 'chase';
  @ApiProperty({ enum: ['hitting', 'pitching'] }) group!: 'hitting' | 'pitching';
  @ApiPropertyOptional({ enum: ['AL', 'NL'], description: 'Hitting only; pitching stays combined.' })
  league?: 'AL' | 'NL';
  @ApiProperty({ type: ChaseRowDto, isArray: true }) rows!: ChaseRowDto[];
}

export class RacesResponseDto {
  @ApiProperty({
    enum: ['full', 'early'],
    description: 'early = six division one-liners only, no wild card/chases (condition-gated, not calendar-gated).',
  })
  mode!: 'full' | 'early';
  @ApiProperty({ example: '9 games left in the regular season' }) note!: string;
  @ApiProperty({ type: RaceGroupDto, isArray: true }) divisions!: RaceGroupDto[];
  @ApiProperty({ type: RaceGroupDto, isArray: true }) wildCards!: RaceGroupDto[];
  @ApiProperty({ type: ChaseGroupDto, isArray: true }) chases!: ChaseGroupDto[];
}
