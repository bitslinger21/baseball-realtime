import { Injectable, Logger } from '@nestjs/common';
import type { LiveUpdate } from '../poller/poller.service';
import type {
  HotEvent,
  HotEventGameContext,
  HotEventPlayer,
  HotEventType,
} from './home.types';

// Below this effective (post-decay) importance, an event isn't worth a user's
// attention — "return only events that actually meet the significance
// threshold" (PROMPT_home_page.md). Tuned, not derived; adjust by feel.
const MIN_IMPORTANCE = 25;
const MAX_RETURNED = 5;

// A completed event (a finished no-hitter, a finished cycle) stays eligible
// for a while rather than vanishing the instant it happens, then decays
// linearly to zero and is pruned — "ranking should decay with age."
const COMPLETED_DECAY_MS = 90 * 60 * 1000;

// An ACTIVE event with no update in this long has an orphaned game — final,
// postponed, or otherwise stopped ticking — so `observe()` will never run
// again for it to clean it up via reconcile(). Drop it here instead of
// letting it linger forever at full importance.
const ACTIVE_STALE_MS = 20 * 60 * 1000;

const HIGH_LEVERAGE_MIN_INNING = 7;
const HIGH_LEVERAGE_MIN_INDEX = 2.5;
const NO_HIT_MIN_INNINGS = 6;

function completedInningsForHalf(
  history: readonly LiveUpdate[],
  currentInning: number,
  currentHalf: 'Top' | 'Bottom',
  currentOuts: number,
): number {
  const innings = new Set(
    history.filter((h) => h.half === currentHalf).map((h) => h.inning),
  );
  const stillInProgress = currentOuts < 3 && innings.has(currentInning);
  return stillInProgress ? innings.size - 1 : innings.size;
}

function inningOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

function fieldingTeam(
  half: 'Top' | 'Bottom',
  latest: LiveUpdate,
): { abbr: string; name: string } {
  return half === 'Top'
    ? { abbr: latest.homeAbbr ?? 'Home', name: latest.homeName ?? 'the home team' }
    : { abbr: latest.awayAbbr ?? 'Away', name: latest.awayName ?? 'the away team' };
}

function battingTeam(
  half: 'Top' | 'Bottom',
  latest: LiveUpdate,
): { abbr: string; name: string } {
  return half === 'Top'
    ? { abbr: latest.awayAbbr ?? 'Away', name: latest.awayName ?? 'the away team' }
    : { abbr: latest.homeAbbr ?? 'Home', name: latest.homeName ?? 'the home team' };
}

function gameContextFrom(gameId: string, latest: LiveUpdate): HotEventGameContext | null {
  if (latest.awayAbbr == null || latest.homeAbbr == null) return null;
  return {
    providerGameId: gameId,
    awayAbbr: latest.awayAbbr,
    homeAbbr: latest.homeAbbr,
    awayScore: latest.awayScore ?? latest.linescore?.away.runs ?? 0,
    homeScore: latest.homeScore ?? latest.linescore?.home.runs ?? 0,
    half: latest.half === 'Top' ? 'top' : 'bottom',
    inning: latest.inning,
  };
}

@Injectable()
export class HotEventsService {
  private readonly log = new Logger(HotEventsService.name);
  private readonly events = new Map<string, HotEvent>();

  /**
   * Run every detector against one game's latest tick + full history, and
   * upsert/retire this game's events accordingly. Called from the poller's
   * per-tick hook (poller.processor.ts), same place Baseball IQ's ambient
   * insight generation is triggered — same data, a second, independent
   * consumer of it.
   */
  observe(gameId: string, latest: LiveUpdate, history: readonly LiveUpdate[]): void {
    if (latest.status !== 'live') return;
    try {
      const detected = [
        ...this.detectNoHitAndPerfectGame(gameId, latest, history),
        ...this.detectCycle(gameId, latest, history),
        ...this.detectMultiHomeRun(gameId, latest, history),
        ...this.detectHighLeverage(gameId, latest, history),
      ];
      this.reconcile(gameId, detected);
    } catch (e: unknown) {
      this.log.warn(
        `hot-event detection failed for ${gameId}: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  /**
   * Replace this game's currently-ACTIVE events with what the detectors just
   * found. An ACTIVE event no longer detected this tick (the bid was broken
   * up, the situation resolved without a milestone) is simply dropped —
   * "avoid creating a completely unrelated event every inning" cuts both
   * ways: a failed bid isn't itself a headline this pass. A COMPLETED event
   * is left alone here; it's pruned by age in getHot().
   */
  private reconcile(gameId: string, detected: HotEvent[]): void {
    const detectedIds = new Set(detected.map((e) => e.id));
    for (const [id, existing] of this.events) {
      if (
        existing.game?.providerGameId === gameId &&
        existing.status === 'ACTIVE' &&
        !detectedIds.has(id)
      ) {
        this.events.delete(id);
      }
    }
    for (const event of detected) {
      const prior = this.events.get(event.id);
      // Once COMPLETED, freeze updatedAt at the completion moment — a cycle
      // completed mid-game keeps getting re-detected every tick for the rest
      // of that game, and if updatedAt kept refreshing, its decay clock would
      // never start until the game itself stopped ticking.
      const freezeUpdatedAt = prior?.status === 'COMPLETED' && event.status === 'COMPLETED';
      const updatedAt = freezeUpdatedAt ? (prior?.updatedAt ?? event.updatedAt) : event.updatedAt;
      this.events.set(event.id, {
        ...event,
        // A re-detected event keeps its original occurredAt/detectedAt —
        // only the situation's current facts (headline, importance, status,
        // game score/inning) move forward tick to tick.
        occurredAt: prior?.occurredAt ?? event.occurredAt,
        detectedAt: prior?.detectedAt ?? event.detectedAt,
        updatedAt,
        expiresAt:
          event.status === 'COMPLETED'
            ? new Date(new Date(updatedAt).getTime() + COMPLETED_DECAY_MS).toISOString()
            : null,
      });
    }
  }

  /** Age-decayed, threshold-filtered, ranked — what the Home page actually
   * renders. Never manufactures a filler event to reach a target count. */
  getHot(): HotEvent[] {
    const now = Date.now();
    const scored: { event: HotEvent; effective: number }[] = [];

    for (const [id, event] of this.events) {
      const ageSinceUpdateMs = now - new Date(event.updatedAt).getTime();

      if (event.status === 'COMPLETED') {
        if (ageSinceUpdateMs >= COMPLETED_DECAY_MS) {
          this.events.delete(id);
          continue;
        }
        const decay = 1 - ageSinceUpdateMs / COMPLETED_DECAY_MS;
        scored.push({ event, effective: event.importance * decay });
      } else {
        if (ageSinceUpdateMs >= ACTIVE_STALE_MS) {
          this.events.delete(id);
          continue;
        }
        scored.push({ event, effective: event.importance });
      }
    }

    return scored
      .filter((s) => s.effective >= MIN_IMPORTANCE)
      .sort((a, b) => b.effective - a.effective)
      .slice(0, MAX_RETURNED)
      .map((s) => s.event);
  }

  // ── Detector 1+2: no-hit bid / perfect-game bid ──────────────────────────
  // Tracked at the TEAM level (not per-pitcher) so a combined no-hitter
  // still counts, matching real MLB scoring convention.
  private detectNoHitAndPerfectGame(
    gameId: string,
    latest: LiveUpdate,
    history: readonly LiveUpdate[],
  ): HotEvent[] {
    const half = latest.half;
    const fielding = fieldingTeam(half, latest);
    const facedByThisTeam = history.filter((h) => h.half === half);

    const hits = facedByThisTeam.filter((h) => h.creditedHit === 1).length;
    const walks = facedByThisTeam.filter((h) => h.playResult === 'Walk').length;
    const hbp = facedByThisTeam.filter((h) => h.playResult === 'HBP').length;
    const errors = facedByThisTeam.filter((h) => h.playResult === 'Error').length;
    const completedInnings = completedInningsForHalf(
      history,
      latest.inning,
      half,
      latest.outs,
    );

    if (hits > 0 || completedInnings < NO_HIT_MIN_INNINGS) return [];

    const isPerfect = walks === 0 && hbp === 0 && errors === 0;
    const pitcherIds = new Set(
      facedByThisTeam.map((h) => h.pitcherId).filter((id): id is string => id != null),
    );
    const pitcherName =
      pitcherIds.size <= 1
        ? (facedByThisTeam[facedByThisTeam.length - 1]?.pitcherName ?? fielding.name)
        : `the ${fielding.name} pitching staff`;

    const gameFinal = latest.status === 'final';
    const type: HotEventType = gameFinal
      ? isPerfect
        ? 'PERFECT_GAME_COMPLETED'
        : 'NO_HITTER_COMPLETED'
      : isPerfect
        ? 'PERFECT_GAME_BID'
        : 'NO_HIT_BID';

    const kind = isPerfect ? 'perfect game' : 'no-hitter';
    const headline = gameFinal
      ? `${pitcherName} has thrown a ${kind}.`
      : `${pitcherName} (${fielding.abbr}) has a ${kind} through ${completedInnings} innings.`;

    const importance = gameFinal
      ? 95
      : Math.min(85, 15 + completedInnings * 9);

    const players: HotEventPlayer[] = [...pitcherIds]
      .map((id) => {
        const p = facedByThisTeam.find((h) => h.pitcherId === id);
        return p?.pitcherName != null ? { name: p.pitcherName } : null;
      })
      .filter((p): p is HotEventPlayer => p != null);

    return [
      this.buildEvent({
        id: `nohit:${gameId}:${half}`,
        type,
        status: gameFinal ? 'COMPLETED' : 'ACTIVE',
        headline,
        importance,
        gameId,
        latest,
        players,
        teams: [fielding.abbr],
        hasIqContext: true,
        iqSuggested: [
          `When was ${fielding.name}'s last ${kind}?`,
          `How often does a ${kind} bid through ${NO_HIT_MIN_INNINGS} innings get finished?`,
        ],
      }),
    ];
  }

  // ── Detector 3: cycle bid ────────────────────────────────────────────────
  private detectCycle(
    gameId: string,
    latest: LiveUpdate,
    history: readonly LiveUpdate[],
  ): HotEvent[] {
    if (latest.batterId == null || latest.batterName == null) return [];

    const hitTypeNames = ['Single', 'Double', 'Triple', 'HomeRun'] as const;
    const thisBattersPAs = history.filter(
      (h) => h.batterId === latest.batterId && h.isFinalPitchOfAtBat === true,
    );
    const gotTypes = new Set(
      thisBattersPAs
        .map((h) => h.playResult)
        .filter((r): r is (typeof hitTypeNames)[number] =>
          r != null && (hitTypeNames as readonly string[]).includes(r),
        ),
    );

    if (gotTypes.size < 3) return [];

    const missing = hitTypeNames.filter((t) => !gotTypes.has(t));
    const battingSide = battingTeam(latest.half, latest);
    const gameFinal = latest.status === 'final';

    if (missing.length === 0) {
      return [
        this.buildEvent({
          id: `cycle:${gameId}:${latest.batterId}`,
          type: 'CYCLE_COMPLETED',
          status: 'COMPLETED',
          headline: `${latest.batterName} has hit for the cycle.`,
          importance: 92,
          gameId,
          latest,
          players: [{ id: Number(latest.batterId), name: latest.batterName }],
          teams: [battingSide.abbr],
          hasIqContext: true,
          iqSuggested: [
            `How many cycles have been hit this season?`,
            `How rare is hitting for the cycle?`,
          ],
        }),
      ];
    }

    if (missing.length !== 1 || gameFinal) return [];
    const missingLabel = missing[0] === 'HomeRun' ? 'home run' : missing[0].toLowerCase();

    return [
      this.buildEvent({
        id: `cycle:${gameId}:${latest.batterId}`,
        type: 'CYCLE_BID',
        status: 'ACTIVE',
        headline: `${latest.batterName} needs a ${missingLabel} to complete the cycle.`,
        importance: 35,
        gameId,
        latest,
        players: [{ id: Number(latest.batterId), name: latest.batterName }],
        teams: [battingSide.abbr],
        hasIqContext: true,
        iqSuggested: [
          `How rare is the ${missingLabel} as the last leg of a cycle?`,
          `Has ${latest.batterName} ever hit for the cycle?`,
        ],
      }),
    ];
  }

  // ── Detector 4: multi-home-run game ─────────────────────────────────────
  private detectMultiHomeRun(
    gameId: string,
    latest: LiveUpdate,
    history: readonly LiveUpdate[],
  ): HotEvent[] {
    const hrCountByBatter = new Map<string, { count: number; name: string; half: 'Top' | 'Bottom' }>();
    for (const h of history) {
      if (h.playResult !== 'HomeRun' || h.batterId == null || h.batterName == null) continue;
      const entry = hrCountByBatter.get(h.batterId);
      if (entry) entry.count += 1;
      else hrCountByBatter.set(h.batterId, { count: 1, name: h.batterName, half: h.half });
    }

    const events: HotEvent[] = [];
    for (const [batterId, entry] of hrCountByBatter) {
      if (entry.count < 3) continue;
      const side = battingTeam(entry.half, latest);
      const importance = Math.min(96, 40 + (entry.count - 3) * 25);
      events.push(
        this.buildEvent({
          id: `multihr:${gameId}:${batterId}`,
          type: 'MULTI_HOME_RUN_GAME',
          status: 'ACTIVE',
          headline: `${entry.name} has hit ${entry.count} home runs today.`,
          importance,
          gameId,
          latest,
          players: [{ id: Number(batterId), name: entry.name }],
          teams: [side.abbr],
          hasIqContext: true,
          iqSuggested: [
            `How many ${entry.count}-home-run games are there in MLB history?`,
            `What is ${entry.name}'s career high for home runs in a game?`,
          ],
        }),
      );
    }
    return events;
  }

  // ── Detector 5: high-leverage late-game situation ───────────────────────
  private detectHighLeverage(
    gameId: string,
    latest: LiveUpdate,
    _history: readonly LiveUpdate[],
  ): HotEvent[] {
    if (latest.inning < HIGH_LEVERAGE_MIN_INNING) return [];

    const basesLoaded = latest.bases.on1 === true && latest.bases.on2 === true && latest.bases.on3 === true;
    const tied = (latest.awayScore ?? 0) === (latest.homeScore ?? 0);
    const halfLabel = latest.half === 'Top' ? 'top' : 'bottom';
    const ord = inningOrdinal(latest.inning);

    let headline: string | null = null;
    let importance = 0;

    if (basesLoaded && tied && latest.inning >= 9) {
      headline = `Bases are loaded in the ${halfLabel} of the ${ord}, tied at ${latest.awayScore ?? 0}.`;
      importance = 80;
    } else if (
      latest.leverageIndex != null &&
      latest.leverageIndex >= HIGH_LEVERAGE_MIN_INDEX
    ) {
      headline = `${latest.awayAbbr ?? 'Away'} @ ${latest.homeAbbr ?? 'Home'} has reached a high-leverage moment in the ${halfLabel} of the ${ord}.`;
      importance = Math.min(85, 20 + latest.leverageIndex * 15);
    }

    if (headline == null) return [];

    return [
      this.buildEvent({
        id: `leverage:${gameId}`,
        type: 'HIGH_LEVERAGE_LATE',
        status: 'ACTIVE',
        headline,
        importance,
        gameId,
        latest,
        players: [],
        teams: [latest.awayAbbr, latest.homeAbbr].filter((t): t is string => t != null),
        hasIqContext: false,
        iqSuggested: [],
      }),
    ];
  }

  private buildEvent(input: {
    id: string;
    type: HotEventType;
    status: 'ACTIVE' | 'COMPLETED';
    headline: string;
    importance: number;
    gameId: string;
    latest: LiveUpdate;
    players: HotEventPlayer[];
    teams: string[];
    hasIqContext: boolean;
    iqSuggested: string[];
  }): HotEvent {
    const now = new Date().toISOString();
    return {
      id: input.id,
      type: input.type,
      status: input.status,
      headline: input.headline,
      importance: input.importance,
      occurredAt: now,
      detectedAt: now,
      updatedAt: now,
      expiresAt: input.status === 'COMPLETED' ? now : null,
      game: gameContextFrom(input.gameId, input.latest),
      players: input.players,
      teams: input.teams,
      hasIqContext: input.hasIqContext,
      iqSuggested: input.iqSuggested,
    };
  }
}
