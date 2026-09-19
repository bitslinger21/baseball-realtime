import { Module } from '@nestjs/common';
import { HotEventsService } from './hot-events.service';
import { HomeController } from './home.controller';

// Depends only on data already passed into observe() by the caller (the
// poller's per-tick hook) — no imports of PollerModule/IqModule needed, so
// PollerModule can import this directly with no circularity, same as it
// already does for IqModule.
@Module({
  providers: [HotEventsService],
  controllers: [HomeController],
  exports: [HotEventsService],
})
export class HomeModule {}
