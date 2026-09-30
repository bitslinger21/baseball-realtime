import { useEffect, useRef, useState } from "react";
import type { ReactElement } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { TeamDot } from "../../components/primitives/TeamDot";
import {
  formatDay,
  formatDuration,
  formatWhen,
  leaderFirst,
  teamInfo,
  type PostseasonGameSideWire,
  type PostseasonGameWire,
  type PostseasonRecapWire,
  type PostseasonSeriesWire,
  type PostseasonSideWire,
} from "./postseason";
import { getAutoplayVideo } from "../../utils/videoPrefs";
import "./SeriesDrawer.css";

// SERIES DRAWER — opened from a current or finished bracket card
// (PROMPT_postseason_bracket.md §3, holistic/series.jsx). Right-side panel,
// dim backdrop, ✕ / Esc / backdrop close — the Lineups panel's gesture.

// Game score: each club with its own runs, never "3–1" (§4). A final reads
// winner first (spec §3); a live game reads away then home, like the
// matchup itself — the leader is bolded either way.
function ScoreLine({ g, tag, awayHome = false }: { g: PostseasonGameWire; tag?: string | null; awayHome?: boolean }): ReactElement {
  const [first, second] = awayHome ? [g.away, g.home] : leaderFirst(g);
  const side = (s: PostseasonGameSideWire, lead: boolean): ReactElement => (
    <span className={`sd__score-side${lead ? " sd__score-side--lead" : ""}`}>
      <TeamDot team={teamInfo(s.abbr)} size={16} />
      <span className="sd__score-abbr">{s.abbr}</span>
      <span className="sd__score-runs num">{s.runs ?? 0}</span>
    </span>
  );
  const leads = (s: PostseasonGameSideWire, o: PostseasonGameSideWire): boolean => (s.runs ?? 0) > (o.runs ?? 0);
  return (
    <div className="sd__score">
      {side(first, leads(first, second))}
      {side(second, leads(second, first))}
      {tag && <span className="sd__score-tag num">{tag}</span>}
    </div>
  );
}

function RecapButton({
  recap,
  open,
  onClick,
}: {
  recap: PostseasonRecapWire | null;
  open: boolean;
  onClick: () => void;
}): ReactElement {
  if (recap == null) return <span className="sd__recap-missing">Recap not posted yet</span>;
  return (
    <button
      type="button"
      className={`sd__recap-btn${open ? " sd__recap-btn--on" : ""}`}
      onClick={onClick}
      aria-expanded={open}
    >
      <svg width="8" height="9" viewBox="0 0 9 10" aria-hidden="true">
        <path d="M0 0 L9 5 L0 10 Z" fill="currentColor" />
      </svg>
      Recap
      <span className="sd__recap-dur num">{formatDuration(recap.durationSec)}</span>
    </button>
  );
}

// Slides down/up (grid-template-rows 0fr ↔ 1fr) and stays mounted so the
// close animates too. Opening plays it when the Autoplay video setting is on;
// collapsing always pauses it.
function RecapPlayer({ recap, open, gameNumber }: { recap: PostseasonRecapWire; open: boolean; gameNumber: number }): ReactElement {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (v == null) return;
    if (!open) v.pause();
    else if (getAutoplayVideo()) void v.play().catch(() => undefined);
  }, [open]);
  return (
    <div className={`sd__recap-wrap${open ? " sd__recap-wrap--open" : ""}`}>
      <div className="sd__recap-inner">
        <video
          ref={ref}
          className="sd__recap-video"
          src={recap.url}
          controls
          playsInline
          preload="none"
          aria-label={`Game ${gameNumber} recap`}
        />
      </div>
    </div>
  );
}

function GameRow({
  g,
  playing,
  onPlay,
}: {
  g: PostseasonGameWire;
  playing: boolean;
  onPlay: () => void;
}): ReactElement {
  const when = g.state === "scheduled" ? formatWhen(g.date, g.startTime) : formatDay(g.date);
  const head = (
    <div className="sd__game-head">
      <span className="sd__game-n">Game {g.number}</span>
      <span className="sd__game-when num">
        {when}
        {g.host != null ? ` · @ ${g.host}` : ""}
      </span>
    </div>
  );

  if (g.state === "final") {
    return (
      <div className="sd__game">
        <div className="sd__game-top">
          {head}
          <RecapButton recap={g.recap} open={playing} onClick={onPlay} />
        </div>
        <ScoreLine g={g} tag={g.innings != null ? `F/${g.innings}` : null} />
        {(g.winner != null || g.loser != null) && (
          <div className="sd__decisions">
            {g.winner != null && (
              <span>
                <b>W</b> {g.winner}
              </span>
            )}
            {g.loser != null && (
              <span>
                <b>L</b> {g.loser}
              </span>
            )}
            {g.save != null && (
              <span>
                <b>SV</b> {g.save}
              </span>
            )}
          </div>
        )}
        {g.note != null && <div className="sd__note">{g.note}</div>}
        {g.recap != null && <RecapPlayer recap={g.recap} open={playing} gameNumber={g.number} />}
      </div>
    );
  }

  if (g.state === "live") {
    return (
      <div className="sd__game sd__game--live">
        <div className="sd__game-top">
          {head}
          <Link to={`/game/${g.gamePk}`} className="sd__open-game">
            Open game →
          </Link>
        </div>
        <div className="sd__live">
          <span className="sd__live-dot" />
          <span className="sd__live-word">LIVE</span>
          {g.inning != null && <span className="sd__live-inning num">{g.inning}</span>}
        </div>
        <ScoreLine g={g} awayHome />
        {g.situation != null && <div className="sd__situation">{g.situation}</div>}
      </div>
    );
  }

  const probables =
    g.probables != null ? `${g.probables.away ?? "TBD"} vs ${g.probables.home ?? "TBD"}` : "Probables not announced";
  return (
    <div className="sd__game">
      {head}
      <div className="sd__situation">{g.state === "ifNecessary" ? "If necessary" : probables}</div>
    </div>
  );
}

function BigTeam({ side }: { side: PostseasonSideWire }): ReactElement {
  const abbr = side.team?.abbr ?? "";
  return (
    <div className="sd__big-team">
      <TeamDot team={teamInfo(abbr, side.team?.id)} size={30} />
      <span className="sd__big-abbr">{abbr}</span>
    </div>
  );
}

export function SeriesDrawer({
  series,
  closing,
  onClose,
}: {
  series: PostseasonSeriesWire;
  closing: boolean;
  onClose: () => void;
}): ReactElement {
  const [playing, setPlaying] = useState<number | null>(null); // one recap open at a time

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div className="sd" role="dialog" aria-modal="true" aria-label={`${series.label} series`}>
      <div className={`sd__backdrop${closing ? " sd__backdrop--out" : ""}`} onClick={onClose} />
      <div className={`sd__panel${closing ? " sd__panel--out" : ""}`}>
        <div className="sd__bar">
          <div className="sd__bar-title">
            <span className="sd__round">{series.label}</span>
            <span className="sd__bo">Best of {series.bestOf}</span>
          </div>
          <button type="button" className="sd__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="sd__scroll">
          <div className="sd__summary">
            <div className="sd__summary-row">
              <BigTeam side={series.high} />
              <span className="sd__series-score num">
                {series.high.wins}
                <span className="sd__series-dash">–</span>
                {series.low.wins}
              </span>
              <BigTeam side={series.low} />
            </div>
            <span className="sd__status">{series.status}</span>
          </div>
          {series.games.map((g) => (
            <GameRow
              key={g.number}
              g={g}
              playing={playing === g.number}
              onPlay={() => setPlaying(playing === g.number ? null : g.number)}
            />
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
