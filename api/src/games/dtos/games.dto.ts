// src/games/dto/game.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsString,
  IsDateString,
  IsOptional,
  IsIn,
  IsObject,
} from 'class-validator';
import { Game } from 'src/persistence/entities/game.entity';

export class GameDto {
  static fromEntity(entity: Game): GameDto {
    const dto = new GameDto();
    dto.id = entity.id;
    dto.providerGameId = entity.providerGameId;
    dto.gameDate = entity.gameDate;
    dto.homeAbbr = entity.homeAbbr;
    dto.awayAbbr = entity.awayAbbr;
    dto.status = entity.status;
    dto.startTimeUtc = entity.startTimeUtc;
    dto.snapshot = entity.snapshot;
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
}
