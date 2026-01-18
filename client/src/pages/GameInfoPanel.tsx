// client/src/pages/GameInfoPanel.tsx
import type { ReactElement } from "react";
import type { GameDto } from "@bitslinger21/baseball-realtime-client";
import type { PlayUpdate } from "../realtime/types";

type Props = {
  selectedDate: string;
  games: readonly GameDto[];
  selectedGame: GameDto | null;
  isWatched: boolean;
  updates: readonly PlayUpdate[];
  isConnected: boolean;
  connectionError: string | null;
};
type Counts = { total: number; live: number; final: number; upcoming: number };

function getStatus(g: GameDto): string {
  const anyG: Record<string, unknown> = g as unknown as Record<string, unknown>;
  const status = typeof anyG.status === "string" ? anyG.status : null;
  return status ?? "—";
}

function computeCounts(games: readonly GameDto[]): Counts {
  let live = 0;
  let final = 0;
  let upcoming = 0;

  for (const g of games) {
    const status = getStatus(g);
    if (status === "live") live += 1;
    else if (status === "final") final += 1;
    else upcoming += 1;
  }

  return { total: games.length, live, final, upcoming };
}

function getScores(g: GameDto): { away: number | null; home: number | null } {
  const anyG: Record<string, unknown> = g as unknown as Record<string, unknown>;

  const away = typeof anyG.awayScore === "number" ? (anyG.awayScore as number) : null;
  const home = typeof anyG.homeScore === "number" ? (anyG.homeScore as number) : null;

  const ls = anyG.linescore as Record<string, unknown> | null;
  const awayLs = (ls?.away as Record<string, unknown> | null) ?? null;
  const homeLs = (ls?.home as Record<string, unknown> | null) ?? null;

  const away2 = away ?? (typeof awayLs?.runs === "number" ? (awayLs.runs as number) : null);
  const home2 = home ?? (typeof homeLs?.runs === "number" ? (homeLs.runs as number) : null);

  return { away: away2, home: home2 };
}

function formatStartTime(g: GameDto): string {
  const anyG: Record<string, unknown> = g as unknown as Record<string, unknown>;
  const startTimeUtc = typeof anyG.startTimeUtc === "string" ? anyG.startTimeUtc : null;
  if (startTimeUtc == null || startTimeUtc === "") return "—";

  const d = new Date(startTimeUtc);
  if (Number.isNaN(d.getTime())) return "—";

  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function latestUpdate(updates: readonly PlayUpdate[]): PlayUpdate | null {
  if (updates.length === 0) return null;
  return updates[updates.length - 1] ?? null;
}

function getSnapshot(u: PlayUpdate | null): {
  inningText: string;
  outsText: string;
  countText: string;
  basesText: string;
  lastText: string;
} {
  if (u == null) {
    return {
      inningText: "—",
      outsText: "—",
      countText: "—",
      basesText: "—",
      lastText: "—",
    };
  }

  const anyU: Record<string, unknown> = u as unknown as Record<string, unknown>;

  const inning =
    typeof anyU.inning === "number"
      ? (anyU.inning as number)
      : typeof anyU.currentInning === "number"
        ? (anyU.currentInning as number)
        : null;

  const halfRaw =
    typeof anyU.half === "string"
      ? (anyU.half as string)
      : typeof anyU.halfInning === "string"
        ? (anyU.halfInning as string)
        : null;

  const half =
    halfRaw == null
      ? null
      : halfRaw.toLowerCase().includes("top")
        ? "Top"
        : halfRaw.toLowerCase().includes("bot")
          ? "Bot"
          : null;

  const outs =
    typeof anyU.outs === "number"
      ? (anyU.outs as number)
      : typeof anyU.outsWhenUp === "number"
        ? (anyU.outsWhenUp as number)
        : null;

  const balls = typeof anyU.balls === "number" ? (anyU.balls as number) : null;
  const strikes = typeof anyU.strikes === "number" ? (anyU.strikes as number) : null;

  const on1 =
    typeof anyU.onFirst === "boolean"
      ? (anyU.onFirst as boolean)
      : typeof anyU.runnerOn1st === "boolean"
        ? (anyU.runnerOn1st as boolean)
        : false;

  const on2 =
    typeof anyU.onSecond === "boolean"
      ? (anyU.onSecond as boolean)
      : typeof anyU.runnerOn2nd === "boolean"
        ? (anyU.runnerOn2nd as boolean)
        : false;

  const on3 =
    typeof anyU.onThird === "boolean"
      ? (anyU.onThird as boolean)
      : typeof anyU.runnerOn3rd === "boolean"
        ? (anyU.runnerOn3rd as boolean)
        : false;

  const bases = [on1 ? "1" : null, on2 ? "2" : null, on3 ? "3" : null].filter(
    (v): v is string => v != null,
  );

  const desc =
    typeof anyU.text === "string"
      ? (anyU.text as string)
      : typeof anyU.description === "string"
        ? (anyU.description as string)
        : typeof anyU.result === "string"
          ? (anyU.result as string)
          : null;

  const inningText =
    inning == null ? "—" : `${half ?? ""} ${String(inning)}`.trim() || String(inning);

  const outsText = outs == null ? "—" : `${outs} out${outs === 1 ? "" : "s"}`;

  const countText = balls != null && strikes != null ? `${balls}-${strikes}` : "—";

  const basesText = bases.length > 0 ? `On ${bases.join(",")}` : "Bases empty";

  const lastText = desc ?? "—";

  return { inningText, outsText, countText, basesText, lastText };
}

export function GameInfoPanel(props: Props): ReactElement {
  const { selectedDate, games, selectedGame, isWatched, updates, isConnected, connectionError } = props;

  if (selectedGame == null) {
    const c = computeCounts(games);
    return (
      <div className="info-card">
        <div className="info-row">
          <span>Total</span>
          <strong>{c.total}</strong>
        </div>
        <div className="info-row">
          <span>Live</span>
          <strong>{c.live}</strong>
        </div>
        <div className="info-row">
          <span>Final</span>
          <strong>{c.final}</strong>
        </div>
        <div className="info-row">
          <span>Upcoming</span>
          <strong>{c.upcoming}</strong>
        </div>
      </div>
    );
  }

  const status = getStatus(selectedGame);
  const start = formatStartTime(selectedGame);
  const s = getScores(selectedGame);

  const u = latestUpdate(updates);
  const snap = getSnapshot(u);

  const showScore: boolean = status === "live" || status === "final";
  const showStart: boolean = !showScore; // show start time only for upcoming/other states

  return (
    <div className="info-card">
      {/* Header row: matchup left, connection + status right */}
      <div className="info-header">
        <div className="info-matchup">
          {selectedGame.awayAbbr} @ {selectedGame.homeAbbr}
        </div>

        <div className="info-header-right">
          <div className="info-status" aria-label="Game status">
            {status}
          </div>
        </div>
      </div>
      {showStart && (
        <div className="info-subtle">
          Start: {start}
        </div>
      )}

      {showScore && (
        <div className="info-row" style={{ marginTop: showStart ? "0.35rem" : "0.25rem" }}>
          <span className="info-status">{status}</span>
          <strong>
            {selectedGame.awayAbbr} {s.away ?? "—"} – {selectedGame.homeAbbr} {s.home ?? "—"}
          </strong>
        </div>
      )}

      {isWatched ? (
        <>
          <div className="info-section-title" style={{ marginTop: "0.6rem" }}>
            Live snapshot
          </div>

          <div className="info-grid">
            <div className="info-kv">
              <div className="info-k">Inning</div>
              <div className="info-v">{snap.inningText}</div>
            </div>
            <div className="info-kv">
              <div className="info-k">Outs</div>
              <div className="info-v">{snap.outsText}</div>
            </div>
            <div className="info-kv">
              <div className="info-k">Count</div>
              <div className="info-v">{snap.countText}</div>
            </div>
            <div className="info-kv">
              <div className="info-k">Bases</div>
              <div className="info-v">{snap.basesText}</div>
            </div>
          </div>

          <div className="info-section-title" style={{ marginTop: "0.6rem" }}>
            Last update
          </div>
          <div className="info-last">{snap.lastText}</div>
        </>
      ) : null}
    </div>
  );
}
