import type { ReactElement } from "react";
import { Card } from "../../components/primitives/Card";
import { Pill } from "../../components/primitives/Pill";
import "./LeverageCard.css";

interface LeverageCardProps {
  current: number;
  peak: number;
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

const MAX_LEV = 3.5;
const AVG_LEV = 1.0;

export function LeverageCard({ current, peak }: LeverageCardProps): ReactElement {
  const clampedCur = Math.min(current, MAX_LEV);
  const clampedPeak = Math.min(peak, MAX_LEV);
  const pct = (v: number) => (v / MAX_LEV) * 100;
  const tone = leverageTone(current);
  const label = leverageLabel(current);

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
        <p className="lev__desc">
          How much this moment can swing the outcome vs. an average play.
        </p>

        <div className="lev__scale">
          <div className="lev__track">
            <div className="lev__fill" style={{ width: `${pct(clampedCur)}%` }} />
            <div className="lev__avg-marker" style={{ left: `${pct(AVG_LEV)}%` }} />
          </div>
          <div className="lev__labels">
            <span>0</span>
            <span className="lev__avg-label">avg 1.0</span>
            <span>peak today {clampedPeak.toFixed(1)}</span>
            <span>{MAX_LEV}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
