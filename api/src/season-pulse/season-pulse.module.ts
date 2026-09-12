import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { SeasonPulseSnapshot } from '../persistence/entities/season-pulse-snapshot.entity';
import { BoxScoreModule } from '../boxscore/boxscore.module';
import { MlbModule } from '../providers/mlb/mlb.module';
import { SeasonPulseService } from './season-pulse.service';
import { SeasonPulseProcessor } from './season-pulse.processor';
import { SeasonPulseScheduler } from './season-pulse.scheduler';
import { SeasonPulseController } from './season-pulse.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([SeasonPulseSnapshot]),
    BullModule.registerQueue({ name: 'season-pulse' }),
    BoxScoreModule,
    MlbModule,
  ],
  providers: [SeasonPulseService, SeasonPulseProcessor, SeasonPulseScheduler],
  controllers: [SeasonPulseController],
  exports: [SeasonPulseService],
})
export class SeasonPulseModule {}
