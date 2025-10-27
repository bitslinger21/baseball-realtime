import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { RedisOptions } from 'ioredis';

export const REDIS = Symbol('REDIS');

/**
 * Redis provider used across the app (BullMQ, caching, etc.)
 * Reads from nested config path app.redis or individual env vars.
 *
 * Expected env vars:
 *   REDIS_HOST=127.0.0.1
 *   REDIS_PORT=6379
 *   REDIS_PASSWORD=optional
 *   REDIS_DB=0
 */
export const redisProvider: Provider = {
  provide: REDIS,
  inject: [ConfigService],
  useFactory: (cfg: ConfigService) => {
    // Try nested config first, then fallback to flat env vars
    const redisCfg = cfg.get('app.redis', {
      host: process.env.REDIS_HOST ?? '127.0.0.1',
      port: Number(process.env.REDIS_PORT ?? 6379),
      password: process.env.REDIS_PASSWORD ?? undefined,
      db: Number(process.env.REDIS_DB ?? 0),
    }) as RedisOptions;

    const client = new Redis({
      host: redisCfg.host,
      port: redisCfg.port,
      password: redisCfg.password,
      db: redisCfg.db,
      // Optional production tuning
      maxRetriesPerRequest: null, // required for BullMQ v5
      enableReadyCheck: true,
    });

    client.on('connect', () =>
      console.log(`✅ Redis connected to ${redisCfg.host}:${redisCfg.port}`),
    );
    client.on('error', (err) =>
      console.error(`❌ Redis connection error:`, err.message),
    );

    return client;
  },
};