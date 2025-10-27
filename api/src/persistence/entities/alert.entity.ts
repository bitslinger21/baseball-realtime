import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('alerts')
export class Alert {
  @PrimaryGeneratedColumn('uuid') 
  id!: string;

  @Index()
  @Column({ type: 'uuid' }) 
  gameId!: string;
  
  @Index() 
  @Column({ length: 40 }) 
  type!: 'cycle-watch'|'cycle-achieved'|'no-hitter-watch'|'no-hitter-broken';

  @Column({ type: 'json', nullable: true }) 
  payload!: any | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) 
  createdAt!: Date;
}