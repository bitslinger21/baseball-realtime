// client/src/components/PitchByPitchFeed.tsx
import type { ReactElement } from "react";
import { Fragment } from "react";
import type { PlayUpdate } from "../realtime/types";
import "./PitchByPitchFeed.css";
import {
  getBatterAnchorId,
  getInningAnchorId,
  getPlayAnchorId,
  getPlayRenderKey,
} from "../realtime/playIds";

function normalizeHalf(h: unknown): "top" | "bottom" {
  const v = String(h ?? "").toLowerCase();
  return v === "top" ? "top" : "bottom";
}

export function PitchByPitchFeed(props: {
  updates: readonly PlayUpdate[];
}): ReactElement {
  const { updates } = props;

  // Newest first
  const items: readonly PlayUpdate[] = [...updates].reverse();

  return (
    <ul className="live-feed-list">
      {items.map((u: PlayUpdate, index: number, arr: readonly PlayUpdate[]) => {
        const prev: PlayUpdate | undefined = arr[index - 1];

        const currHalf: "top" | "bottom" = normalizeHalf(u.half);
        const prevHalf: "top" | "bottom" | null = prev ? normalizeHalf(prev.half) : null;

        const inningChanged: boolean =
          index === 0 ||
          prev == null ||
          prev.inning !== u.inning ||
          prevHalf !== currHalf;

        const prevBatter: string = prev?.batterName ?? "";
        const currBatter: string = u.batterName ?? "";

        const batterChanged: boolean = inningChanged || prevBatter !== currBatter;

        const halfLabel: string = currHalf === "top" ? "Top" : "Bottom";
        const inningLabel: string = `${halfLabel} ${u.inning}`;

        const playRenderKey: string = getPlayRenderKey(u, index);
        const playAnchorId: string = getPlayAnchorId(u, index);
        const inningAnchorId: string = getInningAnchorId(u, index);
        const batterAnchorSourceIndex: number = (() => {
          let sourceIndex = index;

          while (sourceIndex > 0) {
            const candidatePrev = arr[sourceIndex - 1];
            const candidateHalf = normalizeHalf(candidatePrev.half);

            if (candidatePrev.inning !== u.inning || candidateHalf !== currHalf) {
              break;
            }

            if ((candidatePrev.batterName ?? "") !== currBatter) {
              break;
            }

            sourceIndex -= 1;
          }

          return sourceIndex;
        })();
        const batterAnchorIdForPlay: string = getBatterAnchorId(u, batterAnchorSourceIndex);

        return (
          <Fragment key={playRenderKey}>
            {inningChanged && (
              <li id={inningAnchorId} className="feed-inning">
                {inningLabel}
              </li>
            )}

            {batterChanged && (
              <li id={batterAnchorIdForPlay} className="feed-batter">
                {u.batterName ?? "Unknown Batter"}
              </li>
            )}

            <li
              id={playAnchorId}
              className={`feed-pitch ${index === 0 ? "latest-play" : ""}`.trim()}
            >
              <span className="feed-pitch-text">{u.description ?? "—"}</span>
              <span className="feed-pitch-count">
                {u.balls}-{u.strikes}
              </span>
            </li>
          </Fragment>
        );
      })}
    </ul>
  );
}