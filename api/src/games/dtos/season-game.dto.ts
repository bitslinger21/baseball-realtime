import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SeasonGameDto {
  @ApiProperty({ nullable: true })
  providerGameId: string | null = null;

  @ApiProperty()
  gameDate: string = '';

  @ApiPropertyOptional({ nullable: true })
  startTimeUtc: string | null = null;

  @ApiProperty()
  isHome: boolean = false;

  @ApiProperty()
  oppAbbr: string = '';

  @ApiProperty()
  oppName: string = '';

  @ApiPropertyOptional({ nullable: true })
  oppTeamId: number | null = null;

  @ApiProperty({ enum: ['scheduled', 'live', 'final'] })
  status: 'scheduled' | 'live' | 'final' = 'scheduled';

  @ApiPropertyOptional({ nullable: true })
  detailedState: string | null = null;

  @ApiPropertyOptional({ nullable: true })
  teamScore: number | null = null;

  @ApiPropertyOptional({ nullable: true })
  oppScore: number | null = null;

  @ApiPropertyOptional({ nullable: true })
  winnerName: string | null = null;

  @ApiPropertyOptional({ nullable: true })
  loserName: string | null = null;

  @ApiPropertyOptional({ nullable: true })
  homeProbableName: string | null = null;

  @ApiPropertyOptional({ nullable: true })
  awayProbableName: string | null = null;

  @ApiPropertyOptional({ nullable: true })
  currentInning: number | null = null;

  @ApiPropertyOptional({ nullable: true })
  halfInning: string | null = null;
}
