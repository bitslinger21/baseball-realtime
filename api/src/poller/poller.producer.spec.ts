import type { Queue } from 'bullmq';
import { PollerProducer } from './poller.producer';

// A queue that keeps repeatables the way BullMQ 5 lists them: by key, with no
// job id (the old lookup matched on the id and so never found anything).
class FakeQueue {
  readonly reps = new Map<
    string,
    { name: string; key: string; every: number }
  >();

  getRepeatableJobs(): Promise<{ name: string; key: string; every: number }[]> {
    return Promise.resolve([...this.reps.values()].map((r) => ({ ...r })));
  }

  removeRepeatableByKey(key: string): Promise<boolean> {
    return Promise.resolve(this.reps.delete(key));
  }

  add(
    name: string,
    _data: unknown,
    opts: { repeat?: { every: number; key?: string } },
  ): Promise<object> {
    if (opts.repeat != null) {
      // Without a readable key BullMQ hashes one — model that as opaque.
      const key = opts.repeat.key ?? `hash${this.reps.size}`;
      this.reps.set(key, { name, key, every: opts.repeat.every });
    }
    return Promise.resolve({});
  }

  everies(): number[] {
    return [...this.reps.values()].map((r) => r.every);
  }
}

function setup(): {
  producer: PollerProducer;
  games: FakeQueue;
  daily: FakeQueue;
} {
  const games = new FakeQueue();
  const daily = new FakeQueue();
  const producer = new PollerProducer(
    games as unknown as Queue,
    daily as unknown as Queue,
  );
  return { producer, games, daily };
}

describe('PollerProducer daily polls', () => {
  it('keeps exactly one poll per date across cadence changes', async () => {
    const { producer, daily } = setup();
    producer.enableDaily('2026-10-19');
    await producer.upsertDailyPoll('2026-10-19', 'live');
    await producer.upsertDailyPoll('2026-10-19', 'cold');
    await producer.upsertDailyPoll('2026-10-19', 'live');
    await producer.upsertDailyPoll('2026-10-19', 'cold');
    expect(daily.everies()).toEqual([60_000]);
  });

  it('removes every poll for the date when the last viewer leaves', async () => {
    const { producer, daily } = setup();
    producer.enableDaily('2026-10-19');
    producer.enableDaily('2026-10-20');
    await producer.upsertDailyPoll('2026-10-19', 'live');
    await producer.upsertDailyPoll('2026-10-19', 'cold');
    await producer.upsertDailyPoll('2026-10-20', 'live');
    const { removed } = await producer.removeDailyPoll('2026-10-19');
    expect(removed).toBe(1);
    expect([...daily.reps.keys()]).toEqual(['daily:2026-10-20:3000']);
  });

  it('prunes dates no one is watching, and polls in the old key form', async () => {
    const { producer, daily } = setup();
    producer.enableDaily('2026-10-19');
    producer.enableDaily('2026-10-12');
    await producer.upsertDailyPoll('2026-10-19', 'live');
    await producer.upsertDailyPoll('2026-10-12', 'live');
    producer.disableDaily('2026-10-12'); // its removal was missed
    await daily.add('poll', {}, { repeat: { every: 3_000 } }); // a pre-fix orphan
    const pruned = await producer.pruneUnwatchedPolls();
    expect(pruned.dates).toBe(2);
    expect([...daily.reps.keys()]).toEqual(['daily:2026-10-19:3000']);
  });
});

describe('PollerProducer game polls', () => {
  it('keeps one poll per game and removes it on leave', async () => {
    const { producer, games } = setup();
    producer.enableGame('849815');
    await producer.upsertGamePoll('849815', 'live');
    await producer.upsertGamePoll('849815', 'warm');
    expect(games.everies()).toEqual([10_000]);
    await producer.removeGamePoll('849815');
    expect(games.reps.size).toBe(0);
  });

  it('prunes unwatched game polls but leaves the seeded ones', async () => {
    const { producer, games } = setup();
    producer.enableGame('849815');
    await producer.upsertGamePoll('849815', 'live');
    producer.disableGame('849815');
    await games.add(
      'poll-game',
      {},
      { repeat: { every: 15_000, key: 'seed:849817' } },
    );
    const pruned = await producer.pruneUnwatchedPolls();
    expect(pruned.games).toBe(1);
    expect([...games.reps.keys()]).toEqual(['seed:849817']);
  });
});
