// client/src/pages/DailyGamesPage.tsx
import "./DailyGamesPage.css";
import { useRealtimeGame } from "../realtime/useRealtimeGame";

import type { ReactElement, ChangeEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useNavigate } from "react-router-dom";

import type { GameDto } from "@bitslinger21/baseball-realtime-client";
import { gamesApi } from "../api/baseballApiClient";
import { LiveScoreboard } from "./LiveScoreboard";
import { PitchByPitchFeed } from "./PitchByPitchFeed";
import { GameInfoPanel } from "./GameInfoPanel"; // <- if your file is truly GemeInfoPanel.tsx, revert this import
import type { PlayUpdate } from "../realtime/types";

const DATE_STORAGE_KEY = "br-selected-date";

function getTodayIso(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function DailyGamesPage(): ReactElement {
  const [games, setGames] = useState<readonly GameDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProviderGameId, setSelectedProviderGameId] = useState<string | null>(null);
  // When a user clicks ▶, we want the right pane to switch immediately.
  // `useRealtimeGame().isActive()` may only flip true after the socket acknowledges.
  const [optimisticWatchGameId, setOptimisticWatchGameId] = useState<string | null>(null);

  const navigate = useNavigate();

  // --- Date state + persistence ---
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

  // Load games whenever selectedDate changes
  useEffect((): void => {
    const loadGames = async (): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);

        // eslint-disable-next-line no-console
        console.log("[DailyGamesPage] fetching games for", selectedDate);

        const response = await gamesApi.gamesListByDate(selectedDate);
        setGames(response.data ?? []);
      } catch (e) {
        setError("Failed to load games.");
        // eslint-disable-next-line no-console
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

  // --- Realtime hook (single call) ---
  const {
    plays: updates,
    alerts,
    isConnected,
    connectionError,
    watchedGameIds,
    isActive,
    toggleGame,
  } = useRealtimeGame(selectedProviderGameId);

  // Rendering thousands of rows can block the main thread and make clicks feel "laggy".
  // Keep the UI responsive by only rendering the tail of the feed.
  const FEED_MAX_ROWS = 200;
  const visibleUpdates: readonly PlayUpdate[] = useMemo((): readonly PlayUpdate[] => {
    if (updates.length <= FEED_MAX_ROWS) return updates;
    return updates.slice(updates.length - FEED_MAX_ROWS);
  }, [updates]);

  useEffect((): void => {
    if (optimisticWatchGameId == null) return;

    // Clear optimism once the realtime hook confirms the game is active
    if (isActive(optimisticWatchGameId)) {
      setOptimisticWatchGameId(null);
      return;
    }

    // If the user navigated away to another selected game, drop the optimistic state
    if (selectedProviderGameId != null && selectedProviderGameId !== optimisticWatchGameId) {
      setOptimisticWatchGameId(null);
    }
  }, [optimisticWatchGameId, isActive, selectedProviderGameId]);

  // --- Scroll live feed to top when new updates arrive (newest first) ---
  const feedScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = feedScrollRef.current;
    if (el == null) return;
    el.scrollTop = 0;
  }, [updates]);

  const showPitchFeed: boolean =
    selectedProviderGameId != null &&
    (isActive(selectedProviderGameId) || optimisticWatchGameId === selectedProviderGameId);

  // --- Date controls handlers ---
  const handleDateChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const value: string = event.target.value;
    if (value == null || value === "") return;

    // eslint-disable-next-line no-console
    console.log("[DailyGamesPage] manual date change →", value);
    setSelectedDate(value);
  };

  const shiftDate = (deltaDays: number): void => {
    const base: string = selectedDate || getTodayIso();

    const [yearStr, monthStr, dayStr] = base.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr);
    const day = Number(dayStr);

    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
      const today = getTodayIso();
      // eslint-disable-next-line no-console
      console.log("[DailyGamesPage] shiftDate fallback →", today);
      setSelectedDate(today);
      return;
    }

    const d = new Date(year, month - 1, day);
    d.setDate(d.getDate() + deltaDays);

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");

    const next = `${yyyy}-${mm}-${dd}`;
    // eslint-disable-next-line no-console
    console.log("[DailyGamesPage] shiftDate", { deltaDays, from: base, to: next });

    setSelectedDate(next);
  };

  type TeamMeta = { displayName?: string | null; logoUrl?: string | null };

  const getAwayMeta = (g: GameDto): TeamMeta | null =>
    ((g as unknown as { awayTeamMeta?: TeamMeta | null }).awayTeamMeta ?? null);

  const getHomeMeta = (g: GameDto): TeamMeta | null =>
    ((g as unknown as { homeTeamMeta?: TeamMeta | null }).homeTeamMeta ?? null);

  const getScores = (g: GameDto): { away: number | null; home: number | null } => {
    const anyG = g as unknown as Record<string, unknown>;

    const away = typeof anyG.awayScore === "number" ? (anyG.awayScore as number) : null;
    const home = typeof anyG.homeScore === "number" ? (anyG.homeScore as number) : null;

    const ls = (anyG.linescore as unknown) as {
      away?: { runs?: number };
      home?: { runs?: number };
    } | null;

    const away2 = away ?? (typeof ls?.away?.runs === "number" ? ls.away.runs : null);
    const home2 = home ?? (typeof ls?.home?.runs === "number" ? ls.home.runs : null);

    return { away: away2, home: home2 };
  };

  const formatStartTime = (g: GameDto): string => {
    const startTimeUtc =
      (g as unknown as { startTimeUtc?: string | null }).startTimeUtc ?? null;

    if (!startTimeUtc) return "—";

    const d = new Date(startTimeUtc);
    if (Number.isNaN(d.getTime())) return "—";

    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };

  const formatInningCell = (g: GameDto): string => {
    const status = (g as unknown as { status?: string | null }).status ?? null;

    if (status === "final") return "Final";
    if (status !== "live") return formatStartTime(g);

    const anyG = g as unknown as {
      inning?: number;
      currentInning?: number;
      linescore?: { currentInning?: number; inningHalf?: string; isTopInning?: boolean };
      half?: string;
      halfInning?: string;
      isTopInning?: boolean;
    };

    const inning: number | null =
      typeof anyG.inning === "number"
        ? anyG.inning
        : typeof anyG.currentInning === "number"
          ? anyG.currentInning
          : typeof anyG.linescore?.currentInning === "number"
            ? anyG.linescore.currentInning
            : null;

    const halfRaw: string | null =
      typeof anyG.half === "string"
        ? anyG.half
        : typeof anyG.halfInning === "string"
          ? anyG.halfInning
          : typeof anyG.linescore?.inningHalf === "string"
            ? anyG.linescore.inningHalf
            : null;

    const isTop: boolean | null =
      typeof anyG.isTopInning === "boolean"
        ? anyG.isTopInning
        : typeof anyG.linescore?.isTopInning === "boolean"
          ? anyG.linescore.isTopInning
          : halfRaw != null
            ? halfRaw.toLowerCase().includes("top")
            : null;

    const caret = isTop == null ? "" : isTop ? "▲" : "▼";
    const inn = inning == null ? "—" : String(inning);

    return `${caret} ${inn}`.trim();
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
          {/* Left: game list */}
          <div className="game-list-container">
            <ul className="game-list">
              {safeGames.map((g: GameDto): ReactElement => {
                const isSelected: boolean =
                  g.providerGameId != null && g.providerGameId === selectedProviderGameId;

                const active: boolean =
                  g.providerGameId != null ? isActive(g.providerGameId) : false;

                return (
                  <li
                    key={g.providerGameId}
                    className={`game-card ${isSelected ? "selected" : ""} game-card--row`}
                    onClick={(): void => {
                      const gid: string | null = g.providerGameId ?? null;
                      if (gid == null) return;
                      setSelectedProviderGameId((prev: string | null) => (prev === gid ? null : gid));
                    }}
                  >
                    <>
                      {/* Columns 1–4 */}
                      <div className="game-card-grid">
                        {/* Col 1: logos */}
                        <div className="game-col-logos">
                          {((): ReactElement => {
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
                              <span style={{ width: 20, height: 20, display: "inline-block" }} />
                            );
                          })()}
                          {((): ReactElement => {
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
                              <span style={{ width: 20, height: 20, display: "inline-block" }} />
                            );
                          })()}
                        </div>

                        {/* Col 2: team names */}
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

                        {/* Col 3: score (only live/final) */}
                        <div className="game-col-scores">
                          {((): ReactElement => {
                            const status = (g as unknown as { status?: string | null }).status ?? null;
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

                        {/* Col 4: inning / final / start time */}
                        <div className="game-col-inning">{formatInningCell(g)}</div>
                      </div>

                      {/* Col 5: action buttons */}
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

                            const gid: string | null = g.providerGameId ?? null;
                            if (gid == null) return;

                            // Force React to paint the right pane updates *before* we do anything that might be heavier
                            // (like opening/closing sockets or rebuilding subscriptions inside `toggleGame`).
                            flushSync((): void => {
                              if (!isSelected) setSelectedProviderGameId(gid);

                              // Flip the UI immediately; realtime "active" may lag until the socket confirms.
                              if (!active) setOptimisticWatchGameId(gid);
                              else setOptimisticWatchGameId(null);
                            });

                            // Defer the potentially expensive toggle to the next tick so the UI paint isn't blocked.
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
                    </>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Right: live feed / info panel */}
          <div className="live-feed">
            <div className="live-feed-body">
              {/* Info panel always renders (it handles selectedGame null internally) */}
              {/* Top row: title (if selected) + connection status + watched quick-switch */}
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
                    "Games forr " + selectedDate
                  )}
                </div>

                {/* Right side: connection + watched links */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.25rem" }}>
                  {watchedGameIds.length > 0 && (
                    <div style={{ fontSize: "0.75rem", color: isConnected ? "green" : "red", opacity: 0.85 }}>
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
              <div className="info-panel">
                <GameInfoPanel
                  selectedDate={selectedDate}
                  games={safeGames}
                  selectedGame={selectedGame}
                  isWatched={showPitchFeed}
                  updates={updates}
                  isConnected={isConnected}
                  connectionError={connectionError}
                  watchedGames={watchedGamesForLinks}
                  watchedGameIds={watchedGameIds}
                  onSelectGame={(id: string): void => {
                    flushSync((): void => {
                      setSelectedProviderGameId(id);
                    });
                  }}
                />
              </div>

              {/* Feed panel */}
              {/* Feed panel */}
              <div className="feed-panel">
                {selectedProviderGameId == null ? (
                  <p className="live-feed-message">Select a game to view. Click ▶ to watch.</p>
                ) : selectedGame == null ? (
                  <p className="live-feed-message">Selected game not found in list.</p>
                ) : showPitchFeed ? (
                  <>
                    {visibleUpdates.length > 0 && (
                      <LiveScoreboard game={selectedGame} update={visibleUpdates[visibleUpdates.length - 1]} />
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
                        {optimisticWatchGameId === selectedProviderGameId && !isActive(selectedProviderGameId)
                          ? "Connecting…"
                          : "Waiting for updates…"}
                      </p>
                    )}

                    <div className="feed-scroll" ref={feedScrollRef}>
                      <PitchByPitchFeed updates={visibleUpdates} />
                    </div>
                  </>
                ) : (
                  <p className="live-feed-message" style={{ opacity: 0.8 }}>
                    Click ▶ to watch pitch-by-pitch.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )
      }
    </section >
  );
}