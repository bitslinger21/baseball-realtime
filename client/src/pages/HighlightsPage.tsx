import { useCallback, useEffect, useState } from "react";
import type { ChangeEvent, ReactElement } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { BrandHeader } from "../components/primitives/BrandHeader";
import { PageTitle } from "../components/primitives/PageTitle";
import { Card } from "../components/primitives/Card";
import { LivePill, Pill } from "../components/primitives/Pill";
import { Segmented } from "../components/primitives/Segmented";
import { TeamDot } from "../components/primitives/TeamDot";
import { TEAMS } from "../utils/teams";
import type { ClipWire } from "./game/clipTypes";
import { ClipCard } from "./game/GameHighlightsRow";
import { ClipOverlay } from "./home/ClipOverlay";
import "./DailyGamesPage.css";
import "./HighlightsPage.css";

// HIGHLIGHTS — a second view of Games, not a new nav item
// (PROMPT_highlights_page.md): every game of a day that has clips, one card
// each, reached from the Scores | Highlights switch. Shares the Games date
// (br-selected-date) so switching views keeps it; its own URL carries it too.

export const GAMES_DATE_STORAGE_KEY = "br-selected-date";

interface DayTeamWire {
  abbr: string;
  id: number | null;
  runs: number;
}

interface DayGameWire {
  gameId: string;
  away: DayTeamWire;
  home: DayTeamWire;
  state: "live" | "final";
  half: string | null;
  startTime: string | null;
  clips: ClipWire[];
}

const LIVE_REFRESH_MS = 60_000;

function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function shiftIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

// "Sun May 24"
function shortDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }).replace(",", "");
}

function readStoredDate(): string | null {
  try {
    return window.localStorage.getItem(GAMES_DATE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function useDayClips(date: string): { games: DayGameWire[]; loaded: boolean } {
  const [state, setState] = useState<{ date: string; games: DayGameWire[] } | null>(null);
  const anyLive = state?.date === date && state.games.some((g) => g.state === "live");

  useEffect(() => {
    let cancelled = false;
    const load = (): void => {
      void fetch(`/api/clips?date=${encodeURIComponent(date)}`)
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error("bad response"))))
        .then((games: DayGameWire[]) => {
          if (!cancelled) setState({ date, games });
        })
        // Clips are additive: a failure reads exactly like a day with none.
        .catch(() => {
          if (!cancelled) setState({ date, games: [] });
        });
    };
    load();
    if (!anyLive) return () => {
      cancelled = true;
    };
    const id = window.setInterval(load, LIVE_REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [date, anyLive]);

  return { games: state?.date === date ? state.games : [], loaded: state?.date === date };
}

function teamInfo(t: DayTeamWire) {
  return TEAMS[t.abbr] ?? { abbr: t.abbr, id: t.id ?? 0, name: t.abbr, short: t.abbr, primary: "#5c574f", secondary: "#cfc8b4" };
}

// One row per game, collapsed: logo · score · logo · state … N clips · Open
// game →. Clicking the row opens its clip grid (thumbnails only load then);
// opening another row closes this one, so a 15-game day stays scannable.
function GameCard({
  game,
  expanded,
  onToggle,
  onPlay,
}: {
  game: DayGameWire;
  expanded: boolean;
  onToggle: () => void;
  onPlay: (clipId: string) => void;
}): ReactElement {
  const awayLead = game.away.runs > game.home.runs;
  const homeLead = game.home.runs > game.away.runs;
  return (
    <Card padless>
      <div
        className={`hl__head${expanded ? " hl__head--open" : ""}`}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
      >
        <TeamDot team={teamInfo(game.away)} size={22} />
        {/* A game score keeps the dash form: away + runs – runs + home. */}
        <span className="hl__score num">
          <span className={awayLead ? "hl__lead" : "hl__trail"}>
            {game.away.abbr} {game.away.runs}
          </span>
          <span className="hl__trail"> – </span>
          <span className={homeLead ? "hl__lead" : "hl__trail"}>
            {game.home.runs} {game.home.abbr}
          </span>
        </span>
        <TeamDot team={teamInfo(game.home)} size={22} />
        {game.state === "live" ? (
          <span className="hl__state">
            <LivePill />
            {game.half != null && <span className="hl__half num">{game.half}</span>}
          </span>
        ) : (
          <Pill tone="soft">Final</Pill>
        )}
        <span className="hl__spacer" />
        <span className="hl__count num">
          {game.clips.length} {game.clips.length === 1 ? "clip" : "clips"}
        </span>
        <Link to={`/game/${game.gameId}`} className="hl__open" onClick={(e) => e.stopPropagation()}>
          Open game →
        </Link>
        <span className="hl__caret" aria-hidden="true">{expanded ? "▴" : "▾"}</span>
      </div>
      {expanded && (
        <div className="hl__grid">
          {game.clips.map((c) => (
            <ClipCard key={c.id} clip={c} active={false} onClick={() => onPlay(c.id)} />
          ))}
        </div>
      )}
    </Card>
  );
}

export default function HighlightsPage(): ReactElement {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const date = params.get("date") ?? readStoredDate() ?? todayIso();
  const { games, loaded } = useDayClips(date);
  const [playing, setPlaying] = useState<{ gameId: string; clipId: string } | null>(null);
  // One game open at a time; a new date starts with every row collapsed.
  const [openGameId, setOpenGameId] = useState<string | null>(null);
  useEffect(() => setOpenGameId(null), [date]);

  // The date lives in the URL here, and in the shared key Games reads.
  const setDate = useCallback(
    (next: string): void => {
      setParams({ date: next });
      try {
        window.localStorage.setItem(GAMES_DATE_STORAGE_KEY, next);
      } catch {
        // ignore
      }
    },
    [setParams],
  );
  useEffect(() => {
    if (params.get("date") == null) setDate(date);
  }, [params, date, setDate]);

  const clipCount = games.reduce((n, g) => n + g.clips.length, 0);
  const playingGame = playing != null ? games.find((g) => g.gameId === playing.gameId) : undefined;

  return (
    <>
      <BrandHeader active="games" />
      <section className="page-container">
        <PageTitle
          title="Highlights"
          subtitle={
            <>
              {shortDate(date)} · <span className="num">{games.length}</span> {games.length === 1 ? "game" : "games"} ·{" "}
              <span className="num">{clipCount}</span> {clipCount === 1 ? "clip" : "clips"}
            </>
          }
          subtitleRight={
            <div className="date-controls">
              <button type="button" className="join-btn" onClick={() => setDate(shiftIso(date, -1))}>← Prev</button>
              {date !== todayIso() && (
                <button type="button" className="join-btn" onClick={() => setDate(todayIso())}>Today</button>
              )}
              <input
                type="date"
                value={date}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  if (e.target.value !== "") setDate(e.target.value);
                }}
              />
              <button type="button" className="join-btn" onClick={() => setDate(shiftIso(date, 1))}>Next →</button>
            </div>
          }
        />
        <div className="hl__body">
          <div>
            <Segmented items={["Scores", "Highlights"]} active={1} onClick={(i) => i === 0 && navigate("/games")} size="sm" />
          </div>
          {loaded && games.length === 0 && <p className="hl__empty">No highlights yet for {shortDate(date)}</p>}
          {games.map((g) => (
            <GameCard
              key={g.gameId}
              game={g}
              expanded={openGameId === g.gameId}
              onToggle={() => setOpenGameId((cur) => (cur === g.gameId ? null : g.gameId))}
              onPlay={(clipId) => setPlaying({ gameId: g.gameId, clipId })}
            />
          ))}
        </div>
      </section>
      {playing != null && playingGame != null && (
        <ClipOverlay
          title="More from this game"
          clips={playingGame.clips}
          activeId={playing.clipId}
          gameId={playingGame.gameId}
          live={playingGame.state === "live"}
          onPick={(clipId) => setPlaying({ gameId: playingGame.gameId, clipId })}
          onClose={() => setPlaying(null)}
        />
      )}
    </>
  );
}
