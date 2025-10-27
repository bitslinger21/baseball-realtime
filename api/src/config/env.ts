import { registerAs } from '@nestjs/config';

export type AppConfig = {
  nodeEnv: string;
  redis: { host: string; port: number; password?: string };
  db: { host: string; port: number; user: string; pass: string; name: string; logging?: boolean };
};

export function loadAppConfig(): AppConfig {
  return {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    redis: {
      host: process.env.REDIS_HOST ?? '127.0.0.1',
      port: +(process.env.REDIS_PORT ?? 6379),
      password: process.env.REDIS_PASSWORD || undefined,
    },
    db: {
      host: process.env.DB_HOST ?? '127.0.0.1',
      port: +(process.env.DB_PORT ?? 3306),
      user: process.env.DB_USER ?? 'root',
      pass: process.env.DB_PASSWORD ?? 'root',
      name: process.env.DB_NAME ?? 'baseball',
      logging: process.env.TYPEORM_LOGGING === 'true',
    },
  };
}

export default registerAs('app', loadAppConfig);

