import type { PlayUpdate } from "./types";
import {
  getBatterAnchorId,
  getInningAnchorId,
  getPlayAnchorId,
  getPlayRenderKey,
} from "./playIds";

export type FeedHalf = "top" | "bottom";

export type PitchFeedEventRow = {
  key: string;
  sourceIndex: number;
  update: PlayUpdate;
  playRenderKey: string;
  playAnchorId: string;
  description: string;
  countLabel: string;
  isScoringEvent: boolean;
  awayScore: number;
  homeScore: number;
  awayScoreDelta: number;
  homeScoreDelta: number;
};

export type PitchFeedAtBatGroup = {
  key: string;
  inning: number;
  half: FeedHalf;
  inningLabel: string;
  batterName: string;
  pitcherName: string;
  batterAnchorId: string;
  sourceStartIndex: number;
  sourceEndIndex: number;
  events: PitchFeedEventRow[];
  result: PitchFeedEventRow | null;
  runsScored: number;
  isCurrent: boolean;
};

export type PitchFeedInningGroup = {
  key: string;
  inning: number;
  half: FeedHalf;
  label: string;
  inningAnchorId: string;
  sourceStartIndex: number;
  atBats: PitchFeedAtBatGroup[];
};

export type PitchFeedModel = {
  innings: PitchFeedInningGroup[];
  atBats: PitchFeedAtBatGroup[];
};

function normalizeHalf(value: unknown): FeedHalf {
  const v = String(value ?? "").toLowerCase();
  return v === "top" ? "top" : "bottom";
}

function inningLabel(inning: number, half: FeedHalf): string {
  return `${half === "top" ? "Top" : "Bottom"} ${inning}`;
}

function safeName(value: unknown, fallback: string): string {
  const v = typeof value === "string" ? value.trim() : "";
  return v !== "" ? v : fallback;
}

function countLabel(update: PlayUpdate): string {
  return `${update.balls}-${update.strikes}`;
}

function scoreOf(update: PlayUpdate): { away: number; home: number } {
  return {
    away: typeof update.awayScore === "number" ? update.awayScore : 0,
    home: typeof update.homeScore === "number" ? update.homeScore : 0,
  };
}

function isScoringEvent(update: PlayUpdate, previous: PlayUpdate | null): boolean {
  const curr = scoreOf(update);
  const prev = previous ? scoreOf(previous) : curr;

  if (curr.away > prev.away || curr.home > prev.home) {
    return true;
  }

  const description = String(update.description ?? "").toLowerCase();
  return (
    description.includes("scores") ||
    description.includes("homers") ||
    description.includes("home run") ||
    description.includes("run(s)")
  );
}

export function buildPitchFeedModel(updates: readonly PlayUpdate[]): PitchFeedModel {
  if (updates.length === 0) {
    return { innings: [], atBats: [] };
  }

  const innings: PitchFeedInningGroup[] = [];
  const atBats: PitchFeedAtBatGroup[] = [];

  let currentInning: PitchFeedInningGroup | null = null;
  let currentAtBat: PitchFeedAtBatGroup | null = null;

  for (let index = 0; index < updates.length; index += 1) {
    const update = updates[index];
    const previous = index > 0 ? updates[index - 1] : null;

    const half = normalizeHalf(update.half);
    const inning = typeof update.inning === "number" ? update.inning : 0;
    const batterName = safeName(update.batterName, "Unknown Batter");
    const pitcherName = safeName(update.pitcherName, "Unknown Pitcher");

    const playRenderKey = getPlayRenderKey(update, index);

    const row: PitchFeedEventRow = {
      key: playRenderKey,
      sourceIndex: index,
      update,
      playRenderKey,
      playAnchorId: getPlayAnchorId(update, index),
      description: safeName(update.description, "—"),
      countLabel: countLabel(update),
      isScoringEvent: isScoringEvent(update, previous),
      awayScore: scoreOf(update).away,
      homeScore: scoreOf(update).home,
      awayScoreDelta: previous ? Math.max(0, scoreOf(update).away - scoreOf(previous).away) : 0,
      homeScoreDelta: previous ? Math.max(0, scoreOf(update).home - scoreOf(previous).home) : 0,
    };

    const startsNewInning =
      currentInning == null ||
      currentInning.inning !== inning ||
      currentInning.half !== half;

    if (startsNewInning) {
      const nextInning: PitchFeedInningGroup = {
        key: `inning:${playRenderKey}`,
        inning,
        half,
        label: inningLabel(inning, half),
        inningAnchorId: getInningAnchorId(update, index),
        sourceStartIndex: index,
        atBats: [],
      };

      currentInning = nextInning;
      innings.push(nextInning);
      currentAtBat = null;
    }

    const inningGroup = currentInning;
    if (inningGroup == null) {
      continue;
    }

    const startsNewAtBat =
      currentAtBat == null ||
      currentAtBat.inning !== inning ||
      currentAtBat.half !== half ||
      currentAtBat.batterName !== batterName;

    if (startsNewAtBat) {
      const nextAtBat: PitchFeedAtBatGroup = {
        key: `ab:${playRenderKey}`,
        inning,
        half,
        inningLabel: inningLabel(inning, half),
        batterName,
        pitcherName,
        batterAnchorId: getBatterAnchorId(update, index),
        sourceStartIndex: index,
        sourceEndIndex: index,
        events: [],
        result: null,
        runsScored: 0,
        isCurrent: false,
      };

      currentAtBat = nextAtBat;
      inningGroup.atBats.push(nextAtBat);
      atBats.push(nextAtBat);
    }

    const atBatGroup = currentAtBat;
    if (atBatGroup == null) {
      continue;
    }

    const signature = eventSignature(update);

    if (shouldAppendRow(atBatGroup.events, signature)) {
      atBatGroup.events.push(row);
      atBatGroup.sourceEndIndex = index;

      const runsScoredOnRow = row.awayScoreDelta + row.homeScoreDelta;
      if (runsScoredOnRow > 0) {
        atBatGroup.runsScored += runsScoredOnRow;
      }
    }
    atBatGroup.pitcherName = pitcherName;
  }

  for (const atBat of atBats) {
    atBat.result = chooseAtBatResult(atBat.events);
  }

  if (atBats.length > 0) {
    atBats[atBats.length - 1].isCurrent = true;
  }

  return {
    innings,
    atBats,
  };
}

function eventSignature(update: PlayUpdate): string {
  return [
    update.inning ?? "",
    update.half ?? "",
    update.batterName ?? "",
    update.pitcherName ?? "",
    update.description ?? "",
    update.balls ?? "",
    update.strikes ?? "",
    update.outs ?? "",
    update.awayScore ?? "",
    update.homeScore ?? "",
  ].join("|");
}

function shouldAppendRow(
  events: readonly PitchFeedEventRow[],
  nextSignature: string,
): boolean {
  const last = events.length > 0 ? events[events.length - 1] : null;
  if (last == null) return true;

  const lastSignature = eventSignature(last.update);
  if (lastSignature !== nextSignature) return true;

  return false;
}

function descriptionText(row: PitchFeedEventRow): string {
  return row.description.trim().toLowerCase();
}

function isClearlyTerminalDescription(text: string): boolean {
  return (
    text.includes("walk") ||
    text.includes("strikeout") ||
    text.includes("struck out") ||
    text.includes("single") ||
    text.includes("double") ||
    text.includes("triple") ||
    text.includes("home run") ||
    text.includes("homers") ||
    text.includes("grounds out") ||
    text.includes("grounded out") ||
    text.includes("flies out") ||
    text.includes("fly out") ||
    text.includes("lined out") ||
    text.includes("line out") ||
    text.includes("pops out") ||
    text.includes("pop out") ||
    text.includes("reaches on") ||
    text.includes("hit by pitch") ||
    text.includes("in play, out") ||
    text.includes("in play, run") ||
    text.includes("in play, no out") ||
    text.includes("sac fly") ||
    text.includes("sac bunt") ||
    text.includes("fielder's choice") ||
    text.includes("double play") ||
    text.includes("triple play")
  );
}

function chooseAtBatResult(events: readonly PitchFeedEventRow[]): PitchFeedEventRow | null {
  if (events.length === 0) return null;

  for (let i = events.length - 1; i >= 0; i -= 1) {
    const row = events[i];
    if (isClearlyTerminalDescription(descriptionText(row))) {
      return row;
    }
  }

  return inferImplicitTerminalResult(events);
}

function inferImplicitTerminalResult(events: readonly PitchFeedEventRow[]): PitchFeedEventRow | null {
  if (events.length === 0) return null;

  const last = events[events.length - 1];
  const text = last.description.trim().toLowerCase();

  if (text === "ball" && typeof last.update.balls === "number" && last.update.balls >= 4) {
    return {
      ...last,
      description: "Walk",
    };
  }

  if (
    (text === "called strike" || text === "swinging strike" || text === "foul tip") &&
    typeof last.update.strikes === "number" &&
    last.update.strikes >= 3
  ) {
    return {
      ...last,
      description: "Strikeout",
    };
  }

  return last;
}
