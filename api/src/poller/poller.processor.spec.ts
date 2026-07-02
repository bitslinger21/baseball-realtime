import type { Job } from 'bullmq';
import { PollerProcessor } from './poller.processor';
import type { LiveUpdate, GameMeta } from './poller.service';

function makeLiveUpdate(overrides: Partial<LiveUpdate> = {}): LiveUpdate {
  return {
    gameId: 'test-game-123',
    inning: 3,
    half: 'Top',
    outs: 1,
    count: { balls: 2, strikes: 1 },
    bases: { on1: false, on2: false, on3: false },
    homeScore: 2,
    awayScore: 1,
    description: 'Lineout to shortstop',
    playKey: 'pk-abc-001',
    isFinalPitchOfAtBat: false,
    ...overrides,
  };
}

function makeGameMeta(gameId = 'test-game-123'): GameMeta {
  return {
    gameId,
    gameDate: '2026-07-01',
    homeAbbr: 'NYY',
    awayAbbr: 'BOS',
    status: 'live',
  };
}

function makeJob(gameId: string): Job {
  return {
    name: 'game-poll',
    id: 'job-1',
    data: { kind: 'game', gameId },
    updateProgress: jest.fn().mockResolvedValue(undefined),
  } as unknown as Job;
}

describe('PollerProcessor', () => {
  const GAME_ID = 'test-game-123';

  let processor: PollerProcessor;
  let mockPoller: { fetchLatest: jest.Mock; fetchGameMeta: jest.Mock };
  let mockRealtime: { publishGameUpdate: jest.Mock };
  let mockAlerts: { onPlay: jest.Mock };
  let mockGamesRepo: { findOne: jest.Mock; upsert: jest.Mock };
  let mockStats: { recordPlay: jest.Mock };
  let mockMlb: { getScheduleByDate: jest.Mock };
  let mockBroadcastDirector: { onPlay: jest.Mock };

  beforeEach(() => {
    mockPoller = {
      fetchLatest: jest.fn().mockResolvedValue(makeLiveUpdate()),
      fetchGameMeta: jest.fn().mockResolvedValue(makeGameMeta()),
    };

    mockRealtime = {
      publishGameUpdate: jest.fn(),
    };

    mockAlerts = {
      onPlay: jest.fn().mockResolvedValue(undefined),
    };

    mockGamesRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue({ identifiers: [] }),
    };

    mockStats = {
      recordPlay: jest.fn(),
    };

    mockMlb = {
      getScheduleByDate: jest.fn().mockResolvedValue([]),
    };

    mockBroadcastDirector = {
      onPlay: jest.fn().mockResolvedValue(undefined),
    };

    processor = new PollerProcessor(
      mockPoller as any,
      mockRealtime as any,
      mockAlerts as any,
      mockGamesRepo as any,
      mockStats as any,
      mockMlb as any,
      mockBroadcastDirector as any,
    );
  });

  it('publishes a play update to the realtime gateway', async () => {
    await processor.process(makeJob(GAME_ID));

    expect(mockRealtime.publishGameUpdate).toHaveBeenCalledTimes(1);
    expect(mockRealtime.publishGameUpdate).toHaveBeenCalledWith(
      GAME_ID,
      expect.objectContaining({
        play: expect.objectContaining({ providerGameId: GAME_ID }),
      }),
    );
  });

  it('calls alerts.onPlay when isFinalPitchOfAtBat is true', async () => {
    mockPoller.fetchLatest.mockResolvedValue(
      makeLiveUpdate({ isFinalPitchOfAtBat: true }),
    );

    await processor.process(makeJob(GAME_ID));

    expect(mockAlerts.onPlay).toHaveBeenCalledTimes(1);
    expect(mockAlerts.onPlay).toHaveBeenCalledWith(
      GAME_ID,
      expect.objectContaining({ gameId: GAME_ID, ts: expect.any(String) }),
    );
  });

  it('does not call alerts.onPlay when isFinalPitchOfAtBat is false', async () => {
    mockPoller.fetchLatest.mockResolvedValue(
      makeLiveUpdate({ isFinalPitchOfAtBat: false }),
    );

    await processor.process(makeJob(GAME_ID));

    expect(mockAlerts.onPlay).not.toHaveBeenCalled();
    expect(mockRealtime.publishGameUpdate).toHaveBeenCalledTimes(1);
  });

  it('skips a duplicate poll event without re-publishing', async () => {
    const update = makeLiveUpdate();
    mockPoller.fetchLatest.mockResolvedValue(update);

    await processor.process(makeJob(GAME_ID));
    await processor.process(makeJob(GAME_ID));

    expect(mockRealtime.publishGameUpdate).toHaveBeenCalledTimes(1);
  });

  it('catches a fetchLatest error without throwing and without publishing', async () => {
    mockPoller.fetchLatest.mockRejectedValue(new Error('MLB API unavailable'));

    await expect(processor.process(makeJob(GAME_ID))).resolves.toBeUndefined();
    expect(mockRealtime.publishGameUpdate).not.toHaveBeenCalled();
  });

  it('calls broadcastDirector.onPlay once per play processed', async () => {
    await processor.process(makeJob(GAME_ID));
    expect(mockBroadcastDirector.onPlay).toHaveBeenCalledTimes(1);
  });

  it('calls broadcastDirector.onPlay with the correct gameId', async () => {
    await processor.process(makeJob(GAME_ID));
    expect(mockBroadcastDirector.onPlay).toHaveBeenCalledWith(
      GAME_ID,
      expect.any(Object),
      expect.any(Object),
    );
  });

  it('publishGameUpdate is called before broadcastDirector.onPlay (fire-and-forget ordering)', async () => {
    const callOrder: string[] = [];
    mockRealtime.publishGameUpdate.mockImplementation(() => { callOrder.push('publish'); });
    mockBroadcastDirector.onPlay.mockImplementation(() => { callOrder.push('director'); return Promise.resolve(); });

    await processor.process(makeJob(GAME_ID));

    expect(callOrder).toEqual(['publish', 'director']);
  });
});
