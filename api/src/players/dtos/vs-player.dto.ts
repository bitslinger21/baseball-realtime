import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class VsPlayerDto {
  @ApiProperty({ description: 'Batter MLB ID', example: 660670 })
  @IsInt()
  batterId!: number;

  @ApiProperty({ description: 'Pitcher MLB ID', example: 592789 })
  @IsInt()
  pitcherId!: number;

  @ApiProperty({ description: 'Career at-bats in this matchup', example: 12 })
  @IsInt()
  ab!: number;

  @ApiProperty({ description: 'Career hits in this matchup', example: 4 })
  @IsInt()
  h!: number;

  @ApiProperty({ description: 'Career home runs in this matchup', example: 1 })
  @IsInt()
  hr!: number;

  @ApiProperty({ description: 'Career walks in this matchup', example: 0 })
  @IsInt()
  bb!: number;

  @ApiProperty({ description: 'Career strikeouts in this matchup', example: 3 })
  @IsInt()
  k!: number;

  @ApiPropertyOptional({ description: 'Career batting average, e.g. ".333"', example: '.333', nullable: true })
  @IsOptional()
  @IsString()
  avg!: string | null;

  @ApiProperty({ description: 'Career plate appearances in this matchup', example: 15 })
  @IsInt()
  pa!: number;

  @ApiProperty({ description: 'Career doubles in this matchup', example: 1 })
  @IsInt()
  doubles!: number;

  @ApiProperty({ description: 'Career triples in this matchup', example: 0 })
  @IsInt()
  triples!: number;

  @ApiProperty({ description: 'Career RBI in this matchup', example: 2 })
  @IsInt()
  rbi!: number;
}
