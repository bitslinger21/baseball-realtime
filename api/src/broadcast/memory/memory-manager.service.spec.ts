import { MemoryManagerService } from './memory-manager.service';
import type { BroadcastOutput } from '../types/broadcast-output.types';
import { BroadcastEventType } from '../types/broadcast-event.types';

function makeOutput(overrides: Partial<BroadcastOutput> = {}): BroadcastOutput {
  return {
    gameId: 'game-1',
    sequence: 1,
    eventType: BroadcastEventType.AT_BAT_COMPLETE,
    narration: 'Jones lines out to shortstop to end the inning.',
    generatedAt: new Date().toISOString(),
    promptVersion: 'v1.0.0',
    providerName: 'anthropic',
    inputTokens: 100,
    outputTokens: 30,
    durationMs: 800,
    ...overrides,
  };
}

describe('MemoryManagerService', () => {
  let svc: MemoryManagerService;

  beforeEach(() => {
    svc = new MemoryManagerService();
  });

  it('getOrCreateSession returns a new session with correct initial values', () => {
    const session = svc.getOrCreateSession('game-1');
    expect(session.gameId).toBe('game-1');
    expect(session.sequence).toBe(0);
    expect(session.recentNarrations).toHaveLength(0);
    expect(session.mentionedPlayerIds.size).toBe(0);
    expect(session.scoreLastStated).toBeNull();
    expect(session.atBatNarrationCount).toBe(0);
    expect(session.startedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('getOrCreateSession called twice with the same gameId returns the same session', () => {
    const a = svc.getOrCreateSession('game-1');
    const b = svc.getOrCreateSession('game-1');
    expect(a).toBe(b);
  });

  it('getOrCreateSession called with different gameIds returns independent sessions', () => {
    const a = svc.getOrCreateSession('game-1');
    const b = svc.getOrCreateSession('game-2');
    expect(a).not.toBe(b);
    expect(a.gameId).toBe('game-1');
    expect(b.gameId).toBe('game-2');
  });

  it('recordNarration increments atBatNarrationCount', () => {
    svc.recordNarration('game-1', makeOutput());
    svc.recordNarration('game-1', makeOutput());
    expect(svc.getOrCreateSession('game-1').atBatNarrationCount).toBe(2);
  });

  it('recordNarration caps recentNarrations at 5', () => {
    for (let i = 0; i < 7; i++) {
      svc.recordNarration('game-1', makeOutput({ narration: `play ${i}` }));
    }
    expect(svc.getOrCreateSession('game-1').recentNarrations).toHaveLength(5);
    expect(svc.getOrCreateSession('game-1').recentNarrations[4].text).toBe('play 6');
  });

  it('closeSession removes the session; subsequent getOrCreateSession creates a fresh one', () => {
    const original = svc.getOrCreateSession('game-1');
    svc.recordNarration('game-1', makeOutput());
    svc.closeSession('game-1');
    const fresh = svc.getOrCreateSession('game-1');
    expect(fresh).not.toBe(original);
    expect(fresh.atBatNarrationCount).toBe(0);
  });

  it('mutating one session does not affect another', () => {
    svc.recordNarration('game-1', makeOutput({ gameId: 'game-1' }));
    svc.recordNarration('game-1', makeOutput({ gameId: 'game-1' }));
    const snap2 = svc.getSessionSnapshot('game-2');
    expect(snap2.atBatNarrationCount).toBe(0);
    expect(snap2.recentNarrations).toHaveLength(0);
  });
});
