import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { PageTitle } from "../components/primitives/PageTitle";
import { BrandHeader } from "../components/primitives/BrandHeader";
import { getBackLabel } from "../utils/backLabel";
import { Segmented } from "../components/primitives/Segmented";
import { TeamDot } from "../components/primitives/TeamDot";
import type { TeamInfo } from "../utils/teams";
import "./LeadersPage.css";

// ── Team lookup — id → TeamInfo + league ─────────────────────────────────────
interface LeaderTeamInfo extends TeamInfo {
  lg: "AL" | "NL";
}

const TEAM_BY_ID: Record<number, LeaderTeamInfo> = {
  108: { abbr: "LAA", id: 108, name: "Los Angeles Angels",    short: "Angels",      primary: "#003263", secondary: "#BA0021", lg: "AL" },
  109: { abbr: "ARI", id: 109, name: "Arizona Diamondbacks",  short: "Dbacks",      primary: "#A71930", secondary: "#E3D4AD", lg: "NL" },
  110: { abbr: "BAL", id: 110, name: "Baltimore Orioles",     short: "Orioles",     primary: "#DF4601", secondary: "#27251F", lg: "AL" },
  111: { abbr: "BOS", id: 111, name: "Boston Red Sox",        short: "Red Sox",     primary: "#BD3039", secondary: "#0D2B56", lg: "AL" },
  112: { abbr: "CHC", id: 112, name: "Chicago Cubs",          short: "Cubs",        primary: "#0E3386", secondary: "#CC3433", lg: "NL" },
  113: { abbr: "CIN", id: 113, name: "Cincinnati Reds",       short: "Reds",        primary: "#C6011F", secondary: "#000000", lg: "NL" },
  114: { abbr: "CLE", id: 114, name: "Cleveland Guardians",   short: "Guardians",   primary: "#00385D", secondary: "#E50022", lg: "AL" },
  115: { abbr: "COL", id: 115, name: "Colorado Rockies",      short: "Rockies",     primary: "#333366", secondary: "#C4CED4", lg: "NL" },
  116: { abbr: "DET", id: 116, name: "Detroit Tigers",        short: "Tigers",      primary: "#0C2340", secondary: "#FA4616", lg: "AL" },
  117: { abbr: "HOU", id: 117, name: "Houston Astros",        short: "Astros",      primary: "#002D62", secondary: "#EB6E1F", lg: "AL" },
  118: { abbr: "KC",  id: 118, name: "Kansas City Royals",    short: "Royals",      primary: "#004687", secondary: "#BD9B60", lg: "AL" },
  119: { abbr: "LAD", id: 119, name: "Los Angeles Dodgers",   short: "Dodgers",     primary: "#005A9C", secondary: "#EF3E42", lg: "NL" },
  120: { abbr: "WSH", id: 120, name: "Washington Nationals",  short: "Nationals",   primary: "#AB0003", secondary: "#14225A", lg: "NL" },
  121: { abbr: "NYM", id: 121, name: "New York Mets",         short: "Mets",        primary: "#002D72", secondary: "#FF5910", lg: "NL" },
  133: { abbr: "ATH", id: 133, name: "Athletics",             short: "Athletics",   primary: "#003831", secondary: "#EFB21E", lg: "AL" },
  134: { abbr: "PIT", id: 134, name: "Pittsburgh Pirates",    short: "Pirates",     primary: "#27251F", secondary: "#FDB827", lg: "NL" },
  135: { abbr: "SD",  id: 135, name: "San Diego Padres",      short: "Padres",      primary: "#2F241D", secondary: "#FFC425", lg: "NL" },
  136: { abbr: "SEA", id: 136, name: "Seattle Mariners",      short: "Mariners",    primary: "#0C2C56", secondary: "#005C5C", lg: "AL" },
  137: { abbr: "SF",  id: 137, name: "San Francisco Giants",  short: "Giants",      primary: "#FD5A1E", secondary: "#27251F", lg: "NL" },
  138: { abbr: "STL", id: 138, name: "St. Louis Cardinals",   short: "Cardinals",   primary: "#C41E3A", secondary: "#0C2340", lg: "NL" },
  139: { abbr: "TB",  id: 139, name: "Tampa Bay Rays",        short: "Rays",        primary: "#092C5C", secondary: "#8FBCE6", lg: "AL" },
  140: { abbr: "TEX", id: 140, name: "Texas Rangers",         short: "Rangers",     primary: "#003278", secondary: "#C0111F", lg: "AL" },
  141: { abbr: "TOR", id: 141, name: "Toronto Blue Jays",     short: "Blue Jays",   primary: "#134A8E", secondary: "#1D2D5C", lg: "AL" },
  142: { abbr: "MIN", id: 142, name: "Minnesota Twins",       short: "Twins",       primary: "#002B5C", secondary: "#D31145", lg: "AL" },
  143: { abbr: "PHI", id: 143, name: "Philadelphia Phillies", short: "Phillies",    primary: "#E81828", secondary: "#284898", lg: "NL" },
  144: { abbr: "ATL", id: 144, name: "Atlanta Braves",        short: "Braves",      primary: "#13274F", secondary: "#CE1141", lg: "NL" },
  145: { abbr: "CWS", id: 145, name: "Chicago White Sox",     short: "White Sox",   primary: "#27251F", secondary: "#C4CED4", lg: "AL" },
  146: { abbr: "MIA", id: 146, name: "Miami Marlins",         short: "Marlins",     primary: "#00A3E0", secondary: "#EF3340", lg: "NL" },
  147: { abbr: "NYY", id: 147, name: "New York Yankees",      short: "Yankees",     primary: "#0C2340", secondary: "#C4CED4", lg: "AL" },
  158: { abbr: "MIL", id: 158, name: "Milwaukee Brewers",     short: "Brewers",     primary: "#12284B", secondary: "#FFC52F", lg: "NL" },
};

// ── Types ─────────────────────────────────────────────────────────────────────
type LeaderEntry = {
  rank: number;
  playerId: number;
  playerName: string;
  teamName: string;
  teamId: number;
  value: string;
};

type LeaderCategory = {
  category: string;
  label: string;
  leaders: LeaderEntry[];
  asc?: boolean;  // API may carry this; if absent, derived client-side from ASC_CATEGORIES
};

type LeagueLeadersPayload = {
  season: number;
  throughDate?: string;
  batting: LeaderCategory[];
  pitching: LeaderCategory[];
};

// ── Ascending categories (lower is better) — keyed by exact API category string ─
const ASC_CATEGORIES = new Set(["earnedRunAverage", "walksAndHitsPerInningPitched"]);

// ── Ranking logic — ported verbatim from leaders.jsx ─────────────────────────
type RankedEntry = LeaderEntry & { rank: number };

function ranked(rows: LeaderEntry[], league: string, asc: boolean): RankedEntry[] {
  const pool = league === "all"
    ? rows
    : rows.filter((x) => TEAM_BY_ID[x.teamId]?.lg === league);
  const sorted = [...pool].sort((a, b) => {
    const av = parseFloat(a.value), bv = parseFloat(b.value);
    return asc ? av - bv : bv - av;
  });
  let rank = 0, prev: number | null = null;
  const out: RankedEntry[] = [];
  sorted.forEach((row, i) => {
    const v = parseFloat(row.value);
    if (prev === null || v !== prev) { rank = i + 1; prev = v; }
    out.push({ ...row, rank });
  });
  return out.filter((x) => x.rank <= 10);
}

// ── Value display ─────────────────────────────────────────────────────────────
// The API already sends pre-formatted value strings; use them directly for display.
// For integers the API returns "30"; for rates ".337" or "1.056"; ERA "2.14"; WHIP ".88".
// No re-formatting needed — value string is the display value.

// ── LeaderCard ────────────────────────────────────────────────────────────────
// ── Unit tag map — keyed by exact API category strings ───────────────────────
const UNIT_MAP: Record<string, string> = {
  homeRuns: "HR",
  battingAverage: "AVG",
  runsBattedIn: "RBI",
  runs: "R",
  hits: "H",
  stolenBases: "SB",
  onBasePlusSlugging: "OPS",
  wins: "W",
  earnedRunAverage: "ERA",
  strikeouts: "SO",
  walksAndHitsPerInningPitched: "WHIP",
  saves: "SV",
  inningsPitched: "IP",
};

const SCROLL_STEP = 120;

function LeaderCard({ cat }: { cat: LeaderCategory }) {
  const navigate = useNavigate();
  const asc = cat.asc ?? ASC_CATEGORIES.has(cat.category);
  const rows = ranked(cat.leaders, "all", asc);

  const rowsRef = useRef<HTMLDivElement>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  useEffect(() => {
    const el = rowsRef.current;
    if (el == null) return;
    const check = () => {
      setCanScrollUp(el.scrollTop > 2);
      setCanScrollDown(el.scrollHeight - el.scrollTop > el.clientHeight + 2);
    };
    check();
    el.addEventListener("scroll", check);
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", check); ro.disconnect(); };
  }, [rows]);

  const scrollBy = (dir: 1 | -1) => {
    rowsRef.current?.scrollBy({ top: dir * SCROLL_STEP, behavior: "smooth" });
  };

  const unit = UNIT_MAP[cat.category] ?? cat.label.toUpperCase();

  return (
    <div className="leaders-card">
      <div className="leaders-card__header">
        <span className="leaders-card__label">{cat.label}</span>
        <span className="leaders-card__unit">{unit}</span>
      </div>

      <div className="leaders-card__rows-wrap">
        {canScrollUp && (
          <button
            type="button"
            className="leaders-card__chevron-btn leaders-card__chevron-btn--up"
            onClick={() => scrollBy(-1)}
            aria-label="Scroll up"
          >
            <svg width="14" height="9" viewBox="0 0 14 9" fill="none" aria-hidden="true">
              <polyline points="1,8 7,2 13,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}

        <div className="leaders-card__rows" ref={rowsRef}>
          {rows.length === 0 ? (
            <div className="leaders-card__empty">No qualifiers</div>
          ) : (
            rows.map((row, i) => {
              const isLead = row.rank === 1;
              const team = TEAM_BY_ID[row.teamId];
              const teamInfo: TeamInfo = team ?? {
                abbr: row.teamName.slice(0, 3).toUpperCase(),
                id: row.teamId,
                name: row.teamName,
                short: row.teamName,
                primary: "var(--color-text-faint)",
                secondary: "#fff",
              };

              return (
                <div
                  key={`${row.playerId}-${i}`}
                  className={`leaders-card__row${isLead ? " leaders-card__row--lead" : ""}`}
                >
                  <span className={`leaders-card__rank${isLead ? " leaders-card__rank--lead" : ""}`}>
                    {row.rank}
                  </span>

                  <TeamDot team={teamInfo} size={20} />

                  <button
                    type="button"
                    className="leaders-card__name"
                    onClick={() => navigate(`/player/${row.playerId}`, { state: { from: location.pathname } })}
                  >
                    <span className={isLead ? "leaders-card__name-text--lead" : ""}>
                      {row.playerName}
                    </span>
                  </button>

                  <span className={`leaders-card__value${isLead ? " leaders-card__value--lead" : ""}`}>
                    {row.value}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {canScrollDown && (
          <button
            type="button"
            className="leaders-card__chevron-btn leaders-card__chevron-btn--down"
            onClick={() => scrollBy(1)}
            aria-label="Scroll down"
          >
            <svg width="14" height="9" viewBox="0 0 14 9" fill="none" aria-hidden="true">
              <polyline points="1,1 7,7 13,1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

// ── LeadersPage ───────────────────────────────────────────────────────────────
const SIDE_ITEMS = ["Batting", "Pitching"] as const;
const LEAGUE_ITEMS = ["MLB", "AL", "NL"] as const;
const LEAGUE_VALUES = ["all", "AL", "NL"] as const;

export default function LeadersPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [data, setData] = useState<LeagueLeadersPayload | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sideIdx, setSideIdx] = useState(0);
  const [lgIdx, setLgIdx] = useState(0);

  const hasHistory = location.key !== "default";
  const locState = location.state as { from?: string; fromLabel?: string } | null;
  const backLabel = getBackLabel(locState?.from, locState?.fromLabel);
  const handleBack = useCallback((): void => {
    if (hasHistory) navigate(-1);
    else navigate("/");
  }, [navigate, hasHistory]);

  const league = LEAGUE_VALUES[lgIdx];

  useEffect(() => {
    const run = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const leagueParam = league !== "all" ? `&league=${league}` : "";
        const res = await fetch(`/api/leaders${leagueParam}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as LeagueLeadersPayload;
        setData(json);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed");
      } finally {
        setIsLoading(false);
      }
    };
    void run();
  }, [league]);

  const categories = sideIdx === 0 ? (data?.batting ?? []) : (data?.pitching ?? []);

  const throughLabel = data?.throughDate
    ? `2026 Season · through ${data.throughDate} · Top 10 each category`
    : data != null
    ? `${data.season} Season · Top 10 each category`
    : "2026 Season · Top 10 each category";

  return (
    <>
      <BrandHeader active="leaders" backLabel={backLabel} onBack={handleBack} />
      <div className="leaders-page">
      <PageTitle
        title="League Leaders"
        subtitle={throughLabel}
        subtitleRight={
          <div className="leaders-page__league-filter">
            <span className="leaders-page__league-eyebrow">League</span>
            <Segmented
              items={[...LEAGUE_ITEMS]}
              active={lgIdx}
              onClick={setLgIdx}
            />
          </div>
        }
      />

      {/* Controls row — content-level: which categories the body lists, not page-level */}
      <div className="leaders-page__controls">
        <Segmented
          items={[...SIDE_ITEMS]}
          active={sideIdx}
          onClick={setSideIdx}
        />
      </div>

      {isLoading ? (
        <div className="leaders-page__status">Loading…</div>
      ) : error != null ? (
        <div className="leaders-page__status leaders-page__status--error">Error: {error}</div>
      ) : data == null ? (
        <div className="leaders-page__status">No data.</div>
      ) : (
        <div className="leaders-page__grid">
          {categories.map((cat) => (
            <LeaderCard key={cat.category} cat={cat} />
          ))}
        </div>
      )}
      </div>
    </>
  );
}
