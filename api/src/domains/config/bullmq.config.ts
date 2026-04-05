import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BullRootModuleOptions,
  SharedBullConfigurationFactory,
} from '@nestjs/bullmq';

interface RedisConfig {
  host: string;
  port: number;
  password?: string;
}

@Injectable()
export class BullConfig implements SharedBullConfigurationFactory {
  constructor(private readonly cfg: ConfigService) {}

  createSharedConfiguration(): BullRootModuleOptions {
    const redis = this.cfg.get<RedisConfig>('app.redis');

    if (redis == null) {
      throw new Error('Missing configuration for app.redis');
    }

    const { host, port, password } = redis;

    return {
      connection: {
        host,
        port,
        password,
        retryStrategy(times: number): number {
          // simple linear backoff, capped at 3 seconds
          return Math.min(times * 200, 3000);
        },
      },
    };
  }
}
