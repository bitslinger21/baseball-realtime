// src/infrastructure/infrastructure.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import appConfig from '../config/env';
import { BullModule } from '@nestjs/bullmq';
import { BullConfig } from '../config/bullmq.config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { buildTypeOrmOptions } from '../config/typeorm.options';
import { redisProvider } from '../config/redis.config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [appConfig] }),
    BullModule.forRootAsync({ useClass: BullConfig }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => buildTypeOrmOptions(cfg), // ← returns DataSourceOptions
    }),
  ],
  providers: [redisProvider],
  exports: [ConfigModule, BullModule, TypeOrmModule, redisProvider],
})
export class InfrastructureModule {}
