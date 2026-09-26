import { useState, useMemo, useEffect } from "react";
import type { ReactElement } from "react";
import type { BoxScoreDto, GameViewDto, BatterLineDto, PitcherLineDto, BullpenPlayerDto, VsPlayerDto, PitcherSeasonTotalsDto } from "@bitslinger21/baseball-realtime-client";
import { playersApi } from "../../api/baseballApiClient";
import { Card } from "../../components/primitives/Card";
import { Headshot } from "../../components/primitives/Headshot";
import { Pill } from "../../components/primitives/Pill";
import { Segmented } from "../../components/primitives/Segmented";
import { formatIP } from "../../utils/formatIP";
import "./HeadToHeadScreen.css";

// ── Real batter-vs-pitcher summary (GET /players/:batterId/vs/:pitcherId) ──

interface H2HSummary { pa: number; avg: string | null; obp: string; slg: string; hr: number; k: number }

function fmt3(n: number): string {
  if (!isFinite(n)) return ".000";
  const s = n.toFixed(3);
  return n >= 1 ? s : s.replace(/^0/, "");
}

function computeH2HSummary(v: VsPlayerDto): H2HSummary {
  const obp = v.pa > 0 ? (v.h + v.bb) / v.pa : 0;
  const totalBases = v.h - v.doubles - v.triples - v.hr + v.doubles * 2 + v.triples * 3 + v.hr * 4;
  const slg = v.ab > 0 ? totalBases / v.ab : 0;
  return { pa: v.pa, avg: v.avg, obp: fmt3(obp), slg: fmt3(slg), hr: v.hr, k: v.k };
}

// ── Pitching-change helpers (PROMPT_h2h_pitching_change.md) ─────────────────

function fmtRecord(wins: unknown, losses: unknown): string {
  const w = Number(wins);
  const l = Number(losses);
  if (!Number.isFinite(w) || !Number.isFinite(l)) return "—";
  return `${w}-${l}`;
}

function surname(name: string): string {
  const parts = name.trim().split(" ");
  return parts[parts.length - 1] ?? name;
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

// The pitcher currently in the game for this side — the LAST entry in the
// (possibly scout-head-scoped) pitching array (ordered: starter first, each
// reliever appended as they enter). Same convention the Lineups tray uses.
function currentPitcherOf(pitching: readonly PitcherLineDto[]): PitcherLineDto | null {
  return pitching.length > 0 ? pitching[pitching.length - 1] : null;
}

interface HandoffInfo {
  /** This pitcher's position in the game: 1 = starter (still in), 2 = 2nd, 3 = 3rd… */
  ordinal: number;
  /** Who they relieved — null when the starter is still in. */
  replaced: PitcherLineDto | null;
  /** Inning the change happened, derived from the replaced pitcher's final IP. */
  inning: number | null;
}

// IP strings are decimal THIRDS ("4.1" = 4⅓), not real decimals — "4.1" +
// "1.1" is 5⅔ (outs 13+4=17), not the 5.2 naive float addition would give.
// Converting to outs first avoids that.
function ipToOuts(ip: string): number {
  const dot = ip.indexOf(".");
  if (dot === -1) return (parseInt(ip, 10) || 0) * 3;
  const whole = parseInt(ip.slice(0, dot), 10) || 0;
  const frac = parseInt(ip.slice(dot + 1), 10) || 0;
  return whole * 3 + frac;
}

function handoffInfoOf(pitching: readonly PitcherLineDto[]): HandoffInfo {
  const n = pitching.length;
  const replacedIdx = n - 2;
  const replaced = replacedIdx >= 0 ? pitching[replacedIdx] : null;
  // The inning a change happened isn't the replaced pitcher's OWN ip (that's
  // just his own stint length) — it's every one of this team's pitchers'
  // outs summed through him, which maps 1:1 to the game's real innings
  // (a team pitches exactly one half-inning per inning).
  let inning: number | null = null;
  if (replaced != null) {
    let outs = 0;
    for (let i = 0; i <= replacedIdx; i++) outs += ipToOuts(pitching[i].ip);
    inning = Math.floor(outs / 3) + 1;
  }
  return { ordinal: n, replaced, inning };
}

// Season Record/ERA/WHIP/K for one pitcher — same source as the pregame
// probables card. Re-fetches whenever the player changes, so a pitching
// change swaps this out for the new arm's own season line.
function useSeasonPitching(mlbId: number | null): PitcherSeasonTotalsDto | null {
  const [totals, setTotals] = useState<PitcherSeasonTotalsDto | null>(null);
  useEffect(() => {
    setTotals(null);
    if (mlbId == null) return;
    let cancelled = false;
    const year = String(new Date().getFullYear());
    playersApi
      .playersGetPlayerPitching(mlbId, year)
      .then((r) => { if (!cancelled) setTotals(r.data.seasonTotals ?? null); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [mlbId]);
  return totals;
}

// ── Data helpers ──────────────────────────────────────────────────────────────

interface LineupSlot { slot: number; name: string; pos: string; playerId: number }
interface TeamData { lineup: LineupSlot[] }

function buildTeamData(batting: readonly BatterLineDto[]): TeamData {
  // Group by slot; last entry at each slot = active player (highest battingOrder sub-depth).
  const bySlot = new Map<number, BatterLineDto>();
  for (const b of batting) {
    if (b.battingOrder == null) continue;
    const n = parseInt(b.battingOrder, 10);
    if (isNaN(n)) continue;
    const slot = Math.floor(n / 100);
    if (slot < 1 || slot > 9) continue;
    const prev = bySlot.get(slot);
    if (prev == null || n > parseInt(prev.battingOrder ?? "0", 10)) bySlot.set(slot, b);
  }
  const lineup: LineupSlot[] = Array.from(bySlot.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([slot, b]) => ({ slot, name: b.name, pos: b.position ?? "—", playerId: b.playerId }));

  return { lineup };
}

interface TeamMeta { abbr: string; name: string; primaryColorHex: string | null; logoUrl: string | null }
interface ProbableInfo { name: string | null; hand: string | null; jerseyNumber: string | null; mlbId: number | null }

// ── Sub-components ────────────────────────────────────────────────────────────

function Eyebrow({ children }: { children: React.ReactNode }): ReactElement {
  return <div className="h2h__eyebrow">{children}</div>;
}

function StatCell({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <div className="h2h__starter-stat">
      <span className="h2h__starter-stat-label">{label}</span>
      <span className="h2h__starter-stat-value num">{value}</span>
    </div>
  );
}

function PregameSide({ p, meta, border }: { p: ProbableInfo; meta: TeamMeta; border?: boolean }): ReactElement {
  const totals = useSeasonPitching(p.mlbId);
  return (
    <div className={`h2h__starter-side${border ? " h2h__starter-side--border" : ""}`}>
      <Headshot
        mlbId={p.mlbId}
        initials={p.name ? p.name.split(" ").map((w) => w[0] ?? "").join("") : "?"}
        teamColor={meta.primaryColorHex ?? "var(--color-text-faint)"}
        size={64}
      />
      <div className="h2h__starter-info">
        <Eyebrow>Starter · {meta.abbr}</Eyebrow>
        <div className="h2h__starter-name">{p.name ?? "TBD"}</div>
        <div className="h2h__starter-meta">
          {p.hand != null ? (p.hand === "L" ? "LHP" : "RHP") : "—"}
          {p.jerseyNumber != null ? ` · #${p.jerseyNumber}` : ""}
        </div>
        <div className="h2h__starter-stats">
          <StatCell label="Record" value={fmtRecord(totals?.wins, totals?.losses)} />
          <StatCell label="ERA" value={totals?.era != null ? String(totals.era) : "—"} />
          <StatCell label="WHIP" value={totals?.whip != null ? String(totals.whip) : "—"} />
          <StatCell label="K" value={totals?.strikeOuts != null ? String(totals.strikeOuts) : "—"} />
        </div>
      </div>
    </div>
  );
}

function LiveSide({ pitching, meta, border }: { pitching: readonly PitcherLineDto[]; meta: TeamMeta; border?: boolean }): ReactElement {
  const current = currentPitcherOf(pitching);
  const handoff = handoffInfoOf(pitching);
  const totals = useSeasonPitching(current?.playerId ?? null);

  if (current == null) {
    // Brief edge case: the visiting team's starter hasn't thrown a pitch yet
    // (still the top of the 1st) — falls back to a minimal placeholder rather
    // than fabricating a stat line.
    return (
      <div className={`h2h__starter-side${border ? " h2h__starter-side--border" : ""}`}>
        <div className="h2h__starter-info">
          <Eyebrow>Pitching · {meta.abbr}</Eyebrow>
          <div className="h2h__starter-meta">Not up yet</div>
        </div>
      </div>
    );
  }

  const record = fmtRecord(totals?.wins, totals?.losses);
  const era = totals?.era != null ? String(totals.era) : "—";

  const handoffNode: ReactElement = handoff.ordinal <= 1
    ? <>Starter · still in</>
    : (() => {
        const replaced = handoff.replaced;
        const replacedName = replaced != null ? surname(replaced.name) : "—";
        const inningText = handoff.inning != null ? ordinal(handoff.inning) : "—";
        const replacedLine = replaced != null ? `${formatIP(replaced.ip)} IP, ${replaced.r} R` : "—";
        const prefix = handoff.ordinal >= 3 ? `${ordinal(handoff.ordinal)} pitcher · ` : "";
        return <>{prefix}Relieved <b className="h2h__handoff-name">{replacedName}</b> · {inningText} · {replacedLine}</>;
      })();

  return (
    <div className={`h2h__starter-side${border ? " h2h__starter-side--border" : ""}`}>
      <Headshot
        mlbId={current.playerId}
        initials={current.name.split(" ").map((w) => w[0] ?? "").join("")}
        teamColor={meta.primaryColorHex ?? "var(--color-text-faint)"}
        size={64}
      />
      <div className="h2h__starter-info">
        <Eyebrow>Pitching · {meta.abbr}</Eyebrow>
        <div className="h2h__starter-name">{current.name}</div>
        <div className="h2h__starter-meta">
          {current.handedness ?? "—"}
          {current.jerseyNumber != null ? ` · #${current.jerseyNumber}` : ""}
          {` · ${record} · ${era} ERA`}
        </div>
        <div className="h2h__starter-stats">
          <StatCell label="IP" value={formatIP(current.ip)} />
          <StatCell label="R" value={String(current.r)} />
          <StatCell label="K" value={String(current.so)} />
          <StatCell label="BB" value={String(current.bb)} />
        </div>
        <div className="h2h__starter-handoff">{handoffNode}</div>
      </div>
    </div>
  );
}

interface StarterPairProps {
  awayProbable: ProbableInfo;
  homeProbable: ProbableInfo;
  awayMeta: TeamMeta;
  homeMeta: TeamMeta;
  awayPitching: readonly PitcherLineDto[];
  homePitching: readonly PitcherLineDto[];
}

// Pregame: starting pitchers, season Record/ERA/WHIP/K. Live (any state after
// first pitch): follows the pitcher ON THE MOUND for each side independently
// — a pitching change is a quiet handoff line under the stats, never a
// dimmed-pulled-starter-with-an-arrow (PROMPT_h2h_pitching_change.md §3a).
// `awayPitching`/`homePitching` are scout-head-scoped when scrubbing a final
// game, so this follows the scrub position, not always the game's last
// pitcher.
function StarterPair({ awayProbable, homeProbable, awayMeta, homeMeta, awayPitching, homePitching }: StarterPairProps): ReactElement {
  const awayLive = awayPitching.length > 0;
  const homeLive = homePitching.length > 0;
  const title = awayLive || homeLive ? "On the mound" : "Starting pitchers";

  return (
    <Card padless>
      <div className="h2h__card-eyebrow-bar">
        <Eyebrow>{title}</Eyebrow>
      </div>
      <div className="h2h__starter-grid">
        {awayLive
          ? <LiveSide pitching={awayPitching} meta={awayMeta} border />
          : <PregameSide p={awayProbable} meta={awayMeta} border />}
        {homeLive
          ? <LiveSide pitching={homePitching} meta={homeMeta} />
          : <PregameSide p={homeProbable} meta={homeMeta} />}
      </div>
    </Card>
  );
}

interface BatterChipProps { slot: LineupSlot; active: boolean; onClick: () => void }

function BatterChip({ slot, active, onClick }: BatterChipProps): ReactElement {
  return (
    <button
      onClick={onClick}
      className={`h2h__chip h2h__chip--batter${active ? " h2h__chip--active" : ""}`}
    >
      <span className="h2h__chip-slot">{slot.slot}</span>
      <span className="h2h__chip-name">{slot.name}</span>
      <span className="h2h__chip-pos">{slot.pos}</span>
    </button>
  );
}

interface PitcherChipProps { arm: { name: string; playerId: number }; label?: string; active: boolean; onClick: () => void }

function PitcherChip({ arm, label, active, onClick }: PitcherChipProps): ReactElement {
  return (
    <button
      onClick={onClick}
      className={`h2h__chip h2h__chip--pitcher${active ? " h2h__chip--active" : ""}`}
    >
      <span className="h2h__chip-name">{label ?? arm.name}</span>
    </button>
  );
}

interface DeepDiveProps {
  batter: LineupSlot;
  batterMeta: TeamMeta;
  pitcherName: string;
  pitcherMlbId: number | null;
  pitcherMeta: TeamMeta;
}

function DeepDive({ batter, batterMeta, pitcherName, pitcherMlbId, pitcherMeta }: DeepDiveProps): ReactElement {
  const [vs, setVs] = useState<VsPlayerDto | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    setVs(null);
    if (pitcherMlbId == null) {
      setLoaded(true);
      return;
    }
    playersApi
      .playersGetVsPlayer(batter.playerId, pitcherMlbId)
      .then((r) => { if (!cancelled) setVs(r.data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, [batter.playerId, pitcherMlbId]);

  const summary = useMemo(() => (vs != null && vs.pa > 0 ? computeH2HSummary(vs) : null), [vs]);

  return (
    <Card padless>
      <div className="h2h__deepdive-header">
        <Headshot
          mlbId={batter.playerId}
          initials={batter.name.split(" ").map((w) => w[0] ?? "").join("")}
          teamColor={batterMeta.primaryColorHex ?? "var(--color-text-faint)"}
          size={44}
        />
        <div className="h2h__deepdive-title">
          <div className="h2h__deepdive-name">{batter.name}</div>
          <div className="h2h__deepdive-sub">
            {batter.pos} · vs {pitcherName} ({pitcherMeta.abbr})
          </div>
        </div>
        {loaded && summary == null ? (
          <Pill tone="soft">First meeting</Pill>
        ) : summary != null ? (
          <div className="h2h__h2h-line">
            {([["PA", summary.pa], ["AVG", summary.avg ?? "—"], ["OBP", summary.obp], ["SLG", summary.slg], ["HR", summary.hr], ["K", summary.k]] as [string, string | number][]).map(([k, v]) => (
              <div key={k} className="h2h__h2h-stat">
                <span className="h2h__h2h-label">{k}</span>
                <span className="h2h__h2h-value">{v}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
      <div className="h2h__deepdive-empty">
        Pitch-level matchup detail (arsenal breakdown, damage zone) isn't available yet.
      </div>
    </Card>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export interface HeadToHeadScreenProps {
  game: GameViewDto;
  boxScore: BoxScoreDto | null;
  initialSide?: string;
  initialSlot?: number;
  /**
   * Scout-head-scoped pitching chains — when scrubbing a final game, the
   * boxscore's own `pitching` arrays always reflect the FULL game, so
   * "current pitcher" would be the game's last one regardless of the scrub
   * position. Pass these (derived from the sliced play-by-play feed) to
   * follow the scrub head instead; omit for live/pregame games, where the
   * boxscore itself is already exactly current.
   */
  awayPitchingOverride?: readonly PitcherLineDto[];
  homePitchingOverride?: readonly PitcherLineDto[];
}

export function HeadToHeadScreen({ game, boxScore, initialSide, initialSlot, awayPitchingOverride, homePitchingOverride }: HeadToHeadScreenProps): ReactElement {
  const awayMeta = (game.awayTeamMeta as TeamMeta | null) ?? { abbr: game.awayAbbr, name: game.awayName, primaryColorHex: null, logoUrl: null };
  const homeMeta = (game.homeTeamMeta as TeamMeta | null) ?? { abbr: game.homeAbbr, name: game.homeName, primaryColorHex: null, logoUrl: null };

  const snap = game.snapshot as Record<string, unknown> | null;
  const awayProbable: ProbableInfo = (snap?.awayProbable as ProbableInfo | null) ?? { name: null, hand: null, jerseyNumber: null, mlbId: null };
  const homeProbable: ProbableInfo = (snap?.homeProbable as ProbableInfo | null) ?? { name: null, hand: null, jerseyNumber: null, mlbId: null };

  const awaySide = boxScore?.away;
  const homeSide = boxScore?.home;
  const awayPitching: readonly PitcherLineDto[] = awayPitchingOverride ?? awaySide?.pitching ?? [];
  const homePitching: readonly PitcherLineDto[] = homePitchingOverride ?? homeSide?.pitching ?? [];
  const pitchingFor = (side: "away" | "home"): readonly PitcherLineDto[] => side === "away" ? awayPitching : homePitching;
  const awayCurrent = currentPitcherOf(awayPitching);
  const homeCurrent = currentPitcherOf(homePitching);
  const currentFor = (side: "away" | "home"): PitcherLineDto | null => side === "away" ? awayCurrent : homeCurrent;

  const awayData = useMemo(() => boxScore != null ? buildTeamData(boxScore.away.batting) : { lineup: [] }, [boxScore]);
  const homeData = useMemo(() => boxScore != null ? buildTeamData(boxScore.home.batting) : { lineup: [] }, [boxScore]);

  const [mode, setMode] = useState<"batter" | "pitcher">("batter");
  const [batterSide, setBatterSide] = useState<"away" | "home">(initialSide === game.homeAbbr ? "home" : "away");
  const [selectedSlot, setSelectedSlot] = useState<number>(initialSlot ?? 2);

  const [pitcherSide, setPitcherSide] = useState<"away" | "home">("away");
  // "starter" is the true-pregame sentinel (no boxscore pitching data yet, so
  // there's nothing to select by real playerId). Once live, selection is
  // always a real playerId — current pitcher by default, per §3c.
  const [pitcherSel, setPitcherSel] = useState<"starter" | number>(() => awayCurrent?.playerId ?? "starter");
  const [oppSlot, setOppSlot] = useState<number>(2);

  const lineupFor = (side: "away" | "home") => side === "away" ? awayData : homeData;
  const metaFor = (side: "away" | "home") => side === "away" ? awayMeta : homeMeta;
  const probableFor = (side: "away" | "home") => side === "away" ? awayProbable : homeProbable;
  const oppSide = (side: "away" | "home"): "away" | "home" => side === "away" ? "home" : "away";

  const awayLabel = game.awayAbbr;
  const homeLabel = game.homeAbbr;

  const hasLineups = awayData.lineup.length > 0 || homeData.lineup.length > 0;

  if (!hasLineups) {
    return (
      <div className="h2h">
        <StarterPair awayProbable={awayProbable} homeProbable={homeProbable} awayMeta={awayMeta} homeMeta={homeMeta} awayPitching={awayPitching} homePitching={homePitching} />
        <Card>
          <p className="h2h__no-lineups">Lineup data will be available once the game starts.</p>
        </Card>
      </div>
    );
  }

  if (mode === "pitcher") {
    const pSide = pitcherSide;
    const oSide = oppSide(pSide);
    const oTeamData = lineupFor(oSide);
    const pProb = probableFor(pSide);
    const oMeta = metaFor(oSide);
    const pMeta = metaFor(pSide);

    const pCurrent = currentFor(pSide);
    const pStarterLine = pitchingFor(pSide)[0] ?? null;
    const pIsLive = pCurrent != null;
    // Remaining bullpen (arms not yet used) always reflects the real
    // boxscore, not the scout-scoped chain — the roster doesn't "unhappen"
    // when scrubbing back.
    const pBullpen: BullpenPlayerDto[] = (pSide === "away" ? awaySide : homeSide)?.bullpen ?? [];

    let activePitcherName: string;
    let activePitcherMlbId: number | null;
    if (!pIsLive || pitcherSel === "starter") {
      activePitcherName = pProb.name ?? "TBD";
      activePitcherMlbId = pProb.mlbId;
    } else if (pCurrent != null && pitcherSel === pCurrent.playerId) {
      activePitcherName = pCurrent.name;
      activePitcherMlbId = pCurrent.playerId;
    } else if (pStarterLine != null && pitcherSel === pStarterLine.playerId) {
      activePitcherName = pStarterLine.name;
      activePitcherMlbId = pStarterLine.playerId;
    } else {
      const arm = pBullpen.find((b) => b.playerId === pitcherSel);
      activePitcherName = arm?.name ?? pCurrent?.name ?? "TBD";
      activePitcherMlbId = arm?.playerId ?? pCurrent?.playerId ?? null;
    }

    const oppBatter = oTeamData.lineup.find((b) => b.slot === oppSlot) ?? oTeamData.lineup[0];

    return (
      <div className="h2h">
        <StarterPair awayProbable={awayProbable} homeProbable={homeProbable} awayMeta={awayMeta} homeMeta={homeMeta} awayPitching={awayPitching} homePitching={homePitching} />
        <Card padless>
          <div className="h2h__card-eyebrow-bar h2h__card-eyebrow-bar--controls">
            <Eyebrow>By pitcher</Eyebrow>
            <div className="h2h__controls">
              <Segmented items={["Batter", "Pitcher"]} active={1} onClick={(i) => { if (i === 0) setMode("batter"); }} />
              <Segmented items={[awayLabel, homeLabel]} active={pSide === "home" ? 1 : 0} size="sm"
                onClick={(i) => {
                  const newSide = i === 0 ? "away" : "home";
                  setPitcherSide(newSide);
                  setPitcherSel(currentFor(newSide)?.playerId ?? "starter");
                  setOppSlot(2);
                }} />
            </div>
          </div>
          <div className="h2h__chip-rail">
            {pIsLive && pCurrent != null ? (
              <>
                <PitcherChip
                  arm={{ name: pCurrent.name, playerId: pCurrent.playerId }}
                  label={`${pCurrent.name} (pitching)`}
                  active={pitcherSel === pCurrent.playerId}
                  onClick={() => setPitcherSel(pCurrent.playerId)}
                />
                {pStarterLine != null && pStarterLine.playerId !== pCurrent.playerId && (
                  <PitcherChip
                    arm={{ name: pStarterLine.name, playerId: pStarterLine.playerId }}
                    label={`${pStarterLine.name} (starter, pulled)`}
                    active={pitcherSel === pStarterLine.playerId}
                    onClick={() => setPitcherSel(pStarterLine.playerId)}
                  />
                )}
                {pBullpen.map((p) => (
                  <PitcherChip key={p.playerId} arm={p} active={pitcherSel === p.playerId} onClick={() => setPitcherSel(p.playerId)} />
                ))}
              </>
            ) : (
              <PitcherChip
                arm={{ name: pProb.name ?? "TBD", playerId: pProb.mlbId ?? 0 }}
                label={`${pProb.name ?? "TBD"} (starter)`}
                active={pitcherSel === "starter"}
                onClick={() => setPitcherSel("starter")}
              />
            )}
          </div>
        </Card>
        <Card padless>
          <div className="h2h__card-eyebrow-bar">
            <Eyebrow>{activePitcherName} vs the {oMeta.abbr} lineup</Eyebrow>
          </div>
          <div className="h2h__chip-rail">
            {oTeamData.lineup.map((b) => (
              <BatterChip key={b.slot} slot={b} active={oppSlot === b.slot} onClick={() => setOppSlot(b.slot)} />
            ))}
          </div>
        </Card>
        {oppBatter != null && (
          <DeepDive
            batter={oppBatter}
            batterMeta={oMeta}
            pitcherName={activePitcherName}
            pitcherMlbId={activePitcherMlbId}
            pitcherMeta={pMeta}
          />
        )}
      </div>
    );
  }

  // Batter mode — the pitcher in the comparison is the opposing team's
  // pitcher ON THE MOUND once live, not always the starter (§3b).
  const bSide = batterSide;
  const oSide = oppSide(bSide);
  const bTeamData = lineupFor(bSide);
  const bMeta = metaFor(bSide);
  const oProb = probableFor(oSide);
  const oMeta = metaFor(oSide);
  const activeBatter = bTeamData.lineup.find((b) => b.slot === selectedSlot) ?? bTeamData.lineup[0];

  const oCurrent = currentFor(oSide);
  const oIsLive = oCurrent != null;
  const deepDivePitcherName = oIsLive ? oCurrent.name : (oProb.name ?? "TBD");
  const deepDivePitcherMlbId = oIsLive ? oCurrent.playerId : oProb.mlbId;
  const railTitle = oIsLive ? `Lineup vs ${deepDivePitcherName}, on the mound` : "Lineup vs the opposing starter";

  return (
    <div className="h2h">
      <StarterPair awayProbable={awayProbable} homeProbable={homeProbable} awayMeta={awayMeta} homeMeta={homeMeta} awayPitching={awayPitching} homePitching={homePitching} />
      <Card padless>
        <div className="h2h__card-eyebrow-bar h2h__card-eyebrow-bar--controls">
          <Eyebrow>{railTitle}</Eyebrow>
          <div className="h2h__controls">
            <Segmented items={["Batter", "Pitcher"]} active={0} onClick={(i) => { if (i === 1) setMode("pitcher"); }} />
            <Segmented items={[awayLabel, homeLabel]} active={bSide === "home" ? 1 : 0} size="sm"
              onClick={(i) => { setBatterSide(i === 0 ? "away" : "home"); setSelectedSlot(2); }} />
          </div>
        </div>
        <div className="h2h__chip-rail">
          {bTeamData.lineup.map((b) => (
            <BatterChip key={b.slot} slot={b} active={selectedSlot === b.slot} onClick={() => setSelectedSlot(b.slot)} />
          ))}
        </div>
      </Card>
      {activeBatter != null && (
        <DeepDive
          batter={activeBatter}
          batterMeta={bMeta}
          pitcherName={deepDivePitcherName}
          pitcherMlbId={deepDivePitcherMlbId}
          pitcherMeta={oMeta}
        />
      )}
    </div>
  );
}
