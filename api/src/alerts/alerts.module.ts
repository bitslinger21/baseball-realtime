import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Alert } from '../persistence/entities/alert.entity';
import { Clip } from '../persistence/entities/clip.entity';
import { MlbModule } from '../providers/mlb/mlb.module';
import { AlertsController } from './alerts.controller';
import { AlertFeedService } from './alert-feed.service';

// The header bell's alerts (PROMPT_alerts.md): one league-wide feed,
// GET /alerts/feed. The older per-game detector (score change, lead change,
// per-pitcher "no-hitter broken", its history drawer) was removed — it
// duplicated the bell and its detection was wrong.
@Module({
  imports: [
    TypeOrmModule.forFeature([Alert, Clip]),
    MlbModule, // schedule, live feeds and career totals for the bell's feed
  ],
  controllers: [AlertsController],
  providers: [AlertFeedService],
})
export class AlertsModule {}
