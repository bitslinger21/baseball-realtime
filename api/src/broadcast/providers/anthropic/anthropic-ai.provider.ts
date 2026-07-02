import { Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { broadcastConfig } from '../../broadcast.config';
import type { IAiProvider, AiProviderResponse } from '../ai-provider.interface';
import { BroadcastTimeoutError, BroadcastProviderError } from '../../types/broadcast-errors';

const TRANSIENT_STATUS_CODES = new Set([429, 529]);

export class AnthropicAiProvider implements IAiProvider {
  readonly providerName = 'anthropic';
  readonly modelIdentifier = 'claude-sonnet-4-6';

  private readonly logger = new Logger(AnthropicAiProvider.name);
  private readonly client: Anthropic;

  constructor(client?: Anthropic) {
    this.client = client ?? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  async generateNarration(prompt: { system: string; user: string }): Promise<AiProviderResponse> {
    const { timeoutMs, retries } = broadcastConfig.ai;
    let lastError: unknown;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await this.callWithTimeout(prompt, timeoutMs);
      } catch (err) {
        if (err instanceof BroadcastTimeoutError) {
          throw err;
        }

        const isTransient = this.isTransientError(err);
        if (!isTransient || attempt === retries) {
          throw new BroadcastProviderError(
            `AI provider failed after ${attempt + 1} attempt(s)`,
            err,
          );
        }

        lastError = err;
        const backoffMs = 200 * Math.pow(2, attempt);
        this.logger.warn(
          `[broadcast] transient error on attempt ${attempt + 1}, retrying in ${backoffMs}ms`,
        );
        await sleep(backoffMs);
      }
    }

    throw new BroadcastProviderError('AI provider failed after exhausting retries', lastError);
  }

  private async callWithTimeout(
    prompt: { system: string; user: string },
    timeoutMs: number,
  ): Promise<AiProviderResponse> {
    const startTime = Date.now();

    const apiCall = this.client.messages.create({
      model: this.modelIdentifier,
      max_tokens: 150,
      system: prompt.system,
      messages: [{ role: 'user', content: prompt.user }],
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new BroadcastTimeoutError(timeoutMs)), timeoutMs),
    );

    const message = await Promise.race([apiCall, timeoutPromise]);

    const firstBlock = message.content[0];
    if (firstBlock?.type !== 'text') {
      throw new BroadcastProviderError('Unexpected response content type from AI provider');
    }

    return {
      text: firstBlock.text,
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
      durationMs: Date.now() - startTime,
    };
  }

  private isTransientError(err: unknown): boolean {
    if (err instanceof Anthropic.APIError) {
      return TRANSIENT_STATUS_CODES.has(err.status);
    }
    // Network errors (no status code)
    if (err instanceof Error && err.message.toLowerCase().includes('network')) {
      return true;
    }
    return false;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
