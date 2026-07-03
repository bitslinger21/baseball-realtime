import { forwardRef, Module } from '@nestjs/common';
import { RealtimeModule } from '../realtime/realtime.module';
import { BroadcastDirectorService } from './director/broadcast-director.service';
import { ContextBuilderService } from './context/context-builder.service';
import { MemoryManagerService } from './memory/memory-manager.service';
import { PromptBuilderService } from './prompt/prompt-builder.service';
import { NarratorService } from './narrator/narrator.service';
import { OutputRouterService } from './router/output-router.service';
import { AnthropicAiProvider } from './providers/anthropic/anthropic-ai.provider';

@Module({
  imports: [forwardRef(() => RealtimeModule)],
  providers: [
    BroadcastDirectorService,
    ContextBuilderService,
    MemoryManagerService,
    PromptBuilderService,
    NarratorService,
    OutputRouterService,
    { provide: 'IAiProvider', useClass: AnthropicAiProvider },
  ],
  exports: [BroadcastDirectorService],
})
export class BroadcastModule {}
