import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { GameViewDto, StandingTeamDto } from "@bitslinger21/baseball-realtime-client";
import { standingsApi } from "../../api/baseballApiClient";
import { Card } from "../../components/primitives/Card";
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

  useEffect(() => {
    const year = String(new Date().getFullYear());
    standingsApi
      .standingsGetStandings(year)
      .then((r) => setStandings(r.data ?? []))
      .catch(() => {});
  }, []);

  const awayForm = standings.find((s) => s.abbr === game.awayAbbr) ?? null;
  const homeForm = standings.find((s) => s.abbr === game.homeAbbr) ?? null;

  const startTimeUtc = game.startTimeUtc as string | null | undefined;
  const { time, ampm } = formatFirstPitchParts(startTimeUtc);
  const firstPitchInline = time !== "—"
    ? `${time}${ampm.charAt(0).toLowerCase()} ET`
    : null;

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

      <Card padless>
        <div className="preg-matchup__eyebrow-bar">
          <span className="preg-matchup__header-eyebrow">Matchup</span>
          <button
            type="button"
            className={`preg-matchup__lineups-btn${lineupsOpen ? " preg-matchup__lineups-btn--open" : ""}`}
            onClick={onToggleLineups}
          >
            Lineups <span className="preg-matchup__lineups-arrow">{lineupsOpen ? "▸" : "▾"}</span>
          </button>
        </div>
        <div className="preg-matchup__empty-body">
          <div className="preg-matchup__empty-icon">⚾</div>
          <div className="preg-matchup__empty-heading">Game hasn't started</div>
          <div className="preg-matchup__empty-copy">
            The batter matchup, strike zone, and pitch-by-pitch feed appear here once the
            lineup posts and the first pitch is thrown — usually about an hour before
            {firstPitchInline != null && (
              <>{" "}<span className="preg-matchup__empty-time">{firstPitchInline}</span></>
            )}. Bench and bullpen are available now in Lineups →.
          </div>
        </div>
      </Card>
    </>
  );
}
