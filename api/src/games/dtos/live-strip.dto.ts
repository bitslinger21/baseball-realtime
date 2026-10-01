import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LiveStripSideDto {
  @ApiProperty({ example: 'NYY' }) abbr!: string;
  @ApiProperty({ example: 7 }) runs!: number;
}

// The thin strip above an on-top clip player (PROMPT_video_clips.md §6c):
// enough to keep a covered game's state current, nothing more.
export class LiveStripDto {
  @ApiProperty({ example: '849848' }) gameId!: string;
  @ApiProperty({ enum: ['live', 'final', 'scheduled'] }) state!: 'live' | 'final' | 'scheduled';
  @ApiProperty({ type: LiveStripSideDto }) away!: LiveStripSideDto;
  @ApiProperty({ type: LiveStripSideDto }) home!: LiveStripSideDto;
  @ApiPropertyOptional({ type: Number, nullable: true, example: 8 }) inning!: number | null;
  @ApiPropertyOptional({ enum: ['top', 'bottom'], nullable: true }) half!: 'top' | 'bottom' | null;
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: '1 out · runner on 2nd',
    description: 'Outs + runners, or "Middle of the 6th" between halves. Live games only.',
  })
  situation!: string | null;
}
