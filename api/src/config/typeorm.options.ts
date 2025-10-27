import { ConfigService } from '@nestjs/config';
import { DataSourceOptions } from 'typeorm';
import * as path from 'path';

export function buildTypeOrmOptions(cfg: ConfigService): DataSourceOptions {
  const db = cfg.get('app.db'); // from env.ts load
  return {
    type: 'mysql',
    host: db.host,
    port: db.port,
    username: db.user,
    password: db.pass,
    database: db.name,
    entities: [path.join(__dirname, '..', 'persistence', 'entities', '*.{ts,js}')],
    migrations: [path.join(__dirname, '..', 'migrations', '*.{ts,js}')],
    synchronize: false,
    logging: !!db.logging,
  };
}
