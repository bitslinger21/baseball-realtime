import "./StandingsPage.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import type { StandingTeamDto } from "@bitslinger21/baseball-realtime-client";
import { standingsApi } from "../api/baseballApiClient";
import { PageTitle } from "../components/primitives/PageTitle";
import { PageMenu } from "../components/primitives/PageMenu";
import { getBackLabel } from "../utils/backLabel";
import { Segmented } from "../components/primitives/Segmented";
import { TEAMS } from "../utils/teams";

// ── Helpers ────────────────────────────────────────────────────

const DIV_ORDER   = ["East", "Central", "West"];
const LEAGUE_ORDER = ["American League", "National League"];
const CURRENT_YEAR = String(new Date().getFullYear());
const THROUGH_DATE = new Date().toLocaleDateString("en-US", {
  month: "short",
  day: "numeric",
});

type DivisionData = { divisionName: string; teams: StandingTeamDto[] };
type LeagueData   = { leagueName: string; divisions: DivisionData[] };

function groupByLeague(teams: readonly StandingTeamDto[]): LeagueData[] {
  const lgMap = new Map<string, Map<string, StandingTeamDto[]>>();
  for (const t of teams) {
    if (!lgMap.has(t.leagueName)) lgMap.set(t.leagueName, new Map());
    const divMap = lgMap.get(t.leagueName)!;
    if (!divMap.has(t.divisionName)) divMap.set(t.divisionName, []);
    divMap.get(t.divisionName)!.push(t);
  }
  return [...lgMap.keys()]
    .sort((a, b) => LEAGUE_ORDER.indexOf(a) - LEAGUE_ORDER.indexOf(b))
    .map((leagueName) => {
      const divMap = lgMap.get(leagueName)!;
      const divisions = [...divMap.entries()]
        .map(([divisionName, ts]) => ({
          divisionName,
          teams: [...ts].sort((a, b) => a.rank - b.rank),
        }))
        .sort((a, b) => {
          const ai = DIV_ORDER.findIndex((s) => a.divisionName.includes(s));
          const bi = DIV_ORDER.findIndex((s) => b.divisionName.includes(s));
          return ai - bi;
        });
      return { leagueName, divisions };
    });
}

function mlbLogoUrl(abbr: string): string | null {
  const id = TEAMS[abbr]?.id;
  return id != null ? `https://www.mlbstatic.com/team-logos/${id}.svg` : null;
}

function divShortName(divisionName: string): string {
  return divisionName
    .replace("American League ", "AL ")
    .replace("National League ", "NL ");
}

function formatGB(gb: string): string {
  return gb === "-" ? "—" : gb;
}

function formatL10(l10: string): string {
  return l10.replace("-", "–");
}

function extractCity(displayName: string, teamName: string): string {
  return displayName.replace(teamName, "").trim();
}

// ── Wild Card helpers ──────────────────────────────────────────

type WildCardLeague = {
  leagueName: string;
  seeds: StandingTeamDto[];
  wildcards: StandingTeamDto[];
  below: StandingTeamDto[];
  cutoff: StandingTeamDto | null;
};

function sortByRecord(a: StandingTeamDto, b: StandingTeamDto): number {
  const pa = parseFloat(a.pct) || 0;
  const pb = parseFloat(b.pct) || 0;
  if (pb !== pa) return pb - pa;
  return b.wins - a.wins;
}

function buildWildCard(teams: readonly StandingTeamDto[]): WildCardLeague[] {
  const byLeague = new Map<string, StandingTeamDto[]>();
  for (const t of teams) {
    if (!byLeague.has(t.leagueName)) byLeague.set(t.leagueName, []);
    byLeague.get(t.leagueName)!.push(t);
  }
  return [...byLeague.keys()]
    .sort((a, b) => LEAGUE_ORDER.indexOf(a) - LEAGUE_ORDER.indexOf(b))
    .map((leagueName) => {
      const lgTeams = byLeague.get(leagueName)!;
      const leaderAbbrs = new Set(lgTeams.filter((t) => t.rank === 1).map((t) => t.abbr));
      const seeds     = lgTeams.filter((t) =>  leaderAbbrs.has(t.abbr)).sort(sortByRecord);
      const rest      = lgTeams.filter((t) => !leaderAbbrs.has(t.abbr)).sort(sortByRecord);
      const wildcards = rest.slice(0, 3);
      const below     = rest.slice(3);
      const cutoff    = rest[2] ?? null;
      return { leagueName, seeds, wildcards, below, cutoff };
    });
}

function wcgbStr(team: StandingTeamDto, cutoff: StandingTeamDto | null): string {
  if (cutoff == null || team.abbr === cutoff.abbr) return "–";
  const diff = ((team.wins - cutoff.wins) + (cutoff.losses - team.losses)) / 2;
  if (diff > 0) return `+${diff.toFixed(1)}`;
  return Math.abs(diff).toFixed(1);
}

// ── Chart helpers ──────────────────────────────────────────────

const TEAM_COLORS: Record<string, string> = {
  TB:  '#092C5C', NYY: '#0C2340', TOR: '#134A8E', BAL: '#DF4601', BOS: '#BD3039',
  CWS: '#27251F', CLE: '#00385D', MIN: '#002B5C', DET: '#0C2340', KC:  '#004687',
  SEA: '#0C2C56', TEX: '#003278', HOU: '#002D62', ATH: '#003831', LAA: '#BA0021',
  ATL: '#13274F', PHI: '#E81828', MIA: '#00A3E0', WSH: '#AB0003', NYM: '#002D72',
  CHC: '#0E3386', MIL: '#12284B', STL: '#C41E3A', CIN: '#C6011F', PIT: '#27251F',
  LAD: '#005A9C', SD:  '#2F241D', SF:  '#FD5A1E', AZ:  '#A71930', COL: '#333366',
};

function buildDays(): Date[] {
  const start = new Date(Number(CURRENT_YEAR), 2, 26); // Opening Day
  const end   = new Date();
  end.setHours(0, 0, 0, 0);
  const days: Date[] = [];
  const d = new Date(start);
  while (d < end) { days.push(new Date(d)); d.setDate(d.getDate() + 1); }
  days.push(new Date(end));
  return days;
}
const RH_DAYS = buildDays();
const RH_DAY_LABELS = RH_DAYS.map((d) =>
  d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
);

const RH_VB_W  = 1000;
const RH_VB_H  = 420;
const RH_LEFT  = 30;
const RH_RIGHT = 30;
const RH_TOP   = 14;
const RH_BOTTOM = 28;
const RH_PLOT_W = RH_VB_W - RH_LEFT - RH_RIGHT;
const RH_PLOT_H = RH_VB_H - RH_TOP - RH_BOTTOM;
const RH_DAYS_PER_SEC = 22;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

// Real per-day cumulative wins, from each team's `winsByDay` (sparse — one
// entry per date the team played a completed game). Step function: flat
// between games, jumps on each game date. Replaces the fabricated PRNG
// shuffle that used to stand in for a per-day series the API didn't expose.
function winsSeriesFromReal(teams: readonly StandingTeamDto[]): Record<string, number[]> {
  const dayKeys = RH_DAYS.map(dayKey);
  const series: Record<string, number[]> = {};
  teams.forEach((team) => {
    const entries = [...(team.winsByDay ?? [])].sort((a, b) => a.date.localeCompare(b.date));
    const daily = new Array<number>(dayKeys.length).fill(0);
    let ei = 0;
    let cum = 0;
    for (let d = 0; d < dayKeys.length; d++) {
      while (ei < entries.length && entries[ei]!.date <= dayKeys[d]!) {
        cum = entries[ei]!.wins;
        ei++;
      }
      daily[d] = cum;
    }
    series[team.abbr] = daily;
  });
  return series;
}

function niceStep(max: number): number {
  const target = Math.max(1, max) / 6;
  const steps = [1, 2, 5, 10, 15, 20, 25, 50, 100];
  return steps.find((s) => s >= target) ?? 100;
}

type RhHover = { abbr: string; dayIdx: number };

// ── Sub-components ─────────────────────────────────────────────

function TeamLogo({ abbr, size = 21 }: { abbr: string; size?: number }): React.ReactElement {
  const [failed, setFailed] = useState(false);
  const url = mlbLogoUrl(abbr);
  const info = TEAMS[abbr];

  if (url != null && !failed) {
    return (
      <img
        style={{ width: size, height: size, objectFit: "contain", flexShrink: 0 }}
        src={url}
        alt={abbr}
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <div
      style={{
        width: size, height: size, borderRadius: "50%",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: Math.floor(size * 0.38), fontWeight: 700, color: "#fff",
        flexShrink: 0, background: info?.primary ?? "#555",
      }}
    >
      {abbr.slice(0, 2)}
    </div>
  );
}

function RankHistoryChart({
  scopeTeams,
  playDay,
  minimal = false,
}: {
  scopeTeams: StandingTeamDto[];
  playDay: number | null;
  minimal?: boolean;
}): React.ReactElement {
  const weeksN = RH_DAYS.length;
  const wins = useMemo(() => winsSeriesFromReal(scopeTeams), [scopeTeams]);
  const [hover, setHover] = useState<RhHover | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => { setHover(null); }, [scopeTeams]);

  const maxDay   = playDay ?? weeksN - 1;
  const floorDay = Math.floor(maxDay);
  const frac     = maxDay - floorDay;
  const isAnimating = playDay != null && playDay < weeksN - 1;

  const yMax = Math.max(1, ...scopeTeams.map((t) => wins[t.abbr]?.[weeksN - 1] ?? 0));
  const step = niceStep(yMax);
  const yTop = Math.ceil(yMax / step) * step;

  const xAt = (w: number): number =>
    RH_LEFT + (weeksN <= 1 ? 0 : (w / (weeksN - 1)) * RH_PLOT_W);
  const yAt = (v: number): number =>
    RH_TOP + (1 - v / Math.max(1, yTop)) * RH_PLOT_H;

  const showXEvery = Math.max(1, Math.ceil(weeksN / 11));
  const yTicks: number[] = [];
  for (let v = 0; v <= yTop; v += step) yTicks.push(v);

  const handleMove = (e: React.MouseEvent<SVGSVGElement>): void => {
    if (isAnimating) return;
    const el = svgRef.current;
    if (el == null) return;
    const rect = el.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * RH_VB_W;
    const py = ((e.clientY - rect.top) / rect.height) * RH_VB_H;
    const divisor = weeksN <= 1 ? 1 : RH_PLOT_W / (weeksN - 1);
    let w = Math.round((px - RH_LEFT) / divisor);
    w = Math.max(0, Math.min(weeksN - 1, w));
    let best: StandingTeamDto | null = null;
    let bestD = Infinity;
    for (const team of scopeTeams) {
      const d = Math.abs(yAt(wins[team.abbr]?.[w] ?? 0) - py);
      if (d < bestD) { bestD = d; best = team; }
    }
    if (best != null) setHover({ abbr: best.abbr, dayIdx: w });
  };

  const teamPoints = (abbr: string): string => {
    const pts: string[] = [];
    const cap = Math.min(floorDay, weeksN - 1);
    for (let d = 0; d <= cap; d++) {
      pts.push(`${xAt(d)},${yAt(wins[abbr]?.[d] ?? 0)}`);
    }
    if (frac > 0 && floorDay + 1 < weeksN) {
      const v0 = wins[abbr]?.[floorDay] ?? 0;
      const v1 = wins[abbr]?.[floorDay + 1] ?? 0;
      pts.push(`${xAt(maxDay)},${yAt(v0 + (v1 - v0) * frac)}`);
    }
    return pts.join(" ");
  };

  const dotPos = (abbr: string): { cx: number; cy: number } => {
    if (!isAnimating) {
      return { cx: xAt(weeksN - 1), cy: yAt(wins[abbr]?.[weeksN - 1] ?? 0) };
    }
    const v0 = wins[abbr]?.[floorDay] ?? 0;
    const v1 = frac > 0 && floorDay + 1 < weeksN ? (wins[abbr]?.[floorDay + 1] ?? v0) : v0;
    return { cx: xAt(maxDay), cy: yAt(v0 + (v1 - v0) * frac) };
  };

  const n = scopeTeams.length;
  const dotSize = n <= 5 ? 26 : n <= 12 ? 22 : n <= 15 ? 20 : 18;

  return (
    <div className={`st-rh-chart-wrap${minimal ? " st-rh-chart-wrap--minimal" : ""}`} onMouseLeave={() => setHover(null)}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${RH_VB_W} ${RH_VB_H}`}
        className="st-rh-svg"
        width="100%"
        height={minimal ? "100%" : undefined}
        preserveAspectRatio={minimal ? "none" : undefined}
        onMouseMove={handleMove}
      >
        {yTicks.map((v) => (
          <g key={v}>
            <line
              x1={RH_LEFT} y1={yAt(v)} x2={RH_VB_W - RH_RIGHT + (minimal ? 0 : 14)} y2={yAt(v)}
              style={{ stroke: "var(--color-border)" }} strokeWidth={1}
            />
            {!minimal && (
              <text
                x={RH_LEFT - 8} y={yAt(v) + 3.2}
                textAnchor="end" fontSize={9}
                style={{ fontFamily: "var(--font-mono)", fill: "var(--color-text-muted)", fontVariantNumeric: "tabular-nums" }}
              >{v}</text>
            )}
          </g>
        ))}
        {!minimal && RH_DAY_LABELS.map((lab, w) =>
          (w % showXEvery === 0 || w === weeksN - 1) ? (
            <text
              key={w} x={xAt(w)} y={RH_VB_H - RH_BOTTOM + 16}
              textAnchor="middle" fontSize={8.5}
              style={{ fontFamily: "var(--font-mono)", fill: "var(--color-text-muted)" }}
            >{lab}</text>
          ) : null
        )}
        {scopeTeams.map((team) => {
          const isHov = !isAnimating && hover?.abbr === team.abbr;
          return (
            <polyline
              key={team.abbr}
              points={teamPoints(team.abbr)}
              fill="none"
              stroke={TEAM_COLORS[team.abbr] ?? "#888"}
              strokeWidth={isHov ? 3.25 : 1.75}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={!isAnimating && hover != null && !isHov ? 0.16 : 1}
              style={{ transition: isAnimating ? "none" : "opacity 120ms, stroke-width 120ms" }}
            />
          );
        })}
        {/* Dots as SVG <image> so they always sit in the same coordinate space as the lines */}
        {scopeTeams.map((team) => {
          const { cx, cy } = dotPos(team.abbr);
          const isHov = !isAnimating && hover?.abbr === team.abbr;
          const url = mlbLogoUrl(team.abbr);
          const half = dotSize / 2;
          return (
            <image
              key={team.abbr}
              href={url ?? ""}
              x={cx - half}
              y={cy - half}
              width={dotSize}
              height={dotSize}
              opacity={!isAnimating && hover != null && !isHov ? 0.3 : 1}
              style={{ transition: isAnimating ? "none" : "opacity 120ms" }}
            />
          );
        })}
      </svg>

      {!isAnimating && hover != null && (() => {
        const hx = xAt(hover.dayIdx);
        const hy = yAt(wins[hover.abbr]?.[hover.dayIdx] ?? 0);
        const wVal = wins[hover.abbr]?.[hover.dayIdx] ?? 0;
        const team = scopeTeams.find((t) => t.abbr === hover.abbr);
        return (
          <div
            className="st-rh-tooltip"
            style={{
              left: `${(hx / RH_VB_W) * 100}%`,
              top:  `${(hy / RH_VB_H) * 100}%`,
              transform: hx / RH_VB_W > 0.82
                ? "translate(calc(-100% - 12px), -50%)"
                : "translate(12px, -50%)",
            }}
          >
            <div className="st-rh-tooltip__name">{team?.teamName ?? hover.abbr}</div>
            <div className="st-rh-tooltip__stat">{wVal} W · {RH_DAY_LABELS[hover.dayIdx]}</div>
          </div>
        );
      })()}
    </div>
  );
}

function DivisionMiniChart({
  division,
  isActive,
  onFlipBack,
}: {
  division: DivisionData;
  isActive: boolean;
  onFlipBack: () => void;
}): React.ReactElement {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playDay, setPlayDay]     = useState<number | null>(null);
  const rafRef      = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const timerRef    = useRef<number | null>(null);

  useEffect(() => {
    if (!isActive) {
      if (timerRef.current != null) { clearTimeout(timerRef.current); timerRef.current = null; }
      if (rafRef.current  != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      setIsPlaying(false);
      setPlayDay(null);
      return;
    }
    timerRef.current = window.setTimeout(() => {
      setPlayDay(0);
      setIsPlaying(true);
    }, 1000);
    return () => {
      if (timerRef.current != null) { clearTimeout(timerRef.current); timerRef.current = null; }
    };
  }, [isActive]);

  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      lastTimeRef.current = null;
      return;
    }
    const max = RH_DAYS.length - 1;
    let current = 0;
    const tick = (now: number): void => {
      if (lastTimeRef.current == null) lastTimeRef.current = now;
      const dt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;
      current = Math.min(current + dt * RH_DAYS_PER_SEC, max);
      setPlayDay(current);
      if (current >= max) { setIsPlaying(false); rafRef.current = null; return; }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      lastTimeRef.current = null;
    };
  }, [isPlaying]);

  const handleReplay = (): void => {
    if (rafRef.current  != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (timerRef.current != null) { clearTimeout(timerRef.current); timerRef.current = null; }
    lastTimeRef.current = null;
    setIsPlaying(false);
    setPlayDay(0);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      setIsPlaying(true);
    }, 16);
  };

  return (
    <div className="st-div-back">
      <div className="st-div-back-header">
        <span className="st-div-back-title">{division.divisionName}</span>
        <div className="st-div-back-actions">
          <button className="st-div-back-btn" onClick={handleReplay} title="Replay">↺</button>
          <button className="st-div-back-btn" onClick={onFlipBack} title="Back to standings">←</button>
        </div>
      </div>
      <RankHistoryChart scopeTeams={division.teams} playDay={playDay} minimal />
      <p className="st-rh-disclosure">Shape is sample data · final total is real</p>
    </div>
  );
}

function DivRow({ team }: { team: StandingTeamDto }): React.ReactElement {
  return (
    <Link to={`/team/${team.abbr}`} className="st-row">
      <span className="st-rk num">{team.rank}</span>
      <span className="st-tm">
        <TeamLogo abbr={team.abbr} size={21} />
        <span className="st-tm-name">{team.teamName}</span>
      </span>
      <span className="st-n num">{team.wins}</span>
      <span className="st-n num">{team.losses}</span>
      <span className="st-n num">{team.pct}</span>
      <span className="st-n num st-n--gb">{formatGB(team.gamesBack)}</span>
      <span className="st-n num st-n--dim">{formatL10(team.lastTen)}</span>
      <span className="st-n num st-n--strk">{team.streak}</span>
    </Link>
  );
}

function DivisionCard({ div }: { div: DivisionData }): React.ReactElement {
  const [flipped, setFlipped] = useState(false);

  return (
    <div className="st-card-flip-outer">
      <div className={`st-card-flip-inner${flipped ? " st-card-flip-inner--flipped" : ""}`}>
        {/* Front: standings */}
        <div className="st-card st-card-flip-face st-card-flip-face--front">
          <div className="st-card-hd">
            <span className="st-card-t">{divShortName(div.divisionName)}</span>
            <button
              className="pbpv2__flip-btn"
              onClick={() => setFlipped(true)}
              title="Season wins chart"
              aria-label="View season wins chart"
            >
              <svg width="14" height="14" viewBox="0 0 14 14">
                <polygon points="7,1 13,7 7,13 1,7" fill="none" stroke="#b8421e" strokeWidth="1.5" />
              </svg>
            </button>
          </div>
          <div className="st-card-b">
            <div className="st-hd">
              <span />
              <span>Team</span>
              <span>W</span>
              <span>L</span>
              <span>PCT</span>
              <span>GB</span>
              <span>L10</span>
              <span>STRK</span>
            </div>
            {div.teams.map((t) => (
              <DivRow key={t.abbr} team={t} />
            ))}
          </div>
        </div>

        {/* Back: wins-over-time chart — mounted only when flipped */}
        {flipped && (
          <div className="st-card st-card-flip-face st-card-flip-face--back">
            <DivisionMiniChart
              division={div}
              isActive={flipped}
              onFlipBack={() => setFlipped(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function AZRow({ team }: { team: StandingTeamDto }): React.ReactElement {
  const city = extractCity(team.displayName, team.teamName);
  return (
    <Link to={`/team/${team.abbr}`} className="st-azrow">
      <TeamLogo abbr={team.abbr} size={24} />
      <span className="st-azn">
        {team.teamName}
        {city && <span className="st-azc">{city}</span>}
      </span>
      <span className="st-az-wl num">
        {team.wins}–{team.losses}
      </span>
      <span className="st-az-pct num">{team.pct}</span>
    </Link>
  );
}

function WCDivider({ label }: { label: string }): React.ReactElement {
  return (
    <div className="st-wc-divider">
      <span className="st-wc-divider-label">{label}</span>
    </div>
  );
}

function WCTeamRow({
  team, seed, gb, faded = false,
}: {
  team: StandingTeamDto; seed: number; gb: string; faded?: boolean;
}): React.ReactElement {
  return (
    <Link to={`/team/${team.abbr}`} className={`st-row${faded ? " st-row--faded" : ""}`}>
      <span className="st-rk num">{seed}</span>
      <span className="st-tm">
        <TeamLogo abbr={team.abbr} size={21} />
        <span className="st-tm-name">{team.teamName}</span>
      </span>
      <span className="st-n num">{team.wins}</span>
      <span className="st-n num">{team.losses}</span>
      <span className="st-n num">{team.pct}</span>
      <span className="st-n num st-n--gb">{gb}</span>
      <span className="st-n num st-n--dim">{formatL10(team.lastTen)}</span>
      <span className="st-n num st-n--strk">{team.streak}</span>
    </Link>
  );
}

function WildCardCard({ wc }: { wc: WildCardLeague }): React.ReactElement {
  const lgShort = wc.leagueName.replace("American League", "AL").replace("National League", "NL");
  return (
    <div className="st-card">
      <div className="st-card-hd">
        <span className="st-card-t">{lgShort} Playoff Picture</span>
      </div>
      <div className="st-card-b">
        <div className="st-hd">
          <span />
          <span>Team</span>
          <span>W</span>
          <span>L</span>
          <span>PCT</span>
          <span>WCGB</span>
          <span>L10</span>
          <span>STRK</span>
        </div>
        {wc.seeds.map((t, i) => (
          <WCTeamRow key={t.abbr} team={t} seed={i + 1} gb="–" />
        ))}
        <WCDivider label="Wild Card" />
        {wc.wildcards.map((t, i) => (
          <WCTeamRow key={t.abbr} team={t} seed={wc.seeds.length + i + 1} gb={wcgbStr(t, wc.cutoff)} />
        ))}
        <WCDivider label="Out" />
        {wc.below.map((t, i) => (
          <WCTeamRow key={t.abbr} team={t} seed={wc.seeds.length + wc.wildcards.length + i + 1} gb={wcgbStr(t, wc.cutoff)} faded />
        ))}
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────

export default function StandingsPage(): React.ReactElement {
  const navigate = useNavigate();
  const location = useLocation();
  const [teams, setTeams] = useState<readonly StandingTeamDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"div" | "wc" | "az">(() => {
    return (sessionStorage.getItem("standings-view") as "div" | "wc" | "az") ?? "div";
  });

  const hasHistory = location.key !== "default";
  const locState = location.state as { from?: string; fromLabel?: string } | null;
  const backLabel = getBackLabel(locState?.from, locState?.fromLabel);

  const handleBack = useCallback((): void => {
    if (hasHistory) navigate(-1);
    else navigate("/");
  }, [navigate, hasHistory]);

  const handleViewChange = useCallback((idx: number): void => {
    const v = idx === 0 ? "div" : idx === 1 ? "wc" : "az";
    setView(v);
    sessionStorage.setItem("standings-view", v);
  }, []);

  useEffect(() => {
    const load = async (): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);
        const res = await standingsApi.standingsGetStandings(CURRENT_YEAR);
        setTeams(res.data ?? []);
      } catch (e) {
        setError("Failed to load standings.");
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, []);

  const leagues  = useMemo(() => groupByLeague(teams), [teams]);
  const wcData   = useMemo(() => buildWildCard(teams), [teams]);
  const azTeams  = useMemo(() => [...teams].sort((a, b) => a.teamName.localeCompare(b.teamName)), [teams]);

  return (
    <section className="page-container">
      <PageTitle
        navMenu={<PageMenu backLabel={backLabel} onBack={handleBack} />}
        title="Standings"
        subtitle={`${CURRENT_YEAR} season · through ${THROUGH_DATE}`}
      />

      {isLoading && (
        <div className="status-banner status-banner--loading">
          Loading standings…
        </div>
      )}
      {!isLoading && error != null && (
        <div className="status-banner status-banner--error">{error}</div>
      )}
      {!isLoading && error == null && teams.length === 0 && (
        <div className="status-banner status-banner--empty">
          No standings data available.
        </div>
      )}

      {!isLoading && error == null && leagues.length > 0 && (
        <div className="st-wrap">
          <div className="st-bar">
            <div className="st-bar-l">
              <span className="st-bar-lbl">Order</span>
              <Segmented
                items={["Standing", "Wild Card", "A–Z"]}
                active={view === "div" ? 0 : view === "wc" ? 1 : 2}
                onClick={handleViewChange}
                size="sm"
              />
            </div>
            <p className="st-psub">
              Every team links to its page — record, schedule and roster
            </p>
          </div>

          {view === "div" ? (
            <div className="st-cols">
              {leagues.map((lg) => (
                <div key={lg.leagueName} className="st-lg">
                  <div className="st-lg-t">{lg.leagueName}</div>
                  {lg.divisions.map((div) => (
                    <DivisionCard key={div.divisionName} div={div} />
                  ))}
                </div>
              ))}
            </div>
          ) : view === "wc" ? (
            <div className="st-cols">
              {wcData.map((wc) => (
                <WildCardCard key={wc.leagueName} wc={wc} />
              ))}
            </div>
          ) : (
            <div className="st-az">
              {azTeams.map((t) => (
                <AZRow key={t.abbr} team={t} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
