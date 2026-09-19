import { Module } from '@nestjs/common';
import { HotEventsService } from './hot-events.service';
import { FollowingService } from './following.service';
import { HomeController } from './home.controller';
import { GamesModule } from '../games/games.module';
import { StandingsModule } from '../standings/standings.module';
import { PlayersModule } from '../players/players.module';

// HotEventsService depends only on data already passed into observe() by the
// caller (the poller's per-tick hook) — no imports of PollerModule/IqModule
// needed, so PollerModule can import this directly with no circularity, same
// as it already does for IqModule. FollowingService, by contrast, DOES need
// real per-request data (today's games, standings, player lines), so it pulls
// in the modules that already provide those rather than re-deriving them.
@Module({
  imports: [GamesModule, StandingsModule, PlayersModule],
  providers: [HotEventsService, FollowingService],
  controllers: [HomeController],
  exports: [HotEventsService],
})
export class HomeModule {}
