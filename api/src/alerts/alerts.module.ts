import { Module } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { StatsModule } from '../stats/stats.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { PersistenceModule } from 'src/persistence/persistence.module';

@Module({
  imports: [
    StatsModule,        // to access live game/player state
    RealtimeModule,     // to emit alerts through the gateway
    PersistenceModule,
  ],
  providers: [
    AlertsService,      // main detector/alert service
  ],
  exports: [
    AlertsService,      // optional: let PollerModule or others inject it
  ],
})
export class AlertsModule {}