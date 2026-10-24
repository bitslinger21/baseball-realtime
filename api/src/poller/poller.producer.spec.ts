import type { Queue } from 'bullmq';
import { PollerProducer } from './poller.producer';

// Recurring jobs as BullMQ 5 keeps them: job schedulers by id (upserting the
// same id replaces it), listed by getRepeatableJobs with key = id, alongside
// any legacy repeatables an older build left in Redis.
class FakeQueue {
  readonly reps = new Map<
    string,
    { name: string; key: string; every: number; legacy: boolean }
  >();

  getRepeatableJobs(): Promise<{ name: string; key: string; every: number }[]> {
    return Promise.resolve(
      [...this.reps.values()].map(({ name, key, every }) => ({
        name,
        key,
        every,
      })),
    );
  }

  upsertJobScheduler(
    id: string,
    repeat: { every: number },
    template: { name: string },
  ): Promise<object> {
    this.reps.set(id, {
      name: template.name,
      key: id,
      every: repeat.every,
      legacy: false,
    });
    return Promise.resolve({});
  }

  removeJobScheduler(id: string): Promise<boolean> {
    const r = this.reps.get(id);
    if (r == null || r.legacy) return Promise.resolve(false);
    return Promise.resolve(this.reps.delete(id));
  }

  removeRepeatableByKey(key: string): Promise<boolean> {
    return Promise.resolve(this.reps.delete(key));
  }

  /** A repeatable left by an older build. */
  addLegacy(name: string, key: string, every: number): void {
    this.reps.set(key, { name, key, every, legacy: true });
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

  it('removes the poll for the date when the last viewer leaves', async () => {
    const { producer, daily } = setup();
    producer.enableDaily('2026-10-19');
    producer.enableDaily('2026-10-20');
    await producer.upsertDailyPoll('2026-10-19', 'live');
    await producer.upsertDailyPoll('2026-10-19', 'cold');
    await producer.upsertDailyPoll('2026-10-20', 'live');
    const { removed } = await producer.removeDailyPoll('2026-10-19');
    expect(removed).toBe(1);
    expect([...daily.reps.keys()]).toEqual(['daily_2026-10-20']);
  });

  it('prunes dates no one is watching, and legacy repeatables', async () => {
    const { producer, daily } = setup();
    producer.enableDaily('2026-10-19');
    producer.enableDaily('2026-10-12');
    await producer.upsertDailyPoll('2026-10-19', 'live');
    await producer.upsertDailyPoll('2026-10-12', 'live');
    producer.disableDaily('2026-10-12'); // its removal was missed
    daily.addLegacy('poll', 'daily:2026-10-18:3000', 3_000); // the Oct 23 form
    daily.addLegacy('poll', 'df646d907a7f273c', 3_000); // the pre-Oct-23 form
    const pruned = await producer.pruneUnwatchedPolls();
    expect(pruned.dates).toBe(3);
    expect([...daily.reps.keys()]).toEqual(['daily_2026-10-19']);
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
    await games.upsertJobScheduler(
      'seed_849817',
      { every: 15_000 },
      { name: 'poll-game' },
    );
    const pruned = await producer.pruneUnwatchedPolls();
    expect(pruned.games).toBe(1);
    expect([...games.reps.keys()]).toEqual(['seed_849817']);
  });
});
