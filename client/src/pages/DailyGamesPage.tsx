import "./DailyGamesPage.css";
import { useRealtimeGame } from "../realtime/useRealtimeGame";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { flushSync } from "react-dom";
import { useNavigate } from "react-router-dom";

import type { GameDto } from "@bitslinger21/baseball-realtime-client";
import { gamesApi } from "../api/baseballApiClient";
import { LiveScoreboard } from "./LiveScoreboard";
import { PitchByPitchFeed } from "./PitchByPitchFeed";
import type { PlayUpdate } from "../realtime/types";
import { JumpToBottomButton } from "../components/JumpToBottomButton";

const DATE_STORAGE_KEY = "br-selected-date";
const REPLAY_DELAY_STORAGE_KEY = "br-replay-delay-ms";
const DEFAULT_REPLAY_DELAY_MS = 2000;

type TeamMeta = {
  displayName?: string | null;
  logoUrl?: string | null;
  primaryColorHex?: string | null;
};

type GameBadgeVariant =
  | "final"
  | "scheduled"
  | "no-hitter"
  | "live"
  | "extras"
  | "delayed"
  | "cancelled"
  | "postponed"
  | "suspended";

type GameBadge = {
  key:
  | "final"
  | "scheduled"
  | "no-hitter"
  | "live"
  | "extras"
  | "delayed"
  | "cancelled"
  | "postponed"
  | "suspended";
  label: string;
  variant: GameBadgeVariant;
  title?: string;
};

function getReplayDelayMs(): number {
  try {
    const raw = window.localStorage.getItem(REPLAY_DELAY_MS_KEY_FALLBACK());
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed > 50) return parsed;
  } catch {
    // ignore
  }

  return DEFAULT_REPLAY_DELAY_MS;
}

function REPLAY_DELAY_MS_KEY_FALLBACK(): string {
  return REPLAY_DELAY_STORAGE_KEY;
}

function getTodayIso(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function badgeClass(variant: GameBadgeVariant): string {
  return `gc-badge gc-badge--${variant}`;
}

function getAwayMeta(g: GameDto): TeamMeta | null {
  return (g as { awayTeamMeta?: TeamMeta | null }).awayTeamMeta ?? null;
}

function getHomeMeta(g: GameDto): TeamMeta | null {
  return (g as { homeTeamMeta?: TeamMeta | null }).homeTeamMeta ?? null;
}

function getScores(g: GameDto): { away: number | null; home: number | null } {
  const anyG = g as unknown as Record<string, unknown>;

  const away = typeof anyG.awayScore === "number" ? (anyG.awayScore as number) : null;
  const home = typeof anyG.homeScore === "number" ? (anyG.homeScore as number) : null;

  const ls = anyG.linescore as
    | {
      away?: { runs?: number; hits?: number };
      home?: { runs?: number; hits?: number };
    }
    | null
    | undefined;

  const away2 = away ?? (typeof ls?.away?.runs === "number" ? ls.away.runs : null);
  const home2 = home ?? (typeof ls?.home?.runs === "number" ? ls.home.runs : null);

  return { away: away2, home: home2 };
}

function formatStartTime(g: GameDto): string {
  const startTimeUtc = (g as { startTimeUtc?: string | null }).startTimeUtc ?? null;

  if (!startTimeUtc) return "—";

  const d = new Date(startTimeUtc);
  if (Number.isNaN(d.getTime())) return "—";

  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatGameStateCell(g: GameDto): string {
  const anyG = g as {
    status?: string | null;
    detailedState?: string | null;
    inning?: number | null;
    currentInning?: number | null;
    half?: string | null;
    halfInning?: string | null;
    linescore?: {
      currentInning?: number;
      inningHalf?: string;
      isTopInning?: boolean;
      outs?: number;
    } | null;
    isTopInning?: boolean;
    outs?: number | null;
  };

  const status = anyG.status ?? null;
  const detailedState = anyG.detailedState ?? null;

  if (status === "final") {
    return detailedState && detailedState !== "" ? detailedState : "Final";
  }

  if (status !== "live") {
    if (detailedState != null && detailedState !== "" && detailedState !== "Scheduled") {
      return detailedState;
    }

    return formatStartTime(g);
  }

  const inning =
    typeof anyG.inning === "number"
      ? anyG.inning
      : typeof anyG.currentInning === "number"
        ? anyG.currentInning
        : typeof anyG.linescore?.currentInning === "number"
          ? anyG.linescore.currentInning
          : null;

  const halfRaw =
    typeof anyG.half === "string"
      ? anyG.half
      : typeof anyG.halfInning === "string"
        ? anyG.halfInning
        : typeof anyG.linescore?.inningHalf === "string"
          ? anyG.linescore.inningHalf
          : null;

  const isTop =
    typeof anyG.isTopInning === "boolean"
      ? anyG.isTopInning
      : typeof anyG.linescore?.isTopInning === "boolean"
        ? anyG.linescore.isTopInning
        : halfRaw != null
          ? halfRaw.toLowerCase().includes("top")
          : null;

  if (inning == null) {
    return detailedState && detailedState !== "" ? detailedState : "Live";
  }

  const outs =
    typeof anyG.outs === "number"
      ? anyG.outs
      : typeof anyG.linescore?.outs === "number"
        ? anyG.linescore.outs
        : null;

  const outsText = outs == null ? "" : ` • ${outs} out${outs === 1 ? "" : "s"}`;

  if (isTop === true) return `Top ${inning}${outsText}`;
  if (isTop === false) return `Bot ${inning}${outsText}`;

  if (halfRaw != null) {
    const normalized = halfRaw.toLowerCase();
    if (normalized === "top") return `Top ${inning}`;
    if (normalized === "bottom") return `Bot ${inning}`;
    if (normalized === "middle") return `Mid ${inning}`;
    if (normalized === "end") return `End ${inning}`;
  }

  return `Inning ${inning}`;
}

function getVenueText(g: GameDto): string | null {
  const snapshot = (g as { snapshot?: Record<string, unknown> | null }).snapshot ?? null;

  if (snapshot == null) return null;

  const venue = typeof snapshot.venue === "string" ? snapshot.venue : null;
  const city = typeof snapshot.city === "string" ? snapshot.city : null;
  const state = typeof snapshot.state === "string" ? snapshot.state : null;

  if (venue != null && city != null && state != null) {
    return `${venue} — ${city}, ${state}`;
  }

  if (venue != null && city != null) {
    return `${venue} — ${city}`;
  }

  return venue;
}

function getInningNumber(g: GameDto): number | null {
  const anyG = g as {
    inning?: number;
    currentInning?: number;
    linescore?: { currentInning?: number };
  };

  return typeof anyG.inning === "number"
    ? anyG.inning
    : typeof anyG.currentInning === "number"
      ? anyG.currentInning
      : typeof anyG.linescore?.currentInning === "number"
        ? anyG.linescore.currentInning
        : null;
}

function getGameBadges(g: GameDto): readonly GameBadge[] {
  const badges: GameBadge[] = [];

  const anyG = g as unknown as Record<string, unknown>;
  const status = (anyG.status as string | undefined) ?? "scheduled";

  const inning = getInningNumber(g);

  const ls = anyG.linescore as
    | {
      away?: { hits?: number };
      home?: { hits?: number };
    }
    | null
    | undefined;

  const awayHits = typeof ls?.away?.hits === "number" ? ls.away.hits : null;
  const homeHits = typeof ls?.home?.hits === "number" ? ls.home.hits : null;

  switch (status) {
    case "final":
      badges.push({ key: "final", label: "FINAL", variant: "final" });
      break;
    case "live":
      badges.push({ key: "live", label: "LIVE", variant: "live" });
      break;
    case "delayed":
      badges.push({ key: "delayed", label: "DELAYED", variant: "delayed" });
      break;
    case "postponed":
      badges.push({ key: "postponed", label: "POSTPONED", variant: "postponed" });
      break;
    case "suspended":
      badges.push({ key: "suspended", label: "SUSPENDED", variant: "suspended" });
      break;
    case "cancelled":
      badges.push({ key: "cancelled", label: "CANCELLED", variant: "cancelled" });
      break;
    default:
      badges.push({ key: "scheduled", label: "SCHEDULED", variant: "scheduled" });
      break;
  }

  if (status === "live" && inning != null && inning >= 10) {
    badges.push({
      key: "extras",
      label: "EXTRAS",
      variant: "extras",
      title: "Extra innings",
    });
  }

  if (
    status === "live" &&
    inning != null &&
    inning >= 7 &&
    ((awayHits === 0 && awayHits != null) || (homeHits === 0 && homeHits != null))
  ) {
    badges.push({
      key: "no-hitter",
      label: "NO-HITTER",
      variant: "no-hitter",
      title: "No-hitter watch (7th+)",
    });
  }

  return badges;
}

function withBadgeTestOverrides(g: GameDto): GameDto {
  const params = new URLSearchParams(window.location.search);
  const badgeTest = params.get("badgeTest") === "1";
  if (!badgeTest) return g;

  const anyG = g as unknown as Record<string, unknown>;
  const providerGameId = typeof anyG.providerGameId === "string" ? anyG.providerGameId : null;
  if (providerGameId == null || providerGameId === "") return g;

  if (providerGameId.endsWith("7") || providerGameId.endsWith("9")) {
    return {
      ...(g as unknown as Record<string, unknown>),
      status: "live",
      currentInning: 8,
      isTopInning: true,
      linescore: {
        away: { runs: 2, hits: 0 },
        home: { runs: 3, hits: 7 },
        currentInning: 8,
        inningHalf: "Top",
        isTopInning: true,
      },
    } as unknown as GameDto;
  }

  if (providerGameId.endsWith("1") || providerGameId.endsWith("3")) {
    return {
      ...(g as unknown as Record<string, unknown>),
      status: "live",
      currentInning: 10,
      isTopInning: false,
      linescore: {
        away: { runs: 4, hits: 9 },
        home: { runs: 5, hits: 10 },
        currentInning: 10,
        inningHalf: "Bot",
        isTopInning: false,
      },
    } as unknown as GameDto;
  }

  return g;
}

export default function DailyGamesPage() {
  const [games, setGames] = useState<readonly GameDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProviderGameId, setSelectedProviderGameId] = useState<string | null>(null);
  const [optimisticWatchGameId, setOptimisticWatchGameId] = useState<string | null>(null);
  const [isReplayPaused, setIsReplayPaused] = useState<boolean>(false);

  const navigate = useNavigate();

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    try {
      const stored = window.localStorage.getItem(DATE_STORAGE_KEY);
      if (stored != null && stored !== "") return stored;
    } catch {
      // ignore
    }
    return getTodayIso();
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(DATE_STORAGE_KEY, selectedDate);
    } catch {
      // ignore
    }
  }, [selectedDate]);

  useEffect((): void => {
    const loadGames = async (): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await gamesApi.gamesListByDate(selectedDate);
        setGames(response.data ?? []);
      } catch (e) {
        setError("Failed to load games.");
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };

    void loadGames();
  }, [selectedDate]);

  const safeGames: readonly GameDto[] = (games ?? []).filter(
    (g: GameDto | undefined | null): g is GameDto => g != null,
  );

  const selectedGame: GameDto | null =
    safeGames.find(
      (g: GameDto): boolean =>
        g.providerGameId != null && g.providerGameId === selectedProviderGameId,
    ) ?? null;

  const {
    plays: updates,
    alerts,
    isConnected,
    connectionError,
    watchedGameIds,
    isActive,
    toggleGame,
  } = useRealtimeGame(selectedProviderGameId);

  const [replayCount, setReplayCount] = useState<number>(0);

  const selectedGameStatus: string | null =
    (selectedGame as { status?: string | null } | null)?.status ?? null;

  useEffect((): (() => void) | void => {
    if (selectedProviderGameId == null) return;
    if (selectedGameStatus !== "final") return;
    if (updates.length === 0) return;
    if (isReplayPaused) return;
    if (replayCount >= updates.length) return;

    const stepMs = getReplayDelayMs();

    const timer = window.setInterval((): void => {
      setReplayCount((prev) => {
        if (prev >= updates.length) {
          window.clearInterval(timer);
          return prev;
        }
        return prev + 1;
      });
    }, stepMs);

    return (): void => {
      window.clearInterval(timer);
    };
  }, [
    selectedProviderGameId,
    selectedGameStatus,
    updates.length,
    replayCount,
    isReplayPaused,
  ]);

  const visibleUpdates: readonly PlayUpdate[] = useMemo((): readonly PlayUpdate[] => {
    if (selectedGameStatus === "final") {
      return updates.slice(0, replayCount);
    }

    return updates;
  }, [updates, replayCount, selectedGameStatus]);

  useEffect((): void => {
    if (optimisticWatchGameId == null) return;

    if (isActive(optimisticWatchGameId)) {
      setOptimisticWatchGameId(null);
      return;
    }

    if (selectedProviderGameId != null && selectedProviderGameId !== optimisticWatchGameId) {
      setOptimisticWatchGameId(null);
    }
  }, [optimisticWatchGameId, isActive, selectedProviderGameId]);

  const feedScrollRef = useRef<HTMLDivElement | null>(null);
  const liveFeedFrameRef = useRef<HTMLDivElement | null>(null);
  const liveFeedPanelRef = useRef<HTMLDivElement | null>(null);
  const gameListContainerRef = useRef<HTMLDivElement | null>(null);
  const [livePanelHeightPx, setLivePanelHeightPx] = useState<number | null>(null);
  const [feedScrollHeightPx, setFeedScrollHeightPx] = useState<number | null>(null);

  const showPitchFeed: boolean =
    selectedProviderGameId != null &&
    (isActive(selectedProviderGameId) || optimisticWatchGameId === selectedProviderGameId);

  const handleDateChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const value = event.target.value;
    if (value == null || value === "") return;
    setSelectedDate(value);
  };

  useLayoutEffect((): (() => void) | void => {
    const leftEl = gameListContainerRef.current;
    if (leftEl == null) return;

    const updateHeights = (): void => {
      const rightEl = liveFeedPanelRef.current;
      const scrollEl = feedScrollRef.current;

      const nextPanelHeight = Math.ceil(leftEl.getBoundingClientRect().height);
      setLivePanelHeightPx(nextPanelHeight > 0 ? nextPanelHeight : null);

      if (rightEl == null || scrollEl == null) {
        setFeedScrollHeightPx(null);
        return;
      }

      const rightRect = rightEl.getBoundingClientRect();
      const scrollRect = scrollEl.getBoundingClientRect();

      const usedBeforeScroll = Math.max(0, scrollRect.top - rightRect.top);
      const available = Math.floor(rightRect.height - usedBeforeScroll);

      setFeedScrollHeightPx(available > 0 ? available : null);
    };

    updateHeights();

    const observer = new ResizeObserver((): void => {
      updateHeights();
    });

    observer.observe(leftEl);

    const rightEl = liveFeedPanelRef.current;
    if (rightEl != null) {
      observer.observe(rightEl);
    }

    window.addEventListener("resize", updateHeights);

    return (): void => {
      observer.disconnect();
      window.removeEventListener("resize", updateHeights);
    };
  }, [safeGames.length, selectedProviderGameId, watchedGameIds.length, updates.length]);

  const shiftDate = (deltaDays: number): void => {
    const base = selectedDate || getTodayIso();

    const [yearStr, monthStr, dayStr] = base.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr);
    const day = Number(dayStr);

    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
      setSelectedDate(getTodayIso());
      return;
    }

    const d = new Date(year, month - 1, day);
    d.setDate(d.getDate() + deltaDays);

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");

    setSelectedDate(`${yyyy}-${mm}-${dd}`);
  };

  const watchedGamesForLinks: readonly GameDto[] = watchedGameIds
    .map((id) => safeGames.find((g) => g.providerGameId === id) ?? null)
    .filter((g): g is GameDto => g != null);

  return (
    <section className="page-container">
      <div className="page-header">
        <h2>Daily games</h2>

        <div className="date-controls">
          <button type="button" className="join-btn" onClick={(): void => shiftDate(-1)}>
            ← Prev
          </button>

          <input type="date" value={selectedDate} onChange={handleDateChange} />

          <button
            type="button"
            className="join-btn"
            onClick={(): void => shiftDate(1)}
            style={{ marginLeft: "0.25rem" }}
          >
            Next →
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="status-banner status-banner--loading">Loading games…</div>
      )}

      {error !== null && (
        <div className="status-banner status-banner--error">
          Failed to load games. Details: {error}
        </div>
      )}

      {!isLoading && error === null && safeGames.length === 0 && (
        <div className="status-banner status-banner--empty">
          No games scheduled for this date.
        </div>
      )}

      {!isLoading && error === null && safeGames.length > 0 && (
        <div className="games-layout">
          <div className="game-list-container" ref={gameListContainerRef}>
            <ul className="game-list">
              {safeGames.map((g1: GameDto) => {
                const g = withBadgeTestOverrides(g1);
                const isSelected =
                  g.providerGameId != null && g.providerGameId === selectedProviderGameId;

                const active = g.providerGameId != null ? isActive(g.providerGameId) : false;
                const venueText = getVenueText(g);
                const homePrimaryColor = getHomeMeta(g)?.primaryColorHex ?? "#9ca3af";

                return (
                  <li key={g.providerGameId ?? `${g.awayAbbr}-${g.homeAbbr}-${selectedDate}`}>
                    <div
                      className={[
                        "game-card",
                        "game-card--row",
                        isSelected ? "selected" : "",
                        showPitchFeed && selectedProviderGameId === g.providerGameId
                          ? "is-watching"
                          : "",
                        g.status === "live" ? "game-card--live" : "",
                        g.status === "final" ? "game-card--final" : "",
                        g.status === "scheduled" ? "game-card--scheduled" : "",
                        "rd--row",
                      ].join(" ")}
                      style={{ borderLeft: `8px solid ${homePrimaryColor}` }}
                    >
                      <div className="game-card-main">
                        <div className="game-card-grid">
                          <div className="game-col-logos">
                            {(() => {
                              const url = getAwayMeta(g)?.logoUrl ?? null;
                              const name = getAwayMeta(g)?.displayName ?? g.awayAbbr ?? "Away";
                              return url ? (
                                <img
                                  src={url}
                                  alt={`${name} logo`}
                                  style={{ width: 20, height: 20, objectFit: "contain" }}
                                  loading="lazy"
                                />
                              ) : (
                                <span
                                  style={{ width: 20, height: 20, display: "inline-block" }}
                                />
                              );
                            })()}

                            {(() => {
                              const url = getHomeMeta(g)?.logoUrl ?? null;
                              const name = getHomeMeta(g)?.displayName ?? g.homeAbbr ?? "Home";
                              return url ? (
                                <img
                                  src={url}
                                  alt={`${name} logo`}
                                  style={{ width: 20, height: 20, objectFit: "contain" }}
                                  loading="lazy"
                                />
                              ) : (
                                <span
                                  style={{ width: 20, height: 20, display: "inline-block" }}
                                />
                              );
                            })()}
                          </div>

                          <div className="game-col-names">
                            <span
                              style={{
                                fontWeight: 600,
                                minWidth: 0,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {getAwayMeta(g)?.displayName ?? g.awayAbbr}
                            </span>
                            <span
                              style={{
                                fontWeight: 600,
                                minWidth: 0,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {getHomeMeta(g)?.displayName ?? g.homeAbbr}
                            </span>
                          </div>

                          <div className="game-col-scores">
                            {(() => {
                              const status = (g as { status?: string | null }).status ?? null;
                              const show = status === "live" || status === "final";
                              const s = getScores(g);

                              return (
                                <>
                                  <span style={{ fontWeight: 700 }}>
                                    {show && s.away != null ? s.away : ""}
                                  </span>
                                  <span style={{ fontWeight: 700 }}>
                                    {show && s.home != null ? s.home : ""}
                                  </span>
                                </>
                              );
                            })()}
                          </div>

                          <div className="game-col-inning">{formatGameStateCell(g)}</div>
                        </div>

                        {venueText != null ? <div className="game-venue">{venueText}</div> : null}

                        <div className="game-badge-rail" aria-label="game badges">
                          {getGameBadges(g).map((b) => (
                            <span
                              key={b.key}
                              className={badgeClass(b.variant)}
                              title={b.title ?? b.label}
                            >
                              {b.label}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.35rem",
                          marginLeft: "0.75rem",
                          flexShrink: 0,
                        }}
                      >
                        <button
                          type="button"
                          aria-label={active ? "Stop watching live" : "Join live"}
                          title={active ? "Stop watching live" : "Join live"}
                          onClick={(e): void => {
                            e.preventDefault();
                            e.stopPropagation();

                            const gid = g.providerGameId ?? null;
                            if (gid == null) return;

                            flushSync((): void => {
                              if (!isSelected) setSelectedProviderGameId(gid);

                              if (!active) setOptimisticWatchGameId(gid);
                              else setOptimisticWatchGameId(null);
                            });

                            window.setTimeout((): void => {
                              toggleGame(gid);
                            }, 0);
                          }}
                          className={`join-btn icon-btn ${active ? "selected" : ""}`}
                        >
                          {active ? (
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={2}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <rect x="6" y="6" width="12" height="12" />
                            </svg>
                          ) : (
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={2}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polygon points="5 3 19 12 5 21 5 3" />
                            </svg>
                          )}
                        </button>

                        <button
                          type="button"
                          aria-label="Open game page"
                          title="Open game page"
                          onClick={(e): void => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (g.providerGameId != null) navigate(`/game/${g.providerGameId}`);
                          }}
                          className="join-btn icon-btn"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                            <polyline points="15 3 21 3 21 9" />
                            <line x1="10" y1="14" x2="21" y2="3" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <div
            ref={liveFeedPanelRef}
            className="live-feed daily-live-panel"
            style={
              livePanelHeightPx != null
                ? { height: `${livePanelHeightPx}px`, maxHeight: `${livePanelHeightPx}px` }
                : undefined
            }
          >
            <div
              className="live-feed-toprow"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                gap: "0.75rem",
              }}
            >
              <div style={{ fontWeight: 800 }}>
                {selectedGame ? (
                  <>
                    {selectedGame.awayAbbr} @ {selectedGame.homeAbbr}
                  </>
                ) : (
                  "Games for " + selectedDate
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: "0.6rem",
                }}
              >
                {selectedGameStatus === "final" && updates.length > 0 && (
                  <button
                    type="button"
                    className="replay-toggle"
                    onClick={() => setIsReplayPaused((p) => !p)}
                  >
                    {isReplayPaused ? "▶ Play" : "⏸ Pause"}
                  </button>
                )}

                {watchedGameIds.length > 0 && (
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: isConnected ? "green" : "red",
                      opacity: 0.85,
                    }}
                  >
                    {isConnected ? "🟢 Connected" : "🔴 Disconnected"}
                    {connectionError && (
                      <span style={{ marginLeft: "0.5rem", color: "orange" }}>
                        (error: {connectionError})
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {watchedGameIds.length > 0 && (
              <div className="watching-strip">
                <div className="watching-strip__label">WATCHING</div>
                <div className="watching-strip__count">{watchedGameIds.length}</div>

                <div className="watching-strip__chips">
                  {watchedGamesForLinks.length > 0
                    ? watchedGamesForLinks
                      .filter((g: GameDto): boolean => (g.providerGameId ?? "") !== "")
                      .map((g: GameDto) => {
                        const id = g.providerGameId ?? "";
                        const isSelected = selectedProviderGameId === id;

                        return (
                          <button
                            key={id}
                            type="button"
                            className={`watching-chip ${isSelected ? "is-selected" : ""}`}
                            onClick={(): void => {
                              flushSync((): void => {
                                setSelectedProviderGameId(id);
                              });
                            }}
                            title={`${g.awayAbbr} @ ${g.homeAbbr}`}
                          >
                            {g.awayAbbr} @ {g.homeAbbr}
                          </button>
                        );
                      })
                    : watchedGameIds.map((id: string) => {
                      const isSelected = selectedProviderGameId === id;

                      return (
                        <button
                          key={id}
                          type="button"
                          className={`watching-chip ${isSelected ? "is-selected" : ""}`}
                          onClick={(): void => {
                            flushSync((): void => {
                              setSelectedProviderGameId(id);
                            });
                          }}
                          title={id}
                        >
                          {id}
                        </button>
                      );
                    })}
                </div>
              </div>
            )}

            <div ref={liveFeedFrameRef} className="feed-panel daily-live-panel__body">
              {selectedProviderGameId == null ? (
                <p className="live-feed-message">Select a game to view. Click ▶ to watch.</p>
              ) : selectedGame == null ? (
                <p className="live-feed-message">Selected game not found in list.</p>
              ) : showPitchFeed ? (
                <>
                  {visibleUpdates.length > 0 && (
                    <LiveScoreboard
                      game={selectedGame}
                      update={visibleUpdates[visibleUpdates.length - 1]}
                    />
                  )}

                  {alerts.length > 0 && (
                    <div className="alerts-strip">
                      {alerts.slice(-3).map((a, index) => (
                        <div key={`${a.at}-${index}`} className="alert-chip">
                          <span className="alert-type">{a.type}</span>
                          <span className="alert-note">{a.note}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {visibleUpdates.length === 0 && (
                    <p className="live-feed-message">
                      {optimisticWatchGameId === selectedProviderGameId &&
                        !isActive(selectedProviderGameId)
                        ? "Connecting…"
                        : "Waiting for updates…"}
                    </p>
                  )}

                  <div
                    className="feed-scroll"
                    ref={feedScrollRef}
                    style={
                      feedScrollHeightPx != null
                        ? {
                          height: `${feedScrollHeightPx}px`,
                          maxHeight: `${feedScrollHeightPx}px`,
                          overflowY: "auto",
                          overflowX: "hidden",
                        }
                        : {
                          overflowY: "auto",
                          overflowX: "hidden",
                        }
                    }
                  >
                    <PitchByPitchFeed updates={visibleUpdates} />
                  </div>

                  <JumpToBottomButton
                    containerRef={feedScrollRef}
                    anchorRef={liveFeedFrameRef}
                  />
                </>
              ) : (
                <p className="live-feed-message" style={{ opacity: 0.8 }}>
                  Click ▶ to watch pitch-by-pitch.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
