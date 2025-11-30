// api/src/alerts/alerts.service.spec.ts
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';

import { AlertsService, type PlayUpdate } from './alerts.service';
import { Alert } from 'src/persistence/entities/alert.entity';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { StatsService } from '../stats/stats.service';

type AlertPayload = {
  type: string;
  [key: string]: unknown;
};

describe('AlertsService', () => {
  let service: AlertsService;
  let gw: RealtimeGateway;
  let repo: Repository<Alert>;

  const gwMock = {
    publishGameUpdate: jest.fn(),
  };

  const repoMock: Partial<Repository<Alert>> = {
    save: jest.fn().mockResolvedValue(null),
  };

  const statsMock: Partial<StatsService> = {
    recordAlert: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertsService,
        { provide: RealtimeGateway, useValue: gwMock },
        { provide: getRepositoryToken(Alert), useValue: repoMock },
        { provide: StatsService, useValue: statsMock },
      ],
    }).compile();

    service = module.get(AlertsService);
    gw = module.get(RealtimeGateway);

    repo = module.get(getRepositoryToken(Alert));
  });

  /** Helper: build a minimal PlayUpdate with sensible defaults. */
  function makePlay(overrides: Partial<PlayUpdate> = {}): PlayUpdate {
    return {
      gameId: 'game-1',
      ts: '2025-01-01T00:00:00.000Z',
      inning: 1,
      half: 'Top',
      outs: 0,
      count: { balls: 0, strikes: 0 },
      bases: {},
      ...overrides,
    } as PlayUpdate;
  }

  function getAlertPayloadsForGame(gameId: string): AlertPayload[] {
    return gwMock.publishGameUpdate.mock.calls
      .filter(([gid]) => gid === gameId)
      .map(([, payload]) => (payload as { alert?: AlertPayload }).alert!)
      .filter((a) => a != null);
  }

  it('emits cycle-watch then cycle-achieved for a batter with all four hit types', async () => {
    const gameId = 'cycle-game';
    const batterId = 'b1';

    // Single, Double, Triple → cycle-watch (needs HR)
    await service.onPlay(
      gameId,
      makePlay({
        batterId,
        batterName: 'Slugger',
        playResult: 'Single',
      }),
    );
    await service.onPlay(
      gameId,
      makePlay({
        batterId,
        batterName: 'Slugger',
        playResult: 'Double',
      }),
    );
    await service.onPlay(
      gameId,
      makePlay({
        batterId,
        batterName: 'Slugger',
        playResult: 'Triple',
      }),
    );

    // Now: HomeRun → cycle-achieved
    await service.onPlay(
      gameId,
      makePlay({
        batterId,
        batterName: 'Slugger',
        playResult: 'HomeRun',
      }),
    );

    const alerts = getAlertPayloadsForGame(gameId);

    const cycleWatch = alerts.find((a) => a.type === 'cycle-watch');
    const cycleAchieved = alerts.find((a) => a.type === 'cycle-achieved');

    expect(cycleWatch).toBeDefined();
    expect(cycleWatch).toEqual(
      expect.objectContaining({
        batterId,
        needs: 'HR',
        note: expect.stringContaining('needs a HR for the cycle'),
      }),
    );

    expect(cycleAchieved).toBeDefined();
    expect(cycleAchieved).toEqual(
      expect.objectContaining({
        batterId,
        note: expect.stringContaining('hit for the cycle'),
      }),
    );

    // Should also persist the alerts.
    expect(repo.save).toHaveBeenCalled();
  });

  it('emits no-hitter-watch at 7.0 IP with 0 hits, then no-hitter-broken on first hit', async () => {
    const gameId = 'no-hitter-game';
    const pitcherId = 'p1';

    // 7 innings x 3 outs = 21 outs total, no hits
    for (let inning = 1; inning <= 7; inning += 1) {
      await service.onPlay(
        gameId,
        makePlay({
          inning,
          pitcherId,
          pitcherName: 'Ace',
          pitcherOutsRecordedThisPlay: 3,
          creditedHit: 0,
          playResult: 'Out',
        }),
      );
    }

    // First hit allowed
    await service.onPlay(
      gameId,
      makePlay({
        inning: 8,
        pitcherId,
        pitcherName: 'Ace',
        pitcherOutsRecordedThisPlay: 0,
        creditedHit: 1,
        playResult: 'Single',
      }),
    );

    const alerts = getAlertPayloadsForGame(gameId);

    const watch = alerts.find((a) => a.type === 'no-hitter-watch');
    const broken = alerts.find((a) => a.type === 'no-hitter-broken');

    expect(watch).toBeDefined();
    expect(watch).toEqual(
      expect.objectContaining({
        pitcherId,
        ipOuts: 21,
        note: expect.stringContaining('no-hitter through 7.0'),
      }),
    );

    expect(broken).toBeDefined();
    expect(broken).toEqual(
      expect.objectContaining({
        pitcherId,
        note: expect.stringContaining('No-hitter broken'),
      }),
    );
  });

  it('emits score-change + lead-change when lead flips from home to away', async () => {
    const gameId = 'score-game';

    // Initial state: home leads 1–0
    await service.onPlay(
      gameId,
      makePlay({
        homeScore: 1,
        awayScore: 0,
      }),
    );

    // New state: away leads 3–1
    await service.onPlay(
      gameId,
      makePlay({
        homeScore: 1,
        awayScore: 3,
      }),
    );

    const alerts = getAlertPayloadsForGame(gameId);

    const scoreChange = alerts.find((a) => a.type === 'score-change');
    const leadChange = alerts.find((a) => a.type === 'lead-change');

    expect(scoreChange).toBeDefined();
    expect(scoreChange).toEqual(
      expect.objectContaining({
        note: expect.stringContaining('Score change'),
      }),
    );

    expect(leadChange).toBeDefined();
    expect(leadChange).toEqual(
      expect.objectContaining({
        note: expect.stringContaining('takes the lead'),
      }),
    );
  });
});
