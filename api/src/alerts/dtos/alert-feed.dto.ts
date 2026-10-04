import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// The progress picture (AlProg): one of
//   { type:'innings', done }               no-hitter / perfect game
//   { type:'cycle', have:['1B','2B','HR'] } cycle watch
//   { type:'count', from, to, unit }       milestone
export class AlertProgDto {
  @ApiProperty({ enum: ['innings', 'cycle', 'count'] }) type!: 'innings' | 'cycle' | 'count';
  @ApiPropertyOptional({ example: 7 }) done?: number;
  @ApiPropertyOptional({ type: String, isArray: true, example: ['1B', '2B', 'HR'] }) have?: string[];
  @ApiPropertyOptional({ example: 399 }) from?: number;
  @ApiPropertyOptional({ example: 400 }) to?: number;
  @ApiPropertyOptional({ example: 'career HR' }) unit?: string;
}

// One alert for the header bell (PROMPT_alerts.md "Data"). Re-sending the
// same storyId updates that story in place; an ended story arrives as a new
// id with live:false.
export class AlertFeedItemDto {
  @ApiProperty({ example: '2b1f…' }) id!: string;
  @ApiProperty({ example: 'nh:849835:home' }) storyId!: string;
  @ApiProperty({ example: 'No-hitter' }) kind!: string;
  @ApiProperty({ description: 'Arrives as the pop-up (server-decided).' }) big!: boolean;
  @ApiProperty() live!: boolean;
  @ApiProperty({ example: '2026-10-03T01:31:00Z' }) at!: string;
  @ApiProperty({ example: 669373 }) playerId!: number;
  @ApiProperty({ example: 'Skubal' }) playerShort!: string;
  @ApiProperty({ example: 'DET' }) teamAbbr!: string;
  @ApiProperty({ example: 'has a no-hitter through 7' }) title!: string;
  @ApiProperty({ example: '94 pitches · 9 K · 1 BB' }) sub!: string;
  @ApiProperty({ example: '849835' }) gamePk!: string;
  @ApiProperty({ example: 'DET' }) away!: string;
  @ApiProperty({ example: 'CLE' }) home!: string;
  @ApiProperty({ type: Number, isArray: true, example: [3, 0], description: '[away, home]' }) score!: [number, number];
  @ApiProperty({ example: '▲8', description: '"▲8" / "▼8" while live, "Final" after.' }) half!: string;
  @ApiPropertyOptional({ type: String, nullable: true }) clipId!: string | null;
  @ApiPropertyOptional({ type: AlertProgDto, nullable: true }) prog!: AlertProgDto | null;
}
