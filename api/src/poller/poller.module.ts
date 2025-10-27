import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PollerService } from './poller.service';
import { PollerProducer } from './poller.producer';
import { PollerProcessor } from './poller.processor';
import { RealtimeModule } from '../realtime/realtime.module';
import { PollerController } from './poller.controller';
import { AlertsModule } from 'src/alerts/alerts.module';
import { PersistenceModule } from 'src/persistence/persistence.module';
import { GamesModule } from 'src/games/games.module';

@Module({
  imports: [
    // Root BullMQ config is in InfrastructureModule; here we only register the queue
    BullModule.registerQueue({ name: 'game-poller' }),
    RealtimeModule, // to emit updates
    AlertsModule,
    GamesModule,
    PersistenceModule,
  ],
  providers: [PollerService, PollerProducer, PollerProcessor],
  controllers: [PollerController],
  exports: [PollerProducer, PollerService],
})
export class PollerModule {}
