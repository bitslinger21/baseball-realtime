import { useEffect, useRef } from "react";
import "./NarrationStrip.css";

interface NarrationStripProps {
  narration: string | null;
}

export function NarrationStrip({ narration }: NarrationStripProps) {
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (narration === null) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(narration);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utteranceRef.current = utterance;

    window.speechSynthesis.speak(utterance);

    return () => {
      window.speechSynthesis.cancel();
    };
  }, [narration]);

  if (narration === null) return null;

  return (
    <div className="narration-strip">
      <span className="narration-strip__label">📻</span>
      <span className="narration-strip__text">{narration}</span>
    </div>
  );
}
