import { useState, useMemo, useEffect } from "react";
import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import type { BoxScoreDto, GameViewDto, BatterLineDto, PitcherLineDto, BullpenPlayerDto, VsPlayerDto, PitcherSeasonTotalsDto } from "@bitslinger21/scorebook-client";
import { playersApi } from "../../api/baseballApiClient";
import { Card } from "../../components/primitives/Card";
import { Headshot } from "../../components/primitives/Headshot";
import { Pill } from "../../components/primitives/Pill";
import { TeamDot } from "../../components/primitives/TeamDot";
import { TEAMS } from "../../utils/teams";
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
  return { pa: v.pa, avg: v.avg ?? null, obp: fmt3(obp), slg: fmt3(slg), hr: v.hr, k: v.k };
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
//
// Head-to-head v2 (PROMPT_headtohead_v2.md): the two pitcher cards ARE the
// selector — no team toggle, no Batter/Pitcher mode. Pick a pitcher and the
// lineup rail is the OTHER club's hitters; the old Pitcher mode's bullpen
// "what if" is an "Or try" chip row inside the selected card.

type Side = "away" | "home";
// The pitcher in the matchup: the one on the mound, the pulled starter, or a
// bullpen arm by playerId.
type Alt = "mound" | "starter" | number;

interface ArmRef { name: string; mlbId: number | null; hand: string | null }

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

function shortName(abbr: string): string {
  return TEAMS[abbr]?.short ?? abbr;
}

// A player name that opens the player page. On the unselected card a click on
// the name must not also select the card.
function NameLink({ id, name, gameId, className }: { id: number | null; name: string; gameId: string; className?: string }): ReactElement {
  if (id == null) return <span className={className}>{name}</span>;
  return (
    <Link
      to={`/player/${id}`}
      state={{ fromGame: gameId }}
      className={`player-link${className ? ` ${className}` : ""}`}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {name}
    </Link>
  );
}

function PregameBody({ p, gameId }: { p: ProbableInfo; gameId: string }): ReactElement {
  const totals = useSeasonPitching(p.mlbId);
  return (
    <>
      <NameLink id={p.mlbId} name={p.name ?? "TBD"} gameId={gameId} className="h2h__starter-name" />
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
    </>
  );
}

function LiveBody({ pitching, gameId }: { pitching: readonly PitcherLineDto[]; gameId: string }): ReactElement {
  const current = currentPitcherOf(pitching);
  const handoff = handoffInfoOf(pitching);
  const totals = useSeasonPitching(current?.playerId ?? null);

  if (current == null) {
    // Brief edge case: the visiting team's starter hasn't thrown a pitch yet
    // (still the top of the 1st) — a minimal placeholder rather than a
    // fabricated stat line.
    return <div className="h2h__starter-meta">Not up yet</div>;
  }

  const record = fmtRecord(totals?.wins, totals?.losses);
  const era = totals?.era != null ? String(totals.era) : "—";
  const replaced = handoff.replaced;

  return (
    <>
      <NameLink id={current.playerId} name={current.name} gameId={gameId} className="h2h__starter-name" />
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
      <div className="h2h__starter-handoff">
        {handoff.ordinal <= 1 || replaced == null ? (
          <>Starter · still in</>
        ) : (
          <>
            {handoff.ordinal >= 3 ? `${ordinal(handoff.ordinal)} pitcher · ` : ""}Relieved{" "}
            <NameLink id={replaced.playerId} name={surname(replaced.name)} gameId={gameId} className="h2h__handoff-name" />
            {" · "}{handoff.inning != null ? ordinal(handoff.inning) : "—"}{" · "}
            <span className="num">{`${formatIP(replaced.ip)} IP, ${replaced.r} R`}</span>
          </>
        )}
      </div>
    </>
  );
}

function AltChip({ label, sub, active, onClick }: { label: string; sub?: string; active: boolean; onClick: () => void }): ReactElement {
  return (
    <button
      type="button"
      className={`h2h__alt-chip${active ? " h2h__alt-chip--active" : ""}`}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <span className="h2h__alt-chip-label">{label}</span>
      {sub != null && <span className="h2h__alt-chip-sub num">{sub}</span>}
    </button>
  );
}

interface PitcherSelectCardProps {
  selected: boolean;
  onSelect: () => void;
  border: boolean;
  meta: TeamMeta;
  oppAbbr: string;
  probable: ProbableInfo;
  pitching: readonly PitcherLineDto[];
  bullpen: readonly BullpenPlayerDto[];
  alt: Alt;
  onAlt: (a: Alt) => void;
  gameId: string;
}

// One half of "On the mound" / "Starting pitchers", as a button. Selected:
// rust top rule + "Facing the {opp} ↓"; unselected: grayscale headshot and
// muted text (colour, not opacity — it still carries live info), still
// clickable. Both reserve the 3px top border, so switching never shifts layout.
function PitcherSelectCard({ selected, onSelect, border, meta, oppAbbr, probable, pitching, bullpen, alt, onAlt, gameId }: PitcherSelectCardProps): ReactElement {
  const live = pitching.length > 0;
  const current = currentPitcherOf(pitching);
  const starter = pitching[0] ?? null;
  const moundName = live ? (current?.name ?? "—") : (probable.name ?? "TBD");
  const moundId = live ? (current?.playerId ?? null) : probable.mlbId;
  const pulled = live && starter != null && current != null && starter.playerId !== current.playerId ? starter : null;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={selected ? undefined : `Show ${moundName}'s matchups`}
      className={`h2h__pick${selected ? " h2h__pick--selected" : ""}${border ? " h2h__pick--border" : ""}`}
      onClick={selected ? undefined : onSelect}
      onKeyDown={(e) => {
        if (!selected && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onSelect(); }
      }}
    >
      <div className="h2h__pick-row">
        <div className="h2h__pick-photo">
          <Headshot
            mlbId={moundId}
            initials={moundName.split(" ").map((w) => w[0] ?? "").join("")}
            teamColor={meta.primaryColorHex ?? "var(--color-text-faint)"}
            size={64}
          />
        </div>
        <div className="h2h__starter-info">
          <div className="h2h__pick-eyebrow">
            <Eyebrow>{live ? "Pitching" : "Starter"} · {meta.abbr}</Eyebrow>
            {selected
              ? <span className="h2h__pick-facing">Facing the {shortName(oppAbbr)} ↓</span>
              : <span className="h2h__pick-hint">Show his matchups</span>}
          </div>
          {live
            ? <LiveBody pitching={pitching} gameId={gameId} />
            : <PregameBody p={probable} gameId={gameId} />}
        </div>
      </div>
      {selected && (
        <div className="h2h__or-try">
          <span className="h2h__or-try-label">Or try</span>
          <AltChip label={surname(moundName)} sub={live ? "pitching" : "starter"} active={alt === "mound"} onClick={() => onAlt("mound")} />
          {pulled != null && (
            <AltChip label={surname(pulled.name)} sub="pulled" active={alt === "starter"} onClick={() => onAlt("starter")} />
          )}
          {bullpen.map((b) => (
            <AltChip key={b.playerId} label={surname(b.name)} sub={b.era != null ? b.era : undefined} active={alt === b.playerId} onClick={() => onAlt(b.playerId)} />
          ))}
        </div>
      )}
    </div>
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

interface DeepDiveProps {
  batter: LineupSlot;
  batterMeta: TeamMeta;
  pitcher: ArmRef;
  gameId: string;
}

// Header in three left-aligned groups (§4): who · career vs this pitcher ·
// the read. The career group keeps one height whether or not they've met.
// There's no one-sentence "read" in the app's data (the design's read came
// from mock data), so that group is left out rather than invented.
function DeepDive({ batter, batterMeta, pitcher, gameId }: DeepDiveProps): ReactElement {
  const [vs, setVs] = useState<VsPlayerDto | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    setVs(null);
    if (pitcher.mlbId == null) {
      setLoaded(true);
      return;
    }
    playersApi
      .playersGetVsPlayer(batter.playerId, pitcher.mlbId)
      .then((r) => { if (!cancelled) setVs(r.data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, [batter.playerId, pitcher.mlbId]);

  const summary = useMemo(() => (vs != null && vs.pa > 0 ? computeH2HSummary(vs) : null), [vs]);
  const firstMeeting = loaded && summary == null;

  return (
    <Card padless>
      <div className="h2h__deepdive-header">
        <div className="h2h__dd-who">
          <Headshot
            mlbId={batter.playerId}
            initials={batter.name.split(" ").map((w) => w[0] ?? "").join("")}
            teamColor={batterMeta.primaryColorHex ?? "var(--color-text-faint)"}
            size={44}
          />
          <div className="h2h__deepdive-title">
            <NameLink id={batter.playerId} name={batter.name} gameId={gameId} className="h2h__deepdive-name" />
            <div className="h2h__deepdive-sub">
              {batter.pos} · vs {pitcher.name}{pitcher.hand != null ? ` (${pitcher.hand})` : ""}
            </div>
          </div>
        </div>
        <div className="h2h__dd-group">
          <Eyebrow>Career vs {surname(pitcher.name)}{summary != null ? ` · ${summary.pa} PA` : ""}</Eyebrow>
          <div className="h2h__dd-career">
            {firstMeeting ? (
              <>
                <Pill tone="soft">First meeting</Pill>
                <span className="h2h__dd-none">No history yet</span>
              </>
            ) : summary != null ? (
              <div className="h2h__h2h-line">
                {([["AVG", summary.avg ?? "—"], ["OBP", summary.obp], ["SLG", summary.slg], ["HR", summary.hr], ["K", summary.k]] as [string, string | number][]).map(([k, v]) => (
                  <div key={k} className="h2h__h2h-stat">
                    <span className="h2h__h2h-label">{k}</span>
                    <span className="h2h__h2h-value">{v}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
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
  /** The BATTING team's abbr (v1 contract); the selected pitcher is the other club's. */
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
  const gameId = game.providerGameId ?? "";

  const snap = game.snapshot as Record<string, unknown> | null;
  const awayProbable: ProbableInfo = (snap?.awayProbable as ProbableInfo | null) ?? { name: null, hand: null, jerseyNumber: null, mlbId: null };
  const homeProbable: ProbableInfo = (snap?.homeProbable as ProbableInfo | null) ?? { name: null, hand: null, jerseyNumber: null, mlbId: null };

  const awayPitching: readonly PitcherLineDto[] = awayPitchingOverride ?? boxScore?.away?.pitching ?? [];
  const homePitching: readonly PitcherLineDto[] = homePitchingOverride ?? boxScore?.home?.pitching ?? [];

  const awayData = useMemo(() => boxScore != null ? buildTeamData(boxScore.away.batting) : { lineup: [] }, [boxScore]);
  const homeData = useMemo(() => boxScore != null ? buildTeamData(boxScore.home.batting) : { lineup: [] }, [boxScore]);

  const oppOf = (side: Side): Side => side === "away" ? "home" : "away";
  const metaFor = (side: Side): TeamMeta => side === "away" ? awayMeta : homeMeta;
  const probableFor = (side: Side): ProbableInfo => side === "away" ? awayProbable : homeProbable;
  const pitchingFor = (side: Side): readonly PitcherLineDto[] => side === "away" ? awayPitching : homePitching;
  const lineupFor = (side: Side): TeamData => side === "away" ? awayData : homeData;
  // Remaining bullpen (arms still eligible) always reflects the real boxscore,
  // not the scout-scoped chain — the roster doesn't "unhappen" when scrubbing.
  const bullpenFor = (side: Side): readonly BullpenPlayerDto[] => boxScore?.[side]?.bullpen ?? [];

  // Live opens on the pitcher facing the current batter (initialSide is the
  // batting team); pregame opens on the away starter.
  const [pk, setPk] = useState<Side>(() =>
    initialSide == null ? "away" : initialSide === game.homeAbbr ? "away" : "home");
  const [alt, setAlt] = useState<Alt>("mound");
  const [slot, setSlot] = useState<number>(initialSlot ?? 2);
  // Switching pitchers resets to the mound arm and the 2-hole.
  const pick = (side: Side): void => { setPk(side); setAlt("mound"); setSlot(2); };

  const pPitching = pitchingFor(pk);
  const pLive = pPitching.length > 0;
  const pCurrent = currentPitcherOf(pPitching);
  const pProb = probableFor(pk);
  const mound: ArmRef = pLive && pCurrent != null
    ? { name: pCurrent.name, mlbId: pCurrent.playerId, hand: pCurrent.handedness ?? null }
    : { name: pProb.name ?? "TBD", mlbId: pProb.mlbId, hand: pProb.hand };
  const pStarter = pPitching[0] ?? null;
  const pBullpen = bullpenFor(pk);
  const pitcher: ArmRef = alt === "mound"
    ? mound
    : alt === "starter" && pStarter != null
      ? { name: pStarter.name, mlbId: pStarter.playerId, hand: pStarter.handedness ?? null }
      : (() => {
          const arm = pBullpen.find((b) => b.playerId === alt);
          return arm != null ? { name: arm.name, mlbId: arm.playerId, hand: null } : mound;
        })();
  const isWhatIf = alt !== "mound";

  const bSide = oppOf(pk);
  const bMeta = metaFor(bSide);
  const batters = lineupFor(bSide).lineup;
  const batter = batters.find((b) => b.slot === slot) ?? batters[0];
  const hasLineups = awayData.lineup.length > 0 || homeData.lineup.length > 0;
  const anyLive = awayPitching.length > 0 || homePitching.length > 0;
  const bTeam = TEAMS[bMeta.abbr];

  return (
    <div className="h2h">
      <Card padless>
        <div className="h2h__card-eyebrow-bar">
          <Eyebrow>{anyLive ? "On the mound" : "Starting pitchers"}</Eyebrow>
        </div>
        <div className="h2h__starter-grid">
          {(["away", "home"] as const).map((side, i) => (
            <PitcherSelectCard
              key={side}
              selected={pk === side}
              onSelect={() => pick(side)}
              border={i === 0}
              meta={metaFor(side)}
              oppAbbr={metaFor(oppOf(side)).abbr}
              probable={probableFor(side)}
              pitching={pitchingFor(side)}
              bullpen={bullpenFor(side)}
              alt={alt}
              onAlt={setAlt}
              gameId={gameId}
            />
          ))}
        </div>
      </Card>
      {!hasLineups ? (
        <Card>
          <p className="h2h__no-lineups">Lineup data will be available once the game starts.</p>
        </Card>
      ) : (
        <>
          <Card padless>
            <div className="h2h__card-eyebrow-bar h2h__lineup-head">
              <div className="h2h__lineup-title">
                {bTeam != null && <TeamDot team={bTeam} size={20} />}
                <Eyebrow>{shortName(bMeta.abbr)} lineup vs {pitcher.name}</Eyebrow>
              </div>
              {isWhatIf && (
                <div className="h2h__whatif">
                  <span className="h2h__whatif-note">What-if matchup — {surname(pitcher.name)} isn’t pitching</span>
                  <button type="button" className="h2h__whatif-back" onClick={() => setAlt("mound")}>
                    Back to {surname(mound.name)}
                  </button>
                </div>
              )}
            </div>
            <div className="h2h__chip-rail">
              {batters.map((b) => (
                <BatterChip key={b.slot} slot={b} active={batter?.slot === b.slot} onClick={() => setSlot(b.slot)} />
              ))}
            </div>
          </Card>
          {batter != null && (
            <DeepDive batter={batter} batterMeta={bMeta} pitcher={pitcher} gameId={gameId} />
          )}
        </>
      )}
    </div>
  );
}
