import { Module } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeController } from './realtime.controller';
import { RealtimeMockService } from './realtime-mock.service';

@Module({
  providers: [RealtimeGateway, RealtimeMockService],
  controllers: [RealtimeController], // include only if you added realtime.controller.ts
  exports: [RealtimeGateway],        // so other modules (Poller, etc.) can inject it
})
export class RealtimeModule { }
