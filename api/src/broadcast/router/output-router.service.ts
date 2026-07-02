import { Injectable, Logger } from '@nestjs/common';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import type { BroadcastOutput } from '../types/broadcast-output.types';

@Injectable()
export class OutputRouterService {
  private readonly logger = new Logger(OutputRouterService.name);

  constructor(private readonly gateway: RealtimeGateway) {}

  deliver(output: BroadcastOutput): void {
    try {
      this.gateway.publishNarration(output.gameId, output);
      this.logger.debug(
        `[broadcast] delivered gameId=${output.gameId} seq=${output.sequence}`,
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`[broadcast] deliver failed gameId=${output.gameId} error=${msg}`);
    }
  }
}
