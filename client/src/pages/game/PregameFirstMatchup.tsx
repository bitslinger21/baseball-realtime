import { useEffect, useState, type ReactElement } from "react";
import { Link } from "react-router-dom";
import type { GameLineupsDto, GameViewDto, LineupBatterDto, LineupProbableDto, VsPlayerDto } from "@bitslinger21/scorebook-client";
import { playersApi } from "../../api/baseballApiClient";
import { Bases } from "../../components/primitives/Bases";
import { Headshot } from "../../components/primitives/Headshot";
import { OrderSpot } from "../../components/primitives/OrderSpot";
import { Pips } from "../../components/primitives/Pips";
import { StrikeZone } from "../../components/primitives/StrikeZone";
import { useBatterInfo } from "../../hooks/useBatterInfo";
import { useMatchupStats } from "../../hooks/useMatchupStats";
import { fmtClock, pregameLineupState } from "./pregameLineups";
import "./MatchupLeft.css";
import "./MatchupContext.css";
import "./PregameFirstMatchup.css";

// Pregame, first matchup (PROMPT_pregame_first_matchup.md): before the first
// pitch the Preview view uses the live layout — matchup card + context card on
// the left, the pitch-by-pitch card on the right — each in the slot it fills
// during the game, so at the first pitch the cards fill in and nothing moves.
// The first matchup is the away leadoff batter vs the home probable starter.

// Official lineups typically post about an hour before first pitch.
const LINEUP_LEAD_MS = 60 * 60_000;

const lastName = (name: string): string => name.split(" ").slice(-1)[0] ?? name;
const initials = (name: string): string => name.split(" ").map((w) => w[0] ?? "").join("").slice(0, 2).toUpperCase();
const handLabel = (h: string | null | undefined): string => (h === "L" ? "LHP" : h === "R" ? "RHP" : "P");
const hasHistory = (m: VsPlayerDto | null): m is VsPlayerDto => m != null && m.ab > 0;

function ProjectedTag(): ReactElement {
  return <span className="pgfm__projected">Projected</span>;
}

type TeamMeta = { primaryColorHex?: string | null };

interface Props {
  game: GameViewDto;
  lineups: GameLineupsDto;
  lineupsOpen: boolean;
  onToggleLineups: () => void;
}

export function PregameFirstMatchup({ game, lineups, lineupsOpen, onToggleLineups }: Props): ReactElement {
  const state = pregameLineupState(lineups);
  const projected = state === "projected";
  const away = lineups.away;
  const probable = away.opposingProbable!;
  const firstPitch = game.startTimeUtc != null ? new Date(game.startTimeUtc as string).getTime() : null;
  return (
    <div className="pgfm">
      <div className="pgfm__left">
        <PregameMatchupLeft game={game} lead={away.batters[0]!} teamAbbr={away.teamAbbr} probable={probable} projected={projected} firstPitch={firstPitch} lineupsOpen={lineupsOpen} onToggleLineups={onToggleLineups} />
        <PregameMatchupContext game={game} batters={away.batters.slice(0, 3)} probable={probable} projected={projected} />
      </div>
      <PregameFeed state={state} firstPitch={firstPitch} probableHand={probable.hand ?? null} postedAt={away.postedAt ?? null} />
    </div>
  );
}

// ── Left column, matchup card: mirrors MatchupLeft ──────────────────────────

function PregameMatchupLeft({ game, lead, teamAbbr, probable, projected, firstPitch, lineupsOpen, onToggleLineups }: {
  game: GameViewDto; lead: LineupBatterDto; teamAbbr: string; probable: LineupProbableDto; projected: boolean;
  firstPitch: number | null; lineupsOpen: boolean; onToggleLineups: () => void;
}): ReactElement {
  const { batterInfo } = useBatterInfo(lead.mlbId);
  const vs = useMatchupStats(lead.mlbId, probable.mlbId);
  const teamColor = (game.awayTeamMeta as TeamMeta | null)?.primaryColorHex ?? "var(--color-text-faint)";
  const hand = lead.bats != null || lead.throws != null ? `${lead.bats ?? "—"}/${lead.throws ?? "—"}` : null;
  return (
    <div className="card matchup-left">
      <div className="matchup-left__eyebrow">
        <div className="matchup-left__eyebrow-left">
          <span className="matchup-left__inning num">▲ 1st</span>
          <Bases on={[false, false, false]} size={26} fill="var(--color-accent)" />
          <div className="matchup-left__count-group">
            {([
              { l: "BALLS", total: 3, color: "var(--color-info)" },
              { l: "STRIKES", total: 2, color: "var(--color-text)" },
              { l: "OUTS", total: 2, color: "var(--color-accent)" },
            ] as const).map((p) => (
              <span key={p.l} className="matchup-left__count-item">
                <span className="matchup-left__count-label">{p.l}</span>
                <Pips count={0} total={p.total} size={9} gap={5} color={p.color} emptyColor="var(--color-border-strong)" />
              </span>
            ))}
          </div>
        </div>
        <button type="button" className={`matchup-left__lineups-btn${lineupsOpen ? " matchup-left__lineups-btn--open" : ""}`} onClick={onToggleLineups}>
          Lineups <span className="matchup-left__lineups-arrow">{lineupsOpen ? "▸" : "▾"}</span>
        </button>
      </div>

      <div className="matchup-left__grid">
        <div className="matchup-left__zone-col">
          <div className="matchup-left__rewind-strip">
            <span className="matchup-left__rewind-dot matchup-left__rewind-dot--hollow" />
            <span className="matchup-left__rewind-label">Before first pitch</span>
          </div>
          <StrikeZone size={240} dots={[]} />
          <div className="matchup-left__legend">
            {firstPitch != null && (
              <span className="matchup-left__legend-empty">
                Pitches plot here from <span className="pgfm__clock">{fmtClock(firstPitch)}</span>
              </span>
            )}
          </div>
        </div>

        <div className="matchup-left__batter-col">
          <span className="pgfm__eyebrow-row">
            <span className="matchup-left__at-bat-eyebrow">Leading off · {teamAbbr}</span>
            {projected && <ProjectedTag />}
          </span>
          <div className="matchup-left__batter-identity">
            <Headshot mlbId={lead.mlbId} initials={initials(lead.name)} teamColor={teamColor} size={68} />
            <div className="matchup-left__batter-text">
              <div className="matchup-left__batter-name-row">
                <OrderSpot n={lead.slot} />
                <Link to={`/player/${lead.mlbId}`} state={{ fromGame: game.providerGameId }} className="matchup-left__batter-name player-link">{lead.name}</Link>
              </div>
              <span className="matchup-left__batter-meta num">{[lead.position, hand].filter(Boolean).join(" · ")}</span>
              {batterInfo != null && (
                <span className="matchup-left__slash">
                  {batterInfo.avg}<span className="matchup-left__slash-sep"> / </span>
                  {batterInfo.obp}<span className="matchup-left__slash-sep"> / </span>
                  {batterInfo.slg}
                </span>
              )}
            </div>
          </div>
          <div className="matchup-left__stat-rows">
            <div className="matchup-left__stat-row">
              <span className="matchup-left__stat-row-label">Last 7 games</span>
              <span className="matchup-left__stat-row-value">{lead.last7 != null ? `${lead.last7.h}-for-${lead.last7.ab}` : "—"}</span>
            </div>
            <div className="matchup-left__stat-row">
              <span className="matchup-left__stat-row-label">vs {lastName(probable.name)}</span>
              <span className="matchup-left__stat-row-value">
                {hasHistory(vs)
                  ? <>{vs.h}-for-{vs.ab} <span className="pgfm__faint">· career</span></>
                  : <span className="pgfm__first-meeting">First meeting</span>}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Left column, context card: mirrors MatchupContext ───────────────────────

function useSeasonLine(mlbId: number): { record: string; era: string; whip: string; k: string } | null {
  const [line, setLine] = useState<{ record: string; era: string; whip: string; k: string } | null>(null);
  useEffect(() => {
    let alive = true;
    setLine(null);
    playersApi
      .playersGetPlayerPitching(mlbId, String(new Date().getFullYear()))
      .then((r) => {
        const t = r.data.seasonTotals;
        if (!alive || t == null) return;
        setLine({
          record: t.wins != null && t.losses != null ? `${t.wins}-${t.losses}` : "—",
          era: t.era ?? "—",
          whip: t.whip ?? "—",
          k: t.strikeOuts != null ? String(t.strikeOuts) : "—",
        });
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [mlbId]);
  return line;
}

function DueUpRow({ game, label, batter, probableId }: { game: GameViewDto; label: string; batter: LineupBatterDto; probableId: number }): ReactElement {
  const vs = useMatchupStats(batter.mlbId, probableId);
  return (
    <div className="mc__due-player">
      <span className="mc__due-label">{label}</span>
      <div className="mc__due-row">
        <OrderSpot n={batter.slot} />
        <span className="mc__jersey num">#{batter.jerseyNumber ?? "—"}</span>
        <Link to={`/player/${batter.mlbId}`} state={{ fromGame: game.providerGameId }} className="mc__due-name player-link">{batter.name}</Link>
        <span className="mc__due-pos">– {batter.position ?? "—"}</span>
        <span className={`mc__due-line${hasHistory(vs) ? " num" : " pgfm__first-meeting"}`} title="Career vs the starter">
          {hasHistory(vs) ? `${vs.h}-${vs.ab}` : "First meeting"}
        </span>
      </div>
    </div>
  );
}

function PregameMatchupContext({ game, batters, probable, projected }: {
  game: GameViewDto; batters: LineupBatterDto[]; probable: LineupProbableDto; projected: boolean;
}): ReactElement {
  const [lead, onDeck, inHole] = batters;
  const vs = useMatchupStats(lead?.mlbId ?? null, probable.mlbId);
  const season = useSeasonLine(probable.mlbId);
  const pitchingAbbr = game.homeAbbr;
  const teamColor = (game.homeTeamMeta as TeamMeta | null)?.primaryColorHex ?? "var(--color-text-faint)";
  return (
    <div className="card mc">
      {/* Probables are MLB's announcement — never tagged as projected. */}
      <div className="mc__pitcher-strip">
        <Headshot mlbId={probable.mlbId} initials={initials(probable.name)} teamColor={teamColor} size={30} ratio={1.15} />
        <div className="mc__ps-info">
          <span className="mc__ps-eyebrow">Starting · {pitchingAbbr}</span>
          <div className="mc__ps-name-row">
            <Link to={`/player/${probable.mlbId}`} state={{ fromGame: game.providerGameId }} className="mc__ps-name player-link">{probable.name}</Link>
            <span className="mc__ps-hand num">{handLabel(probable.hand)} · #{probable.jerseyNumber ?? "—"}</span>
          </div>
        </div>
        <div className="mc__ps-stats">
          <div className="mc__ps-line1 num">
            <span className="mc__ps-val">{season?.record ?? "—"}</span>
            {"  "}<span className="mc__ps-unit">ERA </span>{season?.era ?? "—"}
          </div>
          <div className="mc__ps-line2 num">
            <span className="mc__ps-unit">WHIP </span>{season?.whip ?? "—"}
            <span className="mc__ps-dot"> · </span>
            {season?.k ?? "—"} <span className="mc__ps-unit">K</span>
            <span className="mc__ps-dot"> · </span>
            <span className="mc__ps-unit">season</span>
          </div>
        </div>
      </div>
      <div className="mc__grid">
        <div className="mc__matchup">
          <span className="mc__eyebrow">First matchup</span>
          {lead != null && (
            <div className="mc__vs-line">
              <Link to={`/player/${lead.mlbId}`} state={{ fromGame: game.providerGameId }} className="mc__player-name player-link">{lastName(lead.name)}</Link>
              <span className="mc__vs">vs</span>
              <Link to={`/player/${probable.mlbId}`} state={{ fromGame: game.providerGameId }} className="mc__player-name player-link">{lastName(probable.name)}</Link>
            </div>
          )}
          <div className="mc__stat-rows">
            <div className="mc__stat-row">
              <span className="mc__stat-label">Career</span>
              <span className="mc__stat-value num">
                {hasHistory(vs)
                  ? <>{vs.h}-for-{vs.ab} <span className="pgfm__faint">· {vs.avg ?? "—"}{vs.hr > 0 ? ` · ${vs.hr} HR` : ""}</span></>
                  : <span className="pgfm__first-meeting">First meeting</span>}
              </span>
            </div>
          </div>
        </div>
        <div className="mc__due-up">
          <span className="pgfm__eyebrow-row">
            <span className="mc__eyebrow">Due up</span>
            {projected && <ProjectedTag />}
          </span>
          {onDeck != null && <DueUpRow game={game} label="On deck" batter={onDeck} probableId={probable.mlbId} />}
          {inHole != null && <DueUpRow game={game} label="In the hole" batter={inHole} probableId={probable.mlbId} />}
        </div>
      </div>
    </div>
  );
}

// ── Right column: the pitch-by-pitch card in its pregame state ──────────────

function PregameFeed({ state, firstPitch, probableHand, postedAt }: {
  state: "projected" | "official" | "none"; firstPitch: number | null; probableHand: string | null; postedAt: string | null;
}): ReactElement {
  return (
    <div className="card pgfm__feed">
      <div className="pgfm__feed-head">
        <span className="pgfm__feed-title">Pitch by pitch</span>
        {firstPitch != null && <span className="pgfm__feed-starts">Starts at <span className="pgfm__clock">{fmtClock(firstPitch)}</span></span>}
      </div>
      <div className="pgfm__feed-body">
        {firstPitch != null && (
          <div className="pgfm__first-pitch">
            <span className="pgfm__first-pitch-label">First pitch</span>
            <span className="pgfm__first-pitch-time num">{fmtClock(firstPitch)}</span>
          </div>
        )}
        <div className="pgfm__feed-copy">
          <p>Every pitch appears here as it's thrown, with the strike zone and the matchup on the left updating alongside it.</p>
          {state === "projected" ? (
            <p>
              Lineups are <span className="pgfm__projected-word">projected</span> from each club's last lineup against a{" "}
              {probableHand === "L" ? "left" : "right"}-handed starter.
              {firstPitch != null && <> Official lineups usually post about <span className="pgfm__clock">{fmtClock(firstPitch - LINEUP_LEAD_MS)}</span>.</>}
            </p>
          ) : postedAt != null ? (
            <p>Official lineups posted at <span className="pgfm__clock">{fmtClock(new Date(postedAt).getTime())}</span>.</p>
          ) : (
            <p>Official lineups are posted.</p>
          )}
          <p>Bench and bullpen are in Lineups.</p>
        </div>
      </div>
    </div>
  );
}
