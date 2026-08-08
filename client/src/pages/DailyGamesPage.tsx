import "./DailyGamesPage.css";
import { useRealtimeGame } from "../realtime/useRealtimeGame";
import { useRealtimeDailyGames, type DailyGameStatusWire } from "../realtime/useRealtimeDailyGames";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";

import type { GameViewDto } from "@bitslinger21/baseball-realtime-client";
import { gamesApi } from "../api/baseballApiClient";
import { PageTitle } from "../components/primitives/PageTitle";
import { PageMenu } from "../components/primitives/PageMenu";
import { FilterStrip, type Filter } from "./dailyGames/FilterStrip";
import { GameCardLive } from "./dailyGames/GameCardLive";
import { GameCardFinal } from "./dailyGames/GameCardFinal";
import { GameCardUpcoming } from "./dailyGames/GameCardUpcoming";

const DATE_STORAGE_KEY = "br-selected-date";

type TeamMeta = {
  displayName?: string | null;
  logoUrl?: string | null;
  primaryColorHex?: string | null;
};

function getTodayIso(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function prettyDate(iso: string): string {
  const parts = iso.split("-");
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function getPageTitle(iso: string): string {
  const today = getTodayIso();
  if (iso === today) return "Today's games";
  const dt = new Date(iso + "T12:00:00");
  const selMs = dt.getTime();
  const todayMs = new Date(today + "T12:00:00").getTime();
  const diffDays = Math.round((selMs - todayMs) / 86_400_000);
  if (diffDays === 1) return "Tomorrow's games";
  if (diffDays >= 2 && diffDays <= 6) {
    return `${dt.toLocaleDateString("en-US", { weekday: "long" })}'s games`;
  }
  const weekday = dt.toLocaleDateString("en-US", { weekday: "long" });
  const month = dt.toLocaleDateString("en-US", { month: "long" });
  const day = dt.getDate();
  return `Games for ${weekday}, ${month} ${day}`;
}

function getAwayMeta(g: GameViewDto): TeamMeta | null {
  return (g.awayTeamMeta as TeamMeta | null | undefined) ?? null;
}

function getHomeMeta(g: GameViewDto): TeamMeta | null {
  return (g.homeTeamMeta as TeamMeta | null | undefined) ?? null;
}

function getScores(g: GameViewDto): { away: number | null; home: number | null } {
  const away = typeof (g.awayScore as unknown) === "number" ? (g.awayScore as unknown as number) : null;
  const home = typeof (g.homeScore as unknown) === "number" ? (g.homeScore as unknown as number) : null;

  const ls = g.linescore;
  const away2 = away ?? (typeof (ls?.away?.runs as unknown) === "number" ? (ls!.away!.runs as unknown as number) : null);
  const home2 = home ?? (typeof (ls?.home?.runs as unknown) === "number" ? (ls!.home!.runs as unknown as number) : null);

  return { away: away2, home: home2 };
}

function formatStartTime(g: GameViewDto): string {
  const startTimeUtc = g.startTimeUtc ?? null;
  if (!startTimeUtc) return "—";
  const d = new Date(startTimeUtc);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatGameStateCell(g: GameViewDto): string {
  const status = g.status as string | null;
  const detailedState = (g.detailedState as string | null | undefined) ?? null;

  if (status === "final") {
    return detailedState && detailedState !== "" ? detailedState : "Final";
  }

  if (status !== "live") {
    if (detailedState != null && detailedState !== "" && detailedState !== "Scheduled") {
      return detailedState;
    }
    return formatStartTime(g);
  }

  const ls = g.linescore;
  const inning =
    typeof (g.inning as unknown) === "number"
      ? (g.inning as unknown as number)
      : typeof (g.currentInning as unknown) === "number"
        ? (g.currentInning as unknown as number)
        : typeof (ls?.currentInning as unknown) === "number"
          ? (ls!.currentInning as unknown as number)
          : null;

  const halfRaw =
    typeof g.half === "string"
      ? g.half
      : typeof (g.halfInning as unknown) === "string"
        ? (g.halfInning as unknown as string)
        : typeof (ls?.inningHalf as unknown) === "string"
          ? (ls!.inningHalf as unknown as string)
          : null;

  const isTop =
    typeof (g.isTopInning as unknown) === "boolean"
      ? (g.isTopInning as unknown as boolean)
      : typeof (ls?.isTopInning as unknown) === "boolean"
        ? (ls!.isTopInning as unknown as boolean)
        : halfRaw != null
          ? halfRaw.toLowerCase().includes("top")
          : null;

  if (inning == null) {
    return detailedState && detailedState !== "" ? detailedState : "Live";
  }

  const outs =
    typeof (g.outs as unknown) === "number"
      ? (g.outs as unknown as number)
      : typeof (ls?.outs as unknown) === "number"
        ? (ls!.outs as unknown as number)
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

function getVenueText(g: GameViewDto): string | null {
  const snapshot = (g.snapshot as Record<string, unknown> | null | undefined) ?? null;
  if (snapshot == null) return null;
  const venue = typeof snapshot.venue === "string" ? snapshot.venue : null;
  const city = typeof snapshot.city === "string" ? snapshot.city : null;
  const state = typeof snapshot.state === "string" ? snapshot.state : null;
  if (venue != null && city != null && state != null) return `${venue} — ${city}, ${state}`;
  if (venue != null && city != null) return `${venue} — ${city}`;
  return venue;
}

function getInningNumber(g: GameViewDto): number | null {
  return typeof (g.inning as unknown) === "number"
    ? (g.inning as unknown as number)
    : typeof (g.currentInning as unknown) === "number"
      ? (g.currentInning as unknown as number)
      : typeof (g.linescore?.currentInning as unknown) === "number"
        ? (g.linescore!.currentInning as unknown as number)
        : null;
}

function isLateGame(g: GameViewDto): boolean {
  if ((g.status as string) !== "live") return false;
  const inning = getInningNumber(g);
  if (inning == null || inning < 7) return false;
  const { away, home } = getScores(g);
  if (away == null || home == null) return true;
  return Math.abs(away - home) <= 3;
}

function mapPhaseToStatus(phase: DailyGameStatusWire["phase"]): string {
  switch (phase) {
    case "LIVE": return "live";
    case "FINAL": return "final";
    case "DELAYED": return "delayed";
    case "POSTPONED": return "postponed";
    case "SUSPENDED": return "suspended";
    case "CANCELLED": return "cancelled";
    default: return "scheduled";
  }
}

function applyDailyOverride(g: GameViewDto, ws: DailyGameStatusWire | undefined): GameViewDto {
  if (ws == null) return g;
  const ls = g.linescore ?? {};
  return {
    ...g,
    status: mapPhaseToStatus(ws.phase) as GameViewDto["status"],
    awayScore: ws.awayScore ?? g.awayScore,
    homeScore: ws.homeScore ?? g.homeScore,
    detailedState: (ws.detailedState ?? (g as unknown as Record<string, unknown>).detailedState) as never,
    inning: (ws.inning ?? (g as unknown as Record<string, unknown>).inning) as never,
    half: (ws.half ?? g.half) as GameViewDto["half"],
    outs: (ws.outs ?? (g as unknown as Record<string, unknown>).outs) as never,
    linescore: {
      ...ls,
      away: { ...(ls.away ?? {}), runs: ws.awayScore ?? ls.away?.runs },
      home: { ...(ls.home ?? {}), runs: ws.homeScore ?? ls.home?.runs },
      currentInning: ws.inning ?? ls.currentInning,
      isTopInning: ws.half === "top" ? true : ws.half === "bottom" ? false : ls.isTopInning,
      inningHalf: ws.half === "top" ? "Top" : ws.half === "bottom" ? "Bottom" : ls.inningHalf,
      outs: ws.outs ?? (ls as unknown as Record<string, unknown>).outs,
    },
  } as unknown as GameViewDto;
}

function withBadgeTestOverrides(g: GameViewDto): GameViewDto {
  const params = new URLSearchParams(window.location.search);
  if (params.get("badgeTest") !== "1") return g;
  const providerGameId = g.providerGameId ?? null;
  if (providerGameId == null || providerGameId === "") return g;
  if (providerGameId.endsWith("7") || providerGameId.endsWith("9")) {
    return {
      ...g,
      status: "live" as GameViewDto["status"],
      currentInning: 8,
      isTopInning: true,
      linescore: { away: { runs: 2, hits: 0 }, home: { runs: 3, hits: 7 }, currentInning: 8, inningHalf: "Top", isTopInning: true },
    } as unknown as GameViewDto;
  }
  if (providerGameId.endsWith("1") || providerGameId.endsWith("3")) {
    return {
      ...g,
      status: "live" as GameViewDto["status"],
      currentInning: 10,
      isTopInning: false,
      linescore: { away: { runs: 4, hits: 9 }, home: { runs: 5, hits: 10 }, currentInning: 10, inningHalf: "Bot", isTopInning: false },
    } as unknown as GameViewDto;
  }
  return g;
}

function teamBase(meta: TeamMeta | null, abbr: string | null | undefined) {
  return {
    name: meta?.displayName ?? abbr ?? "?",
    abbr: abbr ?? "?",
    logoUrl: meta?.logoUrl ?? null,
    primaryColor: meta?.primaryColorHex ?? "var(--color-text-faint)",
  };
}

export default function DailyGamesPage() {
  const [games, setGames] = useState<readonly GameViewDto[]>([]);
  const [apiHydratedDate, setApiHydratedDate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lateFocusMode, setLateFocusMode] = useState<boolean>(false);
  const [filter, setFilter] = useState<Filter>("all");

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
        setGames([]);
        setApiHydratedDate(null);
        const response = await gamesApi.gamesListByDate(selectedDate);
        setGames(response.data ?? []);
        setApiHydratedDate(selectedDate);
      } catch (e) {
        setError("Failed to load games.");
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    void loadGames();
  }, [selectedDate]);

  const safeGames: readonly GameViewDto[] = (games ?? []).filter(
    (g: GameViewDto | undefined | null): g is GameViewDto => g != null,
  );

  // kept dormant — watching plumbing for future multi-game feature
  useRealtimeGame(null);
  const gameOverrides = useRealtimeDailyGames(selectedDate);

  const displayedGames: readonly GameViewDto[] = useMemo(() => {
    const activeOverrides = apiHydratedDate === selectedDate ? gameOverrides : new Map<string, DailyGameStatusWire>();
    return safeGames.map((g) =>
      applyDailyOverride(withBadgeTestOverrides(g), activeOverrides.get(g.providerGameId ?? "")),
    );
  }, [safeGames, gameOverrides, apiHydratedDate, selectedDate]);

  const liveGames = useMemo(() => {
    const live = displayedGames.filter((g) => (g.status as string) === "live");
    return lateFocusMode ? live.filter(isLateGame) : live;
  }, [displayedGames, lateFocusMode]);

  const finalGames = useMemo(
    () => displayedGames.filter((g) => (g.status as string) === "final"),
    [displayedGames],
  );

  const upcomingGames = useMemo(
    () => displayedGames.filter((g) => (g.status as string) !== "live" && (g.status as string) !== "final"),
    [displayedGames],
  );

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
    setFilter("all");
  };

  const handleDateChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const value = event.target.value;
    if (value == null || value === "") return;
    setSelectedDate(value);
    setFilter("all");
  };

  const showLive = filter === "all" || filter === "live";
  const showFinal = filter === "all" || filter === "final";
  const showUpcoming = filter === "all" || filter === "upcoming";

  const subtitle =
    safeGames.length > 0
      ? `${prettyDate(selectedDate)} · ${safeGames.length} game${safeGames.length === 1 ? "" : "s"}`
      : prettyDate(selectedDate);

  return (
    <section className="page-container">
      <PageTitle
        navMenu={<PageMenu showBack={false} />}
        title={getPageTitle(selectedDate)}
        subtitle={subtitle}
        right={
          <div className="date-controls">
            <button type="button" className="join-btn" onClick={() => shiftDate(-1)}>← Prev</button>
            {selectedDate !== getTodayIso() && (
              <button type="button" className="join-btn" onClick={() => { setSelectedDate(getTodayIso()); setFilter("all"); }}>
                Today
              </button>
            )}
            <input type="date" value={selectedDate} onChange={handleDateChange} />
            <button type="button" className="join-btn" onClick={() => shiftDate(1)}>Next →</button>
          </div>
        }
      />

      <FilterStrip
        filter={filter}
        onChange={setFilter}
        counts={{ live: liveGames.length, final: finalGames.length, upcoming: upcomingGames.length }}
        lateFocus={lateFocusMode}
        onLateFocusToggle={() => setLateFocusMode((v) => !v)}
      />

      {isLoading && (
        <div className="status-banner status-banner--loading">Loading games…</div>
      )}
      {error !== null && (
        <div className="status-banner status-banner--error">Failed to load games. Details: {error}</div>
      )}
      {!isLoading && error === null && safeGames.length === 0 && (
        <div className="status-banner status-banner--empty">No games scheduled for this date.</div>
      )}
      {!isLoading && error === null && safeGames.length > 0 && lateFocusMode && liveGames.length === 0 && (filter === "all" || filter === "live") && (
        <div className="status-banner status-banner--empty">No close late-game action right now. Check back later.</div>
      )}

      <div className="dgp-content">
        {showLive && liveGames.length > 0 && (
          <div className="dgp-section">
            <div className="dgp-section__label">Live now · {liveGames.length}</div>
            <div className="dgp-grid dgp-grid--2">
              {liveGames.map((g) => {
                const awayMeta = getAwayMeta(g);
                const homeMeta = getHomeMeta(g);
                const scores = getScores(g);
                const ls = g.linescore;
                const isTop: boolean | null =
                  typeof (g.isTopInning as unknown) === "boolean"
                    ? (g.isTopInning as unknown as boolean)
                    : typeof (ls?.isTopInning as unknown) === "boolean"
                      ? (ls!.isTopInning as unknown as boolean)
                      : null;
                return (
                  <GameCardLive
                    key={g.providerGameId}
                    away={{ ...teamBase(awayMeta, g.awayAbbr), score: scores.away }}
                    home={{ ...teamBase(homeMeta, g.homeAbbr), score: scores.home }}
                    gameState={formatGameStateCell(g)}
                    isTopInning={isTop}
                    inning={getInningNumber(g)}
                    onEnter={() => { if (g.providerGameId != null) navigate(`/game/${g.providerGameId}`, { state: { gameStatus: g.status, from: "/" } }); }}
                  />
                );
              })}
            </div>
          </div>
        )}

        {showFinal && finalGames.length > 0 && (
          <div className="dgp-section">
            <div className="dgp-section__label">Final · {finalGames.length}</div>
            <div className="dgp-grid dgp-grid--4">
              {finalGames.map((g) => {
                const scores = getScores(g);
                return (
                  <GameCardFinal
                    key={g.providerGameId}
                    away={{ ...teamBase(getAwayMeta(g), g.awayAbbr), score: scores.away }}
                    home={{ ...teamBase(getHomeMeta(g), g.homeAbbr), score: scores.home }}
                    venue={getVenueText(g)}
                    innings={getInningNumber(g)}
                    onEnter={() => { if (g.providerGameId != null) navigate(`/game/${g.providerGameId}`, { state: { gameStatus: g.status, from: "/" } }); }}
                  />
                );
              })}
            </div>
          </div>
        )}

        {showUpcoming && upcomingGames.length > 0 && (
          <div className="dgp-section">
            <div className="dgp-section__label">Upcoming · {upcomingGames.length}</div>
            <div className="dgp-grid dgp-grid--4">
              {upcomingGames.map((g) => (
                <GameCardUpcoming
                  key={g.providerGameId}
                  away={teamBase(getAwayMeta(g), g.awayAbbr)}
                  home={teamBase(getHomeMeta(g), g.homeAbbr)}
                  startTime={formatStartTime(g)}
                  venue={getVenueText(g)}
                  onEnter={() => { if (g.providerGameId != null) navigate(`/game/${g.providerGameId}`, { state: { gameStatus: g.status, from: "/" } }); }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
