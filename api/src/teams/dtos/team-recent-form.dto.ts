import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RecentFormGameDto {
  @ApiProperty() providerGameId!: string;
  @ApiProperty() gameDate!: string;
  @ApiProperty() scored!: number;
  @ApiProperty() allowed!: number;
  @ApiProperty({ enum: ['W', 'L'] }) result!: 'W' | 'L';
}

export class TeamRecentFormDto {
  @ApiProperty() wins!: number;
  @ApiProperty() losses!: number;
  @ApiProperty() runsPerGame!: number;

  // null when the window has no innings-pitched data to divide by (shouldn't
  // happen for real final games, but guards a divide-by-zero rather than
  // fabricating a number).
  @ApiPropertyOptional({ nullable: true }) teamEra!: number | null;
  @ApiPropertyOptional({ nullable: true }) bullpenEra!: number | null;

  @ApiProperty() homeRuns!: number;
  @ApiProperty() strikeouts!: number;
  @ApiProperty() walks!: number;

  @ApiProperty({ type: [RecentFormGameDto] })
  games!: RecentFormGameDto[];
}
