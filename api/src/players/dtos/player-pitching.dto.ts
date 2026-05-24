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

export class PitcherSplitRowDto {
  @ApiProperty({ example: 'vl' })
  @IsString()
  splitCode!: string;

  @ApiProperty({ example: 'vs LHB' })
  @IsString()
  label!: string;

  @ApiProperty({ example: 18 })
  @IsNumber()
  games!: number;

  @ApiProperty({ example: '4.1' })
  @IsString()
  inningsPitched!: string;

  @ApiProperty({ example: '2.05' })
  @IsString()
  era!: string;

  @ApiProperty({ example: '0.98' })
  @IsString()
  whip!: string;

  @ApiProperty({ example: 99 })
  @IsNumber()
  strikeOuts!: number;

  @ApiProperty({ example: 22 })
  @IsNumber()
  baseOnBalls!: number;

  @ApiProperty({ example: '.210' })
  @IsString()
  avg!: string;

  @ApiProperty({ example: '.320' })
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

  @ApiProperty({ type: [PitcherSplitRowDto] })
  @ValidateNested({ each: true })
  @Type(() => PitcherSplitRowDto)
  splits!: PitcherSplitRowDto[];
}
