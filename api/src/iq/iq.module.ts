import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameInsight } from '../persistence/entities/game-insight.entity';
import { MlbModule } from '../providers/mlb/mlb.module';
import { TeamsMetaModule } from '../teams/teams-meta.module';
import { PollerService } from '../poller/poller.service';
import { IqService } from './iq.service';
import { IqController } from './iq.controller';
import { SplitsService } from './splits.service';
import { ParkFactorService } from './park-factor.service';

// PollerService is provided here directly (not via PollerModule) for two reasons:
// PollerModule registers BullMQ queues that must stay out of the spec-gen graph
// (see app.module.ts's isSpecGen split), and importing PollerModule here would
// also create a real circular module dependency (PollerModule needs IqService
// for its processor). PollerService itself has no BullMQ dependency — it only
// needs MlbApiService/TeamsMetaService — so a second, independent instance here
// is safe: its in-memory caches just aren't shared with the poller's copy.
@Module({
  imports: [
    TypeOrmModule.forFeature([GameInsight]),
    MlbModule,
    TeamsMetaModule,
  ],
  providers: [IqService, SplitsService, ParkFactorService, PollerService],
  controllers: [IqController],
  exports: [IqService],
})
export class IqModule {}
