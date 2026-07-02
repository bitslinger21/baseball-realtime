import "./NarrationStrip.css";

interface NarrationStripProps {
  narration: string | null;
}

export function NarrationStrip({ narration }: NarrationStripProps) {
  if (narration === null) return null;

  return (
    <div className="narration-strip">
      <span className="narration-strip__label">📻</span>
      <span className="narration-strip__text">{narration}</span>
    </div>
  );
}
