// src/app.module.ts
import { Module } from '@nestjs/common';
import { InfrastructureModule } from './infrastructure/infrastructure.module';
import { RealtimeModule } from './realtime/realtime.module'
import { PollerModule } from './poller/poller.module';
import { PersistenceModule } from './persistence/persistence.module';

@Module({
  imports: [
    InfrastructureModule, // <— all infra wiring here
    RealtimeModule,
    PollerModule,
    PersistenceModule,
  ],
})
export class AppModule {}
