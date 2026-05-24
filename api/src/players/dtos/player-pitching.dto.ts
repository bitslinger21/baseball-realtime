import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";

export class PitchArsenalRowDto {
  @ApiProperty({ example: 'FF' })
  @IsString()
  pitchCode!: string;

  @ApiProperty({ example: 'Four-Seam Fastball' })
  @IsString()
  pitchName!: string;

  @ApiProperty({ example: 28.5 })
  @IsNumber()
  usage!: number;

  @ApiPropertyOptional({ nullable: true, example: 94.2 })
  @IsOptional()
  @IsNumber()
  avgVelocity!: number | null;

  @ApiPropertyOptional({ nullable: true, example: 2380 })
  @IsOptional()
  @IsNumber()
  avgSpin!: number | null;

  @ApiPropertyOptional({ nullable: true, example: 30.1 })
  @IsOptional()
  @IsNumber()
  whiffPct!: number | null;

  @ApiPropertyOptional({ nullable: true, example: 42.0 })
  @IsOptional()
  @IsNumber()
  putAwayPct!: number | null;

  @ApiProperty({ example: 450 })
  @IsNumber()
  count!: number;
}

export class LeverageRowDto {
  @ApiProperty({ example: 'lev_h' })
  @IsString()
  leverageCode!: string;

  @ApiProperty({ example: 'High Leverage' })
  @IsString()
  label!: string;

  @ApiProperty({ example: 45 })
  @IsNumber()
  games!: number;

  @ApiProperty({ example: 120 })
  @IsNumber()
  atBats!: number;

  @ApiProperty({ example: 35 })
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
}

export class PlayerPitchingDto {
  @ApiProperty({ example: '592450' })
  @IsString()
  playerId!: string;

  @ApiProperty({ example: 2025 })
  @IsNumber()
  season!: number;

  @ApiProperty({ type: [PitchArsenalRowDto] })
  @ValidateNested({ each: true })
  @Type(() => PitchArsenalRowDto)
  arsenal!: PitchArsenalRowDto[];

  @ApiProperty({ type: [LeverageRowDto] })
  @ValidateNested({ each: true })
  @Type(() => LeverageRowDto)
  leverage!: LeverageRowDto[];
}
