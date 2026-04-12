import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';

import { AlertsService, type PlayUpdate } from './alerts.service';
import { Alert } from '../persistence/entities/alert.entity';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { StatsService } from '../stats/stats.service'; // ⬅️ add this

describe('AlertsService (unit)', () => {
  let service: AlertsService;
  let repo: Repository<Alert>;
  let gwMock: { publishGameUpdate: jest.Mock };

  beforeEach(async () => {
    gwMock = {
      publishGameUpdate: jest.fn(),
    };

    // Minimal repo mock – only save() is observed in unit tests
    const repoMock: Partial<Repository<Alert>> = {
      save: jest
        .fn()
        .mockImplementation(async (arg: unknown): Promise<unknown> => arg),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        AlertsService,
        StatsService,
        { provide: RealtimeGateway, useValue: gwMock },
        {
          provide: getRepositoryToken(Alert),
          useValue: repoMock,
        },
      ],
    }).compile();

    service = moduleRef.get(AlertsService);
    repo = moduleRef.get<Repository<Alert>>(getRepositoryToken(Alert));
  });

  /** Helper: minimal PlayUpdate with defaults. */
  const makePlay = (overrides: Partial<PlayUpdate> = {}): PlayUpdate =>
    ({
      gameId: 'game-1',
      ts: '2025-01-01T00:00:00.000Z',
      inning: 1,
      half: 'Top',
      outs: 0,
      count: { balls: 0, strikes: 0 },
      bases: {},
      ...overrides,
    }) as PlayUpdate;

  it('emits cycle-watch and cycle-achieved alerts for a batter hitting for the cycle', async () => {
    const gameId = 'g-cycle';
    const batterId = 'b1';

    // Single, Double, Triple → cycle-watch
    await service.onPlay(
      gameId,
      makePlay({
        gameId,
        batterId,
        batterName: 'Slugger',
        playResult: 'Single',
      }),
    );
    await service.onPlay(
      gameId,
      makePlay({
        gameId,
        batterId,
        batterName: 'Slugger',
        playResult: 'Double',
      }),
    );
    await service.onPlay(
      gameId,
      makePlay({
        gameId,
        batterId,
        batterName: 'Slugger',
        playResult: 'Triple',
      }),
    );

    // HomeRun → cycle-achieved
    await service.onPlay(
      gameId,
      makePlay({
        gameId,
        batterId,
        batterName: 'Slugger',
        playResult: 'HomeRun',
      }),
    );

    const saveCalls = (repo.save as jest.Mock).mock.calls;

    // Extract the Alert types from save() calls
    const types = saveCalls.map((args: [Alert]) => args[0].type);

    expect(types).toContain('cycle-watch');
    expect(types).toContain('cycle-achieved');

    // And websocket alerts were published
    const gwPayloads = gwMock.publishGameUpdate.mock.calls
      .map(([, payload]) => payload)
      .filter((p) => p && p.alert);

    const gwTypes = gwPayloads.map((p) => p.alert.type);
    expect(gwTypes).toContain('cycle-watch');
    expect(gwTypes).toContain('cycle-achieved');
  });

  it('emits score-change and lead-change alerts when the lead flips', async () => {
    const gameId = 'g-score';

    // Initial: home leads 1–0
    await service.onPlay(
      gameId,
      makePlay({
        gameId,
        homeScore: 1,
        awayScore: 0,
      }),
    );

    // Lead flips to away 3–1
    await service.onPlay(
      gameId,
      makePlay({
        gameId,
        homeScore: 1,
        awayScore: 3,
      }),
    );

    const saveCalls = (repo.save as jest.Mock).mock.calls;
    const types = saveCalls.map((args: [Alert]) => args[0].type);

    expect(types).toContain('score-change');
    expect(types).toContain('lead-change');
  });
});
