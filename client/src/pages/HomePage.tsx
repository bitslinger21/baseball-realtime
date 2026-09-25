import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import { BrandHeader } from "../components/primitives/BrandHeader";
import { PageTitle } from "../components/primitives/PageTitle";
import { TeamDot } from "../components/primitives/TeamDot";
import { Headshot } from "../components/primitives/Headshot";
import { Inning } from "../components/primitives/Inning";
import { IQDiamond } from "../components/primitives/IQDiamond";
import { EdgeButton } from "../components/primitives/EdgeButton";
import { Segmented } from "../components/primitives/Segmented";
import { playersApi } from "../api/baseballApiClient";
import { TEAMS } from "../utils/teams";
import {
  follow,
  unfollow,
  useFollowing,
  MAX_FOLLOWED,
  type FollowedEntity,
} from "../utils/following";
import "./HomePage.css";

// HOME — the app's front door. Answers "what deserves my attention", not
// "show me everything" (that's Games/Standings/Leaders).
// Layout per PROMPT_home_layout.md §A1: two rows, not two columns —
// [What's hot | Following 320px] then Races, Chases, In the news full width.

function useNarrow(breakpoint: number): boolean {
  const [narrow, setNarrow] = useState(() => window.matchMedia(`(max-width: ${breakpoint}px)`).matches);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const onChange = (): void => setNarrow(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [breakpoint]);
  return narrow;
}

// ── What's Hot ────────────────────────────────────────────────────────────

interface HotGameContext {
  providerGameId: string;
  awayAbbr: string;
  homeAbbr: string;
  awayRuns: number;
  homeRuns: number;
  half: "top" | "bottom";
  inning: number;
  isFinal: boolean;
}

interface HotMoveContext {
  fromAbbr: string;
  toAbbr: string | null;
}

// Net-new context type (§A3.3) — a mini standings block for a hot item whose
// significance IS race state (a lead change, a tie, a berth entering/
// leaving). No detector produces this yet (see "What the real-data check
// found" — race-state is a real, named future category, not built this
// pass), so this stays wired and unused rather than fabricated.
interface HotRaceContext {
  title: string;
  rows: { abbr: string; displayName: string; gamesBack: string }[];
}

interface HotEventItem {
  id: string;
  text: string;
  iq: boolean;
  iqSuggested: string[];
  game?: HotGameContext;
  move?: HotMoveContext;
  race?: HotRaceContext;
}

interface HotEventWire {
  id: string;
  headline: string;
  hasIqContext: boolean;
  iqSuggested: string[];
  game?: {
    providerGameId: string;
    awayAbbr: string;
    homeAbbr: string;
    awayScore: number;
    homeScore: number;
    half: "top" | "bottom";
    inning: number;
    isFinal: boolean;
  } | null;
}

function toHotEventItem(w: HotEventWire): HotEventItem {
  return {
    id: w.id,
    text: w.headline,
    iq: w.hasIqContext,
    iqSuggested: w.iqSuggested,
    game:
      w.game != null
        ? {
            providerGameId: w.game.providerGameId,
            awayAbbr: w.game.awayAbbr,
            homeAbbr: w.game.homeAbbr,
            awayRuns: w.game.awayScore,
            homeRuns: w.game.homeScore,
            half: w.game.half,
            inning: w.game.inning,
            isFinal: w.game.isFinal,
          }
        : undefined,
  };
}

const HOT_REFRESH_MS = 30_000;
const HOT_SHOWN = 5;

function useHotEvents(): HotEventItem[] {
  const [items, setItems] = useState<HotEventItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = (): void => {
      void fetch("/api/home/hot")
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error("bad response"))))
        .then((res: { events: HotEventWire[] }) => {
          if (!cancelled) setItems(res.events.map(toHotEventItem));
        })
        .catch(() => {
          // Leave whatever was last successfully loaded — a transient failure
          // here shouldn't blank out to "Nothing cooking yet." misleadingly.
        });
    };
    load();
    const id = window.setInterval(load, HOT_REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  return items;
}

// ── Day ahead — What's Hot's fallback body/tail (§A4) ────────────────────

interface DayAheadRowWire {
  providerGameId: string;
  awayAbbr: string;
  homeAbbr: string;
  startTimeUtc: string | null;
  awayPitcherName: string | null;
  homePitcherName: string | null;
  stake: string | null;
}

function useDayAhead(): { games: DayAheadRowWire[]; totalCount: number } {
  const [data, setData] = useState<{ games: DayAheadRowWire[]; totalCount: number }>({
    games: [],
    totalCount: 0,
  });

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/home/day-ahead")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("bad response"))))
      .then((res: { games: DayAheadRowWire[]; totalCount: number }) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        // Leave the default empty state.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return data;
}

function DayAheadRow({ g }: { g: DayAheadRowWire }): ReactElement {
  const away = TEAMS[g.awayAbbr];
  const home = TEAMS[g.homeAbbr];
  const time =
    g.startTimeUtc != null
      ? new Date(g.startTimeUtc).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
      : "TBD";
  return (
    <Link to={`/game/${g.providerGameId}`} className="home__dayahead-row">
      <div className="home__dayahead-left">
        <span className="home__dayahead-time num">{time}</span>
        {g.stake != null && <span className="home__dayahead-stake">{g.stake}</span>}
      </div>
      <div className="home__dayahead-matchup">
        {away && <TeamDot team={away} size={18} />}
        <span className="home__dayahead-pitcher">{g.awayPitcherName ?? "TBD"}</span>
        <span className="home__dayahead-at">@</span>
        {home && <TeamDot team={home} size={18} />}
        <span className="home__dayahead-pitcher">{g.homePitcherName ?? "TBD"}</span>
      </div>
    </Link>
  );
}

// Two jobs, one component: the section's whole body when nothing's hot
// (the normal pregame state, not an error), or a sized tail under "Coming
// up today" when 1-2 items are hot. A SHORTLIST capped at 4 — never the
// slate, that's what Games is for.
function DayAhead({ mode, count }: { mode: "body" | "tail"; count: number }): ReactElement | null {
  const { games, totalCount } = useDayAhead();
  if (games.length === 0) return null;
  const shown = mode === "body" ? games : games.slice(0, count);

  return (
    <div className={`home__dayahead${mode === "tail" ? " home__dayahead--tail" : ""}`}>
      {mode === "body" ? (
        <p className="home__dayahead-heading">Nothing cooking yet — here is the day ahead.</p>
      ) : (
        <span className="home__eyebrow home__dayahead-eyebrow">Coming up today</span>
      )}
      {shown.map((g) => (
        <DayAheadRow key={g.providerGameId} g={g} />
      ))}
      <Link
        to="/games"
        className="home__dayahead-all"
        onClick={() => {
          // Games remembers the last date it showed (br-selected-date) — a
          // bare link there lands on whatever day was last browsed instead
          // of today, which is what "games today" actually promised.
          try {
            const now = new Date();
            const iso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
            window.localStorage.setItem("br-selected-date", iso);
          } catch {
            // ignore
          }
        }}
      >
        All {totalCount} games today →
      </Link>
    </div>
  );
}

function SectionHead({
  label,
  note,
  right,
}: {
  label: string;
  note?: string;
  right?: ReactElement;
}): ReactElement {
  return (
    <div className="home__section-head">
      <span className="home__eyebrow">{label}</span>
      {note && <span className="home__section-note">{note}</span>}
      <span className="home__section-head-spacer" />
      {right}
    </div>
  );
}

function GameContext({ g }: { g: HotGameContext }): ReactElement {
  const away = TEAMS[g.awayAbbr];
  const home = TEAMS[g.homeAbbr];
  const leader = g.awayRuns === g.homeRuns ? null : g.awayRuns > g.homeRuns ? "away" : "home";

  const row = (team: typeof away, runs: number, isLeader: boolean | null): ReactElement => (
    <div className="home__game-row">
      <TeamDot team={team} size={18} />
      <span className={`home__game-abbr num${isLeader === false ? " home__game-abbr--trail" : ""}`}>
        {team.abbr}
      </span>
      <span className={`home__game-runs num${isLeader === false ? " home__game-runs--trail" : ""}`}>
        {runs}
      </span>
    </div>
  );

  return (
    <Link to={`/game/${g.providerGameId}`} className="home__game-context">
      <div className="home__game-rows">
        {row(away, g.awayRuns, leader === null ? null : leader === "away")}
        {row(home, g.homeRuns, leader === null ? null : leader === "home")}
      </div>
      <div className="home__game-inning">
        {/* A final game renders "Final", never a rust inning arrow —
            `Inning` only knows top/bottom, so a final drew a rust ▼9, which
            in this language means "live, bottom of the ninth". */}
        {g.isFinal ? (
          <span className="home__game-final">Final</span>
        ) : (
          <Inning half={g.half} num={g.inning} size={13} color="var(--color-accent)" />
        )}
      </div>
    </Link>
  );
}

function MoveContext({ m }: { m: HotMoveContext }): ReactElement | null {
  const from = TEAMS[m.fromAbbr];
  const to = m.toAbbr ? TEAMS[m.toAbbr] : null;
  if (!from) return null;
  return (
    <div className="home__move">
      <TeamDot team={from} size={20} />
      <span className="home__move-abbr num">{from.abbr}</span>
      {to && (
        <>
          <span className="home__move-arrow">→</span>
          <TeamDot team={to} size={20} />
          <span className="home__move-abbr num">{to.abbr}</span>
        </>
      )}
    </div>
  );
}

function RaceContext({ r }: { r: HotRaceContext }): ReactElement {
  return (
    <div className="home__race-context">
      <span className="home__race-context-title">{r.title}</span>
      {r.rows.map((row) => {
        const team = TEAMS[row.abbr];
        return (
          <div key={row.abbr} className="home__race-context-row">
            <span className="home__race-context-logo-slot">{team && <TeamDot team={team} size={16} />}</span>
            <span className="home__race-context-abbr num">{row.abbr}</span>
            {/* Clinched → the column goes empty rather than repeating a
                per-row marker; the eyebrow above already says CLINCHED. */}
            <span className="home__race-context-gb num">{row.gamesBack === "IN" ? "" : row.gamesBack}</span>
          </div>
        );
      })}
    </div>
  );
}

// The existing Baseball IQ experience translated to a light surface: a
// free-text field answered by the real /api/iq/query endpoint. Suggested
// question chips need per-event context from the (not yet built)
// significance generator, so they're omitted rather than invented.
function IQPanel({ item, onClose }: { item: HotEventItem; onClose: () => void }): ReactElement {
  const [q, setQ] = useState("");
  const [phase, setPhase] = useState<"idle" | "thinking" | "answered" | "error">("idle");
  const [answer, setAnswer] = useState<{ headline: string; unit?: string; sub: string } | null>(null);

  const ask = (text: string): void => {
    setQ(text);
    setPhase("thinking");
    void fetch("/api/iq/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId: item.game?.providerGameId ?? item.id, updateIndex: 0, question: text }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("bad response"))))
      .then((res: { ok: boolean; headline: string; unit?: string; sub: string }) => {
        if (!res.ok) {
          setPhase("error");
          return;
        }
        setAnswer({ headline: res.headline, unit: res.unit, sub: res.sub });
        setPhase("answered");
      })
      .catch(() => setPhase("error"));
  };

  return (
    <div className="home__iq-panel">
      <div className="home__iq-panel-head">
        <IQDiamond size={15} />
        <span className="home__iq-panel-label">Baseball IQ</span>
        <span className="home__section-head-spacer" />
        <button type="button" className="home__iq-panel-close" aria-label="Close Baseball IQ" onClick={onClose}>
          ✕
        </button>
      </div>
      <div className="home__iq-panel-body">
        <input
          className="home__iq-panel-input"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            if (phase !== "thinking") setPhase("idle");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && q.trim() !== "") ask(q.trim());
          }}
          disabled={phase === "thinking"}
          placeholder="Ask about this…"
        />
        {phase === "idle" && item.iqSuggested.length > 0 && (
          <div className="home__iq-panel-suggested">
            {item.iqSuggested.map((s) => (
              <button key={s} type="button" className="home__iq-panel-chip" onClick={() => ask(s)}>
                {s}
              </button>
            ))}
          </div>
        )}
        {phase === "thinking" && (
          <div className="home__iq-panel-thinking">
            <span className="home__iq-panel-pulse">
              <IQDiamond size={16} />
            </span>
            <span>Reading the record…</span>
          </div>
        )}
        {phase === "answered" && answer && (
          <div className="home__iq-panel-answer">
            <div className="home__iq-panel-answer-head">
              <span className="home__iq-panel-headline num">{answer.headline}</span>
              {answer.unit && <span className="home__iq-panel-unit">{answer.unit}</span>}
            </div>
            <p className="home__iq-panel-sub">{answer.sub}</p>
          </div>
        )}
        {phase === "error" && <div className="home__iq-panel-error">Baseball IQ could not answer that one.</div>}
      </div>
    </div>
  );
}

function HotItemRow({
  item,
  open,
  onToggleIQ,
}: {
  item: HotEventItem;
  open: boolean;
  onToggleIQ: () => void;
}): ReactElement {
  return (
    <div className="home__hot-item">
      <div className="home__hot-item-grid">
        {item.iq ? (
          <button
            type="button"
            className={`home__hot-bullet home__hot-bullet--iq${open ? " home__hot-bullet--open" : ""}`}
            title="Baseball IQ has context for this"
            onClick={onToggleIQ}
          >
            <IQDiamond size={17} />
          </button>
        ) : (
          <span className="home__hot-bullet">
            <span className="home__hot-dot" />
          </span>
        )}

        <div className="home__hot-item-main">
          <p className="home__hot-text">{item.text}</p>
          {item.move && <MoveContext m={item.move} />}
          {open && <IQPanel item={item} onClose={onToggleIQ} />}
        </div>

        {/* Only one context type per item. */}
        {item.game ? <GameContext g={item.game} /> : item.race ? <RaceContext r={item.race} /> : null}
      </div>
    </div>
  );
}

// ── Following — a narrow sticky rail, not a wide tile grid (§A1, A5) ─────

interface FollowRowWire {
  kind: "team" | "player";
  id: string;
  name: string;
  teamAbbr: string | null;
  state: "live" | "final" | "scheduled" | "idle";
  faces: string[];
  gameId: string | null;
  mlbId: number | null;
}

const FOLLOWING_REFRESH_MS = 30_000;
const STATE_ORDER: Record<FollowRowWire["state"], number> = {
  live: 0,
  final: 1,
  scheduled: 2,
  idle: 3,
};

function useFollowingRows(entities: FollowedEntity[]): FollowRowWire[] {
  const [rows, setRows] = useState<FollowRowWire[]>([]);
  const teamAbbrs = entities.filter((e) => e.kind === "team").map((e) => e.id);
  const playerIds = entities.filter((e) => e.kind === "player").map((e) => e.id);
  const key = `${teamAbbrs.join(",")}|${playerIds.join(",")}`;

  useEffect(() => {
    if (entities.length === 0) {
      setRows([]);
      return;
    }
    let cancelled = false;
    const load = (): void => {
      const params = new URLSearchParams();
      if (teamAbbrs.length > 0) params.set("teams", teamAbbrs.join(","));
      if (playerIds.length > 0) params.set("players", playerIds.join(","));
      void fetch(`/api/home/following?${params.toString()}`)
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error("bad response"))))
        .then((res: { rows: FollowRowWire[] }) => {
          if (!cancelled) setRows(res.rows);
        })
        .catch(() => {
          // Leave the last successfully loaded rows rather than blanking out.
        });
    };
    load();
    const id = window.setInterval(load, FOLLOWING_REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return rows;
}

// A followed entity as a TILE STACK (§A5/§6.2): mark · name · one
// self-describing line. Faces (today / season / next game) cycle in place
// via a shared EdgeButton, which never grows the tile or reflows the list.
// Live entities carry a 2px rust leading edge — not team colour, since a
// quarter of the league is close enough to rust to read as live.
//
// Port note (confirmed real): must use LONGHAND border properties, never
// the `border` shorthand, or a hover-triggered re-render wipes the live
// stripe and shifts the content. Implemented here as its own element
// instead, sidestepping the bug entirely.
function FollowingTile({ row }: { row: FollowRowWire }): ReactElement {
  const team = row.teamAbbr != null ? TEAMS[row.teamAbbr] : undefined;
  const [faceIdx, setFaceIdx] = useState(0);
  const face = row.faces[faceIdx % row.faces.length] ?? "";
  const hasMultipleFaces = row.faces.length > 1;

  return (
    <div className={`follow__tile${hasMultipleFaces ? " edge-hover" : ""}`}>
      <div className={`follow__tile-edge${row.state === "live" ? " follow__tile-edge--live" : ""}`} />
      {row.kind === "team" && team ? (
        <TeamDot team={team} size={28} />
      ) : (
        <Headshot
          mlbId={row.mlbId}
          initials={row.name.split(" ").map((w) => w[0]).join("")}
          teamColor={team?.primary ?? "var(--color-border-strong)"}
          size={28}
        />
      )}
      <div className="follow__tile-main">
        <div className="follow__tile-name">{row.name}</div>
        <div className="follow__tile-line num">{face}</div>
      </div>
      {hasMultipleFaces && (
        <EdgeButton
          edge="right"
          ariaLabel="Show next detail"
          onClick={() => setFaceIdx((i) => (i + 1) % row.faces.length)}
        />
      )}
    </div>
  );
}

const FOLLOW_ROW_HEIGHT = 58; // tile height + gap, for the 3-row (174px) page step

// Declared at module level — minted inside HomeScreen it would be a new
// component type every render, remounting and resetting scrollTop (the same
// latent bug the line-score band carried before its own fix).
function FollowRail({
  rows,
  maxHeight,
}: {
  rows: FollowRowWire[];
  maxHeight: number | null;
}): ReactElement {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canUp, setCanUp] = useState(false);
  const [canDown, setCanDown] = useState(false);
  const checkRef = useRef<() => void>(() => {});

  useEffect(() => {
    const el = scrollRef.current;
    if (el == null) return;
    const check = (): void => {
      setCanUp(el.scrollTop > 2);
      setCanDown(el.scrollHeight - el.scrollTop > el.clientHeight + 2);
    };
    checkRef.current = check;
    check();
    el.addEventListener("scroll", check);
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", check);
      ro.disconnect();
    };
  }, [rows.length, maxHeight]);

  // Native scrollbar suppressed (.follow__rail-scroll CSS) so there's one
  // scroll affordance, not two. Direct assignment, not scrollBy/scrollTo —
  // `{behavior:'smooth'}` is a silent no-op in some real environments, and a
  // programmatic scroll fires no `scroll` event, so the edge state is
  // re-checked by hand right after (PROMPT_home_layout.md PR B).
  const page = (dir: -1 | 1): void => {
    const el = scrollRef.current;
    if (el == null) return;
    el.scrollTop = el.scrollTop + dir * FOLLOW_ROW_HEIGHT * 3;
    checkRef.current();
  };

  return (
    <div className="follow__rail edge-hover" style={maxHeight != null ? { maxHeight } : undefined}>
      {canUp && <EdgeButton edge="top" ariaLabel="Scroll up" onClick={() => page(-1)} />}
      <div className="follow__rail-scroll" ref={scrollRef}>
        {rows.map((row) => (
          <FollowingTile key={`${row.kind}:${row.id}`} row={row} />
        ))}
      </div>
      {canDown && <EdgeButton edge="bottom" ariaLabel="Scroll down" onClick={() => page(1)} />}
    </div>
  );
}

// One panel, two entrances (the "Manage" link when the user follows
// something, "Choose teams and players" from the empty state) — never a
// separate onboarding picker, per spec.
function ManagePanel({ onClose }: { onClose: () => void }): ReactElement {
  const following = useFollowing();
  const [query, setQuery] = useState("");
  const [playerResults, setPlayerResults] = useState<
    { mlbId: number; name: string; teamAbbr: string }[]
  >([]);
  const atCap = following.length >= MAX_FOLLOWED;

  const teamResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q === "") return [];
    return Object.values(TEAMS)
      .filter((t) => t.name.toLowerCase().includes(q) || t.abbr.toLowerCase() === q)
      .slice(0, 5);
  }, [query]);

  useEffect(() => {
    const q = query.trim();
    if (q === "") {
      setPlayerResults([]);
      return;
    }
    let cancelled = false;
    void playersApi
      .playersSearchPlayers(q, String(new Date().getFullYear()))
      .then((res) => {
        if (!cancelled) setPlayerResults(res.data);
      })
      .catch(() => {
        if (!cancelled) setPlayerResults([]);
      });
    return () => {
      cancelled = true;
    };
  }, [query]);

  return (
    <div className="home__manage-backdrop" onClick={onClose}>
      <div className="home__manage-panel" onClick={(e) => e.stopPropagation()}>
        <div className="home__manage-head">
          <span className="home__eyebrow">Following</span>
          <span className="home__manage-count num">{following.length}/{MAX_FOLLOWED}</span>
          <button type="button" className="home__iq-panel-close" aria-label="Close" onClick={onClose}>
            ✕
          </button>
        </div>
        <input
          className="home__manage-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search teams or players…"
          autoFocus
        />
        {atCap && (
          <div className="home__manage-cap-note">
            You're following {MAX_FOLLOWED} — remove one to add another.
          </div>
        )}
        {query.trim() !== "" && (
          <div className="home__manage-results">
            {teamResults.map((t) => (
              <button
                key={t.abbr}
                type="button"
                className="home__manage-result"
                disabled={atCap}
                onClick={() => {
                  follow({ kind: "team", id: t.abbr, name: t.name });
                  setQuery("");
                }}
              >
                <TeamDot team={t} size={22} />
                <span>{t.name}</span>
              </button>
            ))}
            {playerResults.map((p) => (
              <button
                key={p.mlbId}
                type="button"
                className="home__manage-result"
                disabled={atCap}
                onClick={() => {
                  follow({ kind: "player", id: String(p.mlbId), name: p.name });
                  setQuery("");
                }}
              >
                <Headshot mlbId={p.mlbId} initials={p.name.split(" ").map((w) => w[0]).join("")} teamColor={TEAMS[p.teamAbbr]?.primary ?? "var(--color-border-strong)"} size={22} />
                <span>{p.name}</span>
                <span className="home__manage-result-meta">{p.teamAbbr}</span>
              </button>
            ))}
          </div>
        )}
        <div className="home__manage-list">
          {following.map((e) => (
            <div key={`${e.kind}:${e.id}`} className="home__manage-list-row">
              <span>{e.name}</span>
              <button type="button" className="home__manage-remove" onClick={() => unfollow(e.kind, e.id)}>
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Races (divisions + wild card) and Chases — SEPARATE sections (§A6) ──
// A team race has a cut line, a deadline and an elimination rule; a chase
// has none of them. Races render as plain columns (no bordered panels —
// the column IS the container); chases keep a light panel per category.

interface RaceTeamRowWire {
  abbr: string;
  displayName: string;
  record: string;
  gamesBack: string;
  holdingSpot?: boolean;
}
interface ChaseRowWire {
  playerName: string;
  teamAbbr: string | null;
  value: string;
}
interface RaceGroupWire {
  title: string;
  note: string;
  clinchedAbbr: string | null;
  kind: "division" | "wildcard";
  rows: RaceTeamRowWire[];
}
interface ChaseGroupWire {
  title: string;
  kind: "chase";
  group: "hitting" | "pitching";
  league?: "AL" | "NL";
  rows: ChaseRowWire[];
}
interface RacesWire {
  mode: "full" | "early";
  note: string;
  divisions: RaceGroupWire[];
  wildCards: RaceGroupWire[];
  chases: ChaseGroupWire[];
}

const RACES_REFRESH_MS = 5 * 60_000;

function useRaces(): RacesWire | null {
  const [data, setData] = useState<RacesWire | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = (): void => {
      void fetch("/api/home/races")
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error("bad response"))))
        .then((res: RacesWire) => {
          if (!cancelled) setData(res);
        })
        .catch(() => {
          // Leave whatever was last successfully loaded.
        });
    };
    load();
    const id = window.setInterval(load, RACES_REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  return data;
}

function RaceColumn({ race }: { race: RaceGroupWire }): ReactElement {
  // A decided race is ONE LINE: name + green CLINCHED left, logo + full
  // club name right-justified.
  if (race.clinchedAbbr != null) {
    const team = TEAMS[race.clinchedAbbr];
    return (
      <div className="race__group">
        <div className="race__clinched-line">
          <span className="race__clinched-title">{race.title}</span>
          <span className="race__clinched-pill">CLINCHED</span>
          <span className="race__clinched-spacer" />
          {team && <TeamDot team={team} size={18} />}
          <span className="race__clinched-name">{team?.name ?? race.clinchedAbbr}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="race__group">
      <div className="race__group-head">
        <span className="race__group-title">{race.title}</span>
        <span className="race__group-note">{race.note}</span>
      </div>
      {race.rows.map((r) => {
        const team = TEAMS[r.abbr];
        return (
          <div
            key={r.abbr}
            className={`race__row${race.kind === "wildcard" ? (r.holdingSpot ? " race__row--holding" : " race__row--out") : ""}`}
          >
            {/* The tick/logo slots always render (even when empty) — a
                conditionally-omitted grid child shifts every sibling after
                it into the wrong track, which is what squeezed the name
                column down to the logo track's width. */}
            <span className="race__tick" />
            <span className="race__logo-slot">{team && <TeamDot team={team} size={20} />}</span>
            <span className="race__name">{r.displayName}</span>
            <span className="race__record num">{r.record}</span>
            <span className={`race__gb num${r.gamesBack === "IN" ? " race__gb--in" : ""}`}>{r.gamesBack}</span>
          </div>
        );
      })}
    </div>
  );
}

// April quiet mode — six division one-liners, no wild cards, no chases. A
// signed number alone beside a record read as another record, so the
// margin is written as prose.
function EarlySeasonDivisionLine({ race }: { race: RaceGroupWire }): ReactElement {
  const leader = race.rows[0];
  const team = leader != null ? TEAMS[leader.abbr] : undefined;
  return (
    <div className="race__early-row">
      {team && <TeamDot team={team} size={18} />}
      <span className="race__name">{leader?.displayName}</span>
      <span className="race__record num">{leader?.record}</span>
      <span className="race__early-note">{race.note}</span>
    </div>
  );
}

function ChasePanel({ chase }: { chase: ChaseGroupWire }): ReactElement {
  return (
    <div className="chase__panel">
      <div className="chase__panel-head">
        <span className="chase__panel-title">{chase.title}</span>
      </div>
      {chase.rows.map((r, i) => {
        const team = r.teamAbbr != null ? TEAMS[r.teamAbbr] : undefined;
        return (
          <div key={r.playerName} className={`chase__row${i === 0 ? " chase__row--leader" : ""}`}>
            {/* All four slots always render (empty when data's missing) — a
                conditionally-omitted grid child shifts every sibling after
                it into the wrong track. */}
            <span className="chase__logo-slot">{team && <TeamDot team={team} size={18} />}</span>
            <span className="chase__name">{r.playerName}</span>
            <span className="chase__abbr num">{r.teamAbbr ?? ""}</span>
            <span className="chase__value num">{r.value}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── In the news — host only this pass (§A8); content is gated on a news API.

function InTheNews(): ReactElement | null {
  const items: never[] = [];
  if (items.length === 0) return null;
  return <section />;
}

function formatToday(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export default function HomePage(): ReactElement {
  const [openIQ, setOpenIQ] = useState<string | null>(null);
  const hotItems = useHotEvents();
  const [hotExpanded, setHotExpanded] = useState(false);
  const following = useFollowing();
  const followRows = useFollowingRows(following);
  const sortedFollowRows = [...followRows].sort((a, b) => STATE_ORDER[a.state] - STATE_ORDER[b.state]);
  const [managing, setManaging] = useState(false);
  const races = useRaces();
  const narrow = useNarrow(1000);
  // Chases showed both leagues stacked (6 panels per column) — a lot of
  // vertical space for a curated Home section when Leaders already owns
  // "show me everything" (and has this exact League control already).
  const [chaseLeague, setChaseLeague] = useState<"AL" | "NL">("AL");

  const hotShown = hotExpanded ? hotItems : hotItems.slice(0, HOT_SHOWN);
  const hotOverflow = hotItems.length - HOT_SHOWN;

  // A2: the rail is capped by the hot column's own height, measured — a
  // percentage max-height is ignored while the grid sizes its row, so an
  // uncapped rail would set the row height and strand the column instead.
  const hotSectionRef = useRef<HTMLDivElement>(null);
  const [railMaxHeight, setRailMaxHeight] = useState<number | null>(null);

  useEffect(() => {
    if (narrow) {
      setRailMaxHeight(null);
      return;
    }
    const el = hotSectionRef.current;
    if (el == null) return;
    const ro = new ResizeObserver(() => {
      setRailMaxHeight(Math.min(el.offsetHeight, window.innerHeight));
    });
    ro.observe(el);
    setRailMaxHeight(Math.min(el.offsetHeight, window.innerHeight));
    return () => ro.disconnect();
  }, [narrow, hotShown.length]);

  return (
    <>
      <BrandHeader active="home" iqContext="Today across the league" />
      <div className="home-page">
        <PageTitle title="Home" subtitle={formatToday()} />

        <div className="home__sections">
          {/* Row 1 is its own bounded container — What's hot + Following,
              nothing else — so Following's height is measured against
              What's hot alone (A2). Races/Chases/News are separate
              full-width sections below it, in normal flow. Following is
              not sticky; it scrolls away with the page like everything
              else. */}
          <div className={`home__row1${narrow ? " home__row1--narrow" : ""}`}>
            <section className="home__row1-hot" ref={hotSectionRef}>
              <SectionHead label="What's hot right now" />
              <div className="home__section-body">
                {hotItems.length === 0 ? (
                  <DayAhead mode="body" count={4} />
                ) : (
                  <>
                    {hotShown.map((item) => (
                      <HotItemRow
                        key={item.id}
                        item={item}
                        open={openIQ === item.id}
                        onToggleIQ={() => setOpenIQ(openIQ === item.id ? null : item.id)}
                      />
                    ))}
                    {!hotExpanded && hotOverflow > 0 && (
                      <button type="button" className="home__hot-more" onClick={() => setHotExpanded(true)}>
                        {hotOverflow} more
                      </button>
                    )}
                    {hotItems.length <= 2 && <DayAhead mode="tail" count={4 - hotItems.length} />}
                  </>
                )}
              </div>
            </section>

            <section className="home__row1-follow">
              <SectionHead
                label="Following"
                right={
                  following.length > 0 ? (
                    <button type="button" className="home__manage" onClick={() => setManaging(true)}>
                      Manage
                    </button>
                  ) : undefined
                }
              />
              <div className="home__section-body">
                {following.length === 0 ? (
                  <div className="home__follow-empty">
                    <p>Follow teams and players to see what's happening with the baseball you care about.</p>
                    <button type="button" className="home__follow-empty-btn" onClick={() => setManaging(true)}>
                      Choose teams and players
                    </button>
                  </div>
                ) : (
                  <FollowRail rows={sortedFollowRows} maxHeight={narrow ? null : railMaxHeight} />
                )}
              </div>
            </section>
          </div>
          {managing && <ManagePanel onClose={() => setManaging(false)} />}

          {races != null && (
            <section>
              <SectionHead label="Races" note={races.note} />
              <div className="home__section-body">
                {races.mode === "early" ? (
                  <div className="race__early-grid">
                    {races.divisions.map((r) => (
                      <EarlySeasonDivisionLine key={r.title} race={r} />
                    ))}
                  </div>
                ) : (
                  <div className="race__columns">
                    <div className="race__column-group">
                      {races.divisions.map((r) => (
                        <RaceColumn key={r.title} race={r} />
                      ))}
                    </div>
                    <div className="race__column-rule" />
                    <div className="race__column-group">
                      {races.wildCards.map((r) => (
                        <RaceColumn key={r.title} race={r} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {races != null && races.mode === "full" && races.chases.length > 0 && (
            <section>
              <SectionHead
                label="Chases"
                note="Individual leaders · top three"
                right={
                  <Segmented
                    items={["AL", "NL"]}
                    active={chaseLeague === "AL" ? 0 : 1}
                    onClick={(i) => setChaseLeague(i === 0 ? "AL" : "NL")}
                    size="sm"
                  />
                }
              />
              <div className="home__section-body">
                <div className="chase__columns">
                  <div className="chase__column-group">
                    <span className="chase__column-label">Hitting</span>
                    {races.chases
                      .filter((c) => c.group === "hitting" && c.league === chaseLeague)
                      .map((c) => (
                        <ChasePanel key={c.title} chase={c} />
                      ))}
                  </div>
                  <div className="race__column-rule" />
                  <div className="chase__column-group">
                    <span className="chase__column-label">Pitching</span>
                    {races.chases
                      .filter((c) => c.group === "pitching" && c.league === chaseLeague)
                      .map((c) => (
                        <ChasePanel key={c.title} chase={c} />
                      ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          <InTheNews />
        </div>
      </div>
    </>
  );
}
