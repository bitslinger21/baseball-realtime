import { forwardRef, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PollerService } from './poller.service';
import { PollerProducer } from './poller.producer';
import { PollerProcessor } from './poller.processor';
import { RealtimeModule } from '../realtime/realtime.module';
import { PollerController } from './poller.controller';
import { AlertsModule } from 'src/alerts/alerts.module';
import { PersistenceModule } from 'src/persistence/persistence.module';
import { GamesModule } from 'src/games/games.module';
import { MlbModule } from 'src/providers/mlb/mlb.module';
import { PollerScheduler } from './poller.scheduler';
import { StatsModule } from 'src/stats/stats.module';
import { PollerBootstrapService } from './poller.bootstrap.service';
import { TeamsMetaModule } from 'src/teams/teams-meta.module';

@Module({
  imports: [
    // Root BullMQ config is in InfrastructureModule; here we only register the queue
    BullModule.registerQueue({ name: 'game-poller' }),
    forwardRef(() => RealtimeModule), // to emit updates
    forwardRef(() => AlertsModule),
    GamesModule,
    PersistenceModule,
    MlbModule,
    StatsModule,
    TeamsMetaModule
  ],
  providers: [PollerService, PollerProducer, PollerProcessor, PollerScheduler, PollerBootstrapService],
  controllers: [PollerController],
  exports: [PollerProducer, PollerService],
})
export class PollerModule { }
