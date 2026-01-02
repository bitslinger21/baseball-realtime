// client/src/pages/DailyGamesPage.tsx
import "./DailyGamesPage.css";
import { useRealtimeGame } from "../realtime/useRealtimeGame";

import type { ReactElement, ChangeEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import type { GameDto } from "@bitslinger21/baseball-realtime-client";
import { gamesApi } from "../api/baseballApiClient";
import { LiveScoreboard } from "./LiveScoreboard";
import { PitchByPitchFeed } from "./PitchByPitchFeed";

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
  const [selectedProviderGameId, setSelectedProviderGameId] =
    useState<string | null>(null);

  const navigate = useNavigate();

  // --- Date state + persistence ---
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    try {
      const stored = window.localStorage.getItem(DATE_STORAGE_KEY);
      if (stored != null && stored !== "") {
        return stored;
      }
    } catch {
      // ignore
    }
    return getTodayIso();
  });

  // Persist date whenever it changes
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

        // eslint-disable-next-line no-console
        console.log("[DailyGamesPage] games response", response.data);

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
        g.providerGameId != null &&
        g.providerGameId === selectedProviderGameId,
    ) ?? null;

  // --- Realtime hook (single call) ---
  const {
    plays: updates,
    alerts,
    isConnected,
    connectionError,
    activeGameId,
    isActive,
    toggleGame,
  } = useRealtimeGame(selectedProviderGameId);

  const activeGame: GameDto | null =
    safeGames.find(
      (g: GameDto): boolean =>
        g.providerGameId != null && g.providerGameId === activeGameId,
    ) ?? null;

  // --- Scroll live feed to bottom when new updates arrive ---
  const feedScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = feedScrollRef.current;
    if (el == null) return;

    // Newest items are rendered first, so keep view anchored at the top
    el.scrollTop = 0;
  }, [updates]);

  // --- Date controls handlers ---

  const handleDateChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const value: string = event.target.value;
    if (value == null || value === "") {
      return;
    }
    // eslint-disable-next-line no-console
    console.log("[DailyGamesPage] manual date change →", value);
    setSelectedDate(value);
  };

  const shiftDate = (deltaDays: number): void => {
    const base: string = selectedDate || getTodayIso();

    // Parse YYYY-MM-DD as a LOCAL date (no timezone shenanigans)
    const [yearStr, monthStr, dayStr] = base.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr); // 1–12
    const day = Number(dayStr);

    if (
      !Number.isFinite(year) ||
      !Number.isFinite(month) ||
      !Number.isFinite(day)
    ) {
      // Fallback: just reset to today
      const today = getTodayIso();
      // eslint-disable-next-line no-console
      console.log("[DailyGamesPage] shiftDate fallback →", today);
      setSelectedDate(today);
      return;
    }

    // Local midnight for that calendar date
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

  return (
    <section className="page-container">
      <div className="page-header">
        <h2>Games for {selectedDate}</h2>

        <div className="date-controls">
          <button
            type="button"
            className="join-btn"
            onClick={(): void => shiftDate(-1)}
          >
            ← Prev
          </button>

          <input
            type="date"
            value={selectedDate}
            onChange={handleDateChange}
          />

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
        <div className="status-banner status-banner--loading">
          Loading games…
        </div>
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
                  g.providerGameId != null &&
                  g.providerGameId === selectedProviderGameId;

                const active: boolean =
                  g.providerGameId != null && activeGameId === g.providerGameId;

                return (
                  <li
                    key={g.providerGameId}
                    className={`game-card ${isSelected ? "selected" : ""}`}
                    style={{ display: "flex", justifyContent: "space-between", cursor: "pointer" }}
                    onClick={(): void => setSelectedProviderGameId(g.providerGameId ?? null)}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
                        {((): ReactElement | null => {
                          const url = (g as unknown as { awayTeamMeta?: { logoUrl?: string | null } })
                            .awayTeamMeta?.logoUrl;
                          const name =
                            (g as unknown as { awayTeamMeta?: { displayName?: string | null } })
                              .awayTeamMeta?.displayName ??
                            g.awayAbbr;

                          return (
                            <>
                              {url ? (
                                <img
                                  src={url}
                                  alt={`${name} logo`}
                                  style={{ width: 20, height: 20, objectFit: "contain" }}
                                  loading="lazy"
                                />
                              ) : (
                                <span style={{ width: 20, height: 20, display: "inline-block" }} />
                              )}
                              <span
                                style={{
                                  fontWeight: 600,
                                  minWidth: 0,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {name}
                              </span>                            </>
                          );
                        })()}
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
                        {((): ReactElement | null => {
                          const url = (g as unknown as { homeTeamMeta?: { logoUrl?: string | null } })
                            .homeTeamMeta?.logoUrl;
                          const name =
                            (g as unknown as { homeTeamMeta?: { displayName?: string | null } })
                              .homeTeamMeta?.displayName ??
                            g.homeAbbr;

                          return (
                            <>
                              {url ? (
                                <img
                                  src={url}
                                  alt={`${name} logo`}
                                  style={{ width: 20, height: 20, objectFit: "contain" }}
                                  loading="lazy"
                                />
                              ) : (
                                <span style={{ width: 20, height: 20, display: "inline-block" }} />
                              )}
                              <span
                                style={{
                                  fontWeight: 600,
                                  minWidth: 0,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {name}
                              </span>                            </>
                          );
                        })()}
                      </div>

                      <div
                        style={{
                          fontSize: "0.75rem",
                          opacity: 0.75,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {(() => {
                          const startTimeUtc =
                            (g as unknown as { startTimeUtc?: string | null }).startTimeUtc ?? null;

                          if (!startTimeUtc) return g.gameDate;

                          const d = new Date(startTimeUtc);
                          if (Number.isNaN(d.getTime())) return g.gameDate;

                          return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
                        })()}
                        <span style={{ marginLeft: "0.35rem", opacity: 0.7 }}>({g.status})</span>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.4rem",
                        marginLeft: "0.75rem",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.35rem",
                          marginLeft: "auto",
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

                            if (!active) {
                              setSelectedProviderGameId(gid);
                            }

                            toggleGame(gid);
                          }}
                          className={`join-btn icon-btn ${active ? "selected" : ""}`}
                        >
                          {active ? (
                            // ⏹ Stop icon
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
                            // ▶ Play icon
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
                          onClick={(): void => {
                            if (g.providerGameId != null) navigate(`/game/${g.providerGameId}`);
                          }}
                          className="join-btn icon-btn"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
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

          {/* Right: live feed */}
          <div className="live-feed">
            {/* Connection status */}
            {activeGameId != null && (
              <div
                style={{
                  fontSize: "0.75rem",
                  marginBottom: "0.25rem",
                  color: isConnected ? "green" : "red",
                  opacity: 0.8,
                  textAlign: "right",
                  alignSelf: "flex-end",
                  width: "100%",
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

            {/* Listening to ... line, immediately after connection status */}
            {activeGameId != null && activeGame != null && (
              <p className="live-feed-message">
                Watching{" "}
                <strong>
                  {activeGame.awayAbbr} @ {activeGame.homeAbbr}
                </strong>{" "}
                — status: <em>{activeGame.status}</em>
              </p>
            )}

            {selectedProviderGameId == null && (
              <p className="live-feed-message">
                Select a game to view. Click ▶ to watch.
              </p>
            )}

            {selectedProviderGameId != null && selectedGame == null && (
              <p className="live-feed-message">
                Selected game not found in list. (This would be unusual.)
              </p>
            )}

            {selectedProviderGameId != null && selectedGame != null && (
              <>
                {/* Mini scoreboard */}
                {updates.length > 0 && (
                  <LiveScoreboard
                    game={selectedGame}
                    update={updates[updates.length - 1]}
                  />
                )}

                {/* Alerts strip (show most recent 3 alerts) */}
                {alerts.length > 0 && (
                  <div className="alerts-strip">
                    {alerts.slice(-3).map((a, index) => (
                      <div
                        key={`${a.at}-${index}`}
                        className="alert-chip"
                      >
                        <span className="alert-type">{a.type}</span>
                        <span className="alert-note">{a.note}</span>
                      </div>
                    ))}
                  </div>
                )}

                {activeGameId == null && (
                  <p className="live-feed-message">
                    Select a game to view. Click ▶ to watch.
                  </p>
                )}

                {activeGameId != null && updates.length === 0 && (
                  <p className="live-feed-message">Waiting for updates…</p>
                )}

                <div className="feed-scroll" ref={feedScrollRef}>
                  <PitchByPitchFeed updates={updates} />
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}