import { Entity, PrimaryGeneratedColumn, Column, Index, Unique } from 'typeorm';

export type GameInsightCandidateRow = {
  kind: 'Leverage' | 'Streak' | 'Rare';
  score: number;
  text: string;
};

@Entity('game_insight')
@Unique(['providerGameId', 'atBatIndex'])
export class GameInsight {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Index()
  @Column({ type: 'varchar', length: 64 })
  providerGameId!: string;

  @Column({ type: 'int' })
  atBatIndex!: number;

  @Column({ type: 'datetime' })
  createdAt!: Date;

  // Empty arrays are a valid, persisted "we checked, nothing worthy" result —
  // this is what prevents re-calling Claude on every repeat poll of the same play.
  @Column({ type: 'json' })
  candidates!: GameInsightCandidateRow[];

  @Column({ type: 'json' })
  suggested!: string[];
}
