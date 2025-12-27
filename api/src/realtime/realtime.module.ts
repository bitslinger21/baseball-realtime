import { forwardRef, Module } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeController } from './realtime.controller';
import { PollerModule } from 'src/poller/poller.module';

@Module({
  imports: [forwardRef(() => PollerModule)],
  providers: [RealtimeGateway],
  controllers: [RealtimeController], // include only if you added realtime.controller.ts
  exports: [RealtimeGateway], // so other modules (Poller, etc.) can inject it
})
export class RealtimeModule { }
