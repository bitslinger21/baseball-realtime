import { useState, useMemo } from "react";
import type { ReactElement } from "react";
import type { BoxScoreDto, GameViewDto, BatterLineDto, PitcherLineDto } from "@bitslinger21/baseball-realtime-client";
import { Card } from "../../components/primitives/Card";
import { Headshot } from "../../components/primitives/Headshot";
import { Pill } from "../../components/primitives/Pill";
import { Segmented } from "../../components/primitives/Segmented";
import { StrikeZone } from "../../components/primitives/StrikeZone";
import { Th, Td, Tr } from "../../components/primitives/Table";
import "./HeadToHeadScreen.css";

// ── Mock stats (deterministic hash — replace with real batter-vs-pitcher endpoint) ──

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function seeded(seed: number, i: number): number {
  const x = Math.sin(seed + i * 999) * 10000;
  return x - Math.floor(x);
}

const PITCH_TYPES = ["Four-seam", "Sinker", "Slider", "Curveball", "Changeup"];

interface PitchRow { type: string; avg: string; slg: string; whiff: number }
interface MockH2H {
  firstMeeting: boolean;
  pa?: number; avg?: string; obp?: string; slg?: string; hr?: number; k?: number;
  pitchRows: PitchRow[];
  heat: number[];
  read: string;
}

function mockH2H(batterName: string, pitcherName: string): MockH2H {
  const h = hashStr(batterName + pitcherName);
  const firstMeeting = seeded(h, 0) < 0.28;
  const pitchRows: PitchRow[] = PITCH_TYPES.slice(0, 4 + (h % 2)).map((type, i) => ({
    type,
    avg: (0.150 + seeded(h, i + 1) * 0.230).toFixed(3).slice(1),
    slg: (0.200 + seeded(h, i + 5) * 0.420).toFixed(3).slice(1),
    whiff: Math.round(10 + seeded(h, i + 9) * 38),
  }));
  const heat = Array.from({ length: 9 }, (_, i) => seeded(h, i + 20));
  const bestPitch = pitchRows.reduce((a, b) => (parseFloat(b.slg) > parseFloat(a.slg) ? b : a));
  const worstPitch = pitchRows.reduce((a, b) => (parseFloat(b.slg) < parseFloat(a.slg) ? b : a));
  const read = `Damage on the ${bestPitch.type.toLowerCase()} (.${bestPitch.slg.slice(1)} SLG), cold on the ${worstPitch.type.toLowerCase()} (${worstPitch.whiff}% whiff).`;
  if (firstMeeting) return { firstMeeting: true, pitchRows, heat, read };
  const pa = 4 + (h % 14);
  const ab = Math.max(pa - (h % 3), 1);
  const hits = Math.min(ab, Math.round(seeded(h, 40) * ab * 0.5));
  const hr = seeded(h, 41) < 0.15 ? 1 : 0;
  const bb = pa - ab;
  const k = Math.round(seeded(h, 42) * ab * 0.4);
  const avg = (hits / ab).toFixed(3).slice(1);
  const obp = ((hits + bb) / pa).toFixed(3).slice(1);
  const slgTotal = hits + hr * 3;
  const slg = (slgTotal / ab).toFixed(3).slice(1);
  return { firstMeeting: false, pa, avg, obp, slg, hr, k, pitchRows, heat, read };
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

function DeepDive({ batter, batterMeta, pitcherName, pitcherMeta }: DeepDiveProps): ReactElement {
  const d = useMemo(() => mockH2H(batter.name, pitcherName), [batter.name, pitcherName]);
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
        {d.firstMeeting ? (
          <Pill tone="soft">First meeting</Pill>
        ) : (
          <div className="h2h__h2h-line">
            {([["PA", d.pa], ["AVG", d.avg], ["OBP", d.obp], ["SLG", d.slg], ["HR", d.hr], ["K", d.k]] as [string, string | number | undefined][]).map(([k, v]) => (
              <div key={k} className="h2h__h2h-stat">
                <span className="h2h__h2h-label">{k}</span>
                <span className="h2h__h2h-value">{v ?? "—"}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="h2h__deepdive-body">
        <div className="h2h__arsenal">
          <Eyebrow>Arsenal vs this bat</Eyebrow>
          <div className="h2h__arsenal-sub">
            How {batter.name.split(" ").pop()} has hit each pitch type {pitcherName.split(" ").pop()} throws
          </div>
          <table className="tbl h2h__arsenal-table">
            <thead>
              <tr><Th align="left">Pitch</Th><Th>AVG</Th><Th>SLG</Th><Th>Whiff%</Th></tr>
            </thead>
            <tbody>
              {d.pitchRows.map((r) => (
                <Tr key={r.type}>
                  <Td align="left" mono={false}>{r.type}</Td>
                  <Td>.{r.avg.replace(".", "")}</Td>
                  <Td>.{r.slg.replace(".", "")}</Td>
                  <Td hot={r.whiff >= 30}>{r.whiff}%</Td>
                </Tr>
              ))}
            </tbody>
          </table>
          <div className="h2h__read">{d.read}</div>
        </div>
        <div className="h2h__zone-col">
          <Eyebrow>Damage zone</Eyebrow>
          <StrikeZone size={110} heat={d.heat} />
        </div>
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
