import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpcomingFactDto {
  @ApiProperty({ example: 'Opponent' }) label!: string;
  @ApiProperty({ example: 'NYY/CLE' }) value!: string;
  @ApiPropertyOptional({ type: String, isArray: true, example: ['NYY', 'CLE'] }) teams?: string[];
  @ApiPropertyOptional() mono?: boolean;
  @ApiPropertyOptional({ example: 'Set after Game 5 tonight' }) sub?: string;
}

export class UpcomingStatusDto {
  @ApiProperty({ enum: ['games', 'waiting', 'eliminated', 'offseason'] })
  kind!: 'games' | 'waiting' | 'eliminated' | 'offseason';
  @ApiPropertyOptional({ type: String, nullable: true, description: 'One sentence: why there is no matchup to show.' })
  why!: string | null;
  @ApiProperty({ type: UpcomingFactDto, isArray: true, description: 'Only known facts; unknown rows are left out.' })
  facts!: UpcomingFactDto[];
  @ApiPropertyOptional({ enum: ['stats'], nullable: true }) link!: 'stats' | null;
}
