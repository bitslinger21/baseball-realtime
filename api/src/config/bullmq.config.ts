import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BullRootModuleOptions, SharedBullConfigurationFactory } from '@nestjs/bullmq';

@Injectable()
export class BullConfig implements SharedBullConfigurationFactory {
  constructor(private readonly cfg: ConfigService) {}

  createSharedConfiguration(): BullRootModuleOptions {
    const redis = this.cfg.get('app.redis');
    return {
      connection: {
        host: redis.host,
        port: redis.port,
        password: redis.password,
        retryStrategy(times) {
          return Math.min(times * 200, 3000); // backoff
        },
      },
    };
  }
}

