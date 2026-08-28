import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsNumber, IsString, ValidateNested } from "class-validator";

export class LeaderEntryDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  rank!: number;

  @ApiProperty({ example: 663728 })
  @IsNumber()
  playerId!: number;

  @ApiProperty({ example: 'Cal Raleigh' })
  @IsString()
  playerName!: string;

  @ApiProperty({ example: 'Seattle Mariners' })
  @IsString()
  teamName!: string;

  @ApiProperty({ example: 136 })
  @IsNumber()
  teamId!: number;

  @ApiProperty({ example: '60' })
  @IsString()
  value!: string;
}

export class LeaderCategoryDto {
  @ApiProperty({ example: 'homeRuns' })
  @IsString()
  category!: string;

  @ApiProperty({ example: 'Home Runs' })
  @IsString()
  label!: string;

  @ApiProperty({ type: [LeaderEntryDto] })
  @ValidateNested({ each: true })
  @Type(() => LeaderEntryDto)
  leaders!: LeaderEntryDto[];
}

export class LeagueLeadersDto {
  @ApiProperty({ example: 2025 })
  @IsNumber()
  season!: number;

  @ApiProperty({ example: 'Aug 27', required: false })
  @IsString()
  throughDate?: string;

  @ApiProperty({ type: [LeaderCategoryDto] })
  @ValidateNested({ each: true })
  @Type(() => LeaderCategoryDto)
  batting!: LeaderCategoryDto[];

  @ApiProperty({ type: [LeaderCategoryDto] })
  @ValidateNested({ each: true })
  @Type(() => LeaderCategoryDto)
  pitching!: LeaderCategoryDto[];
}
