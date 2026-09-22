import { Module } from '@nestjs/common';
import { HotEventsService } from './hot-events.service';
import { FollowingService } from './following.service';
import { RacesService } from './races.service';
import { DayAheadService } from './day-ahead.service';
import { HomeController } from './home.controller';
import { GamesModule } from '../games/games.module';
import { StandingsModule } from '../standings/standings.module';
import { PlayersModule } from '../players/players.module';
import { LeadersModule } from '../leaders/leaders.module';
import { MlbModule } from '../providers/mlb/mlb.module';

// HotEventsService depends only on data already passed into observe() by the
// caller (the poller's per-tick hook) — no imports of PollerModule/IqModule
// needed, so PollerModule can import this directly with no circularity, same
// as it already does for IqModule. FollowingService/RacesService, by
// contrast, DO need real per-request data (today's games, standings, leader
// boards, player lines), so they pull in the modules that already provide
// those rather than re-deriving them.
@Module({
  imports: [GamesModule, StandingsModule, PlayersModule, LeadersModule, MlbModule],
  providers: [HotEventsService, FollowingService, RacesService, DayAheadService],
  controllers: [HomeController],
  exports: [HotEventsService],
})
export class HomeModule {}
