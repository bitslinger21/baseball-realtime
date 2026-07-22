import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Game } from './entities/game.entity';
import { Alert } from './entities/alert.entity';
import { StatcastBatterSummary } from './entities/statcast-batter-summary.entity';

function createTypeOrmOptions(): TypeOrmModuleOptions {
  const engine: string = process.env.DB_ENGINE ?? 'mysql';

  if (engine === 'sqlite') {
    // Spec generation / lightweight mode
    return {
      type: 'sqlite',
      database: ':memory:',
      entities: [Game, Alert, StatcastBatterSummary],
      synchronize: false,
    };
  }

  // Normal runtime: MySQL (adjust to match your real config)
  return {
    type: 'mysql',
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? '3306'),
    username: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? 'baseball',
    entities: [Game, Alert, StatcastBatterSummary],
    synchronize: false,
  };
}

@Module({
  imports: [
    // Global connection (provides DataSource)
    TypeOrmModule.forRoot(createTypeOrmOptions()),
    // Repositories for your entities
    TypeOrmModule.forFeature([Game, Alert, StatcastBatterSummary]),
  ],
  exports: [TypeOrmModule],
})
export class PersistenceModule { }
