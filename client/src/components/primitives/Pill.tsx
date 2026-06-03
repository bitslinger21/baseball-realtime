import './Pill.css';
import type { CSSProperties } from 'react';

export type PillTone = 'neutral' | 'soft' | 'ink' | 'accent' | 'positive' | 'info' | 'highlight' | 'live';

interface PillProps {
  children: React.ReactNode;
  tone?: PillTone;
  className?: string;
  style?: CSSProperties;
}

export function Pill({ children, tone = 'neutral', className, style }: PillProps) {
  return (
    <span className={`pill pill--${tone}${className ? ` ${className}` : ''}`} style={style}>
      {children}
    </span>
  );
}

interface LivePillProps {
  label?: string;
}

export function LivePill({ label = 'LIVE' }: LivePillProps) {
  return (
    <span className="pill pill--live">
      <span className="pill__live-dot" />
      <span className="pill__live-label">{label}</span>
    </span>
  );
}
