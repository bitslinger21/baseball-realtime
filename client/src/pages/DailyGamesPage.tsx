// client/src/pages/DailyGamesPage.tsx
import "./DailyGamesPage.css";
import { useRealtimeGame } from "../realtime/useRealtimeGame";
import type { PlayUpdate } from "../realtime/types";

import type { ReactElement, ChangeEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import type { GameDto } from "@bitslinger21/baseball-realtime-client";
import { gamesApi } from "../api/baseballApiClient";

const DATE_STORAGE_KEY = "br-selected-date";

function getTodayIso(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function hexLuminance(hex: string): number {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;

  // Perceived luminance (WCAG)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function watermarkOpacityFromColor(hex?: string | null): number {
  if (!hex) return 0.15;

  const lum = hexLuminance(hex);

  // Dark color → higher opacity
  // Light color → lower opacity
  return lum < 0.20
    ? 0.36   // verxy dark team colors
    : lum < 0.35
      ? 0.26
      : lum < 0.55
        ? 0.16
        : 0.06
    ;  // light team colors
}

type TeamMetaLike = {
  logoUrl?: string | null;
  primaryColorHex?: string | null;
  alternateColorHex?: string | null;
  abbr?: string | null;
  displayName?: string | null;
};

function LiveScoreboard(props: {
  game: GameDto;
  update: PlayUpdate;
}): ReactElement {
  const { game, update } = props;

  const awayMeta: TeamMetaLike | null =
    (game as unknown as { awayTeamMeta?: TeamMetaLike | null }).awayTeamMeta ??
    null;
  const homeMeta: TeamMetaLike | null =
    (game as unknown as { homeTeamMeta?: TeamMetaLike | null }).homeTeamMeta ??
    null;

  const awayLogo = awayMeta?.logoUrl ?? null;
  const homeLogo = homeMeta?.logoUrl ?? null;

  const awayColor = awayMeta?.primaryColorHex ?? null;
  const homeColor = homeMeta?.primaryColorHex ?? null;

  const awayAbbr = game.awayAbbr ?? "AWY";
  const homeAbbr = game.homeAbbr ?? "HOM";

  const caret = update.half === "top" ? "▲" : "▼";

  return (
    <div className="lf-board">
      {/* Left: away score block */}
      <ScoreBlock
        side="away"
        logoUrl={awayLogo}
        abbr={awayAbbr}
        score={update.awayScore}
        primaryColorHex={awayColor}
      />

      {/* Center: game state */}
      <div className="lf-center">
        <div className="lf-center-row lf-center-row--top">
          <span className="lf-inning">
            <span
              className="lf-caret"
              aria-label={update.half === "top" ? "Top" : "Bottom"}
            >
              {caret}
            </span>{" "}
            <span className="lf-inning-num">{update.inning}</span>
          </span>
        </div>

        <div className="lf-center-row lf-center-row--mid">
          <span className="lf-bso" aria-label="Balls-Strikes-Outs">
            {update.balls}-{update.strikes}-{update.outs}
          </span>
        </div>

        <div className="lf-center-row lf-center-row--bases" aria-label="Runners on base">
          <BasesTriplet on1={update.bases.on1} on2={update.bases.on2} on3={update.bases.on3} />
        </div>
      </div>

      {/* Right: home score block */}
      <ScoreBlock
        side="home"
        logoUrl={homeLogo}
        abbr={homeAbbr}
        score={update.homeScore}
        primaryColorHex={homeColor}
      />
    </div>
  );
}

function ScoreBlock(props: {
  side: "away" | "home";
  logoUrl: string | null;
  abbr: string;
  score: number;
  primaryColorHex: string | null;
}): ReactElement {
  const { side, logoUrl, abbr, score, primaryColorHex } = props;

  const style = primaryColorHex ? ({ backgroundColor: primaryColorHex } as const) : undefined;

  const watermarkOpacity = watermarkOpacityFromColor(primaryColorHex);
  return (
    <div className={`lf-score-block lf-score-block--${side}`} style={style}>
      {logoUrl ? (

        <img
          className="lf-score-watermark"
          src={logoUrl}
          alt=""
          aria-hidden="true"
          style={{ opacity: watermarkOpacity }}
          loading="lazy"
        />
      ) : null}

      <div className="lf-score-content">
        <div className="lf-team-abbr">{abbr}</div>
        <div className="lf-team-score">{score}</div>
      </div>
    </div>
  );
}

function BasesTriplet(props: {
  on1: boolean;
  on2: boolean;
  on3: boolean;
}): ReactElement {
  const { on1, on2, on3 } = props;

  return (
    <div className="lf-bases-triplet">
      <span className={`lf-base-diamond ${on1 ? "is-on" : ""}`} aria-label="Runner on first" />
      <span
        className={`lf-base-diamond lf-base-diamond--raised ${on2 ? "is-on" : ""}`}
        aria-label="Runner on second"
      />
      <span className={`lf-base-diamond ${on3 ? "is-on" : ""}`} aria-label="Runner on third" />
    </div>
  );
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
  } = useRealtimeGame(selectedProviderGameId);

  // --- Scroll live feed to bottom when new updates arrive ---
  const feedScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = feedScrollRef.current;
    if (el == null) {
      return;
    }
    el.scrollTop = el.scrollHeight;
  }, [updates]);

  // const iconButtonStyle: React.CSSProperties = {
  //   width: 32,
  //   height: 32,
  //   display: "inline-flex",
  //   alignItems: "center",
  //   justifyContent: "center",
  //   padding: 0,
  //   borderRadius: 6,
  //   border: "1px solid #ccc",
  //   background: "#fff",
  //   cursor: "pointer",
  // };

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

                return (
                  <li
                    key={g.providerGameId}
                    className={`game-card ${isSelected ? "selected" : ""}`}
                    style={{ display: "flex", justifyContent: "space-between" }}
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
                          aria-label="Join live"
                          title="Join live"
                          onClick={(): void => setSelectedProviderGameId(g.providerGameId ?? null)}
                          className={`join-btn icon-btn ${isSelected ? "selected" : ""}`}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="5 3 19 12 5 21 5 3" />
                          </svg>
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
            <h3>Live feed</h3>

            {/* Connection status */}
            {selectedProviderGameId != null && (
              <div
                style={{
                  fontSize: "0.75rem",
                  marginBottom: "0.25rem",
                  color: isConnected ? "green" : "red",
                  opacity: 0.8,
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


            {selectedProviderGameId == null && (
              <p className="live-feed-message">
                Select a game to join live.
              </p>
            )}

            {selectedProviderGameId != null && selectedGame == null && (
              <p className="live-feed-message">
                Selected game not found in list. (This would be unusual.)
              </p>
            )}

            {selectedProviderGameId != null && selectedGame != null && (
              <>
                <p className="live-feed-message">
                  Listening to{" "}
                  <strong>
                    {selectedGame.awayAbbr} @ {selectedGame.homeAbbr}
                  </strong>{" "}
                  — status: <em>{selectedGame.status}</em>
                </p>

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

                {updates.length === 0 && (
                  <p className="live-feed-message">No updates yet…</p>
                )}

                <div className="feed-scroll" ref={feedScrollRef}>
                  <ul className="live-feed-list">
                    {updates.map(
                      (
                        u: PlayUpdate,
                        index: number,
                      ): ReactElement => (
                        <li
                          key={`${u.ts}-${index}`}
                          className={
                            index === updates.length - 1
                              ? "latest-play"
                              : undefined
                          }
                        >
                          [
                          {u.half === "top" ? "Top" : "Bottom"}{" "}
                          {u.inning}
                          ]{" "}
                          {u.awayScore}–{u.homeScore} —{" "}
                          {u.batterName ?? "Batter"} vs{" "}
                          {u.pitcherName ?? "Pitcher"} —{" "}
                          {u.balls}-{u.strikes}, {u.outs} out
                          {u.outs === 1 ? "" : "s"}
                          {u.description != null &&
                            u.description.trim() !== "" && (
                              <> — {u.description}</>
                            )}
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}