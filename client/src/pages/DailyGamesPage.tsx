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
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>
                        {g.awayAbbr} @ {g.homeAbbr}{" "}
                        <span style={{ opacity: 0.7 }}>({g.status})</span>
                      </div>
                      <div style={{ fontSize: "0.8rem", opacity: 0.7 }}>
                        {g.gameDate}
                      </div>
                    </div>

                    <button
                      type="button"
                      className={`join-btn ${isSelected ? "selected" : ""}`}
                      onClick={(): void =>
                        setSelectedProviderGameId(g.providerGameId ?? null)
                      }
                    >
                      {isSelected ? "Listening…" : "Join live"}
                    </button>

                    <button
                      type="button"
                      className="join-btn"
                      onClick={(): void => {
                        if (g.providerGameId != null) {
                          navigate(`/game/${g.providerGameId}`);
                        }
                      }}
                      style={{ marginLeft: "0.5rem" }}
                    >
                      Open game page
                    </button>
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
                  <div className="scoreboard">
                    <div className="sb-row">
                      <span className="sb-team">
                        {selectedGame.awayAbbr}
                      </span>
                      <span className="sb-score">
                        {updates[updates.length - 1].awayScore}
                      </span>

                      <span className="sb-team">
                        {selectedGame.homeAbbr}
                      </span>
                      <span className="sb-score">
                        {updates[updates.length - 1].homeScore}
                      </span>
                    </div>

                    <div className="sb-row sb-info">
                      <span>
                        {updates[updates.length - 1].half === "top"
                          ? "Top"
                          : "Bottom"}{" "}
                        {updates[updates.length - 1].inning}
                      </span>
                      <span>
                        {updates[updates.length - 1].outs} out
                        {updates[updates.length - 1].outs === 1 ? "" : "s"}
                      </span>
                    </div>

                    <div className="sb-bases">
                      <span
                        className={
                          updates[updates.length - 1].bases.on1
                            ? "base active"
                            : "base"
                        }
                      />
                      <span
                        className={
                          updates[updates.length - 1].bases.on2
                            ? "base active"
                            : "base"
                        }
                      />
                      <span
                        className={
                          updates[updates.length - 1].bases.on3
                            ? "base active"
                            : "base"
                        }
                      />
                    </div>
                  </div>
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