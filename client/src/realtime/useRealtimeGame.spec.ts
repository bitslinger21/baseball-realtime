/// <reference types="vitest/globals" />
import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import type { NarrationPayload } from './types';

type HandlerFn = (...args: unknown[]) => void;

const handlers = new Map<string, Set<HandlerFn>>();

const mockSocket = {
  connected: false,
  on: vi.fn((event: string, fn: HandlerFn) => {
    if (!handlers.has(event)) handlers.set(event, new Set());
    handlers.get(event)!.add(fn);
  }),
  off: vi.fn((event: string, fn: HandlerFn) => {
    handlers.get(event)?.delete(fn);
  }),
  emit: vi.fn(),
};

vi.mock('socket.io-client', () => ({
  io: () => mockSocket,
}));

// Import after mocking so the hook picks up the mock socket
const { useRealtimeGame } = await import('./useRealtimeGame');

function makeNarration(overrides: Partial<NarrationPayload> = {}): NarrationPayload {
  return {
    gameId: 'game-1',
    sequence: 1,
    eventType: 'AT_BAT_COMPLETE',
    narration: 'The pitch clocks down to zero.',
    generatedAt: new Date().toISOString(),
    promptVersion: 'v1.0.0',
    providerName: 'anthropic',
    inputTokens: 80,
    outputTokens: 20,
    durationMs: 700,
    ...overrides,
  };
}

function emitEvent(event: string, payload: unknown): void {
  handlers.get(event)?.forEach((fn) => fn(payload));
}

describe('useRealtimeGame — narration', () => {
  beforeEach(() => {
    handlers.clear();
    mockSocket.on.mockClear();
    mockSocket.off.mockClear();
    mockSocket.emit.mockClear();
  });

  it('appends a narration event to narrations for the correct gameId', () => {
    const { result } = renderHook(() => useRealtimeGame('game-1'));

    act(() => {
      emitEvent('narration', makeNarration({ gameId: 'game-1', sequence: 1 }));
    });

    expect(result.current.narrations).toHaveLength(1);
    expect(result.current.narrations[0].narration).toBe('The pitch clocks down to zero.');
  });

  it('does not affect selected game narrations when event is for a different gameId', () => {
    const { result } = renderHook(() => useRealtimeGame('game-1'));

    act(() => {
      emitEvent('narration', makeNarration({ gameId: 'game-2', sequence: 1 }));
    });

    expect(result.current.narrations).toHaveLength(0);
  });

  it('caps narrations at 10 entries, keeping the most recent', () => {
    const { result } = renderHook(() => useRealtimeGame('game-1'));

    act(() => {
      for (let i = 1; i <= 12; i++) {
        emitEvent('narration', makeNarration({ gameId: 'game-1', sequence: i, narration: `play ${i}` }));
      }
    });

    expect(result.current.narrations).toHaveLength(10);
    expect(result.current.narrations[0].narration).toBe('play 3');
    expect(result.current.narrations[9].narration).toBe('play 12');
  });

  it('does not clear narrations when a play event arrives', () => {
    const { result } = renderHook(() => useRealtimeGame('game-1'));

    act(() => {
      emitEvent('narration', makeNarration({ gameId: 'game-1', sequence: 1 }));
    });

    act(() => {
      emitEvent('play', {
        play: {
          providerGameId: 'game-1',
          inning: 5,
          half: 'bottom',
          outs: 1,
          balls: 0,
          strikes: 0,
          bases: { on1: false, on2: false, on3: false },
          homeScore: 3,
          awayScore: 2,
          ts: new Date().toISOString(),
          playKey: 'pk-1',
        },
      });
    });

    expect(result.current.narrations).toHaveLength(1);
  });

  it('still returns plays and alerts alongside narrations', () => {
    const { result } = renderHook(() => useRealtimeGame('game-1'));

    expect(result.current).toHaveProperty('plays');
    expect(result.current).toHaveProperty('alerts');
    expect(result.current).toHaveProperty('narrations');
    expect(result.current).toHaveProperty('isConnected');
    expect(result.current).toHaveProperty('connectionError');
    expect(result.current).toHaveProperty('watchedGameIds');
  });
});
