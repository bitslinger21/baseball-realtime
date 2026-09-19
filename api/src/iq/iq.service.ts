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
import { PollerService, type LiveUpdate } from '../poller/poller.service';
import { TeamsMetaService } from '../teams/teams-meta.service';
import { PlayersSearchService } from '../players/players-search.service';
import { GamesService } from '../games/games.service';
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

// One prior question + the answer's own headline/sub — enough for the model
// to resolve a follow-up's pronoun/reference against what was already
// asked/answered. Session-only on the client (cleared when the panel
// closes), so this never needs to be persisted server-side.
interface ConversationTurn {
  question: string;
  headline: string;
  sub: string;
}

const MODEL = 'claude-haiku-4-5-20251001';
// Answering (callQueryModel) needs reliable arithmetic/reasoning — Haiku
// repeatedly got "years since 2013" wrong (and inconsistent across retries)
// even after being given today's real date and told explicitly to compute
// and cross-check the number. Classification (resolveQuestionTarget) doesn't
// need that and stays on the cheaper/faster model.
const ANSWER_MODEL = 'claude-sonnet-5';
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

// Classifies a free-text question BEFORE answering it, so the answer is built
// from the right game's real data instead of forcing whatever game happens to
// be loaded in the client to fit an unrelated question — the bug that caused
// a Kyle-Tucker question to blend in a different game's real home run.
const RESOLVE_TOOL_NAME = 'emit_iq_target';
const RESOLVE_TOOL_SCHEMA = {
  type: 'object' as const,
  properties: {
    subject: {
      type: 'string',
      enum: ['current_game', 'other_team', 'general_knowledge'],
      description:
        "'current_game' if the question is about the game already being viewed, or is ambiguous/uses pronouns with no other team or player clearly named. " +
        "'other_team' if a SPECIFIC player or team is named that is not obviously part of the currently viewed game. " +
        "'general_knowledge' if the question is baseball trivia/history/records not tied to any specific team's current game.",
    },
    teamAbbr: {
      type: 'string',
      description:
        'Set whenever a specific real MLB team can be identified in the question, regardless of subject — its real MLB abbreviation.',
    },
    playerName: {
      type: 'string',
      description:
        'Set whenever a specific real MLB player is named in the question, regardless of subject — their full real name. ' +
        'Always extract this when a player is named, even for a general_knowledge or meta question about the player ' +
        '(e.g. "did X sign with Y", "why don\'t you know about X\'s trade") — their current real team needs to be looked up live.',
    },
  },
  required: ['subject'],
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
    private readonly poller: PollerService,
    private readonly teamsMeta: TeamsMetaService,
    private readonly playersSearch: PlayersSearchService,
    private readonly games: GamesService,
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

  /** Turns prior Q&A turns into real multi-turn message history so the model
   * can resolve a follow-up's pronoun/reference naturally (e.g. "wasn't HE
   * traded?" after "what team is X on") — rather than seeing each question
   * in isolation, which is what previously made "he" unresolvable. Capped to
   * the last few exchanges to keep the prompt small. */
  private buildConversationPrefix(
    conversationHistory: readonly ConversationTurn[] | undefined,
  ): Anthropic.MessageParam[] {
    if (conversationHistory == null || conversationHistory.length === 0) {
      return [];
    }
    return conversationHistory.slice(-3).flatMap((turn) => [
      { role: 'user' as const, content: turn.question },
      { role: 'assistant' as const, content: `${turn.headline}. ${turn.sub}` },
    ]);
  }

  /** Grounds any "how long ago"/"how many years" reasoning in the real current
   * date instead of the model's training cutoff or a guess, and forces
   * internal consistency — without this, answers were both wrong (bad
   * arithmetic) and inconsistent (a different number in headline vs. facts
   * within the same response). */
  private dateGroundingLine(): string {
    return (
      `Today's real-world date is ${new Date().toISOString().slice(0, 10)}. Use this — not your` +
      ` training cutoff or a guess — for any "how long ago"/"how many years"/age-since-date` +
      ` question. If the answer involves such a duration: first work out the exact arithmetic` +
      ` (currentYear − eventYear, as a full elapsed-years count — not a season-count-inclusive-` +
      ` of-both-endpoints framing, which is off by one from this) as a specific number, then use` +
      ` THAT EXACT SAME number everywhere it appears — headline, sub, and any fact. Never state a` +
      ` different number for the same quantity in different fields of your answer; double-check` +
      ` they all agree before responding.`
    );
  }

  /** Your training data has a fixed cutoff, but MLB rosters/transactions
   * (trades, signings, releases, retirements) change constantly after that —
   * some of what's true right now may not be in your training data at all.
   * Without this, the model confidently declared a real signing "inaccurate"
   * purely because it postdated the model's knowledge, rather than admitting
   * it couldn't verify it. */
  private recencyHumilityLine(): string {
    return (
      `Your training data has a fixed knowledge cutoff, and MLB rosters/transactions (trades,` +
      ` signings, releases, retirements) change after that cutoff — something can be real and` +
      ` true right now without being in your training data at all. If the question asserts a` +
      ` specific transaction and you have no live data given here that confirms or contradicts` +
      ` it, do NOT confidently declare it "hasn't happened," "inaccurate," or "unconfirmed" —` +
      ` say plainly that you can't verify it from your training data, that it may have happened` +
      ` after your knowledge cutoff, and suggest the person check a live source. Only contradict` +
      ` a specific claimed transaction outright when live data given here actually conflicts` +
      ` with it.`
    );
  }

  /** The one source of truth for "what team is this player actually on right
   * now" that isn't subject to the model's training cutoff — a live
   * current-season roster lookup. Returns null (never a guess) if the name
   * can't be matched. */
  private async lookupCurrentTeam(
    playerName: string,
  ): Promise<{ name: string; teamAbbr: string } | null> {
    const lastNameToken = playerName.trim().split(/\s+/).pop() ?? '';
    if (lastNameToken === '') return null;
    try {
      const matches = await this.playersSearch.search(
        lastNameToken,
        String(CURRENT_SEASON),
      );
      const match = matches.find(
        (m) => m.teamAbbr != null && m.teamAbbr !== '',
      );
      if (match == null) return null;
      return { name: match.name, teamAbbr: match.teamAbbr };
    } catch (e: unknown) {
      this.log.warn(
        `current-team lookup failed for "${playerName}": ${e instanceof Error ? e.message : String(e)}`,
      );
      return null;
    }
  }

  private buildGeneralKnowledgePrompt(
    question: string,
    note?: string,
    playerContext?: string,
  ): string {
    return [
      this.dateGroundingLine(),
      playerContext ?? '',
      `Answer this fan's question. ${note ?? 'No specific game is in progress at this moment,'}`,
      `so you have no play-by-play, score, or in-game facts to draw on for it — answer only`,
      `from general baseball knowledge/history.`,
      `Question: "${question}"`,
      `Format all numbers with units — the client does no formatting. headline is a very`,
      `short number/phrase (not a sentence), sub is 1-3 sentences of prose, facts is 0-3`,
      `supporting {label, value} pairs.`,
    ]
      .filter((s) => s !== '')
      .join('\n');
  }

  private async buildInProgressPrompt(
    question: string,
    sliced: readonly LiveUpdate[],
    latest: LiveUpdate,
    gameNote?: string,
    playerContext?: string,
  ): Promise<string> {
    let parkFactor: GeneratorContext['parkFactor'] = null;
    const hitData = this.extractHitData(latest);
    if (hitData?.launchSpeed != null && hitData?.launchAngle != null) {
      parkFactor = await this.parkFactor.evaluateAgainstAllParks({
        exitVeloMph: hitData.launchSpeed,
        launchAngleDeg: hitData.launchAngle,
      });
    }

    return [
      this.dateGroundingLine(),
      playerContext ?? '',
      `Answer this fan's question about a baseball game, as of a specific past moment (not "now").`,
      gameNote ?? '',
      `Question: "${question}"`,
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
  }

  /** Classifies what a free-text question is actually about before answering
   * it — the fix for silently forcing an unrelated question into whatever
   * game happens to be loaded. Defaults to 'current_game' on any failure,
   * which reproduces the old (safe, if limited) behavior. */
  private async resolveQuestionTarget(
    question: string,
    conversationHistory: readonly ConversationTurn[] | undefined,
  ): Promise<{
    subject: 'current_game' | 'other_team' | 'general_knowledge';
    teamAbbr?: string;
    playerName?: string;
  }> {
    if (this.client == null) return { subject: 'current_game' };
    try {
      const realAbbrs = Array.from(this.teamsMeta.getIndex().keys());
      const schema = {
        ...RESOLVE_TOOL_SCHEMA,
        properties: {
          ...RESOLVE_TOOL_SCHEMA.properties,
          teamAbbr: {
            ...RESOLVE_TOOL_SCHEMA.properties.teamAbbr,
            ...(realAbbrs.length > 0 ? { enum: realAbbrs } : {}),
          },
        },
      };
      const msg = await this.client.messages.create({
        model: MODEL,
        max_tokens: 128,
        tools: [
          {
            name: RESOLVE_TOOL_NAME,
            description: 'Classify what this baseball question is about.',
            input_schema: schema,
          },
        ],
        tool_choice: { type: 'tool', name: RESOLVE_TOOL_NAME },
        messages: [
          ...this.buildConversationPrefix(conversationHistory),
          { role: 'user', content: question },
        ],
      });
      const block = msg.content.find(
        (b): b is Anthropic.ToolUseBlock =>
          b.type === 'tool_use' && b.name === RESOLVE_TOOL_NAME,
      );
      if (block == null) return { subject: 'current_game' };
      const out = block.input as {
        subject?: string;
        teamAbbr?: string;
        playerName?: string;
      };
      if (out.subject === 'other_team' || out.subject === 'general_knowledge') {
        return {
          subject: out.subject,
          teamAbbr: out.teamAbbr,
          playerName: out.playerName,
        };
      }
      return { subject: 'current_game' };
    } catch (e: unknown) {
      this.log.warn(
        `question-target classification failed, defaulting to current_game: ${e instanceof Error ? e.message : String(e)}`,
      );
      return { subject: 'current_game' };
    }
  }

  /** Resolves a team/player mention to a real game on TODAY's schedule, or
   * null if that team/player isn't playing today (or couldn't be resolved
   * at all) — never fabricates a game to fit the question. */
  private async resolveOtherGame(
    teamAbbr: string | undefined,
    playerName: string | undefined,
  ): Promise<{ gameId: string; awayAbbr: string; homeAbbr: string } | null> {
    let abbr = teamAbbr;

    if (abbr == null && playerName != null && playerName.trim() !== '') {
      const lastNameToken = playerName.trim().split(/\s+/).pop() ?? '';
      try {
        const matches = await this.playersSearch.search(
          lastNameToken,
          String(CURRENT_SEASON),
        );
        abbr = matches[0]?.teamAbbr;
      } catch (e: unknown) {
        this.log.warn(
          `player search failed for "${playerName}": ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }

    if (abbr == null) return null;

    try {
      const todayYmd = new Date().toISOString().slice(0, 10);
      const games = await this.games.listByDate(todayYmd);
      const match = games.find(
        (g) => g.homeAbbr === abbr || g.awayAbbr === abbr,
      );
      if (match?.providerGameId == null) return null;
      return {
        gameId: match.providerGameId,
        awayAbbr: match.awayAbbr,
        homeAbbr: match.homeAbbr,
      };
    } catch (e: unknown) {
      this.log.warn(
        `today's schedule lookup failed: ${e instanceof Error ? e.message : String(e)}`,
      );
      return null;
    }
  }

  async answerQuery(input: {
    gameId: string;
    updateIndex: number;
    question: string;
    history: readonly LiveUpdate[];
    conversationHistory?: readonly ConversationTurn[];
  }): Promise<{
    ok: boolean;
    headline: string;
    unit?: string;
    sub: string;
    facts: { label: string; value: string }[];
  }> {
    const started = Date.now();

    if (this.client == null) {
      return {
        ok: false,
        headline: 'N/A',
        sub: 'Baseball IQ is unavailable right now.',
        facts: [],
      };
    }

    const target = await this.resolveQuestionTarget(
      input.question,
      input.conversationHistory,
    );

    // Whenever a real player is named, ground the answer in their ACTUAL
    // current team via a live roster lookup — not the model's training data,
    // which can't reflect a trade/signing that happened after its cutoff —
    // and add the recency-humility instruction. Both are scoped to ONLY
    // player-mentioning questions: including them on every general-knowledge
    // question (even pure trivia/arithmetic ones) measurably hurt date-math
    // reliability, apparently by diluting the arithmetic instruction.
    // (Observed bug this fixes: the model confidently declared a real
    // signing "hasn't happened" purely because it predated its cutoff.)
    let playerContext: string | undefined;
    if (target.playerName != null && target.playerName.trim() !== '') {
      const current = await this.lookupCurrentTeam(target.playerName);
      const rosterFact =
        current != null
          ? `Verified live roster fact (looked up right now, not from training data): ${current.name}'s current MLB team is ${current.teamAbbr}.`
          : '';
      playerContext = [this.recencyHumilityLine(), rosterFact]
        .filter((s) => s !== '')
        .join('\n');
    }

    if (target.subject === 'general_knowledge') {
      return this.callQueryModel(
        this.buildGeneralKnowledgePrompt(
          input.question,
          'This question is general baseball knowledge/history, not about a specific live game,',
          playerContext,
        ),
        started,
        input.conversationHistory,
      );
    }

    let sliced = input.history.slice(0, input.updateIndex + 1);
    let gameNote: string | undefined;

    if (target.subject === 'other_team') {
      const resolved = await this.resolveOtherGame(
        target.teamAbbr,
        target.playerName,
      );
      if (resolved == null) {
        const who = target.playerName ?? target.teamAbbr ?? 'that team';
        return this.callQueryModel(
          this.buildGeneralKnowledgePrompt(
            input.question,
            `${who} is not playing in a game today, so`,
            playerContext,
          ),
          started,
          input.conversationHistory,
        );
      }
      if (resolved.gameId !== input.gameId) {
        // A genuinely different game — fetch ITS real history rather than
        // forcing the question into whatever game the client had loaded.
        sliced = await this.poller.fetchHistory(resolved.gameId);
        gameNote = `This question is about a different game than the one currently displayed: ${resolved.awayAbbr} @ ${resolved.homeAbbr}, as it stands right now.`;
      }
      // else: resolved back to the same game already loaded — fall through
      // to the existing current_game handling below with no note needed.
    }

    const latest = sliced[sliced.length - 1];

    // No play has happened yet at this moment (Scout paused at marker 0,
    // pregame, updateIndex -1, or the resolved other game hasn't started).
    // This is a supported state, not a failure — answer from general
    // knowledge only; don't invent game-specific facts that don't exist yet.
    if (latest == null) {
      return this.callQueryModel(
        this.buildGeneralKnowledgePrompt(
          input.question,
          gameNote != null
            ? `${gameNote} That game hasn't started yet, so`
            : undefined,
          playerContext,
        ),
        started,
        input.conversationHistory,
      );
    }

    const prompt = await this.buildInProgressPrompt(
      input.question,
      sliced,
      latest,
      gameNote,
      playerContext,
    );
    return this.callQueryModel(prompt, started, input.conversationHistory);
  }

  private async callQueryModel(
    prompt: string,
    started: number,
    conversationHistory: readonly ConversationTurn[] | undefined,
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
        model: ANSWER_MODEL,
        max_tokens: 512,
        tools: [
          {
            name: QUERY_TOOL_NAME,
            description: 'Emit the structured answer to the fan question.',
            input_schema: QUERY_TOOL_SCHEMA,
          },
        ],
        tool_choice: { type: 'tool', name: QUERY_TOOL_NAME },
        messages: [
          ...this.buildConversationPrefix(conversationHistory),
          { role: 'user', content: prompt },
        ],
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
        facts?: unknown[];
      };

      // Tool-choice narrows the schema but doesn't guarantee it — observed the
      // model occasionally emit `facts` as something other than an array of
      // {label,value} objects entirely (once even a non-array value, which
      // threw here). Drop anything malformed rather than pass it to the
      // client, which keys/renders by `label`/`value` unconditionally.
      const facts = (Array.isArray(input_.facts) ? input_.facts : [])
        .filter(
          (f): f is { label: string; value: string } =>
            typeof f === 'object' &&
            f != null &&
            typeof (f as { label?: unknown }).label === 'string' &&
            typeof (f as { value?: unknown }).value === 'string',
        )
        .slice(0, 3);

      return {
        ok: true,
        headline: input_.headline ?? 'N/A',
        unit: input_.unit,
        sub: input_.sub ?? 'No answer available.',
        facts,
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
