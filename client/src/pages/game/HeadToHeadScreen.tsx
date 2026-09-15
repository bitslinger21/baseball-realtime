import { useState, useMemo, useEffect } from "react";
import type { ReactElement } from "react";
import type { BoxScoreDto, GameViewDto, BatterLineDto, PitcherLineDto, VsPlayerDto } from "@bitslinger21/baseball-realtime-client";
import { playersApi } from "../../api/baseballApiClient";
import { Card } from "../../components/primitives/Card";
import { Headshot } from "../../components/primitives/Headshot";
import { Pill } from "../../components/primitives/Pill";
import { Segmented } from "../../components/primitives/Segmented";
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

// ── Data helpers ──────────────────────────────────────────────────────────────

interface LineupSlot { slot: number; name: string; pos: string; playerId: number }
interface BullpenArm { name: string; playerId: number }
interface TeamData { lineup: LineupSlot[]; bullpen: BullpenArm[] }

function buildTeamData(batting: readonly BatterLineDto[], pitching: readonly PitcherLineDto[]): TeamData {
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

  const bullpen: BullpenArm[] = pitching.map((p) => ({ name: p.name, playerId: p.playerId }));

  return { lineup, bullpen };
}

interface TeamMeta { abbr: string; name: string; primaryColorHex: string | null; logoUrl: string | null }
interface ProbableInfo { name: string | null; hand: string | null; jerseyNumber: string | null; mlbId: number | null }

// ── Sub-components ────────────────────────────────────────────────────────────

function Eyebrow({ children }: { children: React.ReactNode }): ReactElement {
  return <div className="h2h__eyebrow">{children}</div>;
}

interface StarterPairProps {
  awayProbable: ProbableInfo;
  homeProbable: ProbableInfo;
  awayMeta: TeamMeta;
  homeMeta: TeamMeta;
}

function StarterPair({ awayProbable, homeProbable, awayMeta, homeMeta }: StarterPairProps): ReactElement {
  const Side = ({ p, meta, label, border }: { p: ProbableInfo; meta: TeamMeta; label: string; border?: boolean }): ReactElement => (
    <div className={`h2h__starter-side${border ? " h2h__starter-side--border" : ""}`}>
      <Headshot
        mlbId={p.mlbId}
        initials={p.name ? p.name.split(" ").map((w) => w[0] ?? "").join("") : "?"}
        teamColor={meta.primaryColorHex ?? "var(--color-text-faint)"}
        size={64}
      />
      <div className="h2h__starter-info">
        <Eyebrow>{label} · {meta.abbr}</Eyebrow>
        <div className="h2h__starter-name">{p.name ?? "TBD"}</div>
        <div className="h2h__starter-meta">
          {p.hand != null ? (p.hand === "L" ? "LHP" : "RHP") : "—"}
          {p.jerseyNumber != null ? ` · #${p.jerseyNumber}` : ""}
        </div>
      </div>
    </div>
  );

  return (
    <Card padless>
      <div className="h2h__card-eyebrow-bar">
        <Eyebrow>Starting pitchers</Eyebrow>
      </div>
      <div className="h2h__starter-grid">
        <Side p={awayProbable} meta={awayMeta} label="Starter" border />
        <Side p={homeProbable} meta={homeMeta} label="Starter" />
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

interface PitcherChipProps { arm: BullpenArm; label?: string; active: boolean; onClick: () => void }

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
}

export function HeadToHeadScreen({ game, boxScore, initialSide, initialSlot }: HeadToHeadScreenProps): ReactElement {
  const awayMeta = (game.awayTeamMeta as TeamMeta | null) ?? { abbr: game.awayAbbr, name: game.awayName, primaryColorHex: null, logoUrl: null };
  const homeMeta = (game.homeTeamMeta as TeamMeta | null) ?? { abbr: game.homeAbbr, name: game.homeName, primaryColorHex: null, logoUrl: null };

  const snap = game.snapshot as Record<string, unknown> | null;
  const awayProbable: ProbableInfo = (snap?.awayProbable as ProbableInfo | null) ?? { name: null, hand: null, jerseyNumber: null, mlbId: null };
  const homeProbable: ProbableInfo = (snap?.homeProbable as ProbableInfo | null) ?? { name: null, hand: null, jerseyNumber: null, mlbId: null };

  const awayData = useMemo(() => boxScore != null ? buildTeamData(boxScore.away.batting, boxScore.away.pitching) : { lineup: [], bullpen: [] }, [boxScore]);
  const homeData = useMemo(() => boxScore != null ? buildTeamData(boxScore.home.batting, boxScore.home.pitching) : { lineup: [], bullpen: [] }, [boxScore]);

  const [mode, setMode] = useState<"batter" | "pitcher">("batter");
  const [batterSide, setBatterSide] = useState<"away" | "home">(initialSide === game.homeAbbr ? "home" : "away");
  const [selectedSlot, setSelectedSlot] = useState<number>(initialSlot ?? 2);

  const [pitcherSide, setPitcherSide] = useState<"away" | "home">("away");
  const [pitcherSel, setPitcherSel] = useState<"starter" | number>("starter"); // 'starter' or bullpen playerId
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
        <StarterPair awayProbable={awayProbable} homeProbable={homeProbable} awayMeta={awayMeta} homeMeta={homeMeta} />
        <Card>
          <p className="h2h__no-lineups">Lineup data will be available once the game starts.</p>
        </Card>
      </div>
    );
  }

  if (mode === "pitcher") {
    const pSide = pitcherSide;
    const oSide = oppSide(pSide);
    const pTeamData = lineupFor(pSide);
    const oTeamData = lineupFor(oSide);
    const pProb = probableFor(pSide);
    const oMeta = metaFor(oSide);
    const pMeta = metaFor(pSide);

    const activePitcherName = pitcherSel === "starter"
      ? (pProb.name ?? "TBD")
      : (pTeamData.bullpen.find((b) => b.playerId === pitcherSel)?.name ?? pProb.name ?? "TBD");
    const activePitcherMlbId = pitcherSel === "starter" ? pProb.mlbId : null;
    const oppBatter = oTeamData.lineup.find((b) => b.slot === oppSlot) ?? oTeamData.lineup[0];

    return (
      <div className="h2h">
        <StarterPair awayProbable={awayProbable} homeProbable={homeProbable} awayMeta={awayMeta} homeMeta={homeMeta} />
        <Card padless>
          <div className="h2h__card-eyebrow-bar h2h__card-eyebrow-bar--controls">
            <Eyebrow>By pitcher</Eyebrow>
            <div className="h2h__controls">
              <Segmented items={["Batter", "Pitcher"]} active={1} onClick={(i) => { if (i === 0) setMode("batter"); }} />
              <Segmented items={[awayLabel, homeLabel]} active={pSide === "home" ? 1 : 0} size="sm"
                onClick={(i) => { setPitcherSide(i === 0 ? "away" : "home"); setPitcherSel("starter"); setOppSlot(2); }} />
            </div>
          </div>
          <div className="h2h__chip-rail">
            <PitcherChip arm={{ name: pProb.name ?? "TBD", playerId: pProb.mlbId ?? 0 }} label={`${pProb.name ?? "TBD"} (starter)`} active={pitcherSel === "starter"} onClick={() => setPitcherSel("starter")} />
            {pTeamData.bullpen.map((p) => (
              <PitcherChip key={p.playerId} arm={p} active={pitcherSel === p.playerId} onClick={() => setPitcherSel(p.playerId)} />
            ))}
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

  // Batter mode
  const bSide = batterSide;
  const oSide = oppSide(bSide);
  const bTeamData = lineupFor(bSide);
  const bMeta = metaFor(bSide);
  const oProb = probableFor(oSide);
  const oMeta = metaFor(oSide);
  const activeBatter = bTeamData.lineup.find((b) => b.slot === selectedSlot) ?? bTeamData.lineup[0];

  return (
    <div className="h2h">
      <StarterPair awayProbable={awayProbable} homeProbable={homeProbable} awayMeta={awayMeta} homeMeta={homeMeta} />
      <Card padless>
        <div className="h2h__card-eyebrow-bar h2h__card-eyebrow-bar--controls">
          <Eyebrow>Lineup vs the opposing starter</Eyebrow>
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
          pitcherName={oProb.name ?? "TBD"}
          pitcherMlbId={oProb.mlbId}
          pitcherMeta={oMeta}
        />
      )}
    </div>
  );
}
