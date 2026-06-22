import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsBoolean, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";

export class GameLogRowDto {
  @ApiProperty({ example: '2025-03-27' })
  @IsString()
  date!: string;

  @ApiProperty({ example: 'Milwaukee Brewers' })
  @IsString()
  opponent!: string;

  @ApiProperty({ example: 158 })
  @IsNumber()
  opponentId!: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  isHome!: boolean;

  @ApiPropertyOptional({ nullable: true, example: true })
  @IsOptional()
  @IsBoolean()
  isWin!: boolean | null;

  @ApiProperty({ example: '1-4 | HR, 2 RBI' })
  @IsString()
  summary!: string;

  // Batting fields
  @ApiPropertyOptional({ nullable: true, example: 4 })
  @IsOptional() @IsNumber() atBats!: number | null;

  @ApiPropertyOptional({ nullable: true, example: 1 })
  @IsOptional() @IsNumber() hits!: number | null;

  @ApiPropertyOptional({ nullable: true, example: 1 })
  @IsOptional() @IsNumber() homeRuns!: number | null;

  @ApiPropertyOptional({ nullable: true, example: 2 })
  @IsOptional() @IsNumber() rbi!: number | null;

  @ApiPropertyOptional({ nullable: true, example: 1 })
  @IsOptional() @IsNumber() strikeOuts!: number | null;

  @ApiPropertyOptional({ nullable: true, example: 0 })
  @IsOptional() @IsNumber() baseOnBalls!: number | null;

  @ApiPropertyOptional({ nullable: true, example: '.250' })
  @IsOptional() @IsString() avg!: string | null;

  @ApiPropertyOptional({ nullable: true, example: 0.243, type: Number, description: 'Running season-to-date batting average through this game (Σhits / ΣatBats, chronological order). Null when ΣatBats === 0.' })
  @IsOptional() @IsNumber() runningAvg!: number | null;

  // Pitching fields
  @ApiPropertyOptional({ nullable: true, example: '6.0' })
  @IsOptional() @IsString() inningsPitched!: string | null;

  @ApiPropertyOptional({ nullable: true, example: 2 })
  @IsOptional() @IsNumber() earnedRuns!: number | null;

  @ApiPropertyOptional({ nullable: true, example: '2.05' })
  @IsOptional() @IsString() era!: string | null;

  @ApiPropertyOptional({ nullable: true, example: '0.98' })
  @IsOptional() @IsString() whip!: string | null;
}

export class CareerRowDto {
  @ApiProperty({ example: '2025' })
  @IsString()
  season!: string;

  @ApiProperty({ example: 'New York Yankees' })
  @IsString()
  team!: string;

  @ApiProperty({ example: 162 })
  @IsNumber()
  gamesPlayed!: number;

  // Batting fields
  @ApiPropertyOptional({ nullable: true, example: 550 })
  @IsOptional() @IsNumber() atBats!: number | null;

  @ApiPropertyOptional({ nullable: true, example: '.280' })
  @IsOptional() @IsString() avg!: string | null;

  @ApiPropertyOptional({ nullable: true, example: 40 })
  @IsOptional() @IsNumber() homeRuns!: number | null;

  @ApiPropertyOptional({ nullable: true, example: 110 })
  @IsOptional() @IsNumber() rbi!: number | null;

  @ApiPropertyOptional({ nullable: true, example: '.940' })
  @IsOptional() @IsString() ops!: string | null;

  // Pitching fields
  @ApiPropertyOptional({ nullable: true, example: '185.2' })
  @IsOptional() @IsString() inningsPitched!: string | null;

  @ApiPropertyOptional({ nullable: true, example: '2.15' })
  @IsOptional() @IsString() era!: string | null;

  @ApiPropertyOptional({ nullable: true, example: '0.95' })
  @IsOptional() @IsString() whip!: string | null;

  @ApiPropertyOptional({ nullable: true, example: 220 })
  @IsOptional() @IsNumber() strikeOuts!: number | null;

  @ApiPropertyOptional({ nullable: true, example: 14 })
  @IsOptional() @IsNumber() wins!: number | null;

  @ApiPropertyOptional({ nullable: true, example: 5 })
  @IsOptional() @IsNumber() losses!: number | null;
}

export class VsTeamRowDto {
  @ApiProperty({ example: 158 })
  @IsNumber()
  opponentId!: number;

  @ApiProperty({ example: 'Milwaukee Brewers' })
  @IsString()
  opponent!: string;

  @ApiProperty({ example: 6 })
  @IsNumber()
  games!: number;

  @ApiProperty({ example: 22 })
  @IsNumber()
  atBats!: number;

  @ApiProperty({ example: 7 })
  @IsNumber()
  hits!: number;

  @ApiProperty({ example: 2 })
  @IsNumber()
  homeRuns!: number;

  @ApiProperty({ example: 5 })
  @IsNumber()
  rbi!: number;

  @ApiProperty({ example: 3 })
  @IsNumber()
  strikeOuts!: number;

  @ApiProperty({ example: 2 })
  @IsNumber()
  baseOnBalls!: number;

  @ApiProperty({ example: '.318' })
  @IsString()
  avg!: string;

  @ApiProperty({ example: '.980' })
  @IsString()
  ops!: string;
}

export class PlayerDrilldownDto {
  @ApiProperty({ example: '592450' })
  @IsString()
  playerId!: string;

  @ApiProperty({ example: 2025 })
  @IsNumber()
  season!: number;

  @ApiProperty({ example: false })
  @IsBoolean()
  isPitcher!: boolean;

  @ApiProperty({ type: [GameLogRowDto] })
  @ValidateNested({ each: true })
  @Type(() => GameLogRowDto)
  gameLog!: GameLogRowDto[];

  @ApiProperty({ type: [CareerRowDto] })
  @ValidateNested({ each: true })
  @Type(() => CareerRowDto)
  career!: CareerRowDto[];

  @ApiProperty({ type: [VsTeamRowDto] })
  @ValidateNested({ each: true })
  @Type(() => VsTeamRowDto)
  vsTeam!: VsTeamRowDto[];
}
