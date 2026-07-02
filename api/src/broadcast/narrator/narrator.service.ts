import { Inject, Injectable, Logger } from '@nestjs/common';
import type { IAiProvider } from '../providers/ai-provider.interface';
import type { BroadcastContext } from '../types/broadcast-context.types';
import type { BroadcastOutput } from '../types/broadcast-output.types';
import { BroadcastValidationError } from '../types/broadcast-errors';

const MIN_NARRATION_LENGTH = 10;
const MAX_NARRATION_LENGTH = 500;

export interface NarrationRequest {
  context: BroadcastContext;
  prompt: { system: string; user: string; promptVersion: string };
  gameId: string;
  sequence: number;
}

@Injectable()
export class NarratorService {
  private readonly logger = new Logger(NarratorService.name);

  constructor(@Inject('IAiProvider') private readonly aiProvider: IAiProvider) {}

  async narrate(request: NarrationRequest): Promise<BroadcastOutput> {
    const { gameId, sequence, prompt, context } = request;

    this.logger.debug(
      `[broadcast] narrate start gameId=${gameId} seq=${sequence} promptVersion=${prompt.promptVersion}`,
    );

    const response = await this.aiProvider.generateNarration({
      system: prompt.system,
      user: prompt.user,
    });

    const { text } = response;

    if (!text || text.length < MIN_NARRATION_LENGTH) {
      const reason = `text too short (${text?.length ?? 0} chars, min ${MIN_NARRATION_LENGTH})`;
      this.logger.warn(`[broadcast] validation failed gameId=${gameId} reason=${reason}`);
      throw new BroadcastValidationError(reason);
    }

    if (text.length > MAX_NARRATION_LENGTH) {
      const reason = `text too long (${text.length} chars, max ${MAX_NARRATION_LENGTH})`;
      this.logger.warn(`[broadcast] validation failed gameId=${gameId} reason=${reason}`);
      throw new BroadcastValidationError(reason);
    }

    const output: BroadcastOutput = {
      gameId,
      sequence,
      eventType: context.event.eventType,
      narration: text,
      generatedAt: new Date().toISOString(),
      promptVersion: prompt.promptVersion,
      providerName: this.aiProvider.providerName,
      inputTokens: response.inputTokens,
      outputTokens: response.outputTokens,
      durationMs: response.durationMs,
    };

    this.logger.debug(
      `[broadcast] narrate done gameId=${gameId} seq=${sequence} durationMs=${output.durationMs} in=${output.inputTokens} out=${output.outputTokens}`,
    );

    return output;
  }
}
