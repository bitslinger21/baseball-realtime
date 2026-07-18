import "./StandingsPage.css";
import { useEffect, useMemo, useRef, useState } from "react";
import type { StandingTeamDto } from "@bitslinger21/baseball-realtime-client";
import { standingsApi } from "../api/baseballApiClient";
import { Segmented } from "../components/primitives/Segmented";

// ── Helpers ──────────────────────────────────────────────────

function byRecord(a: StandingTeamDto, b: StandingTeamDto): number {
  return b.wins / (b.wins + b.losses) - a.wins / (a.wins + a.losses);
}

const DIV_ORDER = ["East", "Central", "West"];

type DivisionData = { divisionName: string; teams: StandingTeamDto[] };
type LeagueData   = { leagueName: string; abbr: string; divisions: DivisionData[] };

function groupByLeague(teams: readonly StandingTeamDto[]): LeagueData[] {
  const lgMap = new Map<string, Map<string, StandingTeamDto[]>>();
  for (const t of teams) {
    if (!lgMap.has(t.leagueName)) lgMap.set(t.leagueName, new Map());
    const divMap = lgMap.get(t.leagueName)!;
    if (!divMap.has(t.divisionName)) divMap.set(t.divisionName, []);
    divMap.get(t.divisionName)!.push(t);
  }
  const lgOrder = ["American League", "National League"];
  return [...lgMap.keys()]
    .sort((a, b) => lgOrder.indexOf(a) - lgOrder.indexOf(b))
    .map((leagueName) => {
      const divMap = lgMap.get(leagueName)!;
      const abbr = leagueName === "American League" ? "AL" : "NL";
      const divisions = [...divMap.entries()]
        .map(([divisionName, ts]) => ({ divisionName, teams: [...ts].sort(byRecord) }))
        .sort((a, b) => {
          const ai = DIV_ORDER.findIndex((s) => a.divisionName.includes(s));
          const bi = DIV_ORDER.findIndex((s) => b.divisionName.includes(s));
          return ai - bi;
        });
      return { leagueName, abbr, divisions };
    });
}

type WildCardData = {
  leaders: StandingTeamDto[];
  wildcard: StandingTeamDto[];
  below: StandingTeamDto[];
  cutoff: StandingTeamDto | null;
};

function buildWildCard(league: LeagueData): WildCardData {
  const leaders = league.divisions.map((d) => d.teams[0]).filter(Boolean).sort(byRecord);
  const leaderAbbrs = new Set(leaders.map((t) => t.abbr));
  const rest = league.divisions
    .flatMap((d) => d.teams)
    .filter((t) => !leaderAbbrs.has(t.abbr))
    .sort(byRecord);
  return {
    leaders,
    wildcard: rest.slice(0, 3),
    below: rest.slice(3),
    cutoff: rest[2] ?? null,
  };
}

function wcgbStr(x: StandingTeamDto, cutoff: StandingTeamDto): string {
  if (x.abbr === cutoff.abbr) return "–";
  const d = ((x.wins - cutoff.wins) + (cutoff.losses - x.losses)) / 2;
  if (d > 0) return `+${d.toFixed(1)}`;
  return Math.abs(d).toFixed(1);
}

// ── Sub-components ────────────────────────────────────────────

function TeamLogoMark({ team, size }: { team: StandingTeamDto; size?: number }): React.ReactElement {
  const [failed, setFailed] = useState(false);
  const logoUrl = team.logoUrl as string | null;
  const sz = size ?? 22;
  if (logoUrl != null && !failed) {
    return (
      <img
        className="st-logo"
        style={size != null ? { width: sz, height: sz } : undefined}
        src={logoUrl}
        alt={team.abbr}
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <div
      className="st-logo-fallback"
      style={{
        background: (team.primaryColorHex as string | null) ?? "#555",
        ...(size != null ? { width: sz, height: sz } : {}),
      }}
    >
      {team.abbr.slice(0, 2)}
    </div>
  );
}

function HeaderBand({ title, tag, gbLabel = "GB", action }: {
  title: string;
  tag: string;
  gbLabel?: string;
  action?: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="st-header-band">
      <div className="st-header-band__title-row">
        <span className="st-header-band__title">{title}</span>
        <div className="st-header-band__right">
          {action}
          <span className="st-header-band__tag">{tag}</span>
        </div>
      </div>
      <div className="st-row st-row--col-labels">
        <span /><span />
        <span className="st-th">Team</span>
        <span className="st-th st-th--right">W</span>
        <span className="st-th st-th--right">L</span>
        <span className="st-th st-th--right">PCT</span>
        <span className="st-th st-th--right">{gbLabel}</span>
        <span className="st-th st-th--right">L10</span>
        <span className="st-th st-th--right">STRK</span>
      </div>
    </div>
  );
}

function TeamRow({ team, pos, gb, tint, strong, topBorder = true }: {
  team: StandingTeamDto;
  pos: number;
  gb: string;
  tint?: boolean;
  strong?: boolean;
  topBorder?: boolean;
}): React.ReactElement {
  const wStreak = team.streak.startsWith("W");
  return (
    <div className={`st-row${tint ? " st-row--tint" : ""}${topBorder ? " st-row--border" : ""}`}>
      <span className={`st-pos num${strong ? " st-pos--strong" : ""}`}>{pos}</span>
      <TeamLogoMark team={team} />
      <span className={`st-team-name${strong ? " st-team-name--strong" : ""}`}>{team.teamName}</span>
      <span className={`st-td num${strong ? " st-td--strong" : " st-td--muted"}`}>{team.wins}</span>
      <span className="st-td num st-td--muted">{team.losses}</span>
      <span className={`st-td num${strong ? " st-td--accent" : " st-td--muted"}`}>{team.pct}</span>
      <span className="st-td num st-td--muted">{gb}</span>
      <span className="st-td num st-td--muted">{team.lastTen}</span>
      <span className={`st-td num${wStreak ? " st-td--positive" : " st-td--muted"}`}>{team.streak}</span>
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
  const [playDay, setPlayDay] = useState<number | null>(null);
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
    // flip animation ≈ 500ms + 500ms pause before play
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

  return (
    <div className="st-div-back">
      <div className="st-div-back-header">
        <span className="st-div-back-title">{division.divisionName}</span>
        <button className="st-div-back-btn" onClick={onFlipBack} title="Back to standings">
          ←
        </button>
      </div>
      <RankHistoryChart scopeTeams={division.teams} playDay={playDay} minimal />
    </div>
  );
}

function DivisionCard({ division }: { division: DivisionData }): React.ReactElement {
  const [flipped, setFlipped] = useState(false);
  const tag = division.divisionName.startsWith("A") ? "AL" : "NL";

  const flipBtn = (
    <button
      className="st-div-flip-btn"
      onClick={() => setFlipped(true)}
      title="Win pace"
    >
      <svg width="14" height="10" viewBox="0 0 14 10" fill="none" aria-hidden="true">
        <polyline
          points="0,9 3,4 6,6.5 10,1 13,3"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );

  return (
    <div className="st-card-flip-outer">
      <div className={`st-card-flip-inner${flipped ? " st-card-flip-inner--flipped" : ""}`}>
        <div className="st-card st-card-flip-face st-card-flip-face--front">
          <HeaderBand title={division.divisionName} tag={tag} action={flipBtn} />
          {division.teams.map((team, i) => (
            <TeamRow
              key={team.abbr}
              team={team}
              pos={i + 1}
              gb={team.gamesBack}
              tint={i === 0}
              strong={i === 0}
              topBorder={i !== 0}
            />
          ))}
        </div>
        <div className="st-card st-card-flip-face st-card-flip-face--back">
          <DivisionMiniChart
            division={division}
            isActive={flipped}
            onFlipBack={() => setFlipped(false)}
          />
        </div>
      </div>
    </div>
  );
}

function WCDivider({ label }: { label: string }): React.ReactElement {
  return (
    <div className="st-wc-divider">
      <span className="st-wc-divider__label">{label}</span>
    </div>
  );
}

function WildCardCard({ league }: { league: LeagueData }): React.ReactElement {
  const { leaders, wildcard, below, cutoff } = buildWildCard(league);
  return (
    <div className="st-card">
      <HeaderBand title={league.leagueName} tag={league.abbr} gbLabel="WCGB" />
      {leaders.map((team, i) => (
        <TeamRow key={team.abbr} team={team} pos={i + 1} gb="–" tint strong topBorder={i !== 0} />
      ))}
      <WCDivider label="Wild Card" />
      {wildcard.map((team, i) => (
        <TeamRow
          key={team.abbr}
          team={team}
          pos={leaders.length + i + 1}
          gb={cutoff != null ? wcgbStr(team, cutoff) : "–"}
          tint
          topBorder={i !== 0}
        />
      ))}
      <WCDivider label="Out" />
      {below.map((team, i) => (
        <TeamRow
          key={team.abbr}
          team={team}
          pos={leaders.length + wildcard.length + i + 1}
          gb={cutoff != null ? wcgbStr(team, cutoff) : "–"}
          topBorder={i !== 0}
        />
      ))}
    </div>
  );
}

// ── Rank History ─────────────────────────────────────────────

const TEAM_COLORS: Record<string, string> = {
  TB: '#092C5C', NYY: '#0C2340', TOR: '#134A8E', BAL: '#DF4601', BOS: '#BD3039',
  CWS: '#27251F', CLE: '#00385D', MIN: '#002B5C', DET: '#0C2340', KC:  '#004687',
  SEA: '#0C2C56', TEX: '#003278', HOU: '#002D62', ATH: '#003831', LAA: '#BA0021',
  ATL: '#13274F', PHI: '#E81828', MIA: '#00A3E0', WSH: '#AB0003', NYM: '#002D72',
  CHC: '#0E3386', MIL: '#12284B', STL: '#C41E3A', CIN: '#C6011F', PIT: '#27251F',
  LAD: '#005A9C', SD:  '#2F241D', SF:  '#FD5A1E', ARI: '#A71930', COL: '#333366',
};

function buildDays(): Date[] {
  const start = new Date(2026, 2, 26); // Opening Day
  const end   = new Date();            // today
  end.setHours(0, 0, 0, 0);
  const days: Date[] = [];
  const d = new Date(start);
  while (d < end) { days.push(new Date(d)); d.setDate(d.getDate() + 1); }
  days.push(new Date(end));
  return days;
}
const RH_DAYS = buildDays();
const RH_DAY_LABELS = RH_DAYS.map((d) =>
  d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
);

function seedFromStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildWinsSeries(teams: readonly StandingTeamDto[]): Record<string, number[]> {
  const n = RH_DAYS.length;
  const series: Record<string, number[]> = {};
  teams.forEach((team) => {
    const total = team.wins + team.losses;
    const rnd = mulberry32(seedFromStr(team.abbr + '_wins'));
    const results = Array.from({ length: total }, (_, i) => (i < team.wins ? 1 : 0));
    for (let i = results.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [results[i], results[j]] = [results[j], results[i]];
    }
    const cum: number[] = [];
    let acc = 0;
    for (let g = 0; g < total; g++) { acc += results[g]; cum.push(acc); }
    const daily = new Array<number>(n);
    for (let d = 0; d < n; d++) {
      const gp = total === 0 ? 0 : Math.round(total * d / (n - 1));
      daily[d] = gp === 0 ? 0 : cum[gp - 1];
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

function teamsForScope(scopeId: string, teams: readonly StandingTeamDto[]): StandingTeamDto[] {
  if (scopeId === 'ALL') return [...teams];
  if (scopeId === 'AL') return teams.filter((t) => t.leagueName === 'American League');
  if (scopeId === 'NL') return teams.filter((t) => t.leagueName === 'National League');
  if (scopeId === 'ALWC' || scopeId === 'NLWC') {
    const lgName = scopeId === 'ALWC' ? 'American League' : 'National League';
    const lgTeams = teams.filter((t) => t.leagueName === lgName);
    const divMap = new Map<string, StandingTeamDto[]>();
    lgTeams.forEach((t) => {
      if (!divMap.has(t.divisionName)) divMap.set(t.divisionName, []);
      divMap.get(t.divisionName)!.push(t);
    });
    const leaderAbbrs = new Set(
      [...divMap.values()].map((ts) => [...ts].sort(byRecord)[0].abbr)
    );
    return lgTeams.filter((t) => !leaderAbbrs.has(t.abbr));
  }
  return teams.filter((t) => t.divisionName === scopeId);
}

function buildScopes(teams: readonly StandingTeamDto[]): { id: string; label: string }[] {
  const divNames = [...new Set(teams.map((t) => t.divisionName))].sort((a, b) => {
    const lgA = a.startsWith('A') ? 0 : 1;
    const lgB = b.startsWith('A') ? 0 : 1;
    if (lgA !== lgB) return lgA - lgB;
    const order = ['East', 'Central', 'West'];
    return order.findIndex((s) => a.includes(s)) - order.findIndex((s) => b.includes(s));
  });
  return [
    { id: 'ALL', label: 'All MLB · 30 teams' },
    { id: 'AL',  label: 'American League · 15 teams' },
    { id: 'NL',  label: 'National League · 15 teams' },
    ...divNames.map((div) => ({
      id: div,
      label: `${div} · ${teams.filter((t) => t.divisionName === div).length} teams`,
    })),
    { id: 'ALWC', label: 'AL Wild Card race · 12 teams' },
    { id: 'NLWC', label: 'NL Wild Card race · 12 teams' },
  ];
}

const RH_VB_W  = 1000;
const RH_VB_H  = 420;
const RH_LEFT  = 30;
const RH_RIGHT = 30;
const RH_TOP   = 14;
const RH_BOTTOM = 28;
const RH_PLOT_W = RH_VB_W - RH_LEFT - RH_RIGHT;
const RH_PLOT_H = RH_VB_H - RH_TOP - RH_BOTTOM;

const RH_DAYS_PER_SEC = 22; // full season (~101 days) plays in ~4.6 s

type RhHover = { abbr: string; dayIdx: number };

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
  const wins = useMemo(() => buildWinsSeries(scopeTeams), [scopeTeams]);
  const [hover, setHover] = useState<RhHover | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => { setHover(null); }, [scopeTeams]);

  // playDay drives clipping; null = show all days
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

  // Build clipped polyline points per team, with a fractionally-interpolated
  // final point so the line tip moves continuously between integer days.
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
    return pts.join(' ');
  };

  // Logo dot position: follows the animated tip, or sits at the final point.
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
    <div className="st-rh-chart-wrap" onMouseLeave={() => setHover(null)}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${RH_VB_W} ${RH_VB_H}`}
        className="st-rh-svg"
        onMouseMove={handleMove}
      >
        {yTicks.map((v) => (
          <g key={v}>
            <line
              x1={RH_LEFT} y1={yAt(v)} x2={RH_VB_W - RH_RIGHT + (minimal ? 0 : 14)} y2={yAt(v)}
              style={{ stroke: 'var(--color-border)' }} strokeWidth={1}
            />
            {!minimal && (
              <text
                x={RH_LEFT - 8} y={yAt(v) + 3.2}
                textAnchor="end" fontSize={9}
                style={{ fontFamily: 'var(--font-mono)', fill: 'var(--color-text-faint)', fontVariantNumeric: 'tabular-nums' }}
              >{v}</text>
            )}
          </g>
        ))}
        {!minimal && RH_DAY_LABELS.map((lab, w) =>
          (w % showXEvery === 0 || w === weeksN - 1) ? (
            <text
              key={w} x={xAt(w)} y={RH_VB_H - RH_BOTTOM + 16}
              textAnchor="middle" fontSize={8.5}
              style={{ fontFamily: 'var(--font-mono)', fill: 'var(--color-text-faint)' }}
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
              stroke={TEAM_COLORS[team.abbr] ?? '#888'}
              strokeWidth={isHov ? 3.25 : 1.75}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={!isAnimating && hover != null && !isHov ? 0.16 : 1}
              style={{ transition: isAnimating ? 'none' : 'opacity 120ms, stroke-width 120ms' }}
            />
          );
        })}
      </svg>

      {scopeTeams.map((team) => {
        const { cx, cy } = dotPos(team.abbr);
        const isHov = !isAnimating && hover?.abbr === team.abbr;
        return (
          <div
            key={team.abbr}
            className="st-rh-dot"
            style={{
              left: `${(cx / RH_VB_W) * 100}%`,
              top:  `${(cy / RH_VB_H) * 100}%`,
              opacity: !isAnimating && hover != null && !isHov ? 0.3 : 1,
              transition: isAnimating ? 'none' : 'opacity 120ms',
            }}
          >
            <TeamLogoMark team={team} size={dotSize} />
          </div>
        );
      })}

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
                ? 'translate(calc(-100% - 12px), -50%)'
                : 'translate(12px, -50%)',
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

function RankHistoryCard({ teams }: { teams: readonly StandingTeamDto[] }): React.ReactElement {
  const [scope, setScope] = useState('AL East');
  const [isPlaying, setIsPlaying] = useState(false);
  const [playDay, setPlayDay] = useState<number | null>(null);
  const rafRef      = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  const scopes     = useMemo(() => buildScopes(teams), [teams]);
  const scopeTeams = useMemo(() => teamsForScope(scope, teams), [scope, teams]);

  // Reset animation whenever scope changes.
  useEffect(() => {
    setIsPlaying(false);
    setPlayDay(null);
  }, [scope]);

  // RAF loop — runs while isPlaying, advances playDay at RH_DAYS_PER_SEC/s.
  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      lastTimeRef.current = null;
      return;
    }
    const max = RH_DAYS.length - 1;
    let current = 0; // local to this effect instance

    const tick = (now: number): void => {
      if (lastTimeRef.current == null) lastTimeRef.current = now;
      const dt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;
      current = Math.min(current + dt * RH_DAYS_PER_SEC, max);
      setPlayDay(current);
      if (current >= max) {
        setIsPlaying(false);
        rafRef.current = null;
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      lastTimeRef.current = null;
    };
  }, [isPlaying]);

  const handlePlayPause = (): void => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      setPlayDay(0);
      setIsPlaying(true);
    }
  };

  const atEnd = playDay != null && playDay >= RH_DAYS.length - 1;

  return (
    <div className="st-rh-card">
      <div className="st-rh-header">
        <div>
          <div className="st-rh-title">Wins over time</div>
          <div className="st-rh-subtitle">
            Cumulative wins · {RH_DAY_LABELS[0]}–{RH_DAY_LABELS[RH_DAY_LABELS.length - 1]}
          </div>
        </div>
        <div className="st-rh-controls">
          <button
            className={`st-rh-play${isPlaying ? ' st-rh-play--active' : ''}`}
            onClick={handlePlayPause}
            title={isPlaying ? 'Pause' : atEnd ? 'Replay' : 'Play season'}
          >
            {isPlaying ? '⏸' : atEnd ? '↺' : '▶'}
          </button>
          <select
            className="st-rh-scope"
            value={scope}
            onChange={(e) => setScope(e.target.value)}
          >
            {scopes.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>
      <RankHistoryChart scopeTeams={scopeTeams} playDay={playDay} />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────

export default function StandingsPage(): React.ReactElement {
  const [teams, setTeams] = useState<readonly StandingTeamDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState(0); // 0 = Divisional · 1 = Wild Card · 2 = Rank History

  useEffect(() => {
    const load = async (): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);
        const res = await standingsApi.standingsGetStandings(String(new Date().getFullYear()));
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

  const leagues = groupByLeague(teams);

  return (
    <section className="page-container">
      <div className="page-header">
        <h2>Standings</h2>
        <span className="st-view-hint">
          {view === 0
            ? "Division leader highlighted"
            : view === 1
            ? "Playoff picture — if the season ended today"
            : "Hover a line for wins + date"}
        </span>
      </div>

      {isLoading && <div className="status-banner status-banner--loading">Loading standings…</div>}
      {!isLoading && error != null && <div className="status-banner status-banner--error">{error}</div>}
      {!isLoading && error == null && teams.length === 0 && (
        <div className="status-banner status-banner--empty">No standings data available.</div>
      )}

      {!isLoading && error == null && leagues.length > 0 && (
        <>
          <div className="st-toggle">
            <Segmented items={["Divisional", "Wild Card", "Rank History"]} active={view} onClick={setView} />
          </div>

          {view < 2 ? (
            <div className="st-columns">
              {view === 0
                ? leagues.map((lg) => (
                    <div key={lg.leagueName} className="st-col">
                      {lg.divisions.map((div) => (
                        <DivisionCard key={div.divisionName} division={div} />
                      ))}
                    </div>
                  ))
                : leagues.map((lg) => (
                    <div key={lg.leagueName} className="st-col">
                      <WildCardCard league={lg} />
                    </div>
                  ))}
            </div>
          ) : (
            <RankHistoryCard teams={teams} />
          )}
        </>
      )}
    </section>
  );
}
