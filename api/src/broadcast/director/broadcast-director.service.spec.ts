import { BroadcastDirectorService } from './broadcast-director.service';
import { MemoryManagerService } from '../memory/memory-manager.service';
import { ContextBuilderService } from '../context/context-builder.service';
import { PromptBuilderService } from '../prompt/prompt-builder.service';
import { NarratorService } from '../narrator/narrator.service';
import { OutputRouterService } from '../router/output-router.service';
import { BroadcastEventType } from '../types/broadcast-event.types';
import { BroadcastTimeoutError, BroadcastProviderError } from '../types/broadcast-errors';
import type { LiveUpdate } from '../../poller/poller.service';
import type { PlayUpdateWire } from '../../poller/poller.processor';
import type { BroadcastOutput } from '../types/broadcast-output.types';
import type { SessionMemorySnapshot } from '../types/broadcast-context.types';

function makeLiveUpdate(overrides: Partial<LiveUpdate> = {}): LiveUpdate {
  return {
    gameId: 'game-1',
    inning: 5,
    half: 'Bottom',
    outs: 1,
    count: { balls: 3, strikes: 2 },
    bases: { on1: false, on2: false, on3: false },
    homeScore: 3,
    awayScore: 2,
    homeAbbr: 'NYY',
    awayAbbr: 'BOS',
    description: 'Judge homers.',
    playResult: 'HomeRun',
    isFinalPitchOfAtBat: true,
    batterName: 'Judge',
    pitcherName: 'Sale',
    playKey: 'pk-001',
    ...overrides,
  };
}

function makePayload(): PlayUpdateWire {
  return {
    providerGameId: 'game-1',
    inning: 5,
    half: 'bottom',
    outs: 1,
    balls: 3,
    strikes: 2,
    bases: { on1: false, on2: false, on3: false },
    homeScore: 3,
    awayScore: 2,
    description: 'Judge homers.',
    ts: new Date().toISOString(),
  };
}

function makeOutput(): BroadcastOutput {
  return {
    gameId: 'game-1',
    sequence: 1,
    eventType: BroadcastEventType.SCORING_PLAY,
    narration: 'Judge crushes it to left!',
    generatedAt: new Date().toISOString(),
    promptVersion: 'v1.0.0',
    providerName: 'anthropic',
    inputTokens: 80,
    outputTokens: 20,
    durationMs: 700,
  };
}

function makeSnapshot(): SessionMemorySnapshot {
  return {
    recentNarrations: [],
    mentionedPlayerIds: [],
    scoreLastStated: null,
    atBatNarrationCount: 0,
  };
}

describe('BroadcastDirectorService', () => {
  let director: BroadcastDirectorService;
  let mockMemory: jest.Mocked<MemoryManagerService>;
  let mockContextBuilder: jest.Mocked<ContextBuilderService>;
  let mockPromptBuilder: jest.Mocked<PromptBuilderService>;
  let mockNarrator: jest.Mocked<NarratorService>;
  let mockRouter: jest.Mocked<OutputRouterService>;

  beforeEach(() => {
    mockMemory = {
      getSessionSnapshot: jest.fn().mockReturnValue(makeSnapshot()),
      nextSequence: jest.fn().mockReturnValue(1),
      recordNarration: jest.fn(),
      getOrCreateSession: jest.fn(),
      closeSession: jest.fn(),
    } as unknown as jest.Mocked<MemoryManagerService>;

    mockContextBuilder = {
      build: jest.fn().mockReturnValue({ event: {}, gameState: {}, recentPlays: [], sessionMemory: makeSnapshot(), announcer: { systemPrompt: '' } }),
    } as unknown as jest.Mocked<ContextBuilderService>;

    mockPromptBuilder = {
      build: jest.fn().mockReturnValue({ system: 'sys', user: 'usr', promptVersion: 'v1.0.0' }),
    } as unknown as jest.Mocked<PromptBuilderService>;

    mockNarrator = {
      narrate: jest.fn().mockResolvedValue(makeOutput()),
    } as unknown as jest.Mocked<NarratorService>;

    mockRouter = {
      deliver: jest.fn(),
    } as unknown as jest.Mocked<OutputRouterService>;

    director = new BroadcastDirectorService(
      mockMemory,
      mockContextBuilder,
      mockPromptBuilder,
      mockNarrator,
      mockRouter,
    );
  });

  it('calls ContextBuilderService.build when event type is in the narrated set', async () => {
    await director.onPlay('game-1', makeLiveUpdate({ isFinalPitchOfAtBat: true }), makePayload());
    expect(mockContextBuilder.build).toHaveBeenCalledTimes(1);
  });

  it('does NOT call ContextBuilderService.build when event type is not in the narrated set', async () => {
    await director.onPlay('game-1', makeLiveUpdate({ isFinalPitchOfAtBat: false }), makePayload());
    expect(mockContextBuilder.build).not.toHaveBeenCalled();
  });

  it('calls NarratorService.narrate with correct gameId and sequence', async () => {
    mockMemory.nextSequence.mockReturnValue(7);
    await director.onPlay('game-1', makeLiveUpdate(), makePayload());
    expect(mockNarrator.narrate).toHaveBeenCalledWith(
      expect.objectContaining({ gameId: 'game-1', sequence: 7 }),
    );
  });

  it('calls OutputRouterService.deliver with the narrator output', async () => {
    const output = makeOutput();
    mockNarrator.narrate.mockResolvedValue(output);
    await director.onPlay('game-1', makeLiveUpdate(), makePayload());
    expect(mockRouter.deliver).toHaveBeenCalledWith(output);
  });

  it('calls MemoryManagerService.recordNarration after successful delivery', async () => {
    const output = makeOutput();
    mockNarrator.narrate.mockResolvedValue(output);
    await director.onPlay('game-1', makeLiveUpdate(), makePayload());
    expect(mockMemory.recordNarration).toHaveBeenCalledWith('game-1', output);
  });

  it('does not throw when ContextBuilderService.build throws', async () => {
    mockContextBuilder.build.mockImplementation(() => { throw new Error('context error'); });
    await expect(director.onPlay('game-1', makeLiveUpdate(), makePayload())).resolves.toBeUndefined();
  });

  it('does not throw when NarratorService.narrate throws BroadcastTimeoutError', async () => {
    mockNarrator.narrate.mockRejectedValue(new BroadcastTimeoutError(3000));
    await expect(director.onPlay('game-1', makeLiveUpdate(), makePayload())).resolves.toBeUndefined();
  });

  it('does not throw when NarratorService.narrate throws BroadcastProviderError', async () => {
    mockNarrator.narrate.mockRejectedValue(new BroadcastProviderError('failed'));
    await expect(director.onPlay('game-1', makeLiveUpdate(), makePayload())).resolves.toBeUndefined();
  });

  it('does not throw when OutputRouterService.deliver throws', async () => {
    mockRouter.deliver.mockImplementation(() => { throw new Error('deliver error'); });
    await expect(director.onPlay('game-1', makeLiveUpdate(), makePayload())).resolves.toBeUndefined();
  });

  it('processes two different gameIds independently', async () => {
    await Promise.all([
      director.onPlay('game-A', makeLiveUpdate({ gameId: 'game-A' }), makePayload()),
      director.onPlay('game-B', makeLiveUpdate({ gameId: 'game-B' }), makePayload()),
    ]);
    expect(mockNarrator.narrate).toHaveBeenCalledTimes(2);
  });
});
