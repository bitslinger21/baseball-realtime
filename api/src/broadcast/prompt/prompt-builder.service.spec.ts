import { PromptBuilderService } from './prompt-builder.service';
import { PROMPT_VERSION } from './templates';
import { broadcastConfig } from '../broadcast.config';
import { BroadcastEventType } from '../types/broadcast-event.types';
import type { BroadcastContext } from '../types/broadcast-context.types';

function makeContext(overrides: Partial<BroadcastContext> = {}): BroadcastContext {
  return {
    event: {
      gameId: 'game-1',
      playKey: 'pk-001',
      eventType: BroadcastEventType.AT_BAT_COMPLETE,
      description: 'Judge lines out to center.',
      atBatResult: 'Out',
      isAtBatComplete: true,
      gameState: {
        inning: 7,
        half: 'top',
        outs: 2,
        bases: { on1: false, on2: false, on3: false },
        balls: 1,
        strikes: 2,
        homeScore: 4,
        awayScore: 3,
        homeAbbr: 'NYY',
        awayAbbr: 'BOS',
        pitcherName: 'Cole',
        pitcherId: 45,
        batterName: 'Judge',
        batterId: 99,
      },
    },
    gameState: {
      inning: 7,
      half: 'top',
      outs: 2,
      bases: { on1: false, on2: false, on3: false },
      balls: 1,
      strikes: 2,
      homeScore: 4,
      awayScore: 3,
      homeAbbr: 'NYY',
      awayAbbr: 'BOS',
      pitcherName: 'Cole',
      pitcherId: 45,
      batterName: 'Judge',
      batterId: 99,
    },
    recentPlays: ['Previous play one.', 'Previous play two.'],
    sessionMemory: {
      recentNarrations: [],
      mentionedPlayerIds: [],
      scoreLastStated: null,
      atBatNarrationCount: 0,
    },
    announcer: { systemPrompt: broadcastConfig.announcer.systemPrompt },
    ...overrides,
  };
}

describe('PromptBuilderService', () => {
  let svc: PromptBuilderService;

  beforeEach(() => {
    svc = new PromptBuilderService();
  });

  it('returns an object with system, user, and promptVersion', () => {
    const result = svc.build(makeContext());
    expect(result).toHaveProperty('system');
    expect(result).toHaveProperty('user');
    expect(result).toHaveProperty('promptVersion');
  });

  it('system equals the configured announcer system prompt', () => {
    const result = svc.build(makeContext());
    expect(result.system).toBe(broadcastConfig.announcer.systemPrompt);
  });

  it('user contains the batter name from the context', () => {
    const result = svc.build(makeContext());
    expect(result.user).toContain('Judge');
  });

  it('user contains the pitcher name from the context', () => {
    const result = svc.build(makeContext());
    expect(result.user).toContain('Cole');
  });

  it('user contains the score from the context', () => {
    const result = svc.build(makeContext());
    expect(result.user).toContain('4');
    expect(result.user).toContain('3');
  });

  it('promptVersion equals PROMPT_VERSION', () => {
    const result = svc.build(makeContext());
    expect(result.promptVersion).toBe(PROMPT_VERSION);
  });

  it('given identical contexts, build always returns identical output', () => {
    const ctx = makeContext();
    expect(svc.build(ctx)).toEqual(svc.build(ctx));
  });
});
