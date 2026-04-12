import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsBoolean, IsNumber, IsString, ValidateNested } from "class-validator";

export class BatterOverviewHeadlineDto {
  @ApiProperty({ description: "The player's batting average for the season." })
  @IsString()
  battingAverage!: string;

  @ApiProperty({ description: "The player's on-base percentage for the season." })
  @IsString()
  onBasePercentage!: string;

  @ApiProperty({ description: "The player's slugging percentage for the season." })
  @IsString()
  sluggingPercentage!: string;

  @ApiProperty({ description: "The player's OPS for the season." })
  @IsString()
  onBasePlusSlugging!: string;

  @ApiProperty({ description: "The player's home runs for the season." })
  @IsNumber()
  homeRuns!: number;

  @ApiProperty({ description: "The player's runs batted in for the season." })
  @IsNumber()
  runsBattedIn!: number;
}

export class BatterOverviewSecondaryDto {
  @ApiProperty({ description: "The number of games played." })
  @IsNumber()
  games!: number;

  @ApiProperty({ description: "The number of at-bats." })
  @IsNumber()
  atBats!: number;

  @ApiProperty({ description: "The number of runs scored." })
  @IsNumber()
  runs!: number;

  @ApiProperty({ description: "The number of hits." })
  @IsNumber()
  hits!: number;

  @ApiProperty({ description: "The number of doubles." })
  @IsNumber()
  doubles!: number;

  @ApiProperty({ description: "The number of triples." })
  @IsNumber()
  triples!: number;

  @ApiProperty({ description: "The number of walks." })
  @IsNumber()
  walks!: number;

  @ApiProperty({ description: "The number of strikeouts." })
  @IsNumber()
  strikeouts!: number;

  @ApiProperty({ description: "The number of stolen bases." })
  @IsNumber()
  stolenBases!: number;
}

export class BatterOverviewTodayDto {
  @ApiProperty({ description: "The label for today's stats." })
  @IsString()
  label!: string;

  @ApiProperty({ description: "The stat line for today's stats." })
  @IsString()
  statLine!: string;

  @ApiProperty({ description: "Whether the player is currently in a live game." })
  @IsBoolean()
  isLive!: boolean;
}

export class BatterOverviewDto {
  @ApiProperty({ description: "The player's unique identifier." })
  @IsString()
  playerId!: string;

  @ApiProperty({ description: "The season for which the stats are displayed." })
  @IsNumber()
  season!: number;

  @ApiProperty({
    description: "The player's headline stats for the season.",
    type: BatterOverviewHeadlineDto,
  })
  @ValidateNested()
  @Type(() => BatterOverviewHeadlineDto)
  headline!: BatterOverviewHeadlineDto;

  @ApiProperty({
    description: "The player's secondary stats for the season.",
    type: BatterOverviewSecondaryDto,
  })
  @ValidateNested()
  @Type(() => BatterOverviewSecondaryDto)
  secondary!: BatterOverviewSecondaryDto;

  @ApiProperty({
    description: "The player's stats for today.",
    type: BatterOverviewTodayDto,
    nullable: true,
  })
  @ValidateNested()
  @Type(() => BatterOverviewTodayDto)
  today!: BatterOverviewTodayDto | null;
}
