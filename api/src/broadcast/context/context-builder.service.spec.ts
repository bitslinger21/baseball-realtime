import { ContextBuilderService } from './context-builder.service';
import { broadcastConfig } from '../broadcast.config';
import { BroadcastEventType } from '../types/broadcast-event.types';
import type { BroadcastEvent, BroadcastGameState } from '../types/broadcast-event.types';
import type { SessionMemorySnapshot } from '../types/broadcast-context.types';

const gameState: BroadcastGameState = {
  inning: 5,
  half: 'bottom',
  outs: 1,
  bases: { on1: false, on2: true, on3: false },
  balls: 2,
  strikes: 1,
  homeScore: 3,
  awayScore: 2,
  homeAbbr: 'NYY',
  awayAbbr: 'BOS',
  pitcherName: 'Cole',
  pitcherId: 99,
  batterName: 'Judge',
  batterId: 99,
};

const baseEvent: BroadcastEvent = {
  gameId: 'game-1',
  playKey: 'pk-001',
  eventType: BroadcastEventType.AT_BAT_COMPLETE,
  description: 'Judge homers to left.',
  atBatResult: 'HomeRun',
  isAtBatComplete: true,
  gameState,
};

function makeSnapshot(narrationTexts: string[]): SessionMemorySnapshot {
  return {
    recentNarrations: narrationTexts.map((text) => ({
      eventType: BroadcastEventType.AT_BAT_COMPLETE,
      text,
      ts: new Date().toISOString(),
    })),
    mentionedPlayerIds: [],
    scoreLastStated: null,
    atBatNarrationCount: narrationTexts.length,
  };
}

describe('ContextBuilderService', () => {
  let svc: ContextBuilderService;

  beforeEach(() => {
    svc = new ContextBuilderService();
  });

  it('recentPlays contains the narration texts from the snapshot', () => {
    const snap = makeSnapshot(['play A', 'play B', 'play C']);
    const ctx = svc.build(baseEvent, snap);
    expect(ctx.recentPlays).toEqual(['play A', 'play B', 'play C']);
  });

  it('recentPlays is capped at 3 even when snapshot has 5', () => {
    const snap = makeSnapshot(['p1', 'p2', 'p3', 'p4', 'p5']);
    const ctx = svc.build(baseEvent, snap);
    expect(ctx.recentPlays).toHaveLength(3);
    expect(ctx.recentPlays).toEqual(['p3', 'p4', 'p5']);
  });

  it('announcer.systemPrompt matches broadcastConfig', () => {
    const ctx = svc.build(baseEvent, makeSnapshot([]));
    expect(ctx.announcer.systemPrompt).toBe(broadcastConfig.announcer.systemPrompt);
  });

  it('gameState in the context matches event.gameState', () => {
    const ctx = svc.build(baseEvent, makeSnapshot([]));
    expect(ctx.gameState).toBe(gameState);
  });

  it('returned context contains no undefined fields', () => {
    const ctx = svc.build(baseEvent, makeSnapshot(['x']));
    expect(ctx.event).toBeDefined();
    expect(ctx.gameState).toBeDefined();
    expect(ctx.recentPlays).toBeDefined();
    expect(ctx.sessionMemory).toBeDefined();
    expect(ctx.announcer).toBeDefined();
  });
});
