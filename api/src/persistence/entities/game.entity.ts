// src/persistence/entities/game.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('games')
export class Game {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  providerGameId!: string;

  @Index()
  @Column({ type: 'date' })
  gameDate!: string; // UTC date of game

  @Index()
  @Column({ length: 5 })
  homeAbbr!: string;

  @Index()
  @Column({ length: 5 })
  awayAbbr!: string;

  @Column({ type: 'varchar', length: 20 })
  status!: 'scheduled' | 'live' | 'final';

  // 🔹 Change here: 'timestamp' → 'datetime'
  @Column({ type: 'datetime', nullable: true })
  startTimeUtc!: Date | null;

  // we'll fix snapshot next
  @Column({ type: 'simple-json', nullable: true })
  snapshot!: any | null;
}
