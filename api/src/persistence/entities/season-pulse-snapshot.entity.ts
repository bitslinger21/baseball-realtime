import { Entity, PrimaryGeneratedColumn, Column, Unique } from 'typeorm';

@Entity('season_pulse_snapshot')
@Unique(['teamId'])
export class SeasonPulseSnapshot {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ type: 'int' })
  teamId!: number;

  @Column({ type: 'datetime' })
  computedAt!: Date;

  @Column({ type: 'int' })
  overallRank!: number;

  @Column({ type: 'int' })
  overallPrevRank!: number;

  @Column({ type: 'float' })
  runDiff!: number;

  // 12 points, oldest -> newest: overall (run-differential) rank at each
  // trailing-30-day checkpoint, spaced 7 days apart, ending today.
  @Column({ type: 'json' })
  weeklyRanks!: number[];

  @Column({ type: 'int' })
  offenseRank!: number;

  @Column({ type: 'int' })
  offensePrevRank!: number;

  @Column({ type: 'float' })
  offenseStat!: number;

  // Nullable: a team with no boxscore-derived starts/appearances in a window
  // (fetch failures tolerated, see season-pulse.service.ts) has no rank.
  @Column({ type: 'int', nullable: true })
  startingRank!: number | null;

  @Column({ type: 'int', nullable: true })
  startingPrevRank!: number | null;

  @Column({ type: 'float', nullable: true })
  startingStat!: number | null;

  @Column({ type: 'int', nullable: true })
  bullpenRank!: number | null;

  @Column({ type: 'int', nullable: true })
  bullpenPrevRank!: number | null;

  @Column({ type: 'float', nullable: true })
  bullpenStat!: number | null;
}
