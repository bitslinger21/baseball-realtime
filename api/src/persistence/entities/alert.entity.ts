import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

// One header-bell alert (PROMPT_alerts.md); the payload is the whole stored
// alert, keyed by its own id (alert-feed.service.ts). Rows of the removed
// per-game detector's types may still sit in the table; nothing reads them.
export type AlertType = 'feed';

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
