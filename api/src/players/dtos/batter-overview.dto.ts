import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsBoolean, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";

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

  @ApiPropertyOptional({ nullable: true, example: 4 })
  @IsOptional() @IsNumber() plateAppearances!: number | null;

  @ApiPropertyOptional({ nullable: true, example: 3 })
  @IsOptional() @IsNumber() atBats!: number | null;

  @ApiPropertyOptional({ nullable: true, example: 1 })
  @IsOptional() @IsNumber() hits!: number | null;

  @ApiPropertyOptional({ nullable: true, example: 1 })
  @IsOptional() @IsNumber() homeRuns!: number | null;

  @ApiPropertyOptional({ nullable: true, example: 2 })
  @IsOptional() @IsNumber() rbi!: number | null;

  @ApiPropertyOptional({ nullable: true, example: 1 })
  @IsOptional() @IsNumber() walks!: number | null;

  @ApiPropertyOptional({ nullable: true, example: 1 })
  @IsOptional() @IsNumber() strikeouts!: number | null;

  @ApiPropertyOptional({ nullable: true, example: '.333' })
  @IsOptional() @IsString() avg!: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'live' })
  @IsOptional() @IsString() gameStatus!: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'NYY' })
  @IsOptional() @IsString() opponent!: string | null;

  @ApiPropertyOptional({ nullable: true, example: '748531' })
  @IsOptional() @IsString() gameId!: string | null;

  /** Where the player is in the current live game's batting order. Omitted when not live. */
  @ApiPropertyOptional({ nullable: true, enum: ['atBat', 'onDeck', 'inTheHole', 'idle'], example: 'atBat' })
  @IsOptional() @IsString() playerState!: 'atBat' | 'onDeck' | 'inTheHole' | 'idle' | null;

  /** Most recent completed game; present when gameStatus === 'offday' and a game was found. */
  @ApiPropertyOptional({ nullable: true })
  @IsOptional() lastGame!: { date: string; opponent: string; hits: number; atBats: number } | null;
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
