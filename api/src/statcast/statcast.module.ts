import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { StatcastBatterSummary } from '../persistence/entities/statcast-batter-summary.entity';
import { StatcastService } from './statcast.service';
import { StatcastProcessor } from './statcast.processor';
import { StatcastScheduler } from './statcast.scheduler';
import { StatcastController } from './statcast.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([StatcastBatterSummary]),
    BullModule.registerQueue({ name: 'statcast-ingest' }),
  ],
  providers: [StatcastService, StatcastProcessor, StatcastScheduler],
  controllers: [StatcastController],
  exports: [StatcastService],
})
export class StatcastModule {}
