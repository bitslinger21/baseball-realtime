import Anthropic from '@anthropic-ai/sdk';
import { AnthropicAiProvider } from './anthropic-ai.provider';
import { BroadcastTimeoutError, BroadcastProviderError } from '../../types/broadcast-errors';
import { broadcastConfig } from '../../broadcast.config';

const PROMPT = { system: 'You are an announcer.', user: 'Judge homers.' };

function makeSuccessMessage(text = 'A towering shot to left field!') {
  return {
    content: [{ type: 'text', text }],
    usage: { input_tokens: 50, output_tokens: 20 },
  };
}

describe('AnthropicAiProvider', () => {
  let provider: AnthropicAiProvider;
  let mockCreate: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    mockCreate = jest.fn();
    // Inject a mock Anthropic client — no module mocking needed
    const mockClient = { messages: { create: mockCreate } } as unknown as Anthropic;
    provider = new AnthropicAiProvider(mockClient);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns AiProviderResponse with correct fields on success', async () => {
    mockCreate.mockResolvedValue(makeSuccessMessage());

    const promise = provider.generateNarration(PROMPT);
    jest.runAllTimersAsync();
    const result = await promise;

    expect(result.text).toBe('A towering shot to left field!');
    expect(result.inputTokens).toBe(50);
    expect(result.outputTokens).toBe(20);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('throws BroadcastTimeoutError when the timeout fires first', async () => {
    mockCreate.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(makeSuccessMessage()), 10_000)),
    );

    const promise = provider.generateNarration(PROMPT);
    jest.advanceTimersByTime(broadcastConfig.ai.timeoutMs + 1);

    await expect(promise).rejects.toBeInstanceOf(BroadcastTimeoutError);
  });

  it('retries on a 429 response and succeeds on the second attempt', async () => {
    const rateLimitError = new Anthropic.RateLimitError(
      429,
      { error: { type: 'rate_limit_error', message: 'Rate limited' } },
      'Rate limited',
      undefined as any,
    );

    mockCreate
      .mockRejectedValueOnce(rateLimitError)
      .mockResolvedValueOnce(makeSuccessMessage('Retry success!'));

    const promise = provider.generateNarration(PROMPT);
    await jest.runAllTimersAsync();
    const result = await promise;

    expect(result.text).toBe('Retry success!');
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  it('throws BroadcastProviderError after exhausting retries', async () => {
    const rateLimitError = new Anthropic.RateLimitError(
      429,
      { error: { type: 'rate_limit_error', message: 'Rate limited' } },
      'Rate limited',
      undefined as any,
    );

    mockCreate.mockRejectedValue(rateLimitError);

    const promise = provider.generateNarration(PROMPT);
    // Attach handler before advancing timers to avoid unhandledRejection
    const assertion = expect(promise).rejects.toBeInstanceOf(BroadcastProviderError);
    await jest.runAllTimersAsync();
    await assertion;
    expect(mockCreate).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it('providerName equals "anthropic"', () => {
    expect(provider.providerName).toBe('anthropic');
  });

  it('modelIdentifier equals "claude-sonnet-4-6"', () => {
    expect(provider.modelIdentifier).toBe('claude-sonnet-4-6');
  });
});
