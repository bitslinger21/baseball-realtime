import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { GameViewDto, StandingTeamDto } from "@bitslinger21/baseball-realtime-client";
import { standingsApi, playersApi } from "../../api/baseballApiClient";
import { Card } from "../../components/primitives/Card";
import { LineScoreBand } from "./LineScoreBand";
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

interface PregameLineScoreBandProps {
  game: GameViewDto;
  awayMeta: TeamMeta | null | undefined;
  homeMeta: TeamMeta | null | undefined;
  awayProbable: ProbableInfo | null;
  homeProbable: ProbableInfo | null;
  awayEra: string | null;
  homeEra: string | null;
  awayForm: StandingTeamDto | null;
  homeForm: StandingTeamDto | null;
}

// A thin wrapper around the shared LineScoreBand (PROMPT_linescore_band.md §6b):
// same 48px sticky bar, overlay drawer and innings scroller as live, so the game
// view no longer changes shape at first pitch. Only the data differs — dashed
// runs, "Line score & probables", and probables + season form where live shows
// Game leaders (there are none before a pitch is thrown).
function PregameLineScoreBand({
  game,
  awayMeta,
  homeMeta,
  awayProbable,
  homeProbable,
  awayEra,
  homeEra,
  awayForm,
  homeForm,
}: PregameLineScoreBandProps): ReactElement {
  const zones = (
    <div className="preg-zones">
      <div className="preg-zones__zone preg-zones__zone--probables">
        <div className="lsb__eyebrow">Probable pitchers</div>
        {[
          { probable: awayProbable, meta: awayMeta, abbr: game.awayAbbr, label: "Away", era: awayEra },
          { probable: homeProbable, meta: homeMeta, abbr: game.homeAbbr, label: "Home", era: homeEra },
        ].map(({ probable, meta, abbr, label, era }) => (
          <div key={`${abbr}-prob`} className="lsb__leader">
            <TeamLogo meta={meta} abbr={abbr} size={22} onDark />
            <div className="lsb__leader-text preg-zones__prob-text">
              {probable?.name != null && probable.mlbId != null ? (
                <Link to={`/player/${probable.mlbId}`} state={{ fromGame: game.providerGameId }} className="lsb__leader-name player-link" title={probable.name}>
                  {probable.name}
                </Link>
              ) : (
                <div className="lsb__leader-name">TBD</div>
              )}
              <div className="lsb__leader-line">
                {probable?.name != null
                  ? `${handLabel(probable.pitchHand)}${probable.jerseyNumber != null ? ` · #${probable.jerseyNumber}` : ""} · ${label}`
                  : label}
              </div>
            </div>
            {probable?.name != null && (
              <div className="preg-zones__era num">
                {era ?? "—"} <span className="preg-zones__era-unit">ERA</span>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="preg-zones__zone preg-zones__zone--form">
        <div className="lsb__eyebrow">Coming in</div>
        {[
          { form: awayForm, meta: awayMeta, abbr: game.awayAbbr },
          { form: homeForm, meta: homeMeta, abbr: game.homeAbbr },
        ].map(({ form, meta, abbr }) => (
          <div key={abbr} className="lsb__leader">
            <TeamLogo meta={meta} abbr={abbr} size={22} onDark />
            <div>
              <div className="preg-zones__rec num">{fmtRecord(form?.wins, form?.losses)}</div>
              <div className="preg-zones__form-sub">
                {form != null ? (
                  <>
                    L10 <span className="num">{form.lastTen}</span>
                    {" · "}Streak{" "}
                    <span className={`num ${(form.streak ?? "").charAt(0) === "W" ? "preg-zones__strk--win" : "preg-zones__strk--loss"}`}>
                      {form.streak}
                    </span>
                  </>
                ) : (
                  <span className="num">—</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return <LineScoreBand game={game} latest={null} allUpdates={[]} mode="pregame" zones={zones} />;
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

  const awayPitcherMlbId = awayProbable?.mlbId ?? null;
  const homePitcherMlbId = homeProbable?.mlbId ?? null;
  const [awayEra, setAwayEra] = useState<string | null>(null);
  const [homeEra, setHomeEra] = useState<string | null>(null);

  useEffect(() => {
    const year = String(new Date().getFullYear());
    setAwayEra(null);
    if (awayPitcherMlbId == null) return;
    playersApi
      .playersGetPlayerPitching(awayPitcherMlbId, year)
      .then((r) => setAwayEra(r.data.seasonTotals?.era ?? null))
      .catch(() => {});
  }, [awayPitcherMlbId]);

  useEffect(() => {
    const year = String(new Date().getFullYear());
    setHomeEra(null);
    if (homePitcherMlbId == null) return;
    playersApi
      .playersGetPlayerPitching(homePitcherMlbId, year)
      .then((r) => setHomeEra(r.data.seasonTotals?.era ?? null))
      .catch(() => {});
  }, [homePitcherMlbId]);

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
        awayEra={awayEra}
        homeEra={homeEra}
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
