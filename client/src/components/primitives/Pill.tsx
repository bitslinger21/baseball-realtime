import './Pill.css';

export type PillTone = 'neutral' | 'soft' | 'ink' | 'accent' | 'positive' | 'info' | 'highlight' | 'live';

interface PillProps {
  children: React.ReactNode;
  tone?: PillTone;
  className?: string;
}

export function Pill({ children, tone = 'neutral', className }: PillProps) {
  return (
    <span className={`pill pill--${tone}${className ? ` ${className}` : ''}`}>
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
