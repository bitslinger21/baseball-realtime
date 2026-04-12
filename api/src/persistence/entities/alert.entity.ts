import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type AlertType =
  | 'cycle-watch'
  | 'cycle-achieved'
  | 'no-hitter-watch'
  | 'no-hitter-broken'
  | 'score-change'
  | 'game-tied'
  | 'lead-change';

@Entity('alerts')
export class Alert {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 64 })
  gameId!: string;

  @Column({ type: 'varchar', length: 64 })
  type!: AlertType;

  @Column({ type: 'json' })
  payload!: Record<string, unknown>;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;
}
