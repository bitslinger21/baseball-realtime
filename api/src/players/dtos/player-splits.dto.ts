import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";

export class SplitRowDto {
  @ApiProperty({ example: 'vl' })
  @IsString()
  splitCode!: string;

  @ApiProperty({ example: 'vs LHP' })
  @IsString()
  label!: string;

  @ApiProperty({ example: 45 })
  @IsNumber()
  games!: number;

  @ApiProperty({ example: 130 })
  @IsNumber()
  atBats!: number;

  @ApiProperty({ example: 38 })
  @IsNumber()
  hits!: number;

  @ApiProperty({ example: 8 })
  @IsNumber()
  homeRuns!: number;

  @ApiProperty({ example: 22 })
  @IsNumber()
  rbi!: number;

  @ApiProperty({ example: 15 })
  @IsNumber()
  baseOnBalls!: number;

  @ApiProperty({ example: 30 })
  @IsNumber()
  strikeOuts!: number;

  @ApiProperty({ example: '.292' })
  @IsString()
  avg!: string;

  @ApiProperty({ example: '.365' })
  @IsString()
  obp!: string;

  @ApiProperty({ example: '.480' })
  @IsString()
  slg!: string;

  @ApiProperty({ example: '.845' })
  @IsString()
  ops!: string;

  @ApiPropertyOptional({ example: 'handedness' })
  @IsOptional()
  @IsString()
  group?: string;
}

export class PlayerSplitsDto {
  @ApiProperty({ example: '592450' })
  @IsString()
  playerId!: string;

  @ApiProperty({ example: 2025 })
  @IsNumber()
  season!: number;

  /** Which timeframe was requested. 'career' rows have no season filter. */
  @ApiProperty({ enum: ['season', 'career'], example: 'season' })
  @IsString()
  timeframe!: 'season' | 'career';

  @ApiProperty({ type: [SplitRowDto] })
  @ValidateNested({ each: true })
  @Type(() => SplitRowDto)
  splits!: SplitRowDto[];
}
