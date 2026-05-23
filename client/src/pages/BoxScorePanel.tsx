// client/src/pages/BoxScorePanel.tsx
import { Fragment, type ReactElement } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  BoxScoreDto,
  BatterLineDto,
  PitcherLineDto,
  GameViewDto,
} from "@bitslinger21/baseball-realtime-client";
import { Link } from "react-router-dom";

import type { PlayUpdate } from "../realtime/types";

type Props = {
  box: BoxScoreDto;
  game?: GameViewDto | null;
  live?: PlayUpdate | null;
};

type TeamMetaLike = { logoUrl?: string | null };

type SideKey = "away" | "home";
type ModeKey = "batting" | "pitching";

type BatterLineLike = BatterLineDto & {
  mlbId?: string | number;
  playerId?: string | number;
  jerseyNumber?: string | number | null;
  battingOrder?: string | null;
  position?: string | null;
  positionAbbr?: string | null;
};

type LineupSlot = {
  starter: BatterLineDto;
  replacements: BatterLineDto[];
  starterWasReplaced: boolean;
};

type BenchEntry = {
  row: BatterLineDto;
  replaced: boolean;
};

type BattingLayout = {
  starters: LineupSlot[];
  bench: BenchEntry[];
};

function batterStatSignature(row: BatterLineDto): string {
  return [row.ab, row.r, row.h, row.rbi, row.bb, row.so, row.hr].join("|");
}

function pitcherStatSignature(row: PitcherLineDto): string {
  return [
    row.ip,
    row.h,
    row.r,
    row.er,
    row.bb,
    row.so,
    asText(row.pitches, ""),
    asText(row.strikes, ""),
  ].join("|");
}

function useTransientHighlights(
  values: ReadonlyMap<string, string>,
  durationMs = 1700,
): ReadonlySet<string> {
  const previousRef = useRef<Map<string, string> | null>(null);
  const timersRef = useRef<Map<string, number>>(new Map());
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());

  useEffect((): (() => void) | void => {
    if (previousRef.current == null) {
      previousRef.current = new Map(values);
      return;
    }

    const changedKeys: string[] = [];
    const previous = previousRef.current;

    for (const [key, value] of values.entries()) {
      const prior = previous.get(key);
      if (prior != null && prior !== value) {
        changedKeys.push(key);
      }
    }

    previousRef.current = new Map(values);

    if (changedKeys.length === 0) {
      return;
    }

    setActiveKeys((current) => {
      const next = new Set(current);
      for (const key of changedKeys) {
        next.add(key);
      }
      return next;
    });

    for (const key of changedKeys) {
      const existingTimer = timersRef.current.get(key);
      if (existingTimer != null) {
        window.clearTimeout(existingTimer);
      }

      const timerId = window.setTimeout((): void => {
        setActiveKeys((current) => {
          if (!current.has(key)) {
            return current;
          }

          const next = new Set(current);
          next.delete(key);
          return next;
        });

        timersRef.current.delete(key);
      }, durationMs);

      timersRef.current.set(key, timerId);
    }
  }, [values, durationMs]);

  useEffect((): (() => void) => {
    return (): void => {
      for (const timerId of timersRef.current.values()) {
        window.clearTimeout(timerId);
      }
      timersRef.current.clear();
    };
  }, []);

  return activeKeys;
}

function sortBattingOrder(a: BatterLineDto, b: BatterLineDto): number {
  const ao = normalizeBattingOrder(a);
  const bo = normalizeBattingOrder(b);

  if (ao !== bo) return ao - bo;

  const an = a.name ?? "";
  const bn = b.name ?? "";
  return an.localeCompare(bn);
}

function asText(v: unknown, fallback = ""): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  return fallback;
}

function getLogoUrl(meta: unknown): string | null {
  const anyMeta = meta as TeamMetaLike | null | undefined;
  const url = anyMeta?.logoUrl;
  return typeof url === "string" && url !== "" ? url : null;
}

function safeText(v: unknown, fallback: string): string {
  const s = typeof v === "string" ? v.trim() : "";
  return s !== "" ? s : fallback;
}

function cityFromTeamName(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? parts.slice(0, -1).join(" ") : name;
}

function pickAbbr(gameAbbr: unknown, boxAbbr: unknown, fallback: string): string {
  const a = typeof gameAbbr === "string" ? gameAbbr.trim() : "";
  if (a !== "" && a !== "AWY" && a !== "HOM") return a;

  const b = typeof boxAbbr === "string" ? boxAbbr.trim() : "";
  if (b !== "" && b !== "AWY" && b !== "HOM") return b;

  return fallback;
}

function getMlbId(row: { mlbId?: string | number; playerId?: string | number }): string | null {
  const raw = row.mlbId ?? row.playerId;
  if (raw == null) return null;
  return String(raw);
}

function getPlayerKey(row: {
  mlbId?: string | number;
  playerId?: string | number;
  name?: string;
}): string {
  const id = getMlbId(row);
  if (id != null && id.trim() !== "") return id.trim();

  const playerId = row.playerId == null ? "" : String(row.playerId).trim();
  if (playerId !== "") return playerId;

  const name = typeof row.name === "string" ? row.name.trim() : "";
  if (name !== "") return `name:${name}`;

  return "unknown-player";
}

function normalizeBattingOrder(row: { battingOrder?: string | null }): number {
  const raw = typeof row.battingOrder === "string" ? row.battingOrder.trim() : "";
  if (raw === "") return Number.MAX_SAFE_INTEGER;

  const parsed = Number.parseInt(raw, 10);
  if (Number.isFinite(parsed)) return parsed;

  return Number.MAX_SAFE_INTEGER;
}

function displayBattingOrder(row: { battingOrder?: string | null }): string {
  const normalized = normalizeBattingOrder(row);
  if (normalized === Number.MAX_SAFE_INTEGER) return "";

  return String(Math.floor(normalized / 100));
}

function battingOrderSlot(row: { battingOrder?: string | null }): number {
  const normalized = normalizeBattingOrder(row);
  if (normalized === Number.MAX_SAFE_INTEGER) return Number.MAX_SAFE_INTEGER;

  return Math.floor(normalized / 100) * 100;
}

function getPosition(row: BatterLineDto): string {
  const anyRow = row as BatterLineLike;
  const fromPosition = typeof anyRow.position === "string" ? anyRow.position.trim() : "";
  if (fromPosition !== "") return fromPosition;

  const fromAbbr = typeof anyRow.positionAbbr === "string" ? anyRow.positionAbbr.trim() : "";
  if (fromAbbr !== "") return fromAbbr;

  return "";
}

function dedupeBenchEntries(entries: readonly BenchEntry[]): BenchEntry[] {
  const seen = new Set<string>();
  const result: BenchEntry[] = [];

  for (const entry of entries) {
    const key = getPlayerKey(entry.row);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(entry);
  }

  return result;
}

function buildBattingLayout(rows: readonly BatterLineDto[]): BattingLayout {
  const sortedRows = [...rows].sort(sortBattingOrder);

  const slotGroups = new Map<number, BatterLineDto[]>();

  for (const row of sortedRows) {
    const slot = battingOrderSlot(row);
    if (slot === Number.MAX_SAFE_INTEGER) continue;

    const bucket = slotGroups.get(slot) ?? [];
    bucket.push(row);
    slotGroups.set(slot, bucket);
  }

  const starters: LineupSlot[] = [];
  const slottedIds = new Set<string>();

  const orderedSlots = [...slotGroups.keys()].sort((a, b) => a - b);

  for (const slot of orderedSlots) {
    const group = [...(slotGroups.get(slot) ?? [])].sort(sortBattingOrder);
    if (group.length === 0) continue;

    const starter = group.find((row) => normalizeBattingOrder(row) === slot) ?? group[0];
    const starterKey = getPlayerKey(starter);

    const replacements = group.filter((row) => getPlayerKey(row) !== starterKey);

    slottedIds.add(starterKey);
    for (const replacement of replacements) {
      slottedIds.add(getPlayerKey(replacement));
    }

    starters.push({
      starter,
      replacements,
      starterWasReplaced: replacements.length > 0,
    });
  }

  const bench = dedupeBenchEntries([
    ...sortedRows
      .filter((row) => battingOrderSlot(row) === Number.MAX_SAFE_INTEGER)
      .filter((row) => !slottedIds.has(getPlayerKey(row)))
      .map((row) => ({
        row,
        replaced: false,
      })),
    ...starters
      .filter((slot) => slot.starterWasReplaced)
      .map((slot) => ({
        row: slot.starter,
        replaced: true,
      })),
  ]).sort((a, b) => a.row.name.localeCompare(b.row.name));

  return {
    starters,
    bench,
  };
}

function TeamChip({
  label,
  logoUrl,
  size = 18,
}: {
  label: string;
  logoUrl: string | null;
  size?: number;
}): ReactElement {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.35rem",
        minWidth: 0,
      }}
    >
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={`${label} logo`}
          width={size}
          height={size}
          style={{ objectFit: "contain", display: "block" }}
          loading="lazy"
        />
      ) : (
        <span style={{ width: size, height: size, display: "inline-block" }} />
      )}
      <span style={{ fontWeight: 700, letterSpacing: "0.04em" }}>{label}</span>
    </span>
  );
}

function PlayerNameLink({
  mlbId,
  name,
}: {
  mlbId: string | null;
  name: string;
}): ReactElement {
  if (mlbId == null) return <>{name}</>;

  const id = mlbId.trim();
  if (id === "") return <>{name}</>;

  return (
    <Link className="linkish" to={`/player/${encodeURIComponent(id)}`} title="View player stats">
      {name}
    </Link>
  );
}

function BatterIdentity({
  row,
  benchLabel,
  isReplacement = false,
}: {
  row: BatterLineDto;
  benchLabel?: string;
  isReplacement?: boolean;
}): ReactElement {
  const position = getPosition(row);
  const jersey = asText((row as BatterLineLike).jerseyNumber, "");
  const mlbId = getMlbId(row);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: "0.45rem",
        minWidth: 0,
        flexWrap: "wrap",
      }}
    >
      {isReplacement && (
        <span style={{ color: "var(--text-muted, #9ca3af)", marginRight: "0.1rem" }}>↳</span>
      )}

      <span className="bs-name" style={{ fontWeight: 600 }}>
        <PlayerNameLink mlbId={mlbId} name={row.name} />
      </span>

      {position !== "" && (
        <span style={{ color: "var(--text-muted, #9ca3af)", fontSize: "0.9em" }}>{position}</span>
      )}

      {benchLabel != null && benchLabel !== "" && (
        <span style={{ color: "var(--text-muted, #9ca3af)", fontSize: "0.9em" }}>{benchLabel}</span>
      )}
    </div>
  );
}

export function BoxScorePanel({ box, game, live }: Props): ReactElement {
  const [side, setSide] = useState<SideKey>("away");
  const [mode, setMode] = useState<ModeKey>("batting");
  const awayLogoUrl = getLogoUrl((game as any)?.awayTeamMeta);
  const homeLogoUrl = getLogoUrl((game as any)?.homeTeamMeta);

  const awayAbbr = pickAbbr(game?.awayAbbr, box.away?.teamAbbr, "AWY");
  const homeAbbr = pickAbbr(game?.homeAbbr, box.home?.teamAbbr, "HOM");

  const awayName = safeText((game as any)?.awayName, awayAbbr);
  const homeName = safeText((game as any)?.homeName, homeAbbr);

  const awayCity = cityFromTeamName(awayName);
  const homeCity = cityFromTeamName(homeName);

  const selectedLogo = side === "away" ? awayLogoUrl : homeLogoUrl;

  const hasLive = live != null;

  const awayR = hasLive ? (live.awayScore ?? live.linescore?.away.runs ?? 0) : 0;
  const homeR = hasLive ? (live.homeScore ?? live.linescore?.home.runs ?? 0) : 0;

  const awayH = hasLive ? (live.linescore?.away.hits ?? 0) : 0;
  const awayE = hasLive ? (live.linescore?.away.errors ?? 0) : 0;
  const homeH = hasLive ? (live.linescore?.home.hits ?? 0) : 0;
  const homeE = hasLive ? (live.linescore?.home.errors ?? 0) : 0;

  const battingRows: readonly BatterLineDto[] = useMemo(() => {
    const rows = side === "away" ? box.away.batting : box.home.batting;
    return [...rows].sort(sortBattingOrder);
  }, [box, side]);

  const battingLayout = useMemo(() => buildBattingLayout(battingRows), [battingRows]);

  const pitchingRows: readonly PitcherLineDto[] = useMemo(() => {
    const rows = side === "away" ? box.away.pitching : box.home.pitching;
    return [...rows];
  }, [box, side]);

  const battingHighlightValues = useMemo((): ReadonlyMap<string, string> => {
    return new Map(battingRows.map((row) => [getPlayerKey(row), batterStatSignature(row)]));
  }, [battingRows]);

  const pitchingHighlightValues = useMemo((): ReadonlyMap<string, string> => {
    return new Map(pitchingRows.map((row) => [getPlayerKey(row), pitcherStatSignature(row)]));
  }, [pitchingRows]);

  const highlightedBatters = useTransientHighlights(battingHighlightValues);
  const highlightedPitchers = useTransientHighlights(pitchingHighlightValues);

  return (
    <div
      className="bs-root"
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      }}
    >
      <div className="bs-header" style={{ borderBottom: "none" }}>
        <div className="bs-title-row">
          <h3 className="bs-title">Box score</h3>
        </div>

        <table className="bs-table" style={{ marginBottom: "0.25rem" }}>
          <thead>
            <tr>
              <th className="bs-th bs-left"></th>
              <th className="bs-th bs-right">R</th>
              <th className="bs-th bs-right">H</th>
              <th className="bs-th bs-right">E</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="bs-td bs-left">
                <TeamChip label={awayName} logoUrl={awayLogoUrl} />
              </td>
              <td className="bs-td bs-right">{awayR}</td>
              <td className="bs-td bs-right">{awayH}</td>
              <td className="bs-td bs-right">{awayE}</td>
            </tr>
            <tr>
              <td className="bs-td bs-left">
                <TeamChip label={homeName} logoUrl={homeLogoUrl} />
              </td>
              <td className="bs-td bs-right">{homeR}</td>
              <td className="bs-td bs-right">{homeH}</td>
              <td className="bs-td bs-right">{homeE}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        className="bs-body"
        style={{
          overflowY: "auto",
          minHeight: 0,
        }}
      >
        <div
          className="bs-controls"
          style={{ marginTop: 0, paddingTop: "0.25rem", paddingBottom: "0.9rem" }}
        >
          <div className="bs-seg" role="group" aria-label="Team">
            <button
              type="button"
              className={`bs-seg-btn ${side === "away" ? "is-active" : ""}`}
              onClick={(): void => setSide("away")}
            >
              {awayAbbr}
            </button>
            <button
              type="button"
              className={`bs-seg-btn ${side === "home" ? "is-active" : ""}`}
              onClick={(): void => setSide("home")}
            >
              {homeAbbr}
            </button>
          </div>

          <div className="bs-seg" role="group" aria-label="Mode">
            <button
              type="button"
              className={`bs-seg-btn ${mode === "batting" ? "is-active" : ""}`}
              onClick={(): void => setMode("batting")}
            >
              Batting
            </button>
            <button
              type="button"
              className={`bs-seg-btn ${mode === "pitching" ? "is-active" : ""}`}
              onClick={(): void => setMode("pitching")}
            >
              Pitching
            </button>
          </div>

        </div>

        <h4 className="bs-section-title">
          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
            <TeamChip label={side === "away" ? awayCity : homeCity} logoUrl={selectedLogo} />
            <span>{mode === "batting" ? "Batting" : "Pitching"}</span>
          </span>
        </h4>

        {mode === "batting" ? (
          <BattingTable layout={battingLayout} highlightedPlayerKeys={highlightedBatters} />
        ) : (
          <PitchingTable rows={pitchingRows} highlightedPlayerKeys={highlightedPitchers} />
        )}
      </div>

    </div>
  );
}

function BattingTable({
  layout,
  highlightedPlayerKeys,
}: {
  layout: BattingLayout;
  highlightedPlayerKeys: ReadonlySet<string>;
}): ReactElement {
  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <div>
        <div
          style={{
            fontWeight: 700,
            fontSize: "0.92rem",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            marginBottom: "0.45rem",
            color: "var(--text-muted, #9ca3af)",
          }}
        >
          Starters
        </div>

        <table className="bs-table">
          <thead>
            <tr>
              <th className="bs-th bs-left">Order</th>
              <th className="bs-th bs-left">#</th>
              <th className="bs-th bs-left">Batter</th>
              <th className="bs-th bs-right">AB</th>
              <th className="bs-th bs-right">R</th>
              <th className="bs-th bs-right">H</th>
              <th className="bs-th bs-right">RBI</th>
              <th className="bs-th bs-right">BB</th>
              <th className="bs-th bs-right">SO</th>
              <th className="bs-th bs-right">HR</th>
            </tr>
          </thead>
          <tbody>
            {layout.starters.map((slot) => {
              const starterOrder = displayBattingOrder(slot.starter);
              const starterKey = getPlayerKey(slot.starter);
              const starterHighlighted = highlightedPlayerKeys.has(starterKey);

              return (
                <Fragment key={`slot:${starterKey}`}>
                  <tr className={starterHighlighted ? "bs-row-flash" : ""}>
                    <td className="bs-td bs-left">{starterOrder}</td>
                    <td className="bs-td bs-left">
                      {asText((slot.starter as BatterLineLike).jerseyNumber, "")}
                    </td>
                    <td className="bs-td bs-left bs-name">
                      <BatterIdentity row={slot.starter} />
                    </td>
                    <td className="bs-td bs-right">{slot.starter.ab}</td>
                    <td className="bs-td bs-right">{slot.starter.r}</td>
                    <td className="bs-td bs-right">{slot.starter.h}</td>
                    <td className="bs-td bs-right">{slot.starter.rbi}</td>
                    <td className="bs-td bs-right">{slot.starter.bb}</td>
                    <td className="bs-td bs-right">{slot.starter.so}</td>
                    <td className="bs-td bs-right">{slot.starter.hr}</td>
                  </tr>

                  {slot.replacements.map((replacement) => {
                    const replacementKey = getPlayerKey(replacement);
                    const replacementHighlighted = highlightedPlayerKeys.has(replacementKey);

                    return (
                      <tr
                        key={`replacement:${starterKey}:${replacementKey}`}
                        className={replacementHighlighted ? "bs-row-flash" : ""}
                      >
                        <td className="bs-td bs-left"></td>
                        <td className="bs-td bs-left">
                          {asText((replacement as BatterLineLike).jerseyNumber, "")}
                        </td>
                        <td className="bs-td bs-left bs-name">
                          <BatterIdentity row={replacement} isReplacement />
                        </td>
                        <td className="bs-td bs-right">{replacement.ab}</td>
                        <td className="bs-td bs-right">{replacement.r}</td>
                        <td className="bs-td bs-right">{replacement.h}</td>
                        <td className="bs-td bs-right">{replacement.rbi}</td>
                        <td className="bs-td bs-right">{replacement.bb}</td>
                        <td className="bs-td bs-right">{replacement.so}</td>
                        <td className="bs-td bs-right">{replacement.hr}</td>
                      </tr>
                    );
                  })}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <div>
        <div
          style={{
            fontWeight: 700,
            fontSize: "0.92rem",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            marginBottom: "0.45rem",
            color: "var(--text-muted, #9ca3af)",
          }}
        >
          Bench
        </div>

        <table className="bs-table">
          <thead>
            <tr>
              <th className="bs-th bs-left">#</th>
              <th className="bs-th bs-left">Batter</th>
              <th className="bs-th bs-right">AB</th>
              <th className="bs-th bs-right">R</th>
              <th className="bs-th bs-right">H</th>
              <th className="bs-th bs-right">RBI</th>
              <th className="bs-th bs-right">BB</th>
              <th className="bs-th bs-right">SO</th>
              <th className="bs-th bs-right">HR</th>
            </tr>
          </thead>
          <tbody>
            {layout.bench.length === 0 ? (
              <tr>
                <td className="bs-td bs-left" colSpan={9}>
                  No bench players
                </td>
              </tr>
            ) : (
              layout.bench.map((entry) => {
                const key = getPlayerKey(entry.row);
                const highlighted = highlightedPlayerKeys.has(key);

                return (
                  <tr key={`bench:${key}`} className={highlighted ? "bs-row-flash" : ""}>
                    <td className="bs-td bs-left">
                      {asText((entry.row as BatterLineLike).jerseyNumber, "")}
                    </td>
                    <td className="bs-td bs-left bs-name">
                      <BatterIdentity
                        row={entry.row}
                        benchLabel={entry.replaced ? "(replaced)" : undefined}
                      />
                    </td>
                    <td className="bs-td bs-right">{entry.row.ab}</td>
                    <td className="bs-td bs-right">{entry.row.r}</td>
                    <td className="bs-td bs-right">{entry.row.h}</td>
                    <td className="bs-td bs-right">{entry.row.rbi}</td>
                    <td className="bs-td bs-right">{entry.row.bb}</td>
                    <td className="bs-td bs-right">{entry.row.so}</td>
                    <td className="bs-td bs-right">{entry.row.hr}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PitchingTable({
  rows,
  highlightedPlayerKeys,
}: {
  rows: readonly PitcherLineDto[];
  highlightedPlayerKeys: ReadonlySet<string>;
}): ReactElement {
  return (
    <table className="bs-table">
      <thead>
        <tr>
          <th className="bs-th bs-left">#</th>
          <th className="bs-th bs-left">Pitcher</th>
          <th className="bs-th bs-right">IP</th>
          <th className="bs-th bs-right">H</th>
          <th className="bs-th bs-right">R</th>
          <th className="bs-th bs-right">ER</th>
          <th className="bs-th bs-right">BB</th>
          <th className="bs-th bs-right">SO</th>
          <th className="bs-th bs-right">P</th>
          <th className="bs-th bs-right">S</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((p) => {
          const key = getPlayerKey(p);
          const highlighted = highlightedPlayerKeys.has(key);

          return (
            <tr key={p.playerId} className={highlighted ? "bs-row-flash" : ""}>
              <td className="bs-td bs-left">{asText(p.jerseyNumber, "")}</td>
              <td className="bs-td bs-left bs-name">
                <PlayerNameLink mlbId={getMlbId(p)} name={p.name} />
              </td>
              <td className="bs-td bs-right">{p.ip}</td>
              <td className="bs-td bs-right">{p.h}</td>
              <td className="bs-td bs-right">{p.r}</td>
              <td className="bs-td bs-right">{p.er}</td>
              <td className="bs-td bs-right">{p.bb}</td>
              <td className="bs-td bs-right">{p.so}</td>
              <td className="bs-td bs-right">{asText(p.pitches, "")}</td>
              <td className="bs-td bs-right">{asText(p.strikes, "")}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
