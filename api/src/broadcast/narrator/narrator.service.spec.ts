import { NarratorService, NarrationRequest } from './narrator.service';
import { BroadcastValidationError, BroadcastTimeoutError, BroadcastProviderError } from '../types/broadcast-errors';
import { BroadcastEventType } from '../types/broadcast-event.types';
import type { IAiProvider, AiProviderResponse } from '../providers/ai-provider.interface';
import type { BroadcastContext } from '../types/broadcast-context.types';

function makeAiResponse(overrides: Partial<AiProviderResponse> = {}): AiProviderResponse {
  return {
    text: 'Judge crushes a towering home run into the left field seats!',
    inputTokens: 80,
    outputTokens: 25,
    durationMs: 900,
    ...overrides,
  };
}

function makeRequest(overrides: Partial<NarrationRequest> = {}): NarrationRequest {
  const context: BroadcastContext = {
    event: {
      gameId: 'game-1',
      playKey: 'pk-001',
      eventType: BroadcastEventType.SCORING_PLAY,
      description: 'Judge homers.',
      atBatResult: 'HomeRun',
      isAtBatComplete: true,
      gameState: {
        inning: 7, half: 'bottom', outs: 0,
        bases: { on1: false, on2: false, on3: false },
        balls: 3, strikes: 2,
        homeScore: 5, awayScore: 4,
        homeAbbr: 'NYY', awayAbbr: 'BOS',
        pitcherName: 'Sale', pitcherId: 11,
        batterName: 'Judge', batterId: 99,
      },
    },
    gameState: {
      inning: 7, half: 'bottom', outs: 0,
      bases: { on1: false, on2: false, on3: false },
      balls: 3, strikes: 2,
      homeScore: 5, awayScore: 4,
      homeAbbr: 'NYY', awayAbbr: 'BOS',
      pitcherName: 'Sale', pitcherId: 11,
      batterName: 'Judge', batterId: 99,
    },
    recentPlays: [],
    sessionMemory: { recentNarrations: [], mentionedPlayerIds: [], scoreLastStated: null, atBatNarrationCount: 0 },
    announcer: { systemPrompt: 'You are an announcer.' },
  };

  return {
    context,
    prompt: { system: 'You are an announcer.', user: 'Judge homers.', promptVersion: 'v1.0.0' },
    gameId: 'game-1',
    sequence: 3,
    ...overrides,
  };
}

describe('NarratorService', () => {
  let svc: NarratorService;
  let mockProvider: jest.Mocked<IAiProvider>;

  beforeEach(() => {
    mockProvider = {
      providerName: 'anthropic',
      modelIdentifier: 'claude-sonnet-4-6',
      generateNarration: jest.fn(),
    };
    svc = new NarratorService(mockProvider);
  });

  it('returns a well-formed BroadcastOutput on a valid AI response', async () => {
    mockProvider.generateNarration.mockResolvedValue(makeAiResponse());
    const output = await svc.narrate(makeRequest());

    expect(output.gameId).toBe('game-1');
    expect(output.sequence).toBe(3);
    expect(output.narration).toBe('Judge crushes a towering home run into the left field seats!');
    expect(output.providerName).toBe('anthropic');
    expect(output.promptVersion).toBe('v1.0.0');
    expect(output.inputTokens).toBe(80);
    expect(output.outputTokens).toBe(25);
  });

  it('throws BroadcastValidationError when text is empty', async () => {
    mockProvider.generateNarration.mockResolvedValue(makeAiResponse({ text: '' }));
    await expect(svc.narrate(makeRequest())).rejects.toBeInstanceOf(BroadcastValidationError);
  });

  it('throws BroadcastValidationError when text exceeds 500 characters', async () => {
    mockProvider.generateNarration.mockResolvedValue(makeAiResponse({ text: 'x'.repeat(501) }));
    await expect(svc.narrate(makeRequest())).rejects.toBeInstanceOf(BroadcastValidationError);
  });

  it('propagates BroadcastTimeoutError from the provider', async () => {
    mockProvider.generateNarration.mockRejectedValue(new BroadcastTimeoutError(3000));
    await expect(svc.narrate(makeRequest())).rejects.toBeInstanceOf(BroadcastTimeoutError);
  });

  it('propagates BroadcastProviderError from the provider', async () => {
    mockProvider.generateNarration.mockRejectedValue(new BroadcastProviderError('failed'));
    await expect(svc.narrate(makeRequest())).rejects.toBeInstanceOf(BroadcastProviderError);
  });

  it('BroadcastOutput.sequence matches the value passed in the request', async () => {
    mockProvider.generateNarration.mockResolvedValue(makeAiResponse());
    const output = await svc.narrate(makeRequest({ sequence: 42 }));
    expect(output.sequence).toBe(42);
  });

  it('BroadcastOutput.gameId matches the value passed in the request', async () => {
    mockProvider.generateNarration.mockResolvedValue(makeAiResponse());
    const output = await svc.narrate(makeRequest({ gameId: 'game-xyz' }));
    expect(output.gameId).toBe('game-xyz');
  });

  it('BroadcastOutput.generatedAt is a valid ISO 8601 string', async () => {
    mockProvider.generateNarration.mockResolvedValue(makeAiResponse());
    const output = await svc.narrate(makeRequest());
    expect(new Date(output.generatedAt).toISOString()).toBe(output.generatedAt);
  });

  it('BroadcastOutput.promptVersion matches the prompt version', async () => {
    mockProvider.generateNarration.mockResolvedValue(makeAiResponse());
    const output = await svc.narrate(makeRequest());
    expect(output.promptVersion).toBe('v1.0.0');
  });
});
