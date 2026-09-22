import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DayAheadRowDto {
  @ApiProperty({ example: '776543' }) providerGameId!: string;
  @ApiProperty({ example: 'ATL' }) awayAbbr!: string;
  @ApiProperty({ example: 'HOU' }) homeAbbr!: string;
  @ApiPropertyOptional({ nullable: true }) startTimeUtc?: string | null;
  @ApiPropertyOptional({ nullable: true, example: 'Framber Valdez' }) awayPitcherName?: string | null;
  @ApiPropertyOptional({ nullable: true, example: 'Hunter Brown' }) homePitcherName?: string | null;
  @ApiPropertyOptional({
    nullable: true,
    example: 'AL West race',
    description: 'A real, checkable reason this game made the shortlist. Never fabricated.',
  })
  stake?: string | null;
}

export class DayAheadResponseDto {
  @ApiProperty({ type: DayAheadRowDto, isArray: true, maxItems: 4 }) games!: DayAheadRowDto[];
  @ApiProperty({ example: 12, description: 'Real total for "All N games today →".' })
  totalCount!: number;
}
