import { Column, CreateDateColumn, Entity, Index } from 'typeorm';

export type ClipPlayerTag = { id: number; teamId: number; role: string };
export type ClipScore = { away: number; home: number };

// PROMPT_video_clips.md §6b. Primary key is the SOURCE's own clip id (a
// stable slug, not generated) so a re-poll upserts in place rather than
// duplicating — `id` is what repository.save() matches an existing row on.
@Entity('clip')
export class Clip {
  @Column({ type: 'varchar', length: 191, primary: true })
  id!: string;

  @Index()
  @Column({ type: 'varchar', length: 64 })
  gameId!: string;

  // null when the ingest job couldn't match this clip to a specific play
  // (§6a) — it still surfaces in the Highlights row, just with no Watch
  // button and no scorecard mark.
  @Column({ type: 'int', nullable: true })
  atBatIndex!: number | null;

  @Column({ type: 'int', nullable: true })
  inning!: number | null;

  @Column({ type: 'varchar', length: 8, nullable: true })
  half!: 'top' | 'bottom' | null;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'int' })
  durationSec!: number;

  @Column({ type: 'varchar', length: 512 })
  mp4Url!: string;

  @Column({ type: 'varchar', length: 512, nullable: true })
  thumbnailUrl!: string | null;

  @Column({ type: 'json' })
  players!: ClipPlayerTag[];

  @Column({ type: 'json', nullable: true })
  scoreAfter!: ClipScore | null;

  @Column({ type: 'datetime' })
  publishedAt!: Date;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;
}
