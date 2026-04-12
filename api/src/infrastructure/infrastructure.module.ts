import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import appConfig from '../domains/config/env';
import { BullConfig } from '../domains/config/bullmq.config';
import { buildTypeOrmOptions } from '../domains/config/typeorm.options';
import { redisProvider } from '../domains/config/redis.config';

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
export class InfrastructureModule { }
