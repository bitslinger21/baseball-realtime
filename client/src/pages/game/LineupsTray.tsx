import React, { useState, useEffect, useCallback, useMemo } from "react";
import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import type { BoxScoreDto, BatterLineDto, BenchPlayerDto, PitcherLineDto, BullpenPlayerDto } from "@bitslinger21/baseball-realtime-client";
import type { GameViewDto } from "@bitslinger21/baseball-realtime-client";
import { Segmented } from "../../components/primitives/Segmented";
import { TEAM_NICKNAMES } from "../../utils/teamNicknames";
import { formatIP } from "../../utils/formatIP";
import { useTrayMetrics } from "./useTrayMetrics";
import type { TrayPlayer } from "./useTrayMetrics";
import "./LineupsTray.css";

// ── helpers ──────────────────────────────────────────────────────────────────

function slotOf(battingOrder: string | null | undefined): number {
  if (battingOrder == null) return 0;
  return Math.floor(parseInt(battingOrder, 10) / 100);
}

function subDepthOf(battingOrder: string | null | undefined): number {
  if (battingOrder == null) return 0;
  return parseInt(battingOrder, 10) % 100;
}

interface SlotGroup {
  slot: number;
  starter: BatterLineDto;
  subs: BatterLineDto[];
}

function buildLineupSlots(batting: BatterLineDto[]): SlotGroup[] {
  const map = new Map<number, BatterLineDto[]>();
  for (const b of batting) {
    const slot = slotOf(b.battingOrder);
    if (slot === 0) continue;
    const arr = map.get(slot) ?? [];
    arr.push(b);
    map.set(slot, arr);
  }
  const slots: SlotGroup[] = [];
  for (const [slot, players] of map) {
    players.sort((a, b) => subDepthOf(a.battingOrder) - subDepthOf(b.battingOrder));
    const [starter, ...subs] = players;
    slots.push({ slot, starter, subs });
  }
  slots.sort((a, b) => a.slot - b.slot);
  return slots;
}

// Players subbed out of the batting order — appear both in the lineup sub-tree
// and separately in the Bench section.
function subbedOutBatters(slots: SlotGroup[]): BatterLineDto[] {
  const out: BatterLineDto[] = [];
  for (const { starter, subs } of slots) {
    if (subs.length === 0) continue;
    out.push(starter);
    // All subs except the last are also out
    for (let i = 0; i < subs.length - 1; i++) out.push(subs[i]);
  }
  return out;
}

function pitcherStatLine(p: PitcherLineDto): string {
  const parts = [`${formatIP(p.ip)} IP`, `${p.h} H`, `${p.r} R`, `${p.so} K`];
  if (p.bb > 0) parts.push(`${p.bb} BB`);
  return parts.join(" · ");
}

function batterLine(b: BatterLineDto): string {
  return `${b.h}-${b.ab}`;
}

// ── sub-components ─────────────────────────────────────────────────────────

function SectionLabel({ children, count }: { children: string; count: number }): ReactElement {
  return (
    <div className="lt__section-label">
      <span className="lt__section-label-text">{children}</span>
      <span className="lt__section-label-count">{count}</span>
    </div>
  );
}

function JerseyNum({ children, faint }: { children: string | number; faint?: boolean }): ReactElement {
  return (
    <span className={`lt__jersey${faint ? " lt__jersey--faint" : ""}`}>#{children}</span>
  );
}

interface LineupEntryProps {
  group: SlotGroup;
  gameId?: string | null;
}

function LineupEntry({ group, gameId }: LineupEntryProps): ReactElement {
  const { slot, starter, subs } = group;
  const wasReplaced = subs.length > 0;

  return (
    <div className="lt__lineup-entry">
      {/* Starter row */}
      <div className="lt__player-row">
        <span className="lt__slot num">{slot}</span>
        <JerseyNum faint={wasReplaced}>{starter.jerseyNumber ?? "—"}</JerseyNum>
        <div className="lt__player-identity">
          <Link
            to={`/player/${starter.playerId}`}
            state={{ fromGame: gameId ?? undefined }}
            className={`lt__player-name player-link${wasReplaced ? " lt__player-name--muted" : ""}`}
          >
            {starter.name}
          </Link>
          <span className="lt__pos">{starter.position ?? "—"}</span>
        </div>
        <span className={`lt__stat-line num${wasReplaced ? " lt__stat-line--faint" : ""}`}>
          {batterLine(starter)}
        </span>
        <span className={`lt__pa-seq num${wasReplaced ? " lt__pa-seq--faint" : ""}`}>
          {starter.pa ?? ""}
        </span>
      </div>

      {/* Substitution rows */}
      {wasReplaced && subs.map((sub, i) => {
        const isActive = i === subs.length - 1;
        return (
          <div key={sub.playerId} className="lt__sub-row" style={{ position: "relative" }}>
            {/* Vertical connector — runs full height except last row stops at midpoint */}
            <span
              className="lt__connector-v"
              style={{ top: i === 0 ? -6 : 0, bottom: isActive ? "50%" : 0 }}
            />
            {/* Horizontal tick */}
            <span className="lt__connector-h" />
            <span className="lt__sub-spacer" />
            <JerseyNum faint={!isActive}>{sub.jerseyNumber ?? "—"}</JerseyNum>
            <div className="lt__player-identity">
              <Link
                to={`/player/${sub.playerId}`}
                state={{ fromGame: gameId ?? undefined }}
                className={`lt__player-name player-link${!isActive ? " lt__player-name--muted" : ""}`}
              >
                {sub.name}
              </Link>
              <span className="lt__pos">{sub.position ?? "—"}</span>
            </div>
            <span className={`lt__stat-line num${!isActive ? " lt__stat-line--faint" : ""}`}>
              {batterLine(sub)}
            </span>
            <span className={`lt__pa-seq num${!isActive ? " lt__pa-seq--faint" : ""}`}>{sub.pa ?? ""}</span>
          </div>
        );
      })}
    </div>
  );
}

interface PitcherSlotProps {
  pitchers: PitcherLineDto[];
  gameId?: string | null;
}

function PitcherSlot({ pitchers, gameId }: PitcherSlotProps): ReactElement {
  const [starter, ...subs] = pitchers;
  const wasReplaced = subs.length > 0;

  return (
    <div className="lt__lineup-entry">
      {/* Starter pitcher row */}
      <div className="lt__player-row">
        <span className="lt__slot num">P</span>
        <JerseyNum faint={wasReplaced}>{starter.jerseyNumber ?? "—"}</JerseyNum>
        <div className="lt__player-identity">
          <Link
            to={`/player/${starter.playerId}`}
            state={{ fromGame: gameId ?? undefined }}
            className={`lt__player-name player-link${wasReplaced ? " lt__player-name--muted" : ""}`}
          >
            {starter.name}
          </Link>
          <span className="lt__pos">{starter.position ?? "P"}</span>
        </div>
        <span className={`lt__stat-line lt__stat-line--pitcher num${wasReplaced ? " lt__stat-line--faint" : ""}`}>
          {pitcherStatLine(starter)}
        </span>
      </div>

      {wasReplaced && subs.map((sub, i) => {
        const isActive = i === subs.length - 1;
        return (
          <div key={sub.playerId} className="lt__sub-row" style={{ position: "relative" }}>
            <span
              className="lt__connector-v"
              style={{ top: i === 0 ? -6 : 0, bottom: isActive ? "50%" : 0 }}
            />
            <span className="lt__connector-h" />
            <span className="lt__sub-spacer" />
            <JerseyNum faint={!isActive}>{sub.jerseyNumber ?? "—"}</JerseyNum>
            <div className="lt__player-identity">
              <Link
                to={`/player/${sub.playerId}`}
                state={{ fromGame: gameId ?? undefined }}
                className={`lt__player-name player-link${!isActive ? " lt__player-name--muted" : ""}`}
              >
                {sub.name}
              </Link>
              <span className="lt__pos">{sub.position ?? "P"}</span>
            </div>
            <span className={`lt__stat-line lt__stat-line--pitcher num${!isActive ? " lt__stat-line--faint" : ""}`}>
              {pitcherStatLine(sub)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function BenchRow({ player, subOut, gameId }: { player: BenchPlayerDto | BatterLineDto; subOut?: boolean; gameId?: string | null }): ReactElement {
  const jersey = "jerseyNumber" in player ? player.jerseyNumber : null;
  return (
    <div className="lt__bench-row">
      <JerseyNum>{jersey ?? "—"}</JerseyNum>
      <div className="lt__player-identity">
        <Link to={`/player/${player.playerId}`} state={{ fromGame: gameId ?? undefined }} className="lt__player-name player-link">
          {player.name}
        </Link>
        <span className="lt__pos">{player.position ?? "—"}</span>
      </div>
      <span className="lt__bench-status">
        {subOut ? "Out" : "Avail"}
      </span>
    </div>
  );
}

function BullpenRow({ pitcher, gameId }: { pitcher: BullpenPlayerDto; gameId?: string | null }): ReactElement {
  return (
    <div className="lt__bench-row">
      <JerseyNum>{pitcher.jerseyNumber ?? "—"}</JerseyNum>
      <div className="lt__player-identity">
        <Link to={`/player/${pitcher.playerId}`} state={{ fromGame: gameId ?? undefined }} className="lt__player-name player-link">
          {pitcher.name}
        </Link>
        <span className="lt__pos">{pitcher.position ?? "P"}</span>
      </div>
      <span className="lt__bullpen-era num">{pitcher.era != null ? `${pitcher.era} ERA` : "—"}</span>
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export interface LineupsTrayProps {
  open: boolean;
  onClose: () => void;
  closing: boolean;
  boxScore: BoxScoreDto | null;
  game: GameViewDto;
  /** abbr of the team currently at bat — used as default toggle selection */
  battingTeamAbbr: string;
}

export function LineupsTray({ open, onClose, closing, boxScore, game, battingTeamAbbr }: LineupsTrayProps): ReactElement | null {
  const awayAbbr = game.awayAbbr;
  const homeAbbr = game.homeAbbr;
  const awayNick = TEAM_NICKNAMES[awayAbbr] ?? awayAbbr;
  const homeNick = TEAM_NICKNAMES[homeAbbr] ?? homeAbbr;

  // Default to the batting team
  const defaultIdx = battingTeamAbbr === homeAbbr ? 1 : 0;
  const [sideIdx, setSideIdx] = useState(defaultIdx);

  // When the batting team changes (e.g. half-inning flip), update default
  useEffect(() => {
    setSideIdx(battingTeamAbbr === homeAbbr ? 1 : 0);
  }, [battingTeamAbbr, homeAbbr]);

  // Esc to close
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, handleKey]);

  // Derive the current side BEFORE the early return so hooks below are always called
  const isHome = sideIdx === 1;
  const side = isHome ? boxScore?.home : boxScore?.away;

  // Build a flat player list for useTrayMetrics (measures text to size tray + stat col)
  const trayPlayers = useMemo((): TrayPlayer[] => {
    const batting = side?.batting ?? [];
    const pitching = side?.pitching ?? [];
    const slots = buildLineupSlots(batting);
    const toBatter = (b: BatterLineDto): TrayPlayer => ({
      name: b.name,
      pos: b.position ?? "",
      isPitcher: false,
      seq: b.pa ?? "",
    });
    const toPitcher = (p: PitcherLineDto): TrayPlayer => ({
      name: p.name,
      pos: p.position ?? "P",
      isPitcher: true,
      stat: pitcherStatLine(p),
    });
    const result: TrayPlayer[] = slots.map((g) => ({
      ...toBatter(g.starter),
      subs: g.subs.map(toBatter),
    }));
    if (pitching.length > 0) {
      result.push({ ...toPitcher(pitching[0]), subs: pitching.slice(1).map(toPitcher) });
    }
    return result;
  }, [side]);

  const { statCol, trayWidth } = useTrayMetrics(trayPlayers);

  if (!open && !closing) return null;

  const sideAbbr = isHome ? homeAbbr : awayAbbr;
  const isBatting = sideAbbr === battingTeamAbbr;

  const batting = side?.batting ?? [];
  const bench = side?.bench ?? [];
  const pitching = side?.pitching ?? [];
  const bullpen = side?.bullpen ?? [];

  const lineupSlots = buildLineupSlots(batting);
  const subbedOut = subbedOutBatters(lineupSlots);
  // Pulled pitchers (all but the current/last pitcher) go to bench
  const pulledPitchers = pitching.slice(0, -1);
  const benchPlayers: Array<{ player: BatterLineDto | BenchPlayerDto; subOut: boolean }> = [
    ...subbedOut.map((p) => ({ player: p as BatterLineDto, subOut: true })),
    ...bench.map((p) => ({ player: p, subOut: false })),
    ...pulledPitchers.map((p) => ({ player: p as unknown as BenchPlayerDto, subOut: true })),
  ];

  const lineupPosted = (side?.batting?.length ?? 0) > 0;

  const totalLineupCount = lineupSlots.reduce(
    (n, g) => n + 1 + g.subs.length,
    0,
  ) + (pitching.length > 0 ? pitching.length : 0);

  return (
    <>
      {/* Dim backdrop */}
      <div
        className={`lt__backdrop${closing ? " lt__backdrop--out" : ""}`}
        onClick={onClose}
      />

      {/* Tray panel — width and stat-column are dynamic via CSS vars */}
      <div
        className={`lt__tray${closing ? " lt__tray--out" : ""}`}
        style={{ "--lt-tray-w": `${trayWidth}px`, "--lt-stat-col": `${statCol}px` } as React.CSSProperties}
      >
        {/* Header */}
        <div className="lt__header">
          <div className="lt__header-left">
            <span className="lt__title">Lineups</span>
            <Segmented
              items={[awayNick, homeNick]}
              active={sideIdx}
              onClick={setSideIdx}
              size="sm"
            />
          </div>
          <button type="button" className="lt__close" onClick={onClose} aria-label="Close lineups">
            ✕
          </button>
        </div>

        {/* Team strip */}
        <div className="lt__team-strip">
          <span className="lt__team-name">{isHome ? game.homeName : game.awayName}</span>
          <span className={`lt__team-status${isBatting ? " lt__team-status--active" : ""}`}>
            {isBatting ? "At bat" : "In field"}
          </span>
        </div>

        {/* Scrollable body */}
        <div className="lt__body">
          {/* Lineup */}
          <SectionLabel count={lineupPosted ? totalLineupCount : 0}>Lineup</SectionLabel>
          <div className="lt__section-rows lt__section-rows--border">
            {lineupPosted ? (
              <>
                {lineupSlots.map((group) => (
                  <LineupEntry key={group.slot} group={group} gameId={game.providerGameId} />
                ))}
                {pitching.length > 0 && <PitcherSlot pitchers={pitching} gameId={game.providerGameId} />}
              </>
            ) : (
              <div className="lt__lineup-not-posted">
                <div className="lt__lineup-not-posted__icon">📋</div>
                <div className="lt__lineup-not-posted__title">Lineup not yet posted</div>
                <div className="lt__lineup-not-posted__body">
                  Clubs typically post the starting lineup about an hour before first pitch.
                </div>
              </div>
            )}
          </div>

          {/* Bench */}
          <SectionLabel count={benchPlayers.length}>Bench</SectionLabel>
          <div className="lt__section-rows lt__section-rows--border">
            {benchPlayers.map(({ player, subOut }, i) => (
              <BenchRow key={`${player.playerId}-${i}`} player={player} subOut={subOut} gameId={game.providerGameId} />
            ))}
            {benchPlayers.length === 0 && (
              <div className="lt__empty-section">—</div>
            )}
          </div>

          {/* Bullpen */}
          <SectionLabel count={bullpen.length}>Bullpen</SectionLabel>
          <div className="lt__section-rows" style={{ paddingBottom: 16 }}>
            {bullpen.map((p) => (
              <BullpenRow key={p.playerId} pitcher={p} gameId={game.providerGameId} />
            ))}
            {bullpen.length === 0 && (
              <div className="lt__empty-section">—</div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
