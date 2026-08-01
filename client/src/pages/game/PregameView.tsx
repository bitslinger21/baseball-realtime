import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { GameViewDto, SeriesDto, StandingTeamDto } from "@bitslinger21/baseball-realtime-client";
import { gamesApi, standingsApi } from "../../api/baseballApiClient";
import { Bases } from "../../components/primitives/Bases";
import { Card } from "../../components/primitives/Card";
import { Headshot } from "../../components/primitives/Headshot";
import { Pill } from "../../components/primitives/Pill";
import { Pips } from "../../components/primitives/Pips";
import { Segmented } from "../../components/primitives/Segmented";
import { StrikeZone } from "../../components/primitives/StrikeZone";
import { TEAM_NICKNAMES } from "../../utils/teamNicknames";
import "./PregameView.css";

// ── Types ─────────────────────────────────────────────────

interface TeamMeta {
  abbr: string;
  name: string;
  displayName: string;
  primaryColorHex: string | null;
  alternateColorHex: string | null;
  logoUrl: string | null;
}

interface ProbableInfo {
  mlbId: number | null;
  name: string | null;
  jerseyNumber: string | null;
  pitchHand: string | null;
}

// ── Helpers ───────────────────────────────────────────────

function initials(name: string | null | undefined): string {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0] ?? "").join("").slice(0, 2).toUpperCase();
}

function handLabel(code: string | null | undefined): string {
  if (code === "L") return "LHP";
  if (code === "R") return "RHP";
  return "—";
}

function fmtRecord(wins: number | undefined, losses: number | undefined): string {
  if (wins == null || losses == null) return "—";
  return `${wins}–${losses}`;
}

export function formatFirstPitchParts(startTimeUtc: string | null | undefined): { time: string; ampm: string; pill: string } {
  if (startTimeUtc == null) return { time: "—", ampm: "", pill: "First pitch —" };
  try {
    const d = new Date(startTimeUtc as string);
    const locale = d.toLocaleTimeString("en-US", {
      timeZone: "America/New_York",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    const [timePart, meridiem] = locale.split(" ");
    const shortMeridiem = (meridiem ?? "").charAt(0).toLowerCase();
    return {
      time: timePart ?? "—",
      ampm: `${meridiem ?? ""} ET`,
      pill: `First pitch ${timePart ?? "—"}${shortMeridiem}`,
    };
  } catch {
    return { time: "—", ampm: "", pill: "First pitch —" };
  }
}

// ── TeamLogo — uses ESPN logoUrl with abbr letter-mark fallback ───────────

interface TeamLogoProps {
  meta: TeamMeta | null | undefined;
  abbr: string;
  size: number;
  onDark?: boolean;
}

function TeamLogo({ meta, abbr, size, onDark = false }: TeamLogoProps): ReactElement {
  const color = meta?.primaryColorHex ?? "var(--color-text-faint)";
  if (meta?.logoUrl) {
    const img = (
      <img
        src={meta.logoUrl}
        alt={abbr}
        width={size}
        height={size}
        style={{ objectFit: "contain", flexShrink: 0, display: "block" }}
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
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        color: "#fff",
        fontFamily: "var(--font-sans)",
        fontSize: size * 0.38,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {abbr.slice(0, 2)}
    </span>
  );
}

// ── Sub-components ────────────────────────────────────────

const INNINGS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

interface PregameLineScoreBandProps {
  game: GameViewDto;
  awayMeta: TeamMeta | null | undefined;
  homeMeta: TeamMeta | null | undefined;
  awayProbable: ProbableInfo | null;
  homeProbable: ProbableInfo | null;
  awayForm: StandingTeamDto | null;
  homeForm: StandingTeamDto | null;
}

function PregameLineScoreBand({
  game,
  awayMeta,
  homeMeta,
  awayProbable,
  homeProbable,
  awayForm,
  homeForm,
}: PregameLineScoreBandProps): ReactElement {
  return (
    <div className="preg-band">
      {/* Zone 1 — empty line score */}
      <div className="preg-band__zone1">
        <div className="preg-band__header-row">
          <div className="preg-band__inn-nums">
            {INNINGS.map((n) => (
              <div key={n} className="preg-band__inn-num">{n}</div>
            ))}
          </div>
          <div className="preg-band__rhe-head-wrap">
            {["R", "H", "E"].map((x) => (
              <div key={x} className="preg-band__rhe-head">{x}</div>
            ))}
          </div>
        </div>

        <div className="preg-band__team-row">
          <div className="preg-band__team-col">
            <TeamLogo meta={awayMeta} abbr={game.awayAbbr} size={24} onDark />
            <span className="preg-band__team-name preg-band__team-name--bold">
              {TEAM_NICKNAMES[game.awayAbbr] ?? game.awayName ?? game.awayAbbr}
            </span>
          </div>
          <div className="preg-band__dashes">
            {INNINGS.map((n) => <div key={n} className="preg-band__dash-cell">–</div>)}
          </div>
          <div className="preg-band__rhe-wrap">
            <div className="preg-band__rhe-dash">–</div>
            <div className="preg-band__rhe-dash">–</div>
            <div className="preg-band__rhe-dash">–</div>
          </div>
        </div>

        <div className="preg-band__divider" />

        <div className="preg-band__team-row">
          <div className="preg-band__team-col">
            <TeamLogo meta={homeMeta} abbr={game.homeAbbr} size={24} onDark />
            <span className="preg-band__team-name">
              {TEAM_NICKNAMES[game.homeAbbr] ?? game.homeName ?? game.homeAbbr}
            </span>
          </div>
          <div className="preg-band__dashes">
            {INNINGS.map((n) => <div key={n} className="preg-band__dash-cell">–</div>)}
          </div>
          <div className="preg-band__rhe-wrap">
            <div className="preg-band__rhe-dash">–</div>
            <div className="preg-band__rhe-dash">–</div>
            <div className="preg-band__rhe-dash">–</div>
          </div>
        </div>
      </div>

      {/* Zone 2 — probable pitchers */}
      <div className="preg-band__zone2">
        <div className="preg-band__zone-head">Probable pitchers</div>
        {[
          { probable: awayProbable, meta: awayMeta, abbr: game.awayAbbr, label: "Away" },
          { probable: homeProbable, meta: homeMeta, abbr: game.homeAbbr, label: "Home" },
        ].map(({ probable, meta, abbr, label }) =>
          probable?.name != null && probable.mlbId != null ? (
            <div key={`${abbr}-prob`} className="preg-band__prob-item">
              <TeamLogo meta={meta} abbr={abbr} size={22} onDark />
              <div className="preg-band__prob-text">
                <Link
                  to={`/player/${probable.mlbId}`}
                  state={{ fromGame: game.providerGameId }}
                  className="preg-band__prob-name player-link"
                >
                  {probable.name}
                </Link>
                <span className="preg-band__prob-meta">
                  {handLabel(probable.pitchHand)}
                  {probable.jerseyNumber != null ? ` · #${probable.jerseyNumber}` : ""}
                  {` · ${label}`}
                </span>
              </div>
              <div className="preg-band__prob-era-wrap">
                —<span className="preg-band__era-unit">ERA</span>
              </div>
            </div>
          ) : (
            <div key={`${abbr}-prob`} className="preg-band__prob-item">
              <TeamLogo meta={meta} abbr={abbr} size={22} onDark />
              <div className="preg-band__prob-text">
                <span className="preg-band__prob-name">TBD</span>
                <span className="preg-band__prob-meta">{label}</span>
              </div>
            </div>
          ),
        )}
      </div>

      {/* Zone 3 — coming in (season form) */}
      <div className="preg-band__zone3">
        <div className="preg-band__zone-head">Coming in</div>
        {[
          { form: awayForm, meta: awayMeta, abbr: game.awayAbbr },
          { form: homeForm, meta: homeMeta, abbr: game.homeAbbr },
        ].map(({ form, meta, abbr }) => (
          <div key={abbr} className="preg-band__form-item">
            <TeamLogo meta={meta} abbr={abbr} size={22} onDark />
            <div className="preg-band__form-text">
              <div className="preg-band__form-rec">
                {fmtRecord(form?.wins, form?.losses)}
              </div>
              <div className="preg-band__form-sub">
                {form != null ? (
                  <>
                    L10 <span className="preg-band__form-mono">{form.lastTen}</span>
                    {" · "}Streak{" "}
                    <span
                      className={`preg-band__form-mono ${
                        (form.streak ?? "").charAt(0) === "W"
                          ? "preg-band__form-strk--win"
                          : "preg-band__form-strk--loss"
                      }`}
                    >
                      {form.streak}
                    </span>
                  </>
                ) : (
                  <span className="preg-band__form-mono">—</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface PregameMatchupLeftProps {
  game: GameViewDto;
  lineupsOpen: boolean;
  onToggleLineups: () => void;
  awayMeta: TeamMeta | null | undefined;
  homeProbable: ProbableInfo | null;
  pitcherNames: string;
  firstPitchTime: string;
  firstPitchAmPm: string;
}

function PregameMatchupLeft({
  game,
  lineupsOpen,
  onToggleLineups,
  awayMeta,
  homeProbable,
  pitcherNames,
  firstPitchTime,
  firstPitchAmPm,
}: PregameMatchupLeftProps): ReactElement {
  const awayColor = awayMeta?.primaryColorHex ?? "var(--color-accent)";

  return (
    <Card padless>
      {/* Play-state eyebrow */}
      <div className="preg-matchup__eyebrow-bar">
        <div className="preg-matchup__eyebrow-left">
          <span className="preg-matchup__inning">▲ 1st</span>
          <Bases on={[false, false, false]} size={26} fill="var(--color-accent)" empty="var(--color-border-strong)" />
          <div className="preg-matchup__count-group">
            {(
              [
                { l: "BALLS", total: 3, color: "var(--color-info)" },
                { l: "STRIKES", total: 2, color: "var(--color-text)" },
                { l: "OUTS", total: 2, color: "var(--color-accent)" },
              ] as const
            ).map((p) => (
              <span key={p.l} className="preg-matchup__count-item">
                <span className="preg-matchup__count-label">{p.l}</span>
                <Pips count={0} total={p.total} size={9} gap={5} color={p.color} emptyColor="var(--color-border-strong)" />
              </span>
            ))}
          </div>
        </div>
        <button
          type="button"
          className={`preg-matchup__lineups-btn${lineupsOpen ? " preg-matchup__lineups-btn--open" : ""}`}
          onClick={onToggleLineups}
        >
          Lineups <span className="preg-matchup__lineups-arrow">{lineupsOpen ? "▸" : "▾"}</span>
        </button>
      </div>

      {/* Zone + leadoff batter grid */}
      <div className="preg-matchup__grid">
        <div className="preg-matchup__zone-col">
          <StrikeZone size={240} dots={[]} />
          <span className="preg-matchup__zone-hint">Pitches plot here once the game starts</span>
        </div>

        {/* Leadoff batter — empty state until lineup posts */}
        <div className="preg-matchup__batter-col">
          <span className="preg-matchup__leadoff-eyebrow">Leading off · {game.awayAbbr}</span>
          <div className="preg-matchup__tbd-block">
            <span className="preg-matchup__tbd-label">Lineup not yet posted</span>
            <span className="preg-matchup__tbd-sub">
              The leadoff matchup will appear once {game.awayAbbr}'s batting order is set, usually about an hour before first pitch.
            </span>
          </div>
        </div>
      </div>

      {/* First-pitch dark strip */}
      <div className="preg-matchup__fp-wrap">
        <div className="preg-matchup__fp">
          <div>
            <div className="preg-matchup__fp-eyebrow">First pitch</div>
            <div className="preg-matchup__fp-title">{pitcherNames}</div>
          </div>
          <div className="preg-matchup__fp-time-block">
            <div className="preg-matchup__fp-time">{firstPitchTime}</div>
            <div className="preg-matchup__fp-time-unit">{firstPitchAmPm}</div>
          </div>
          <div className="preg-matchup__fp-misc">
            {homeProbable?.name != null ? (
              <span className="preg-matchup__fp-pitcher-note">
                vs {homeProbable.name.split(" ").slice(-1)[0]}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </Card>
  );
}

function PregameContext({
  game,
  homeProbable,
}: {
  game: GameViewDto;
  homeProbable: ProbableInfo | null;
}): ReactElement {
  const pitcherLastName = homeProbable?.name?.split(" ").slice(-1)[0] ?? null;

  return (
    <Card padless>
      <div className="preg-ctx__grid">
        {/* Probable starter — always available (rotation-based, known days ahead of lineup) */}
        <div className="preg-ctx__col preg-ctx__col--left">
          <div className="preg-ctx__eyebrow">Probable starter · {game.homeAbbr}</div>
          {pitcherLastName != null ? (
            homeProbable?.mlbId != null ? (
              <Link
                to={`/player/${homeProbable.mlbId}`}
                state={{ fromGame: game.providerGameId }}
                className="preg-ctx__starter-name player-link"
              >
                {pitcherLastName}
              </Link>
            ) : (
              <div className="preg-ctx__starter-name">{pitcherLastName}</div>
            )
          ) : (
            <div className="preg-ctx__starter-name preg-ctx__starter-name--tbd">TBD</div>
          )}
          <div className="preg-ctx__starter-note">
            Batter-specific matchup history will appear once {game.awayAbbr}'s lineup is posted.
          </div>
        </div>

        {/* Top of the order — empty state until lineup posts */}
        <div className="preg-ctx__col preg-ctx__col--right">
          <div className="preg-ctx__eyebrow">Top of the order · {game.awayAbbr}</div>
          <div className="preg-ctx__tbd">
            <span className="preg-ctx__tbd-label">Not yet posted</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

function PregamePitchByPitch({ firstPitchLabel }: { firstPitchLabel: string }): ReactElement {
  return (
    <div className="preg-pbp">
      <div className="preg-pbp__header">
        <div className="preg-pbp__title-group">
          <span className="preg-pbp__title">Pitch by pitch</span>
          <span className="preg-pbp__count">· 0 at-bats</span>
        </div>
        <Segmented items={["All", "Runs", "K", "HR", "BB"]} active={0} size="sm" />
      </div>
      <div className="preg-pbp__body">
        <div className="preg-pbp__ball-icon">⚾</div>
        <div className="preg-pbp__heading">Waiting for the game to begin</div>
        <div className="preg-pbp__desc">
          First pitch is scheduled for{" "}
          <span className="preg-pbp__desc-time">{firstPitchLabel}</span>. Every pitch
          and plate appearance will appear here, newest first, as soon as play starts.
        </div>
      </div>
    </div>
  );
}

interface PregameStartersProps {
  game: GameViewDto;
  awayMeta: TeamMeta | null | undefined;
  homeMeta: TeamMeta | null | undefined;
  awayProbable: ProbableInfo | null;
  homeProbable: ProbableInfo | null;
}

function PregameStarters({
  game,
  awayMeta,
  homeMeta,
  awayProbable,
  homeProbable,
}: PregameStartersProps): ReactElement {
  const sides = [
    { probable: awayProbable, meta: awayMeta, abbr: game.awayAbbr, isLeft: true },
    { probable: homeProbable, meta: homeMeta, abbr: game.homeAbbr, isLeft: false },
  ];

  return (
    <Card padless>
      <div className="preg-starters__header">
        <span className="preg-starters__eyebrow">Starting pitchers</span>
      </div>
      <div className="preg-starters__grid">
        {sides.map(({ probable, meta, abbr, isLeft }) => (
          <div key={abbr} className={`preg-starters__side${isLeft ? " preg-starters__side--left" : ""}`}>
            <Headshot
              mlbId={probable?.mlbId ?? null}
              initials={initials(probable?.name)}
              teamColor={meta?.primaryColorHex ?? "var(--color-text-faint)"}
              size={72}
            />
            <div className="preg-starters__info">
              <div className="preg-starters__probable">
                Probable <span className="preg-starters__probable-sep">· {abbr}</span>
              </div>
              {probable?.name != null && probable.mlbId != null ? (
                <Link
                  to={`/player/${probable.mlbId}`}
                  state={{ fromGame: game.providerGameId }}
                  className="preg-starters__name player-link"
                >
                  {probable.name}
                </Link>
              ) : (
                <span className="preg-starters__name preg-starters__name--tbd">TBD</span>
              )}
              <div className="preg-starters__meta">
                {handLabel(probable?.pitchHand)}
                {probable?.jerseyNumber != null ? ` · #${probable.jerseyNumber}` : ""}
              </div>
              <div className="preg-starters__stats">
                {[
                  ["Record", "—"],
                  ["ERA", "—"],
                  ["WHIP", "—"],
                  ["K", "—"],
                ].map(([k, v]) => (
                  <div key={k} className="preg-starters__stat">
                    <span className="preg-starters__stat-label">{k}</span>
                    <span className="preg-starters__stat-value">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

interface PregameOddsProps {
  awayAbbr: string;
  homeAbbr: string;
  awayMeta: TeamMeta | null | undefined;
  homeMeta: TeamMeta | null | undefined;
}

function PregameOdds({ awayAbbr, homeAbbr, awayMeta, homeMeta }: PregameOddsProps): ReactElement {
  const awayColor = awayMeta?.primaryColorHex ?? "var(--color-text-faint)";
  const homeColor = homeMeta?.primaryColorHex ?? "var(--color-border)";

  return (
    <Card padless>
      <div className="preg-odds__header">
        <div className="preg-odds__eyebrow">Pregame win probability</div>
        <div className="preg-odds__pct-wrap">
          <span className="preg-odds__pct">—</span>
          <span className="preg-odds__pct-team" style={{ color: awayColor }}>{awayAbbr}</span>
        </div>
      </div>
      <div className="preg-odds__body">
        <div className="preg-odds__bar">
          <div
            className="preg-odds__bar-segment"
            style={{ width: "50%", background: awayColor }}
          >
            <span className="preg-odds__bar-label">{awayAbbr}</span>
          </div>
          <div
            className="preg-odds__bar-segment"
            style={{ width: "50%", background: homeColor }}
          >
            <span className="preg-odds__bar-label" style={{ marginLeft: "auto" }}>{homeAbbr}</span>
          </div>
        </div>
        <div className="preg-odds__explain preg-odds__explain--muted">
          Win probability model not yet available for this game.
        </div>
      </div>
    </Card>
  );
}

interface PregameSeriesProps {
  game: GameViewDto;
  series: SeriesDto | null;
  awayMeta: TeamMeta | null | undefined;
  homeMeta: TeamMeta | null | undefined;
}

function PregameSeries({ game, series, awayMeta, homeMeta }: PregameSeriesProps): ReactElement {
  const metaByAbbr = (abbr: string): TeamMeta | null | undefined =>
    abbr === game.awayAbbr ? awayMeta : abbr === game.homeAbbr ? homeMeta : undefined;

  const awayWins = series?.awayWins ?? 0;
  const homeWins = series?.homeWins ?? 0;

  return (
    <Card padless>
      <div className="preg-series__header">
        <div className="preg-series__eyebrow">Season series</div>
        {series != null ? (
          <span className="preg-series__record">
            {awayWins} <span className="preg-series__record-sep">–</span> {homeWins}
          </span>
        ) : (
          <span className="preg-series__record">— – —</span>
        )}
      </div>
      <div className="preg-series__body">
        {series == null ? (
          <div className="preg-series__context">Loading series data…</div>
        ) : series.games.length === 0 ? (
          <div className="preg-series__context">No prior matchups this season.</div>
        ) : (
          series.games.map((g, i) => (
            <div key={i} className="preg-series__game">
              <span className="preg-series__date">{g.date}</span>
              <TeamLogo meta={metaByAbbr(g.awayAbbr)} abbr={g.awayAbbr} size={20} />
              <span
                className={`preg-series__score ${
                  g.winner === g.awayAbbr ? "preg-series__score--winner" : "preg-series__score--loser"
                }`}
              >
                {g.awayScore ?? "—"}
              </span>
              <span className="preg-series__at">@</span>
              <TeamLogo meta={metaByAbbr(g.homeAbbr)} abbr={g.homeAbbr} size={20} />
              <span
                className={`preg-series__score ${
                  g.winner === g.homeAbbr ? "preg-series__score--winner" : "preg-series__score--loser"
                }`}
              >
                {g.homeScore ?? "—"}
              </span>
              <span className="preg-series__winner-label">{g.winner != null ? `${g.winner} W` : "—"}</span>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

// ── Main component ────────────────────────────────────────

interface PregameViewProps {
  game: GameViewDto;
  lineupsOpen: boolean;
  onToggleLineups: () => void;
}

export function PregameView({ game, lineupsOpen, onToggleLineups }: PregameViewProps): ReactElement {
  const awayMeta = game.awayTeamMeta as TeamMeta | null | undefined;
  const homeMeta = game.homeTeamMeta as TeamMeta | null | undefined;

  const snap = game.snapshot as Record<string, unknown> | null | undefined;
  const awayProbable = (snap?.awayProbable as ProbableInfo | null | undefined) ?? null;
  const homeProbable = (snap?.homeProbable as ProbableInfo | null | undefined) ?? null;

  const [standings, setStandings] = useState<StandingTeamDto[]>([]);
  const [series, setSeries] = useState<SeriesDto | null>(null);

  useEffect(() => {
    const year = String(new Date().getFullYear());
    standingsApi
      .standingsGetStandings(year)
      .then((r) => setStandings(r.data ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!game.providerGameId) return;
    gamesApi
      .gamesGetSeries(game.providerGameId)
      .then((r) => setSeries((r.data as unknown as SeriesDto) ?? null))
      .catch(() => {});
  }, [game.providerGameId]);

  const awayForm = standings.find((s) => s.abbr === game.awayAbbr) ?? null;
  const homeForm = standings.find((s) => s.abbr === game.homeAbbr) ?? null;

  const startTimeUtc = game.startTimeUtc as string | null | undefined;
  const { time, ampm } = formatFirstPitchParts(startTimeUtc);
  const shortTime = time !== "—" ? `${time}${ampm.charAt(0).toLowerCase()}` : "—";
  const firstPitchLabel = time !== "—" ? `${shortTime} ET` : "—";

  const awayLastName = awayProbable?.name?.split(" ").slice(-1)[0] ?? "TBD";
  const homeLastName = homeProbable?.name?.split(" ").slice(-1)[0] ?? "TBD";
  const pitcherNames = `${awayLastName} vs ${homeLastName}`;

  return (
    <>
      <PregameLineScoreBand
        game={game}
        awayMeta={awayMeta}
        homeMeta={homeMeta}
        awayProbable={awayProbable}
        homeProbable={homeProbable}
        awayForm={awayForm}
        homeForm={homeForm}
      />

      <div className="preg-hero-grid">
        <div className="preg-left-col">
          <PregameMatchupLeft
            game={game}
            lineupsOpen={lineupsOpen}
            onToggleLineups={onToggleLineups}
            awayMeta={awayMeta}
            homeProbable={homeProbable}
            pitcherNames={pitcherNames}
            firstPitchTime={time}
            firstPitchAmPm={ampm}
          />
          <PregameContext game={game} homeProbable={homeProbable} />
        </div>
        <PregamePitchByPitch firstPitchLabel={firstPitchLabel} />
      </div>

      <PregameStarters
        game={game}
        awayMeta={awayMeta}
        homeMeta={homeMeta}
        awayProbable={awayProbable}
        homeProbable={homeProbable}
      />

      <div className="preg-bottom-grid">
        <PregameOdds
          awayAbbr={game.awayAbbr}
          homeAbbr={game.homeAbbr}
          awayMeta={awayMeta}
          homeMeta={homeMeta}
        />
        <PregameSeries
          game={game}
          series={series}
          awayMeta={awayMeta}
          homeMeta={homeMeta}
        />
      </div>
    </>
  );
}
