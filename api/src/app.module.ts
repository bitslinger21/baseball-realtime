// src/app.module.ts
import { Module } from '@nestjs/common';
import { InfrastructureModule } from './infrastructure/infrastructure.module';
import { RealtimeModule } from './realtime/realtime.module'
import { PollerModule } from './poller/poller.module';
import { PersistenceModule } from './persistence/persistence.module';
import { AlertsModule } from './alerts/alerts.module';

const isSpecGen = process.env.SPEC_GEN === '1';

@Module({
  imports: [
    ...(isSpecGen ? [] : [AlertsModule, InfrastructureModule, PersistenceModule, PollerModule, RealtimeModule]),
  ],
})
export class AppModule {}
