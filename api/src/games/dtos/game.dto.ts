import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import {
  IsUUID,
  IsString,
  IsDateString,
  IsOptional,
  IsIn,
  IsObject,
  IsInt,
  IsBoolean,
  Min,
} from 'class-validator';

export class ProbablePitcherDto {
  @ApiPropertyOptional({ nullable: true, example: 663554 })
  @IsOptional()
  @IsInt()
  mlbId!: number | null;

  @ApiPropertyOptional({ nullable: true, example: 'Casey Mize' })
  @IsOptional()
  @IsString()
  name!: string | null;

  @ApiPropertyOptional({ nullable: true, example: '12' })
  @IsOptional()
  @IsString()
  jerseyNumber!: string | null;

  @ApiPropertyOptional({ nullable: true, enum: ['L', 'R'] })
  @IsOptional()
  @IsString()
  pitchHand!: 'L' | 'R' | null;
}

export class StarterStatusDto {
  @ApiProperty({ enum: ['confirmed', 'projected', 'tbd'] })
  status!: 'confirmed' | 'projected' | 'tbd';

  @ApiPropertyOptional({ nullable: true, enum: ['High', 'Medium', 'Low'] })
  confidence?: 'High' | 'Medium' | 'Low' | null;

  @ApiPropertyOptional({ nullable: true, example: 'Jun 15 vs CHC' })
  lastStart?: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'On turn behind Verlander, on normal 5 days’ rest.' })
  basis?: string | null;
}

export class LinescoreTeamDto {
  @ApiPropertyOptional({ example: 3, nullable: true }) runs?: number | null;
  @ApiPropertyOptional({ example: 7, nullable: true }) hits?: number | null;
  @ApiPropertyOptional({ example: 0, nullable: true }) errors?: number | null;
}

export class LinescoreDto {
  @ApiPropertyOptional({ type: LinescoreTeamDto, nullable: true }) away?: LinescoreTeamDto | null;
  @ApiPropertyOptional({ type: LinescoreTeamDto, nullable: true }) home?: LinescoreTeamDto | null;
  @ApiPropertyOptional({ example: 5, nullable: true }) currentInning?: number | null;
  @ApiPropertyOptional({ example: 'Top', nullable: true }) inningHalf?: string | null;
  @ApiPropertyOptional({ example: true, nullable: true }) isTopInning?: boolean | null;
  @ApiPropertyOptional({ example: 2, nullable: true }) outs?: number | null;
}
import { Game } from '../../persistence/entities/game.entity';

export class GameDto {
  static fromEntity(entity: Game): GameDto {
    const dto = new GameDto();
    dto.id = entity.id;
    dto.providerGameId = entity.providerGameId;
    dto.gameDate = entity.gameDate;
    dto.homeAbbr = entity.homeAbbr;
    dto.awayAbbr = entity.awayAbbr;
    dto.homeName = entity.homeName;
    dto.awayName = entity.awayName;
    dto.status = entity.status;
    dto.startTimeUtc = entity.startTimeUtc;
    dto.snapshot = entity.snapshot;
    dto.homeScore = entity.homeScore;
    dto.awayScore = entity.awayScore;
    dto.snapshot = entity.snapshot;

    // NEW: daily-games support (DB might not have these; keep optional)
    dto.detailedState = null;
    dto.inning = null;
    dto.half = null;
    dto.outs = null;
    dto.linescore = null;
    dto.currentInning = null;
    dto.isTopInning = null;
    dto.halfInning = null;

    // Promote probable/venue/teamId from snapshot for DB-loaded games
    const snap = entity.snapshot as Record<string, unknown> | null;
    dto.venue = typeof snap?.venue === 'string' ? snap.venue : null;
    dto.homeTeamId = typeof snap?.homeTeamId === 'number' ? snap.homeTeamId : null;
    dto.awayTeamId = typeof snap?.awayTeamId === 'number' ? snap.awayTeamId : null;
    dto.homeProbable = (snap?.homeProbable as ProbablePitcherDto | null) ?? null;
    dto.awayProbable = (snap?.awayProbable as ProbablePitcherDto | null) ?? null;

    return dto;
  }

  @ApiPropertyOptional({
    description: 'Internal unique game ID (UUID)',
    example: '2f1e8d10-4b8a-4e59-a07a-61d9c6c4cf71',
  })
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiPropertyOptional({
    description: 'External provider-assigned game ID',
    example: '663937',
  })
  @IsOptional()
  @IsString()
  providerGameId?: string;

  @ApiProperty({
    description: 'UTC calendar date of the game (YYYY-MM-DD)',
    example: '2025-10-30',
  })
  @IsDateString()
  gameDate: string;

  @ApiProperty({
    description: 'Home team abbreviation (usually 2–5 chars)',
    example: 'HOU',
    maxLength: 5,
  })
  @IsString()
  homeAbbr: string;

  @ApiProperty({
    description: 'Away team abbreviation (usually 2–5 chars)',
    example: 'DET',
    maxLength: 5,
  })
  @IsString()
  awayAbbr: string;

  @ApiProperty({
    description: 'Home team name',
    example: 'Astros',
  })
  @IsString()
  homeName: string;

  @ApiProperty({
    description: 'Away team name',
    example: 'Tigers',
  })
  @IsString()
  awayName: string;

  @ApiProperty({
    description: 'Current game status',
    enum: ['scheduled', 'live', 'final'],
    example: 'final',
  })
  @IsIn(['scheduled', 'live', 'final'])
  status: 'scheduled' | 'live' | 'final';

  @ApiPropertyOptional({
    description: 'Start time of the game in UTC (timestamp)',
    type: String,
    format: 'date-time',
    example: '2025-10-30T19:05:00Z',
    nullable: true,
  })
  @IsOptional()
  @IsDateString()
  startTimeUtc: Date | null;

  @ApiPropertyOptional({
    description:
      'Arbitrary JSON snapshot of provider metadata (venue, IDs, etc.)',
    type: Object,
    example: {
      venue: 'Minute Maid Park',
      providerVenueId: 2143,
      feedUrl: 'https://api.sportsdata.io/v4/mlb/scores/json/Game/663937',
    },
    nullable: true,
  })
  @IsOptional()
  @IsObject()
  snapshot: Record<string, unknown> | null;

  @ApiPropertyOptional({
    description: 'Current home team score',
    example: 5,
    nullable: true,
  })
  @IsOptional()
  homeScore: number | null;

  @ApiPropertyOptional({
    description: 'Current away team score',
    example: 3,
    nullable: true,
  })
  @IsOptional()
  awayScore: number | null;

  // -------------------------
  // NEW: schedule/linescore support for Daily Games UI
  // -------------------------

  @ApiPropertyOptional({
    description:
      'Provider detailed state (e.g., Delayed, Postponed, Suspended). Useful for edge statuses.',
    example: 'Delayed Start',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  detailedState: string | null;

  @ApiPropertyOptional({
    description: 'Current inning number (live games only)',
    example: 5,
    nullable: true,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  inning: number | null;

  @ApiPropertyOptional({
    description: 'Current half inning (live games only)',
    enum: ['top', 'bottom'],
    example: 'top',
    nullable: true,
  })
  @IsOptional()
  @IsIn(['top', 'bottom'])
  half: 'top' | 'bottom' | null;

  @ApiPropertyOptional({
    description: 'Current outs (live games only)',
    example: 2,
    nullable: true,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  outs: number | null;

  @ApiPropertyOptional({
    description: 'Full linescore snapshot for the current game state',
    type: LinescoreDto,
    nullable: true,
  })
  @IsOptional()
  linescore?: LinescoreDto | null;

  @ApiPropertyOptional({
    description: 'Current inning number (alias used by some provider feeds)',
    example: 5,
    nullable: true,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  currentInning?: number | null;

  @ApiPropertyOptional({
    description: 'Whether it is currently the top half of the inning',
    example: true,
    nullable: true,
  })
  @IsOptional()
  @IsBoolean()
  isTopInning?: boolean | null;

  @ApiPropertyOptional({
    description: 'Half-inning label (e.g. "Top", "Bottom")',
    example: 'Top',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  halfInning?: string | null;

  // ── Upcoming-tab fields (populated from live MLB schedule; null for DB-only rows) ──

  @ApiPropertyOptional({ description: 'Ballpark name', example: 'Daikin Park', nullable: true })
  @IsOptional()
  @IsString()
  venue?: string | null;

  @ApiPropertyOptional({ description: 'MLB numeric home team ID', example: 117, nullable: true })
  @IsOptional()
  @IsInt()
  homeTeamId?: number | null;

  @ApiPropertyOptional({ description: 'MLB numeric away team ID', example: 116, nullable: true })
  @IsOptional()
  @IsInt()
  awayTeamId?: number | null;

  @ApiPropertyOptional({ type: ProbablePitcherDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProbablePitcherDto)
  homeProbable?: ProbablePitcherDto | null;

  @ApiPropertyOptional({ type: ProbablePitcherDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProbablePitcherDto)
  awayProbable?: ProbablePitcherDto | null;

  @ApiPropertyOptional({ type: StarterStatusDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => StarterStatusDto)
  homeStarterStatus?: StarterStatusDto | null;

  @ApiPropertyOptional({ type: StarterStatusDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => StarterStatusDto)
  awayStarterStatus?: StarterStatusDto | null;
}