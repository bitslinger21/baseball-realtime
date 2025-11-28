import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';

import { AlertsService, type PlayUpdate } from './alerts.service';
import { Alert } from 'src/persistence/entities/alert.entity';
import { RealtimeGateway } from 'src/realtime/realtime.gateway';

type RealtimeGwMock = {
  publishGameUpdate: jest.Mock;
};

type AlertRepoMock = {
  save: jest.Mock;
};

describe('AlertsService', () => {
  let service: AlertsService;
  let gw: RealtimeGwMock;
  let alertsRepo: AlertRepoMock;

  beforeEach(async () => {
    gw = {
      publishGameUpdate: jest.fn(),
    };

    alertsRepo = {
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertsService,
        {
          provide: RealtimeGateway,
          useValue: gw,
        },
        {
          provide: getRepositoryToken(Alert),
          useValue: alertsRepo,
        },
      ],
    }).compile();

    service = module.get<AlertsService>(AlertsService);
  });

  const basePlay: Omit<PlayUpdate, 'gameId'> = {
    ts: '2025-01-01T00:00:00Z',
    inning: 1,
    half: 'Top',
    outs: 0,
    count: { balls: 0, strikes: 0 },
    bases: {},
    homeScore: 0,
    awayScore: 0,
  };

  function makePlay(overrides: Partial<PlayUpdate> & { gameId: string }): PlayUpdate {
    return {
      ...basePlay,
      ...overrides,
    };
  }

  it('emits cycle-watch after third distinct hit and cycle-achieved after the fourth', async () => {
    const gameId = 'game-1';
    const batterId = 'batter-1';

    // 1B
    service.onPlay(
      gameId,
      makePlay({
        gameId,
        batterId,
        batterName: 'Test Batter',
        playResult: 'Single',
        creditedHit: 1,
      }),
    );

    // 2B
    service.onPlay(
      gameId,
      makePlay({
        gameId,
        batterId,
        batterName: 'Test Batter',
        playResult: 'Double',
        creditedHit: 1,
      }),
    );

    // 3B -> should trigger cycle-watch
    service.onPlay(
      gameId,
      makePlay({
        gameId,
        batterId,
        batterName: 'Test Batter',
        playResult: 'Triple',
        creditedHit: 1,
      }),
    );

    // 4th hit (HR) -> should trigger cycle-achieved
    service.onPlay(
      gameId,
      makePlay({
        gameId,
        batterId,
        batterName: 'Test Batter',
        playResult: 'HomeRun',
        creditedHit: 1,
      }),
    );

    const calls = gw.publishGameUpdate.mock.calls;

    // We expect at least 2 alerts: one with type "cycle-watch", one with "cycle-achieved"
    const cycleWatch = calls.find(
      ([_gameId, payload]: [string, { alert?: any }]) =>
        payload.alert != null && payload.alert.type === 'cycle-watch',
    );
    const cycleAchieved = calls.find(
      ([_gameId, payload]: [string, { alert?: any }]) =>
        payload.alert != null && payload.alert.type === 'cycle-achieved',
    );

    expect(cycleWatch).toBeDefined();
    expect(cycleAchieved).toBeDefined();

    // Also verify we persisted something
    expect(alertsRepo.save).toHaveBeenCalled();
  });

  it('emits no-hitter-watch when pitcher has 7.0 IP with 0 hits', () => {
    const gameId = 'game-2';
    const pitcherId = 'pitcher-1';

    // Simulate 7 innings worth of outs on this pitcher, without hits.
    // We call onPlay multiple times, each recording some outs.
    for (let i = 0; i < 7; i += 1) {
      service.onPlay(
        gameId,
        makePlay({
          gameId,
          pitcherId,
          pitcherName: 'Ace Pitcher',
          playResult: 'Out',
          creditedHit: 0,
          pitcherOutsRecordedThisPlay: 3,
          homeScore: 0,
          awayScore: 0,
        }),
      );
    }

    const calls = gw.publishGameUpdate.mock.calls;

    const watchCall = calls.find(
      ([_gameId, payload]: [string, { alert?: any }]) =>
        payload.alert != null && payload.alert.type === 'no-hitter-watch',
    );

    expect(watchCall).toBeDefined();

    const [, watchPayload] = watchCall as [string, { alert: any }];
    expect(watchPayload.alert.pitcherName).toBe('Ace Pitcher');
    expect(watchPayload.alert.ipOuts).toBeGreaterThanOrEqual(21);
  });

  it('emits score-change and lead-change alerts when the lead flips', () => {
    const gameId = 'game-3';

    // Initial score snapshot
    service.onPlay(
      gameId,
      makePlay({
        gameId,
        homeScore: 1,
        awayScore: 0,
      }),
    );

    // Away team takes lead
    service.onPlay(
      gameId,
      makePlay({
        gameId,
        homeScore: 1,
        awayScore: 2,
      }),
    );

    const calls = gw.publishGameUpdate.mock.calls;

    const scoreChangeCall = calls.find(
      ([_gameId, payload]: [string, { alert?: any }]) =>
        payload.alert != null && payload.alert.type === 'score-change',
    );

    const leadChangeCall = calls.find(
      ([_gameId, payload]: [string, { alert?: any }]) =>
        payload.alert != null && payload.alert.type === 'lead-change',
    );

    expect(scoreChangeCall).toBeDefined();
    expect(leadChangeCall).toBeDefined();
  });
});
