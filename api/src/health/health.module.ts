import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health.controller';
import { InfrastructureModule } from '../infrastructure/infrastructure.module';

@Module({
  imports: [
    TerminusModule,
    TypeOrmModule,
    InfrastructureModule,
  ],
  controllers: [HealthController],
})
export class HealthModule {}
