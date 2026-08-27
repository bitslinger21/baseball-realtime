import type { ReactElement } from "react";
import { Card } from "../../components/primitives/Card";
import { Pill } from "../../components/primitives/Pill";
import "./LeverageCard.css";

interface GameSituation {
  bases: { on1?: boolean; on2?: boolean; on3?: boolean };
  outs: number;
}

interface LeverageCardProps {
  current: number;
  peak: number;
  situation?: GameSituation | null;
}

function leverageTone(value: number): "accent" | "info" | "soft" {
  if (value >= 2.0) return "accent";
  if (value >= 1.0) return "info";
  return "soft";
}

function leverageLabel(value: number): string {
  if (value >= 2.0) return "HIGH";
  if (value >= 1.0) return "MED";
  return "LOW";
}

function buildSituationText(sit: GameSituation): string {
  const on: string[] = [];
  if (sit.bases.on1) on.push("1st");
  if (sit.bases.on2) on.push("2nd");
  if (sit.bases.on3) on.push("3rd");

  const runnerPart =
    on.length === 0
      ? "Bases empty"
      : `Runner${on.length > 1 ? "s" : ""} on ${on.join(" & ")}`;

  const outsPart = `${sit.outs} out${sit.outs !== 1 ? "s" : ""}`;
  return `${runnerPart}, ${outsPart}.`;
}

const AVG_LEV = 1.0;

export function LeverageCard({ current, peak, situation }: LeverageCardProps): ReactElement {
  const maxLev = Math.max(3.5, peak);
  const clampedCur = Math.min(current, maxLev);
  const clampedPeak = Math.min(peak, maxLev);
  const pct = (v: number) => (v / maxLev) * 100;
  const tone = leverageTone(current);
  const label = leverageLabel(current);
  const contextText = situation != null ? buildSituationText(situation) : null;

  return (
    <Card padless>
      <div className="lev__header">
        <span className="lev__eyebrow">Leverage index</span>
      </div>
      <div className="lev__body">
        <div className="lev__value-row">
          <span className="lev__value">{current.toFixed(1)}×</span>
          <Pill tone={tone}>{label}</Pill>
        </div>
        <p className="lev__explanation">How much this moment can swing the outcome vs. an average play.</p>
        {contextText != null && (
          <p className="lev__desc">{contextText}</p>
        )}

        <div className="lev__scale">
          <div className="lev__track">
            <div className="lev__fill" style={{ width: `${pct(clampedCur)}%` }} />
            <div className="lev__avg-marker" style={{ left: `${pct(AVG_LEV)}%` }} />
          </div>
          <div className="lev__labels">
            <span>0</span>
            <span className="lev__avg-label">avg 1.0</span>
            <span>peak today {clampedPeak.toFixed(1)}</span>
            <span>{maxLev.toFixed(1)}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
