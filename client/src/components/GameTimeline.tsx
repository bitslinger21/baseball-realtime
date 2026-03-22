// client/src/components/GameTimeline.tsx
import "./GameTimeline.css";
import type { ReactElement } from "react";
import { useMemo, useState } from "react";
import {
  getBatterAnchorIdFromKey,
  getInningAnchorIdFromKey,
  getPlayRenderKey,
} from "../realtime/playIds";
import type { PlayUpdate } from "../realtime/types";

type MarkerKind = "inning" | "score";

type Marker = {
  key: string;
  kind: MarkerKind;
  label: string;
  renderIndex: number; // index into reversed list (newest-first)
  jumpTargetId: string;
};

function normalizeHalf(h: unknown): "top" | "bottom" {
  const v = String(h ?? "").toLowerCase();
  return v === "top" ? "top" : "bottom";
}

function scoreOf(u: PlayUpdate): { away: number; home: number } {
  const away: number = typeof (u as any).awayScore === "number" ? (u as any).awayScore : 0;
  const home: number = typeof (u as any).homeScore === "number" ? (u as any).homeScore : 0;
  return { away, home };
}

function getBatterAnchorSourceKey(
  items: readonly PlayUpdate[],
  index: number,
): string {
  const u = items[index];
  let sourceIndex = index;
  const currHalf = normalizeHalf((u as any).half);
  const currBatter = (u as any).batterName ?? "";

  while (sourceIndex > 0) {
    const candidatePrev = items[sourceIndex - 1];
    const candidateHalf = normalizeHalf((candidatePrev as any).half);
    const candidateBatter = (candidatePrev as any).batterName ?? "";

    if ((candidatePrev as any).inning !== (u as any).inning || candidateHalf !== currHalf) {
      break;
    }

    if (candidateBatter !== currBatter) {
      break;
    }

    sourceIndex -= 1;
  }

  return getPlayRenderKey(items[sourceIndex], sourceIndex);
}

export function GameTimeline(props: {
  updates: readonly PlayUpdate[];
  onJump: (targetId: string) => void;
}): ReactElement {
  const { updates, onJump } = props;

  // Must match PitchByPitchFeed’s render order: newest first
  const items: readonly PlayUpdate[] = useMemo(() => [...updates].reverse(), [updates]);

  const markers: readonly Marker[] = useMemo(() => {
    if (items.length < 2) return [];

    const out: Marker[] = [];

    for (let i = 0; i < items.length; i += 1) {
      const u = items[i];
      const prev = i > 0 ? items[i - 1] : undefined;
      const playRenderKey: string = getPlayRenderKey(u, i);

      const half = normalizeHalf((u as any).half);
      const prevHalf = prev ? normalizeHalf((prev as any).half) : null;

      const inningChanged: boolean =
        i === 0 ||
        prev == null ||
        (prev as any).inning !== (u as any).inning ||
        prevHalf !== half;

      const sc = scoreOf(u);
      const psc = prev ? scoreOf(prev) : null;

      const scoreChanged: boolean =
        psc == null || psc.away !== sc.away || psc.home !== sc.home;

      if (inningChanged) {
        const caret = half === "top" ? "▲" : "▼";
        const inn: number = typeof (u as any).inning === "number" ? (u as any).inning : 0;

        out.push({
          key: `inn:${i}`,
          kind: "inning",
          label: `${caret}${inn}`,
          renderIndex: i,
          jumpTargetId: getInningAnchorIdFromKey(playRenderKey),
        });
        continue;
      }

      if (scoreChanged && prev != null) {
        const scoringRenderIndex = i - 1;
        const scoringPlay = items[scoringRenderIndex];
        const scoringScore = scoreOf(scoringPlay);
        const scoringBatterAnchorKey = getBatterAnchorSourceKey(items, scoringRenderIndex);

        out.push({
          key: `sc:${i}`,
          kind: "score",
          label: `${scoringScore.away}-${scoringScore.home}`,
          renderIndex: scoringRenderIndex,
          jumpTargetId: getBatterAnchorIdFromKey(scoringBatterAnchorKey),
        });
      }
    }

    return out.slice(0, 30);
  }, [items]);

  const [activeKey, setActiveKey] = useState<string | null>(null);

  const denom: number = Math.max(1, items.length - 1);

  return (
    <div className="gt-root" aria-label="Game timeline">
      <div
        className="gt-bar"
        style={{
          position: "relative",
          width: "100%",
          height: "10px",
          borderRadius: "999px",
          background: "rgba(0, 0, 0, 0.10)",
          border: "1px solid rgba(0, 0, 0, 0.18)",
          overflow: "visible",
        }}
      >
        {markers.map((m) => {
          const pct: number = (denom - m.renderIndex) / denom;

          return (
            <button
              key={m.key}
              type="button"
              className={`gt-tick ${m.kind} ${activeKey === m.key ? "is-active" : ""}`.trim()}
              style={{
                position: "absolute",
                left: `${pct * 100}%`,
                top: m.kind === "score" ? "32%" : "50%",
                transform: "translate(-50%, -50%)",
                width: "18px",
                height: "18px",
                border: 0,
                background: "transparent",
                padding: 0,
                cursor: "pointer",
              }}
              title={m.kind === "inning" ? `Inning ${m.label}` : `Score ${m.label}`}
              onClick={() => {
                setActiveKey(m.key);
                onJump(m.jumpTargetId);
              }}
            >
              <span
                className="gt-dot"
                style={{
                  display: "block",
                  width: activeKey === m.key ? "10px" : "8px",
                  height: activeKey === m.key ? "10px" : "8px",
                  borderRadius: m.kind === "inning" ? "1px" : "999px",
                  background:
                    m.kind === "score"
                      ? "rgba(34, 197, 94, 0.95)"
                      : "rgba(59, 130, 246, 0.95)",
                  boxShadow: "0 0 0 1px rgba(0, 0, 0, 0.15)",
                  margin: "0 auto",
                }}
              />
            </button>
          );
        })}
      </div>

      <div className="gt-legend">
        <span className="gt-legend-item">
          <span
            className="gt-legend-dot inning"
            style={{
              background: "rgba(59, 130, 246, 0.95)",
              boxShadow: "0 0 0 1px rgba(0, 0, 0, 0.15)",
            }}
          />
          Inning change
        </span>

        <span className="gt-legend-item">
          <span
            className="gt-legend-dot"
            style={{
              background: "rgba(34, 197, 94, 0.95)",
              boxShadow: "0 0 0 1px rgba(0, 0, 0, 0.15)",
            }}
          />
          Run scored
        </span>
      </div>
    </div>
  );
}
