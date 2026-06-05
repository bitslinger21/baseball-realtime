import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SeriesGameDto {
  @ApiProperty({ example: 'May 22' })
  date!: string;

  @ApiProperty({ example: 'HOU' })
  awayAbbr!: string;

  @ApiPropertyOptional({ nullable: true, example: 3 })
  awayScore!: number | null;

  @ApiProperty({ example: 'CHC' })
  homeAbbr!: string;

  @ApiPropertyOptional({ nullable: true, example: 5 })
  homeScore!: number | null;

  @ApiPropertyOptional({ nullable: true, example: 'CHC' })
  winner!: string | null;
}

export class SeriesDto {
  @ApiProperty({ example: 'HOU' })
  awayAbbr!: string;

  @ApiProperty({ example: 'CHC' })
  homeAbbr!: string;

  @ApiProperty({ example: 1 })
  awayWins!: number;

  @ApiProperty({ example: 1 })
  homeWins!: number;

  @ApiProperty({ type: [SeriesGameDto] })
  games!: SeriesGameDto[];
}
