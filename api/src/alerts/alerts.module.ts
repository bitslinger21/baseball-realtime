import { forwardRef, Module } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { StatsModule } from '../stats/stats.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { PersistenceModule } from '../persistence/persistence.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Alert } from '../persistence/entities/alert.entity';
import { AlertsController } from './alerts.controller';
import { AlertFeedService } from './alert-feed.service';
import { Clip } from '../persistence/entities/clip.entity';
import { MlbModule } from '../providers/mlb/mlb.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Alert, Clip]),
    MlbModule, // schedule, live feeds and career totals for the bell's feed
    StatsModule, // to access live game/player state
    forwardRef(() => RealtimeModule), // to emit alerts through the gateway
    PersistenceModule,
  ],
  controllers: [AlertsController],
  providers: [
    AlertsService, // main detector/alert service
    AlertFeedService, // league-wide header-bell feed (PROMPT_alerts.md)
  ],
  exports: [
    AlertsService, // optional: let PollerModule or others inject it
  ],
})
export class AlertsModule {}
