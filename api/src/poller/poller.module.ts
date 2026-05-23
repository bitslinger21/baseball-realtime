import { forwardRef, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PollerService } from './poller.service';
import { PollerProducer } from './poller.producer';
import { PollerProcessor } from './poller.processor';
import { DailyPollerProcessor } from './daily-poller.processor';
import { RealtimeModule } from '../realtime/realtime.module';
import { PollerController } from './poller.controller';
import { AlertsModule } from '../alerts/alerts.module';
import { PersistenceModule } from '../persistence/persistence.module';
import { GamesModule } from '../games/games.module';
import { MlbModule } from '../providers/mlb/mlb.module';
import { PollerScheduler } from './poller.scheduler';
import { StatsModule } from '../stats/stats.module';
import { PollerBootstrapService } from './poller.bootstrap.service';
import { TeamsMetaModule } from '../teams/teams-meta.module';

@Module({
  imports: [
    // Root BullMQ config is in InfrastructureModule; here we only register the queues
    BullModule.registerQueue({ name: 'game-poller' }),
    BullModule.registerQueue({ name: 'daily-poller' }),
    forwardRef(() => RealtimeModule), // to emit updates
    forwardRef(() => AlertsModule),
    GamesModule,
    PersistenceModule,
    MlbModule,
    StatsModule,
    TeamsMetaModule
  ],
  providers: [PollerService, PollerProducer, PollerProcessor, DailyPollerProcessor, PollerScheduler, PollerBootstrapService],
  controllers: [PollerController],
  exports: [PollerProducer, PollerService],
})
export class PollerModule { }
