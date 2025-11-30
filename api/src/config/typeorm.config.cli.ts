// src/config/typeorm.config.cli.ts
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { loadAppConfig } from './env';
import * as path from 'path';

import { Game } from '../persistence/entities/game.entity';
import { Alert } from '../persistence/entities/alert.entity';

// Make sure .env is loaded when running CLI directly
import * as dotenv from 'dotenv';
dotenv.config();

const cfg = loadAppConfig();

export default new DataSource({
  type: 'mysql',
  host: cfg.db.host,
  port: cfg.db.port,
  username: cfg.db.user,
  password: cfg.db.pass,
  database: cfg.db.name,
  // Use explicit globs so the CLI can find them
  //   entities: [Game, Alert],
  entities: [
    path.join(__dirname, '..', 'persistence', 'entities', '*.{ts,js}'),
  ],
  //   migrations: ['src/migrations/*.{ts,js}'],
  migrations: [path.join(__dirname, '..', 'migrations', '*.{ts,js}')],
  synchronize: false,
  logging: !!cfg.db.logging,
});
