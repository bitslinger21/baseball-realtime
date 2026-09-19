import { useEffect, useMemo, useState } from "react";
import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import { BrandHeader } from "../components/primitives/BrandHeader";
import { PageTitle } from "../components/primitives/PageTitle";
import { TeamDot } from "../components/primitives/TeamDot";
import { Headshot } from "../components/primitives/Headshot";
import { Inning } from "../components/primitives/Inning";
import { IQDiamond } from "../components/primitives/IQDiamond";
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
// "show me everything" (that's Games/Standings/Leaders). Three sections:
// What's Hot (this pass), Following + Races (placeholders — shape only,
// per PROMPT_home_page.md §6: "build section 1 first").
//
// "Right now" does NOT mean a game is in progress — a trade with zero games
// being played can be the hottest thing in baseball. So a hot item is an
// EVENT with optional game context, never a scoreboard with text attached.

interface HotGameContext {
  providerGameId: string;
  awayAbbr: string;
  homeAbbr: string;
  awayRuns: number;
  homeRuns: number;
  half: "top" | "bottom";
  inning: number;
}

interface HotMoveContext {
  fromAbbr: string;
  toAbbr: string | null;
}

interface HotEventItem {
  id: string;
  text: string;
  // Real availability flag resolved server-side by the IQ service — never
  // inferred client-side from the event type. Absence of the diamond (not a
  // greyed-out one) is what signals "no context for this".
  iq: boolean;
  iqSuggested: string[];
  game?: HotGameContext;
  move?: HotMoveContext;
}

// Wire shape from GET /api/home/hot (api/src/home/dtos/hot-event.dto.ts).
// Transaction/roster-move detectors aren't built yet (see PROMPT_home_page.md
// "Initial Implementation Scope" — live-game detectors ship first), so `move`
// never appears from this endpoint today; the field/component stay ready for
// when that lands rather than being removed.
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
          }
        : undefined,
  };
}

const HOT_REFRESH_MS = 30_000;

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

function formatToday(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
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
        <Inning half={g.half} num={g.inning} size={13} color="var(--color-accent)" />
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

        {item.game && <GameContext g={item.game} />}
      </div>
    </div>
  );
}

// ── Following (PROMPT_home_page.md §6) — a dashboard, not a feed: one row
// per followed team/player stating what's true right now, rewritten in
// place. Identity is device-local (utils/following.ts); this section fetches
// today's line for that local list from the real backend on every load.

interface FollowRowWire {
  kind: "team" | "player";
  id: string;
  name: string;
  teamAbbr: string | null;
  state: "live" | "final" | "scheduled" | "idle";
  line: string;
  meta: string;
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

function FollowingRowView({ row }: { row: FollowRowWire }): ReactElement {
  const team = row.teamAbbr != null ? TEAMS[row.teamAbbr] : undefined;
  return (
    <div className="home__follow-row">
      {row.kind === "team" && team ? (
        <TeamDot team={team} size={30} />
      ) : (
        <Headshot
          mlbId={row.mlbId}
          initials={row.name.split(" ").map((w) => w[0]).join("")}
          teamColor={team?.primary ?? "var(--color-border-strong)"}
          size={30}
        />
      )}
      <div className="home__follow-row-main">
        <div className="home__follow-row-name">{row.name}</div>
        <div className="home__follow-row-line">{row.line}</div>
      </div>
      <span className={`home__follow-row-meta${row.state === "live" ? " home__follow-row-meta--live" : ""}`}>
        {row.meta}
      </span>
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
            You're following eight — remove one to add another.
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

export default function HomePage(): ReactElement {
  const [openIQ, setOpenIQ] = useState<string | null>(null);
  const hotItems = useHotEvents();
  const following = useFollowing();
  const followRows = useFollowingRows(following);
  const sortedFollowRows = [...followRows].sort(
    (a, b) => STATE_ORDER[a.state] - STATE_ORDER[b.state],
  );
  const [managing, setManaging] = useState(false);

  return (
    <>
      <BrandHeader active="home" />
      <div className="home-page">
        <PageTitle title="Home" subtitle={formatToday()} />

        <div className="home__sections">
          <section>
            <SectionHead label="What's hot right now" />
            <div className="home__section-body">
              {hotItems.length === 0 ? (
                <div className="home__empty">
                  <span>Nothing cooking yet.</span>
                </div>
              ) : (
                hotItems.map((item) => (
                  <HotItemRow
                    key={item.id}
                    item={item}
                    open={openIQ === item.id}
                    onToggleIQ={() => setOpenIQ(openIQ === item.id ? null : item.id)}
                  />
                ))
              )}
            </div>
          </section>

          <section>
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
                <div className="home__follow-grid">
                  {sortedFollowRows.map((row) => (
                    <FollowingRowView key={`${row.kind}:${row.id}`} row={row} />
                  ))}
                </div>
              )}
            </div>
          </section>
          {managing && <ManagePanel onClose={() => setManaging(false)} />}

          {/* Placeholder — same as above. Races is season-sensitive (quiet in
              April, prominent in September); that weighting isn't implemented
              in this pass, so this section carries no rows yet. */}
          <section>
            <SectionHead label="Races" note="Placeholder · behaviour designed separately" />
            <div className="home__section-body" />
          </section>
        </div>
      </div>
    </>
  );
}
