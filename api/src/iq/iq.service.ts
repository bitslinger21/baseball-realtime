import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Anthropic from '@anthropic-ai/sdk';

import type { AppConfig } from '../domains/config/env';
import {
  GameInsight,
  GameInsightCandidateRow,
} from '../persistence/entities/game-insight.entity';
import type { LiveUpdate } from '../poller/poller.service';
import { SplitsService } from './splits.service';
import { ParkFactorService } from './park-factor.service';
import {
  EMPTY_IQ_BLOCK,
  GeneratorContext,
  IqBlock,
  IqCandidate,
  SituationalSplitLine,
  TriggerReason,
} from './iq.types';

const MODEL = 'claude-haiku-4-5-20251001';
const MIN_SCORE_THRESHOLD = 0.6;
const MIN_PLAYS_BETWEEN_INSIGHTS = 2;
const MIN_MS_BETWEEN_INSIGHTS = 60_000;
const CURRENT_SEASON = new Date().getFullYear();

type PerGameState = {
  lastScore: string | null;
  lastPitcherId: number | null;
  lastLeverageBucket: number | null;
  lastAtBatIndex: number | null;
  lastShownAtMs: number;
  lastShownAtBatIndex: number;
  shownFingerprints: Set<string>;
};

const GENERATE_TOOL_NAME = 'emit_baseball_iq';
const GENERATE_TOOL_SCHEMA = {
  type: 'object' as const,
  properties: {
    candidates: {
      type: 'array',
      maxItems: 3,
      items: {
        type: 'object',
        properties: {
          kind: { type: 'string', enum: ['Leverage', 'Streak', 'Rare'] },
          score: { type: 'number', minimum: 0, maximum: 1 },
          text: { type: 'string', maxLength: 140 },
        },
        required: ['kind', 'score', 'text'],
      },
    },
    suggested: {
      type: 'array',
      maxItems: 3,
      items: { type: 'string' },
    },
  },
  required: ['candidates', 'suggested'],
};

const QUERY_TOOL_NAME = 'emit_iq_answer';
const QUERY_TOOL_SCHEMA = {
  type: 'object' as const,
  properties: {
    headline: { type: 'string', maxLength: 24 },
    unit: { type: 'string', maxLength: 16 },
    sub: { type: 'string' },
    facts: {
      type: 'array',
      maxItems: 3,
      items: {
        type: 'object',
        properties: {
          label: { type: 'string' },
          value: { type: 'string' },
        },
        required: ['label', 'value'],
      },
    },
  },
  required: ['headline', 'sub', 'facts'],
};

@Injectable()
export class IqService {
  private readonly log = new Logger(IqService.name);
  private readonly client: Anthropic | null;
  private readonly stateByGame = new Map<string, PerGameState>();

  constructor(
    cfg: ConfigService,
    private readonly splits: SplitsService,
    private readonly parkFactor: ParkFactorService,
    @InjectRepository(GameInsight)
    private readonly insightRepo: Repository<GameInsight>,
  ) {
    const apiKey = cfg.get<AppConfig['anthropicApiKey']>('app.anthropicApiKey');
    this.client = apiKey != null ? new Anthropic({ apiKey }) : null;
    if (this.client == null) {
      this.log.warn(
        'ANTHROPIC_API_KEY not set — Baseball IQ generation disabled',
      );
    }
  }

  private stateFor(gameId: string): PerGameState {
    let s = this.stateByGame.get(gameId);
    if (s == null) {
      s = {
        lastScore: null,
        lastPitcherId: null,
        lastLeverageBucket: null,
        lastAtBatIndex: null,
        lastShownAtMs: 0,
        lastShownAtBatIndex: -Infinity,
        shownFingerprints: new Set(),
      };
      this.stateByGame.set(gameId, s);
    }
    return s;
  }

  private checkTrigger(
    u: LiveUpdate,
    state: PerGameState,
  ): TriggerReason | null {
    const score = `${u.homeScore ?? 0}-${u.awayScore ?? 0}`;
    const pitcherId = u.pitcherId != null ? Number(u.pitcherId) : null;
    const leverageBucket =
      u.leverageIndex != null ? Math.floor(u.leverageIndex * 2) : null; // ~0.5-wide buckets

    let reason: TriggerReason | null = null;

    if (state.lastScore != null && state.lastScore !== score) {
      reason = 'scoring_play';
    } else if (
      state.lastPitcherId != null &&
      pitcherId != null &&
      state.lastPitcherId !== pitcherId
    ) {
      reason = 'pitching_change';
    } else if (
      state.lastLeverageBucket != null &&
      leverageBucket != null &&
      leverageBucket !== state.lastLeverageBucket &&
      (u.leverageIndex ?? 0) >= 1.5
    ) {
      reason = 'leverage_crossing';
    } else if (u.isFinalPitchOfAtBat === true && u.outs === 3) {
      reason = 'half_inning_gap';
    }
    // Milestone/streak crossings need the play-history digest, checked in
    // buildContext's caller once we know a candidate window is worth building;
    // for the cheap synchronous gate, the four checks above cover the vast
    // majority of real triggers described in the handoff doc.

    state.lastScore = score;
    state.lastPitcherId = pitcherId ?? state.lastPitcherId;
    state.lastLeverageBucket = leverageBucket ?? state.lastLeverageBucket;

    return reason;
  }

  private cadenceOk(state: PerGameState, atBatIndex: number): boolean {
    const plays = atBatIndex - state.lastShownAtBatIndex;
    const ms = Date.now() - state.lastShownAtMs;
    return plays >= MIN_PLAYS_BETWEEN_INSIGHTS || ms >= MIN_MS_BETWEEN_INSIGHTS;
  }

  private fingerprint(c: IqCandidate): string {
    return `${c.kind}:${c.text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .slice(0, 40)}`;
  }

  private digestHistory(history: readonly LiveUpdate[]): string[] {
    return history
      .slice(-12)
      .map((u) => u.description ?? u.playResult ?? '')
      .filter((s) => s.trim() !== '');
  }

  /**
   * Exit velo / launch angle live on the specific playEvent where contact
   * happened (`playEvents[].hitData`), not on the play object itself. MLB's
   * feed carries more fields here than this codebase's narrow `MlbPlay` type
   * declares (trajectory/location only), so this reads the raw JSON directly.
   */
  private extractHitData(
    u: LiveUpdate,
  ): { launchSpeed?: number; launchAngle?: number } | undefined {
    const currentPlay = (u.snapshot as { currentPlay?: unknown } | undefined)
      ?.currentPlay as
      | {
          playEvents?: Array<{
            details?: { isInPlay?: boolean };
            hitData?: { launchSpeed?: number; launchAngle?: number };
          }>;
        }
      | undefined;
    const events = currentPlay?.playEvents ?? [];
    for (let i = events.length - 1; i >= 0; i--) {
      const hitData = events[i]?.hitData;
      if (
        events[i]?.details?.isInPlay === true &&
        hitData?.launchSpeed != null
      ) {
        return hitData;
      }
    }
    return undefined;
  }

  private async buildContext(
    gameId: string,
    u: LiveUpdate,
    history: readonly LiveUpdate[],
    reason: TriggerReason,
    state: PerGameState,
  ): Promise<GeneratorContext> {
    const batterId = u.batterId != null ? Number(u.batterId) : undefined;
    const pitcherId = u.pitcherId != null ? Number(u.pitcherId) : undefined;

    const [batterSplitsRaw, pitcherSplitsRaw] = await Promise.all([
      batterId != null
        ? this.splits
            .getSplits(batterId, CURRENT_SEASON, 'hitting')
            .catch(() => [])
        : Promise.resolve([]),
      pitcherId != null
        ? this.splits
            .getSplits(pitcherId, CURRENT_SEASON, 'pitching')
            .catch(() => [])
        : Promise.resolve([]),
    ]);

    // A RISP split is a season-long tendency, not a description of this play.
    // Handing it to the model when nobody's actually in scoring position right
    // now invites exactly the bug this guards against: "Bregman hits .340 with
    // runners in scoring position" on a play with the bases empty. Strip it out
    // unless the current play's bases actually match the situation it names.
    const hasRisp = u.bases.on2 === true || u.bases.on3 === true;
    const dropsUnmatchedRisp = (
      lines: SituationalSplitLine[],
    ): SituationalSplitLine[] =>
      lines.filter((l) => hasRisp || !/scoring position/i.test(l.situation));
    const batterSplits = dropsUnmatchedRisp(batterSplitsRaw);
    const pitcherSplits = dropsUnmatchedRisp(pitcherSplitsRaw);

    let parkFactor: GeneratorContext['parkFactor'] = null;
    const isBattedBallResult =
      u.playResult === 'Single' ||
      u.playResult === 'Double' ||
      u.playResult === 'Triple' ||
      u.playResult === 'HomeRun' ||
      u.playResult === 'Out';
    const hitData = this.extractHitData(u);
    if (
      isBattedBallResult &&
      hitData?.launchSpeed != null &&
      hitData?.launchAngle != null
    ) {
      parkFactor = await this.parkFactor.evaluateAgainstAllParks({
        exitVeloMph: hitData.launchSpeed,
        launchAngleDeg: hitData.launchAngle,
      });
    }

    return {
      providerGameId: gameId,
      inning: u.inning,
      half: u.half === 'Top' ? 'top' : 'bottom',
      outs: u.outs,
      balls: u.count.balls,
      strikes: u.count.strikes,
      bases: {
        on1: u.bases.on1 === true,
        on2: u.bases.on2 === true,
        on3: u.bases.on3 === true,
      },
      homeScore: u.homeScore ?? 0,
      awayScore: u.awayScore ?? 0,
      homeAbbr: u.homeAbbr,
      awayAbbr: u.awayAbbr,
      batterId,
      batterName: u.batterName ?? u.batter?.name,
      batterAvg: u.batterAvg,
      batterSplits,
      pitcherId,
      pitcherName: u.pitcherName ?? u.pitcher?.name,
      pitcherEra: u.pitcherEra,
      pitcherSplits,
      description: u.description,
      playResult: u.playResult,
      scorebookCode: u.scorebookCode,
      leverageIndex: u.leverageIndex,
      homeTeamWinProbability: u.homeTeamWinProbability,
      parkFactor,
      triggerReason: reason,
      recentPlaysDigest: this.digestHistory(history),
      alreadyShown: Array.from(state.shownFingerprints),
    };
  }

  private buildGeneratePrompt(ctx: GeneratorContext): string {
    return [
      `You generate a broadcast-quality baseball insight for a live game UI. Be terse and plain-language — no sabermetric jargon a casual fan wouldn't say out loud.`,
      `Trigger: ${ctx.triggerReason}.`,
      `State: ${ctx.awayAbbr ?? 'Away'} ${ctx.awayScore} @ ${ctx.homeAbbr ?? 'Home'} ${ctx.homeScore}, ` +
        `${ctx.half} ${ctx.inning}, ${ctx.outs} out, count ${ctx.balls}-${ctx.strikes}, ` +
        `bases: 1B=${ctx.bases.on1} 2B=${ctx.bases.on2} 3B=${ctx.bases.on3}.`,
      `Batter: ${ctx.batterName ?? 'unknown'} (season avg ${ctx.batterAvg ?? 'n/a'}). Situational splits (season-long tendencies, NOT a description of this play): ${JSON.stringify(ctx.batterSplits)}.`,
      `Pitcher: ${ctx.pitcherName ?? 'unknown'} (season ERA ${ctx.pitcherEra ?? 'n/a'}). Situational splits (season-long tendencies, NOT a description of this play): ${JSON.stringify(ctx.pitcherSplits)}.`,
      `Last play: ${ctx.description ?? ctx.playResult ?? 'n/a'}.`,
      `A situational split describes how a player has performed in that situation THIS SEASON — it is background, not a claim about right now. Only phrase a candidate as if a situational split is happening in the current play (e.g. "with runners in scoring position", "with two outs") if the State line above actually matches it (bases/outs). If a split doesn't match the current State, you may still use the number, but frame it as a season fact ("this season") — never imply it describes this at-bat.`,
      ctx.leverageIndex != null
        ? `Leverage index: ${ctx.leverageIndex}. Win probability (home): ${ctx.homeTeamWinProbability ?? 'n/a'}.`
        : '',
      ctx.parkFactor != null
        ? `Park factor: estimated carry ${ctx.parkFactor.distanceFt}ft, would clear ${ctx.parkFactor.wouldClearParks} of ${ctx.parkFactor.totalParks} MLB parks.`
        : '',
      `Recent plays: ${ctx.recentPlaysDigest.join(' | ')}`,
      ctx.alreadyShown.length > 0
        ? `Do NOT repeat these facts or close variants, already shown this game: ${ctx.alreadyShown.join(', ')}`
        : '',
      `Produce 0-3 candidates (empty is correct and expected if nothing here is genuinely non-obvious — a fact already visible on the scoreboard, like "the away team is down 3", does not qualify). Each candidate needs a kind (Leverage/Streak/Rare), a 0-1 score, and one plain sentence under 110 characters, front-loaded so it survives being cut off. Also produce 0-3 "suggested" follow-up questions a fan might ask right now — each must be answerable from the context you were given or general baseball knowledge/history.`,
    ]
      .filter((s) => s !== '')
      .join('\n');
  }

  private async callGenerate(ctx: GeneratorContext): Promise<IqBlock> {
    if (this.client == null) return EMPTY_IQ_BLOCK;

    try {
      const msg = await this.client.messages.create({
        model: MODEL,
        max_tokens: 1024,
        tools: [
          {
            name: GENERATE_TOOL_NAME,
            description:
              'Emit the baseball IQ candidates and suggested questions for this moment.',
            input_schema: GENERATE_TOOL_SCHEMA,
          },
        ],
        tool_choice: { type: 'tool', name: GENERATE_TOOL_NAME },
        messages: [{ role: 'user', content: this.buildGeneratePrompt(ctx) }],
      });

      const block = msg.content.find(
        (b): b is Anthropic.ToolUseBlock =>
          b.type === 'tool_use' && b.name === GENERATE_TOOL_NAME,
      );
      if (block == null) return EMPTY_IQ_BLOCK;

      const input = block.input as {
        candidates?: IqCandidate[];
        suggested?: string[];
      };
      // Deterministic safety net: the prompt asks the model not to describe a
      // situational split as happening "right now" unless it matches the
      // actual play — but a model can still ignore that instruction. Catch the
      // specific, previously-observed failure (RISP language on a play with
      // the bases empty) rather than trust the instruction alone.
      const hasRisp = ctx.bases.on2 || ctx.bases.on3;
      const candidates = (input.candidates ?? [])
        .filter((c) => c.score >= MIN_SCORE_THRESHOLD)
        .filter((c) => hasRisp || !/scoring position/i.test(c.text))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

      return {
        candidates,
        suggested: (input.suggested ?? []).slice(0, 3),
      };
    } catch (e: unknown) {
      this.log.warn(
        `Claude generate call failed: ${e instanceof Error ? e.message : String(e)}`,
      );
      return EMPTY_IQ_BLOCK;
    }
  }

  /**
   * Called once per distinct live tick (the poller already de-dupes identical
   * ticks before calling this). Returns undefined for "no iq block" — the vast
   * majority of ticks, with zero Claude calls and zero added latency.
   */
  async maybeGenerate(
    gameId: string,
    u: LiveUpdate,
    history: readonly LiveUpdate[],
  ): Promise<IqBlock | undefined> {
    const atBatIndex = u.atBatIndex;
    if (atBatIndex == null) return undefined;

    const existing = await this.insightRepo.findOne({
      where: { providerGameId: gameId, atBatIndex },
    });
    if (existing != null) {
      return { candidates: existing.candidates, suggested: existing.suggested };
    }

    const state = this.stateFor(gameId);
    const reason = this.checkTrigger(u, state);
    state.lastAtBatIndex = atBatIndex;

    if (reason == null) return undefined;
    if (!this.cadenceOk(state, atBatIndex)) return undefined;

    const ctx = await this.buildContext(gameId, u, history, reason, state);
    const block = await this.callGenerate(ctx);

    // Persist even the empty result — prevents re-calling Claude for this same
    // play on a later poll tick or process restart.
    await this.insightRepo
      .save(
        this.insightRepo.create({
          providerGameId: gameId,
          atBatIndex,
          createdAt: new Date(),
          candidates: block.candidates as GameInsightCandidateRow[],
          suggested: block.suggested,
        }),
      )
      .catch((e: unknown) =>
        this.log.warn(
          `failed to persist game insight: ${e instanceof Error ? e.message : String(e)}`,
        ),
      );

    if (block.candidates.length > 0) {
      state.lastShownAtMs = Date.now();
      state.lastShownAtBatIndex = atBatIndex;
      for (const c of block.candidates)
        state.shownFingerprints.add(this.fingerprint(c));
    }

    return block;
  }

  /** Batch lookup for hydrate/replay — never calls Claude. */
  async getPersistedForGame(gameId: string): Promise<Map<number, IqBlock>> {
    const rows = await this.insightRepo.find({
      where: { providerGameId: gameId },
    });
    const map = new Map<number, IqBlock>();
    for (const r of rows) {
      map.set(r.atBatIndex, {
        candidates: r.candidates,
        suggested: r.suggested,
      });
    }
    return map;
  }

  async answerQuery(input: {
    gameId: string;
    updateIndex: number;
    question: string;
    history: readonly LiveUpdate[];
  }): Promise<{
    ok: boolean;
    headline: string;
    unit?: string;
    sub: string;
    facts: { label: string; value: string }[];
  }> {
    const started = Date.now();
    const sliced = input.history.slice(0, input.updateIndex + 1);
    const latest = sliced[sliced.length - 1];

    if (this.client == null) {
      return {
        ok: false,
        headline: 'N/A',
        sub: 'Baseball IQ is unavailable right now.',
        facts: [],
      };
    }

    // No play has happened yet at this moment (Scout paused at marker 0,
    // pregame, updateIndex -1). This is a supported state, not a failure —
    // the client's "no context, asking" state explicitly invites general
    // baseball-history questions here. Answer from general knowledge only;
    // don't invent game-specific facts that don't exist yet.
    if (latest == null) {
      const prompt = [
        `Answer this fan's question. No specific game is in progress yet at this moment, so`,
        `you have no play-by-play, score, or in-game facts to draw on — answer only from`,
        `general baseball knowledge/history, or say you need the game to start if the`,
        `question requires in-game context you don't have.`,
        `Question: "${input.question}"`,
        `Format all numbers with units — the client does no formatting. headline is a very`,
        `short number/phrase (not a sentence), sub is 1-3 sentences of prose, facts is 0-3`,
        `supporting {label, value} pairs.`,
      ].join('\n');
      return this.callQueryModel(prompt, started);
    }

    let parkFactor: GeneratorContext['parkFactor'] = null;
    const hitData = this.extractHitData(latest);
    if (hitData?.launchSpeed != null && hitData?.launchAngle != null) {
      parkFactor = await this.parkFactor.evaluateAgainstAllParks({
        exitVeloMph: hitData.launchSpeed,
        launchAngleDeg: hitData.launchAngle,
      });
    }

    const prompt = [
      `Answer this fan's question about a baseball game, as of a specific past moment (not "now").`,
      `Question: "${input.question}"`,
      `Game state as of that moment: ${latest.awayAbbr ?? 'Away'} ${latest.awayScore} @ ${latest.homeAbbr ?? 'Home'} ${latest.homeScore}, ` +
        `${latest.half} ${latest.inning}, ${latest.outs} out. Last play: ${latest.description ?? latest.playResult ?? 'n/a'}.`,
      `Recent plays: ${this.digestHistory(sliced).join(' | ')}`,
      parkFactor != null
        ? `Park factor for the relevant batted ball: estimated carry ${parkFactor.distanceFt}ft, would clear ${parkFactor.wouldClearParks} of ${parkFactor.totalParks} MLB parks.`
        : '',
      `Answer using only this game, its participants, the two teams, and general baseball history/records. Format all numbers with units — the client does no formatting. headline is a very short number/phrase (not a sentence), sub is 1-3 sentences of prose, facts is 0-3 supporting {label, value} pairs.`,
    ]
      .filter((s) => s !== '')
      .join('\n');

    return this.callQueryModel(prompt, started);
  }

  private async callQueryModel(
    prompt: string,
    started: number,
  ): Promise<{
    ok: boolean;
    headline: string;
    unit?: string;
    sub: string;
    facts: { label: string; value: string }[];
  }> {
    // callQueryModel is only ever invoked after the `this.client == null` guard
    // in answerQuery, but TS can't see that across the call boundary.
    if (this.client == null) {
      return {
        ok: false,
        headline: 'N/A',
        sub: 'Baseball IQ is unavailable right now.',
        facts: [],
      };
    }

    try {
      const msg = await this.client.messages.create({
        model: MODEL,
        max_tokens: 512,
        tools: [
          {
            name: QUERY_TOOL_NAME,
            description: 'Emit the structured answer to the fan question.',
            input_schema: QUERY_TOOL_SCHEMA,
          },
        ],
        tool_choice: { type: 'tool', name: QUERY_TOOL_NAME },
        messages: [{ role: 'user', content: prompt }],
      });

      const block = msg.content.find(
        (b): b is Anthropic.ToolUseBlock =>
          b.type === 'tool_use' && b.name === QUERY_TOOL_NAME,
      );

      this.log.log(`/iq/query round-trip: ${Date.now() - started}ms`);

      if (block == null) {
        return {
          ok: false,
          headline: 'N/A',
          sub: 'Baseball IQ is unavailable right now.',
          facts: [],
        };
      }

      const input_ = block.input as {
        headline?: string;
        unit?: string;
        sub?: string;
        facts?: { label: string; value: string }[];
      };

      return {
        ok: true,
        headline: input_.headline ?? 'N/A',
        unit: input_.unit,
        sub: input_.sub ?? 'No answer available.',
        facts: (input_.facts ?? []).slice(0, 3),
      };
    } catch (e: unknown) {
      this.log.warn(
        `Claude query call failed: ${e instanceof Error ? e.message : String(e)}`,
      );
      return {
        ok: false,
        headline: 'N/A',
        sub: 'Baseball IQ is unavailable right now.',
        facts: [],
      };
    }
  }
}
