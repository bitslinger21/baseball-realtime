import React, { useState, useRef, useEffect } from "react";
import type { ReactElement } from "react";
import type { GameViewDto, BoxScoreDto } from "@bitslinger21/baseball-realtime-client";
import type { PlayUpdate } from "../../realtime/types";
import { TEAM_NICKNAMES } from "../../utils/teamNicknames";
import "./LineScoreBand.css";

interface ScoringPlay {
  inning: number;
  half: "top" | "bottom";
  description: string;
}

interface Leader {
  abbr: string;
  name: string;
  ab: number;
  h: number;
  rbi: number;
  logoUrl: string | null;
}

function deriveScoringPlays(updates: readonly PlayUpdate[]): ScoringPlay[] {
  const plays: ScoringPlay[] = [];
  for (let i = 1; i < updates.length; i++) {
    const prev = updates[i - 1];
    const cur = updates[i];
    if (
      cur.description != null &&
      (cur.homeScore !== prev.homeScore || cur.awayScore !== prev.awayScore)
    ) {
      plays.push({ inning: cur.inning, half: cur.half, description: cur.description });
    }
  }
  return plays;
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
  for (const [, b] of map) {
    if (b.h === 0) continue;
    if (b.isHome) {
      if (home == null || b.h > home.h) home = { abbr: homeAbbr, name: b.name, ab: b.ab, h: b.h, rbi: b.rbi, logoUrl: homeLogoUrl };
    } else {
      if (away == null || b.h > away.h) away = { abbr: awayAbbr, name: b.name, ab: b.ab, h: b.h, rbi: b.rbi, logoUrl: awayLogoUrl };
    }
  }
  return { away, home };
}

function innLabel(half: "top" | "bottom", inning: number): string {
  return `${half === "top" ? "▲" : "▼"}${inning}`;
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

export function LineScoreBand({ game, latest, allUpdates, isFinal = false }: LineScoreBandProps): ReactElement {
  // Innings scroll: three rows (header, away, home) share one horizontal scroll position.
  const innHdrRef = useRef<HTMLDivElement>(null);
  const innAwayRef = useRef<HTMLDivElement>(null);
  const innHomeRef = useRef<HTMLDivElement>(null);
  const isSyncingRef = useRef(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

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

  // Sync all three innings rows on scroll + track chevron visibility.
  useEffect(() => {
    const refs = [innHdrRef, innAwayRef, innHomeRef];
    const handler = (e: Event): void => {
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;
      const src = e.target as HTMLDivElement;
      const sl = src.scrollLeft;
      refs.forEach(r => { if (r.current && r.current !== src) r.current.scrollLeft = sl; });
      setCanScrollLeft(sl > 1);
      setCanScrollRight(sl + src.clientWidth < src.scrollWidth - 1);
      requestAnimationFrame(() => { isSyncingRef.current = false; });
    };
    const els = refs.map(r => r.current).filter((el): el is HTMLDivElement => el != null);
    els.forEach(el => el.addEventListener("scroll", handler, { passive: true }));
    return () => els.forEach(el => el.removeEventListener("scroll", handler));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // When extra innings appear: update chevron state + auto-scroll to show the newest inning.
  useEffect(() => {
    const el = innHdrRef.current;
    if (el == null) return;
    setCanScrollRight(el.scrollWidth > el.clientWidth + 1);
    if (inningCount > 9) {
      const w = el.scrollWidth;
      el.scrollLeft = w;
      if (innAwayRef.current) innAwayRef.current.scrollLeft = w;
      if (innHomeRef.current) innHomeRef.current.scrollLeft = w;
    }
  }, [inningCount]);

  const scoringPlays = deriveScoringPlays(allUpdates);
  const visibleScoring = scoringPlays.slice(-3);
  const hiddenCount = Math.max(0, scoringPlays.length - 3);

  const awayMeta = game.awayTeamMeta as TeamMeta | null;
  const homeMeta = game.homeTeamMeta as TeamMeta | null;
  const awayLogoUrl = awayMeta?.logoUrl ?? null;
  const homeLogoUrl = homeMeta?.logoUrl ?? null;

  const { away: awayLeader, home: homeLeader } = deriveLeaders(
    allUpdates, game.awayAbbr, game.homeAbbr, awayLogoUrl, homeLogoUrl,
  );
  const leaderSlots: (Leader | null)[] = [awayLeader, homeLeader];

  const isLive = latest != null && !isFinal;

  return (
    <div className="lsb">
      {/* Zone 1 — line score */}
      <div className="lsb__zone lsb__zone--first">
        <div className="lsb__header">
          <div className="lsb__team-col">
            {isLive ? (
              <>
                <span className="lsb__live-dot" />
                <span className="lsb__live-label">
                  {latest != null
                    ? `Live · ${latest.half === "top" ? "▲" : "▼"}${latest.inning}`
                    : "Live"}
                </span>
              </>
            ) : (
              <span className="lsb__live-label" style={{ color: "#71717a" }}>Final</span>
            )}
          </div>
          <div className="lsb__innings-wrap">
            {canScrollLeft && (
              <button
                type="button"
                className="lsb__inn-chevron lsb__inn-chevron--left"
                onClick={() => {
                  if (innHdrRef.current) innHdrRef.current.scrollLeft = 0;
                  if (innAwayRef.current) innAwayRef.current.scrollLeft = 0;
                  if (innHomeRef.current) innHomeRef.current.scrollLeft = 0;
                }}
              >‹</button>
            )}
            <div className="lsb__innings" ref={innHdrRef}>
              {INNINGS.map((i) => (
                <div
                  key={i}
                  className={`lsb__inn-cell lsb__inn-cell--header${i === curInning ? " lsb__inn-cell--current-header" : ""}`}
                >
                  {i}
                </div>
              ))}
            </div>
            {canScrollRight && (
              <button
                type="button"
                className="lsb__inn-chevron lsb__inn-chevron--right"
                onClick={() => {
                  const w = innHdrRef.current?.scrollWidth ?? 0;
                  if (innHdrRef.current) innHdrRef.current.scrollLeft = w;
                  if (innAwayRef.current) innAwayRef.current.scrollLeft = w;
                  if (innHomeRef.current) innHomeRef.current.scrollLeft = w;
                }}
              >›</button>
            )}
          </div>
          <div className="lsb__rhe">
            {["R", "H", "E"].map((x) => (
              <div key={x} className="lsb__rhe-cell lsb__rhe-cell--header">{x}</div>
            ))}
          </div>
        </div>

        {/* Away row */}
        <ScoreRow
          abbr={game.awayAbbr}
          name={TEAM_NICKNAMES[game.awayAbbr] ?? game.awayName}
          logoUrl={awayLogoUrl}
          r={awayR}
          h={awayH}
          e={awayE}
          curInning={curInning}
          bold={awayR > homeR}
          inningRuns={awayInningRuns}
          innings={INNINGS}
          innRef={innAwayRef}
        />
        <div className="lsb__divider" />
        {/* Home row */}
        <ScoreRow
          abbr={game.homeAbbr}
          name={TEAM_NICKNAMES[game.homeAbbr] ?? game.homeName}
          logoUrl={homeLogoUrl}
          r={homeR}
          h={homeH}
          e={homeE}
          curInning={curInning}
          bold={homeR > awayR}
          inningRuns={homeInningRuns}
          innings={INNINGS}
          innRef={innHomeRef}
        />
      </div>

      {/* Zone 2 — scoring summary (hidden) */}

      {/* Zone 3 — game leaders */}
      <div className="lsb__zone lsb__zone--leaders">
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
                <div className="lsb__leader-name" title={l.name}>{l.name}</div>
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

      {/* Zone 4 — last pitch */}
      {latest != null && (
        <div className="lsb__zone lsb__zone--last-pitch">
          <div className="lsb__lp-label">
            <div className="lsb__lp-eyebrow">Last pitch</div>
            <div className="lsb__lp-name">{latest.pitchType ?? "—"}</div>
          </div>
          <div className="lsb__lp-velo-block">
            <div className="lsb__lp-velo">
              {latest.pitchSpeedMph != null ? Math.round(latest.pitchSpeedMph) : "—"}
            </div>
            <div className="lsb__lp-velo-unit">MPH</div>
          </div>
          <div className="lsb__lp-result">
            <span className="lsb__lp-pill">
              {(latest.description ?? "—").split(",")[0].split("(")[0].trim() || "—"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

interface ScoreRowProps {
  abbr: string;
  name: string;
  logoUrl: string | null;
  r: number;
  h: number;
  e: number;
  curInning: number | null;
  bold: boolean;
  inningRuns: (number | null)[] | null;
  innings: number[];
  innRef: React.Ref<HTMLDivElement>;
}

function ScoreRow({ abbr, name, logoUrl, r, h, e, curInning, bold, inningRuns, innings, innRef }: ScoreRowProps): ReactElement {
  return (
    <div className="lsb__header">
      <div className="lsb__team-col">
        <TeamMark logoUrl={logoUrl} abbr={abbr} size={24} onDark />
        <span className={`lsb__team-name${bold ? " lsb__team-name--bold" : ""}`}>{name}</span>
      </div>
      <div className="lsb__innings-wrap">
        <div className="lsb__innings lsb__innings--sync" ref={innRef}>
          {innings.map((i) => {
            const runs = inningRuns != null ? inningRuns[i - 1] : null;
            const isPlayed = runs != null;
            return (
              <div
                key={i}
                className={`lsb__inn-cell${isPlayed ? " lsb__inn-cell--value" : " lsb__inn-cell--null"}${i === curInning ? " lsb__inn-cell--current-bg" : ""}`}
              >
                {isPlayed ? runs : "–"}
              </div>
            );
          })}
        </div>
      </div>
      <div className="lsb__rhe">
        <div className="lsb__rhe-cell lsb__rhe-cell--accent">{r}</div>
        <div className="lsb__rhe-cell lsb__rhe-cell--dim">{h}</div>
        <div className="lsb__rhe-cell lsb__rhe-cell--dim">{e}</div>
      </div>
    </div>
  );
}
