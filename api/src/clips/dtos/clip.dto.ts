import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ClipPlayerTagDto {
  @ApiProperty({ example: 657136 }) id!: number;
  @ApiProperty({ example: 111 }) teamId!: number;
  @ApiProperty({ example: 'batter' }) role!: string;
}

export class ClipScoreDto {
  @ApiProperty({ example: 3 }) away!: number;
  @ApiProperty({ example: 4 }) home!: number;
}

// PROMPT_video_clips.md §6b — the one shape every clip endpoint returns.
export class ClipDto {
  @ApiProperty({ example: 'aaron-civale-in-play-run-s-to-connor-wong' }) id!: string;
  @ApiProperty({ example: '824703' }) gameId!: string;
  @ApiPropertyOptional({ nullable: true, example: 57, description: 'null when unmatched to a play (§6a).' })
  atBatIndex!: number | null;
  @ApiPropertyOptional({ nullable: true, example: 7 }) inning!: number | null;
  @ApiPropertyOptional({ nullable: true, enum: ['top', 'bottom'] }) half!: 'top' | 'bottom' | null;
  @ApiProperty({ example: "Connor Wong's go-ahead double" }) title!: string;
  @ApiProperty({ example: 'Connor Wong lines a go-ahead double to left field to give the Red Sox a 4-3 lead in the bottom of the 7th inning' })
  description!: string;
  @ApiProperty({ example: 30 }) durationSec!: number;
  @ApiProperty({ example: 'https://.../clip_720p.mp4' }) mp4Url!: string;
  @ApiPropertyOptional({ nullable: true }) thumbnailUrl!: string | null;
  @ApiProperty({ type: ClipPlayerTagDto, isArray: true }) players!: ClipPlayerTagDto[];
  @ApiPropertyOptional({ nullable: true, type: ClipScoreDto }) scoreAfter!: ClipScoreDto | null;
  @ApiProperty({ example: '2026-09-26T23:41:07Z' }) publishedAt!: string;
}
