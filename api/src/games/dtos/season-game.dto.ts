import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SeasonGameDto {
  @ApiProperty({ type: String, nullable: true })
  providerGameId: string | null = null;

  @ApiProperty()
  gameDate: string = '';

  @ApiPropertyOptional({ type: String, nullable: true })
  startTimeUtc: string | null = null;

  @ApiProperty()
  isHome: boolean = false;

  @ApiProperty()
  oppAbbr: string = '';

  @ApiProperty()
  oppName: string = '';

  @ApiPropertyOptional({ type: Number, nullable: true })
  oppTeamId: number | null = null;

  @ApiProperty({ enum: ['scheduled', 'live', 'final'] })
  status: 'scheduled' | 'live' | 'final' = 'scheduled';

  @ApiPropertyOptional({ type: String, nullable: true })
  detailedState: string | null = null;

  @ApiPropertyOptional({ type: Number, nullable: true })
  teamScore: number | null = null;

  @ApiPropertyOptional({ type: Number, nullable: true })
  oppScore: number | null = null;

  @ApiPropertyOptional({ type: String, nullable: true })
  winnerName: string | null = null;

  @ApiPropertyOptional({ type: String, nullable: true })
  loserName: string | null = null;

  @ApiPropertyOptional({ type: Number, nullable: true })
  winnerId: number | null = null;

  @ApiPropertyOptional({ type: Number, nullable: true })
  loserId: number | null = null;

  @ApiPropertyOptional({ type: String, nullable: true })
  homeProbableName: string | null = null;

  @ApiPropertyOptional({ type: String, nullable: true })
  awayProbableName: string | null = null;

  @ApiPropertyOptional({ type: Number, nullable: true })
  currentInning: number | null = null;

  @ApiPropertyOptional({ type: String, nullable: true })
  halfInning: string | null = null;
}
