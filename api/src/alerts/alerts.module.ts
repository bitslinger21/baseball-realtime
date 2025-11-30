import { Module } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { StatsModule } from '../stats/stats.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { PersistenceModule } from 'src/persistence/persistence.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Alert } from 'src/persistence/entities/alert.entity';
import { AlertsController } from './alerts.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Alert]),
    StatsModule, // to access live game/player state
    RealtimeModule, // to emit alerts through the gateway
    PersistenceModule,
  ],
  controllers: [AlertsController],
  providers: [
    AlertsService, // main detector/alert service
  ],
  exports: [
    AlertsService, // optional: let PollerModule or others inject it
  ],
})
export class AlertsModule {}
