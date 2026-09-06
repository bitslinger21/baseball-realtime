import { Fragment, useEffect, useRef, useState } from "react";
import type { ReactElement } from "react";
import type { GameViewDto, BoxScoreDto } from "@bitslinger21/baseball-realtime-client";
import type { PlayUpdate } from "../../realtime/types";
import { Link } from "react-router-dom";
import { TEAM_NICKNAMES } from "../../utils/teamNicknames";
import "./LineScoreBand.css";

interface Leader {
  abbr: string;
  name: string;
  ab: number;
  h: number;
  rbi: number;
  logoUrl: string | null;
  playerId: number;
}

// Compute per-inning run totals from the sliced play-by-play feed, not from the final
// box score (which is always the end-of-game state and fills in all innings immediately).
function deriveInningRuns(
  updates: readonly PlayUpdate[],
  half: "top" | "bottom",
): (number | null)[] {
  if (updates.length === 0) return [];
  const runsMap = new Map<number, number>();
  const seen = new Set<number>();
  for (const u of updates) {
    if (u.half === half) seen.add(u.inning);
  }
  let prevAway = updates[0].awayScore;
  let prevHome = updates[0].homeScore;
  for (let i = 1; i < updates.length; i++) {
    const u = updates[i];
    const delta = half === "top" ? u.awayScore - prevAway : u.homeScore - prevHome;
    if (delta > 0) runsMap.set(u.inning, (runsMap.get(u.inning) ?? 0) + delta);
    prevAway = u.awayScore;
    prevHome = u.homeScore;
  }
  if (seen.size === 0) return [];
  const maxInn = Math.max(...seen);
  return Array.from({ length: maxInn }, (_, i) => {
    const inn = i + 1;
    return seen.has(inn) ? (runsMap.get(inn) ?? 0) : null;
  });
}

type TeamMeta = { primaryColorHex?: string | null; logoUrl?: string | null };

const HIT_RESULTS = new Set(['Single', 'Double', 'Triple', 'HomeRun']);
const NON_AB_RESULTS = new Set(['Walk', 'IntentionalWalk', 'HitByPitch', 'SacFly', 'SacBunt']);

function deriveLeaders(
  updates: readonly PlayUpdate[],
  awayAbbr: string,
  homeAbbr: string,
  awayLogoUrl: string | null,
  homeLogoUrl: string | null,
): { away: Leader | null; home: Leader | null } {
  // Count H/AB from playResult events (accurate at any play-head position).
  // batterGameRBI may still be final stats for historically-fetched completed games but
  // is secondary for leader display (leader is determined by H).
  const map = new Map<number, { name: string; ab: number; h: number; rbi: number; isHome: boolean }>();
  for (const u of updates) {
    if (u.batterId == null || u.playResult == null) continue;
    const prev = map.get(u.batterId);
    const isHit = HIT_RESULTS.has(u.playResult);
    const isAB = !NON_AB_RESULTS.has(u.playResult);
    map.set(u.batterId, {
      name: u.batterName ?? prev?.name ?? "",
      ab: (prev?.ab ?? 0) + (isAB ? 1 : 0),
      h: (prev?.h ?? 0) + (isHit ? 1 : 0),
      rbi: Math.max(prev?.rbi ?? 0, u.batterGameRBI ?? 0),
      isHome: u.half === "bottom",
    });
  }

  let away: Leader | null = null;
  let home: Leader | null = null;
  for (const [id, b] of map) {
    if (b.h === 0) continue;
    if (b.isHome) {
      if (home == null || b.h > home.h) home = { abbr: homeAbbr, name: b.name, ab: b.ab, h: b.h, rbi: b.rbi, logoUrl: homeLogoUrl, playerId: id };
    } else {
      if (away == null || b.h > away.h) away = { abbr: awayAbbr, name: b.name, ab: b.ab, h: b.h, rbi: b.rbi, logoUrl: awayLogoUrl, playerId: id };
    }
  }
  return { away, home };
}

// Team logo: real MLB logo where available, letter-mark fallback.
// onDark wraps the logo in a white circular plate so dark-dominant marks
// (e.g. Twins navy, Royals blue) remain legible against the ink band.
function TeamMark({ logoUrl, abbr, size, onDark = false }: { logoUrl: string | null; abbr: string; size: number; onDark?: boolean }): ReactElement {
  const [failed, setFailed] = useState(false);
  if (logoUrl != null && !failed) {
    const img = (
      <img
        src={logoUrl}
        alt={abbr}
        onError={() => setFailed(true)}
        style={{ width: size, height: size, objectFit: "contain", display: "block", flexShrink: 0 }}
      />
    );
    if (!onDark) return img;
    return (
      <div style={{
        width: size * 1.22, height: size * 1.22, borderRadius: "50%",
        background: "#fff", display: "grid", placeItems: "center",
        flexShrink: 0, padding: size * 0.11,
      }}>{img}</div>
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: "var(--color-text-faint)", color: "#fff",
      display: "grid", placeItems: "center",
      fontFamily: "var(--font-sans)", fontSize: size * 0.45, fontWeight: 700,
      flexShrink: 0,
    }}>
      {abbr[0]}
    </div>
  );
}

interface LineScoreBandProps {
  game: GameViewDto;
  latest: PlayUpdate | null;
  allUpdates: readonly PlayUpdate[];
  boxScore?: BoxScoreDto | null;
  isFinal?: boolean;
}

const INN_SCROLL_STEP = 3 * 29; // 3 innings × (28px cell + 1px gap)

export function LineScoreBand({ game, latest, allUpdates, isFinal = false }: LineScoreBandProps): ReactElement {
  const [drawerOpen, setDrawerOpen] = useState(false);

  // One scroller for the whole innings grid — no refs to keep in sync, so there is
  // nothing for the header/away/home rows to drift apart on (see PROMPT_linescore_band.md §4).
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const scrollInn = (dir: -1 | 1): void => {
    scrollRef.current?.scrollBy({ left: dir * INN_SCROLL_STEP, behavior: 'smooth' });
  };

  const curInning = latest?.inning ?? null;

  // R: use per-pitch score fields — linescore.runs is final-game value in historical replays.
  const awayR = latest?.awayScore ?? 0;
  const homeR = latest?.homeScore ?? 0;

  // H: derive from completed at-bats in allUpdates (the current replay slice).
  // linescore.hits is also a final-game snapshot so we can't use it for replay scrubbing.
  let awayH = 0, homeH = 0;
  for (const u of allUpdates) {
    if (u.isFinalPitchOfAtBat && u.playResult != null && HIT_RESULTS.has(u.playResult)) {
      if (u.half === 'top') awayH++;
      else homeH++;
    }
  }

  // E: no reliable per-pitch error count in the feed; fall back to linescore for live games,
  // zero for replays where linescore carries the final total.
  const awayRhe = latest?.linescore?.away ?? null;
  const homeRhe = latest?.linescore?.home ?? null;
  const awayE = awayRhe?.errors ?? 0;
  const homeE = homeRhe?.errors ?? 0;

  // Derive per-inning runs from the sliced play-by-play feed (not the final box score).
  const awayInningRuns = deriveInningRuns(allUpdates, "top");
  const homeInningRuns = deriveInningRuns(allUpdates, "bottom");

  // Dynamic innings — grows past 9 for extra-inning games.
  const inningCount = Math.max(
    9,
    curInning ?? 0,
    awayInningRuns.length,
    homeInningRuns.length,
  );
  const INNINGS = Array.from({ length: inningCount }, (_, i) => i + 1);

  // Track chevron visibility + auto-scroll to the newest inning as extra innings appear.
  useEffect(() => {
    const el = scrollRef.current;
    if (el == null) return;
    setCanScrollLeft(el.scrollLeft > 1);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
    if (inningCount > 9) el.scrollLeft = el.scrollWidth;
  }, [inningCount]);

  const handleScroll = (): void => {
    const el = scrollRef.current;
    if (el == null) return;
    setCanScrollLeft(el.scrollLeft > 1);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  };

  const awayMeta = game.awayTeamMeta as TeamMeta | null;
  const homeMeta = game.homeTeamMeta as TeamMeta | null;
  const awayLogoUrl = awayMeta?.logoUrl ?? null;
  const homeLogoUrl = homeMeta?.logoUrl ?? null;
  const awayNick = TEAM_NICKNAMES[game.awayAbbr] ?? game.awayName;
  const homeNick = TEAM_NICKNAMES[game.homeAbbr] ?? game.homeName;

  const { away: awayLeader, home: homeLeader } = deriveLeaders(
    allUpdates, game.awayAbbr, game.homeAbbr, awayLogoUrl, homeLogoUrl,
  );
  const leaderSlots: (Leader | null)[] = [awayLeader, homeLeader];

  const awayIsTrailer = homeR > awayR;
  const homeIsTrailer = awayR > homeR;

  return (
    // The bar itself is the sticky element AND (since position:sticky establishes a
    // containing block for absolute descendants, same as position:relative) the
    // drawer's anchor. It must be the component's real DOM root — wrapping it in a
    // dedicated div here would make THAT div (only as tall as the bar, since the
    // drawer is absolutely positioned and adds no flow height) the sticky containing
    // block instead of .gp__col, leaving zero room for the bar to actually stick.
    <div className="lsb-bar" data-final={isFinal || undefined}>
      {/* Status (LIVE/Final), inning, and last-pitch all live elsewhere on the screen
          now; see PROMPT_linescore_band.md §0. */}
      <div className="lsb-bar__score">
        <TeamMark logoUrl={awayLogoUrl} abbr={game.awayAbbr} size={22} onDark />
        <span className="lsb-bar__abbr">{game.awayAbbr}</span>
        <span className={`lsb-bar__runs${awayIsTrailer ? " lsb-bar__runs--trailer" : ""}`}>{awayR}</span>
        <span className="lsb-bar__dash">–</span>
        <span className={`lsb-bar__runs${homeIsTrailer ? " lsb-bar__runs--trailer" : ""}`}>{homeR}</span>
        <span className="lsb-bar__abbr">{game.homeAbbr}</span>
        <TeamMark logoUrl={homeLogoUrl} abbr={game.homeAbbr} size={22} onDark />
      </div>
      <div className="lsb-bar__divider" />
      <button
        type="button"
        className={`lsb-bar__trigger${drawerOpen ? " lsb-bar__trigger--open" : ""}`}
        aria-expanded={drawerOpen}
        onClick={() => setDrawerOpen((o) => !o)}
      >
        Line score &amp; leaders <span className="lsb-bar__caret">{drawerOpen ? "▴" : "▾"}</span>
      </button>
      <div className="lsb-bar__spacer" />

      {/* Drawer — nested inside the sticky bar (which, since position:sticky
          establishes a containing block for absolute descendants, anchors it
          correctly) — always mounted so the innings scroller has real layout
          width to measure chevrons against, overlays the content below rather
          than pushing it. */}
      <div className={`lsb-drawer${drawerOpen ? " lsb-drawer--open" : ""}`} aria-hidden={!drawerOpen}>
        <div className="lsb-drawer__inner">
          <div className="lsb-drawer__linescore">
            {/* Fixed label column */}
            <div className="lsb2__labels">
              <div className="lsb2__cell lsb2__cell--label-hdr">INNINGS</div>
              <div className="lsb2__cell lsb2__cell--team">
                <TeamMark logoUrl={awayLogoUrl} abbr={game.awayAbbr} size={24} onDark />
                <Link to={`/team/${game.awayAbbr}`} className="lsb2__team-name lsb2__team-name--away">{awayNick}</Link>
              </div>
              <div className="lsb2__cell lsb2__cell--hairline" />
              <div className="lsb2__cell lsb2__cell--team">
                <TeamMark logoUrl={homeLogoUrl} abbr={game.homeAbbr} size={24} onDark />
                <Link to={`/team/${game.homeAbbr}`} className="lsb2__team-name">{homeNick}</Link>
              </div>
            </div>

            {/* One horizontally-scrolling grid — header/away/hairline/home share one
                scroll position because they ARE one grid, not three synced ones. */}
            <div className="lsb2__scroll-wrap">
              {canScrollLeft && (
                <button type="button" className="lsb2__chevron lsb2__chevron--left" onClick={() => scrollInn(-1)} aria-label="Scroll innings left">
                  <svg width="9" height="14" viewBox="0 0 9 14" fill="none" aria-hidden="true">
                    <polyline points="8,1 2,7 8,13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              )}
              <div className="lsb2__scroll" ref={scrollRef} onScroll={handleScroll}>
                {INNINGS.map((i) => {
                  const aRun = awayInningRuns[i - 1] ?? null;
                  const hRun = homeInningRuns[i - 1] ?? null;
                  const isCurrent = i === curInning;
                  return (
                    <Fragment key={i}>
                      <div className={`lsb2__cell lsb2__cell--inn-hdr${isCurrent ? " lsb2__cell--current-hdr" : ""}`}>{i}</div>
                      <div className={`lsb2__cell lsb2__cell--run${aRun == null ? " lsb2__cell--null" : ""}${isCurrent ? " lsb2__cell--current" : ""}`}>{aRun != null ? aRun : "–"}</div>
                      <div className="lsb2__cell lsb2__cell--hairline" />
                      <div className={`lsb2__cell lsb2__cell--run${hRun == null ? " lsb2__cell--null" : ""}${isCurrent ? " lsb2__cell--current" : ""}`}>{hRun != null ? hRun : "–"}</div>
                    </Fragment>
                  );
                })}
              </div>
              {canScrollRight && (
                <button type="button" className="lsb2__chevron lsb2__chevron--right" onClick={() => scrollInn(1)} aria-label="Scroll innings right">
                  <svg width="9" height="14" viewBox="0 0 9 14" fill="none" aria-hidden="true">
                    <polyline points="1,1 7,7 1,13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              )}
            </div>

            {/* Fixed R/H/E column — same 4-row template so its hairline lines up
                with the label column's and the scroller's. */}
            <div className="lsb2__rhe">
              {([
                { label: "R", away: awayR, home: homeR, accent: true },
                { label: "H", away: awayH, home: homeH, accent: false },
                { label: "E", away: awayE, home: homeE, accent: false },
              ] as const).map((col) => (
                <div key={col.label} className="lsb2__rhe-col">
                  <div className="lsb2__cell lsb2__cell--rhe-hdr">{col.label}</div>
                  <div className={`lsb2__cell lsb2__cell--rhe-val${col.accent ? " lsb2__cell--rhe-r" : " lsb2__cell--rhe-dim"}`}>{col.away}</div>
                  <div className="lsb2__cell lsb2__cell--hairline" />
                  <div className={`lsb2__cell lsb2__cell--rhe-val${col.accent ? " lsb2__cell--rhe-r" : " lsb2__cell--rhe-dim"}`}>{col.home}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="lsb-drawer__leaders">
            <div className="lsb__eyebrow">Game leaders</div>
            {leaderSlots.every((l) => l == null) && (
              <div className="lsb__scoring-desc" style={{ color: "#52525b", fontSize: 11 }}>
                No hits yet
              </div>
            )}
            {leaderSlots.map((l, i) =>
              l != null ? (
                <div key={l.abbr} className="lsb__leader">
                  <TeamMark logoUrl={l.logoUrl} abbr={l.abbr} size={22} onDark />
                  <div className="lsb__leader-text">
                    <Link to={`/player/${l.playerId}`} state={{ fromGame: game.providerGameId }} className="lsb__leader-name player-link" title={l.name}>{l.name}</Link>
                    <div className="lsb__leader-line" title={`${l.h}-for-${l.ab}${l.rbi > 0 ? ` · ${l.rbi} RBI` : ""}`}>
                      {l.h}-for-{l.ab}
                      {l.rbi > 0 ? ` · ${l.rbi} RBI` : ""}
                    </div>
                  </div>
                </div>
              ) : (
                <div key={`empty-${i}`} className="lsb__leader" aria-hidden="true" style={{ visibility: "hidden" }}>
                  <div style={{ width: 22, height: 22 }} />
                  <div>
                    <div className="lsb__leader-name">—</div>
                    <div className="lsb__leader-line">—</div>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
