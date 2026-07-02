import { Test, TestingModule } from '@nestjs/testing';
import { BroadcastDirectorService } from './director/broadcast-director.service';
import { ContextBuilderService } from './context/context-builder.service';
import { MemoryManagerService } from './memory/memory-manager.service';
import { PromptBuilderService } from './prompt/prompt-builder.service';
import { NarratorService } from './narrator/narrator.service';
import { OutputRouterService } from './router/output-router.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

describe('BroadcastModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        BroadcastDirectorService,
        ContextBuilderService,
        MemoryManagerService,
        PromptBuilderService,
        NarratorService,
        OutputRouterService,
        { provide: 'IAiProvider', useValue: { generateNarration: jest.fn(), providerName: 'mock', modelIdentifier: 'mock' } },
        { provide: RealtimeGateway, useValue: { publishNarration: jest.fn(), publishGameUpdate: jest.fn() } },
      ],
    }).compile();
  });

  it('resolves BroadcastDirectorService', () => {
    expect(module.get(BroadcastDirectorService)).toBeInstanceOf(BroadcastDirectorService);
  });

  it('resolves ContextBuilderService', () => {
    expect(module.get(ContextBuilderService)).toBeInstanceOf(ContextBuilderService);
  });

  it('resolves MemoryManagerService', () => {
    expect(module.get(MemoryManagerService)).toBeInstanceOf(MemoryManagerService);
  });

  it('resolves PromptBuilderService', () => {
    expect(module.get(PromptBuilderService)).toBeInstanceOf(PromptBuilderService);
  });

  it('resolves NarratorService', () => {
    expect(module.get(NarratorService)).toBeInstanceOf(NarratorService);
  });

  it('resolves OutputRouterService', () => {
    expect(module.get(OutputRouterService)).toBeInstanceOf(OutputRouterService);
  });
});
