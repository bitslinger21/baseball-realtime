import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class HotEventGameDto {
  @ApiProperty({ example: '776543' }) providerGameId!: string;
  @ApiProperty({ example: 'ATL' }) awayAbbr!: string;
  @ApiProperty({ example: 'HOU' }) homeAbbr!: string;
  @ApiProperty({ example: 0 }) awayScore!: number;
  @ApiProperty({ example: 3 }) homeScore!: number;
  @ApiProperty({ enum: ['top', 'bottom'], example: 'bottom' }) half!: 'top' | 'bottom';
  @ApiProperty({ example: 7 }) inning!: number;
}

export class HotEventPlayerDto {
  @ApiPropertyOptional({ example: 686613 }) id?: number;
  @ApiProperty({ example: 'Hunter Brown' }) name!: string;
}

export class HotEventDto {
  @ApiProperty({ example: 'nohit:776543:Bottom' }) id!: string;

  @ApiProperty({
    example: 'NO_HIT_BID',
    description:
      'NO_HIT_BID | PERFECT_GAME_BID | NO_HITTER_COMPLETED | PERFECT_GAME_COMPLETED | ' +
      'CYCLE_BID | CYCLE_COMPLETED | MULTI_HOME_RUN_GAME | HIGH_LEVERAGE_LATE',
  })
  type!: string;

  @ApiProperty({ enum: ['ACTIVE', 'COMPLETED'], example: 'ACTIVE' })
  status!: 'ACTIVE' | 'COMPLETED';

  @ApiProperty({
    example: 'Hunter Brown (HOU) has a no-hitter through six innings.',
    description: 'Display-ready prose, composed server-side — never assembled by the client.',
  })
  headline!: string;

  @ApiProperty({ example: 69, description: 'Ranking score, higher = more significant.' })
  importance!: number;

  @ApiProperty() occurredAt!: string;
  @ApiProperty() detectedAt!: string;
  @ApiProperty() updatedAt!: string;
  @ApiPropertyOptional({ nullable: true }) expiresAt?: string | null;

  @ApiPropertyOptional({ type: HotEventGameDto, nullable: true })
  game?: HotEventGameDto | null;

  @ApiProperty({ type: HotEventPlayerDto, isArray: true }) players!: HotEventPlayerDto[];
  @ApiProperty({ type: String, isArray: true, example: ['HOU'] }) teams!: string[];

  @ApiProperty({
    description:
      'Real availability flag resolved server-side — the client must not infer this from ' +
      'event type. true = show the red diamond bullet; false = the plain dot.',
  })
  hasIqContext!: boolean;

  @ApiProperty({
    type: String,
    isArray: true,
    description: 'Static suggested-question prompts for this event type — not a fabricated answer.',
  })
  iqSuggested!: string[];
}

export class HotEventsResponseDto {
  @ApiProperty({ type: HotEventDto, isArray: true, maxItems: 5 })
  events!: HotEventDto[];
}
