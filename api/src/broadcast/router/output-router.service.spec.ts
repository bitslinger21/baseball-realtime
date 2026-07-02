import { OutputRouterService } from './output-router.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import { BroadcastEventType } from '../types/broadcast-event.types';
import type { BroadcastOutput } from '../types/broadcast-output.types';

function makeOutput(overrides: Partial<BroadcastOutput> = {}): BroadcastOutput {
  return {
    gameId: 'game-1',
    sequence: 1,
    eventType: BroadcastEventType.AT_BAT_COMPLETE,
    narration: 'Judge homers to left.',
    generatedAt: new Date().toISOString(),
    promptVersion: 'v1.0.0',
    providerName: 'anthropic',
    inputTokens: 80,
    outputTokens: 20,
    durationMs: 700,
    ...overrides,
  };
}

describe('OutputRouterService', () => {
  let svc: OutputRouterService;
  let mockGateway: jest.Mocked<Pick<RealtimeGateway, 'publishNarration'>>;

  beforeEach(() => {
    mockGateway = { publishNarration: jest.fn() };
    svc = new OutputRouterService(mockGateway as unknown as RealtimeGateway);
  });

  it('calls publishNarration with the correct gameId and output', () => {
    const output = makeOutput();
    svc.deliver(output);
    expect(mockGateway.publishNarration).toHaveBeenCalledWith('game-1', output);
  });

  it('does not throw when publishNarration throws', () => {
    mockGateway.publishNarration.mockImplementation(() => {
      throw new Error('socket down');
    });
    expect(() => svc.deliver(makeOutput())).not.toThrow();
  });

  it('logs an error when publishNarration throws', () => {
    const logSpy = jest.spyOn((svc as any).logger, 'error').mockImplementation(() => {});
    mockGateway.publishNarration.mockImplementation(() => {
      throw new Error('socket down');
    });
    svc.deliver(makeOutput());
    expect(logSpy).toHaveBeenCalled();
  });
});
