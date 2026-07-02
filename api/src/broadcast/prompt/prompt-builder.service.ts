import { Injectable, Logger } from '@nestjs/common';
import { buildUserMessage, PROMPT_VERSION } from './templates';
import type { BroadcastContext } from '../types/broadcast-context.types';

@Injectable()
export class PromptBuilderService {
  private readonly logger = new Logger(PromptBuilderService.name);

  constructor() {}

  build(context: BroadcastContext): { system: string; user: string; promptVersion: string } {
    return {
      system: context.announcer.systemPrompt,
      user: buildUserMessage(context),
      promptVersion: PROMPT_VERSION,
    };
  }
}
