import { useState } from "react";
import type { ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { TeamDot } from "../../components/primitives/TeamDot";
import { Headshot } from "../../components/primitives/Headshot";
import { EdgeButton } from "../../components/primitives/EdgeButton";
import { TEAMS } from "../../utils/teams";
import type { ClipWire } from "../game/clipTypes";
import { buildLayers, clipLine3, type FollowRowWire } from "./following";
import "./FollowCard.css";

// A followed entity as a stack of LAYERS (PROMPT_video_clips.md §3a/§3b).
// Every layer is three lines at a fixed height — `Name · LABEL`, then two
// content lines — so cycling never moves the rail. Previous and next edge
// buttons wrap both ways, each revealed only while the pointer is on its own
// strip. A `1/5` counter replaces the old "more here" mark.
//
// Live entities carry a 2px rust leading edge (state, not team colour).
// Longhand borders only — see the port note that used to live on the tile.
export function FollowCard({
  row,
  clips,
  onPlayClip,
}: {
  row: FollowRowWire;
  clips: readonly ClipWire[];
  onPlayClip: (clipId: string) => void;
}): ReactElement {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const layers = buildLayers(row, clips);
  const n = layers.length;
  const many = n > 1;
  const at = ((step % n) + n) % n;
  const layer = layers[at];
  const team = row.teamAbbr != null ? TEAMS[row.teamAbbr] : undefined;

  // Clicking the card anywhere but a button opens the player/team page.
  const open = (): void => {
    if (row.kind === "player" && row.mlbId != null) navigate(`/player/${row.mlbId}`);
    else if (row.kind === "team") navigate(`/team/${row.id}`);
  };

  return (
    <div
      className={`fcard${many ? " fcard--many" : ""}`}
      role="link"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === "Enter") open();
      }}
    >
      <div className={`fcard__edge${row.state === "live" ? " fcard__edge--live" : ""}`} />
      {row.kind === "team" && team ? (
        <TeamDot team={team} size={28} />
      ) : (
        <Headshot
          mlbId={row.mlbId}
          initials={row.name.split(" ").map((w) => w[0]).join("")}
          teamColor={team?.primary ?? "var(--color-border-strong)"}
          size={28}
        />
      )}
      <div className="fcard__main">
        <div className="fcard__head">
          <span className="fcard__name">{row.name}</span>
          <span className={`fcard__label${layer?.kind === "clip" ? " fcard__label--video" : ""}`}>
            · {layer?.kind === "clip" ? "VIDEO" : layer?.label}
          </span>
          {many && (
            <span className="fcard__count num">
              {at + 1}/{n}
            </span>
          )}
        </div>
        <div className="fcard__body">
          {layer?.kind === "clip" ? (
            <div className="fcard__clip">
              <button
                type="button"
                className="fcard__play"
                aria-label={`Play: ${layer.clip.title}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onPlayClip(layer.clip.id);
                }}
              >
                <svg width="7" height="8" viewBox="0 0 8 9" aria-hidden="true">
                  <path d="M0 0L8 4.5L0 9Z" fill="#fff" />
                </svg>
              </button>
              <span className="fcard__clip-title" title={layer.clip.title}>
                {layer.clip.title}
              </span>
              <span className="fcard__line fcard__line--muted num">{clipLine3(layer.clip, row)}</span>
            </div>
          ) : layer != null ? (
            <>
              <div className="fcard__line num">{layer.lines[0]}</div>
              <div className="fcard__line fcard__line--muted num">{layer.lines[1]}</div>
            </>
          ) : null}
        </div>
      </div>
      {many && (
        <>
          <span className="fcard__edge-hit" onClick={(e) => e.stopPropagation()}>
            <EdgeButton edge="left" self thickness={24} ariaLabel={`Previous view for ${row.name}`} onClick={() => setStep((s) => s - 1)} />
          </span>
          <span className="fcard__edge-hit fcard__edge-hit--right" onClick={(e) => e.stopPropagation()}>
            <EdgeButton edge="right" self thickness={24} ariaLabel={`Next view for ${row.name}`} onClick={() => setStep((s) => s + 1)} />
          </span>
        </>
      )}
    </div>
  );
}
