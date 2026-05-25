import './Stat.css';

export type StatSize = 'hero' | 'md' | 'sm';

interface StatProps {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  size?: StatSize;
  accent?: string;
  trend?: number;
  align?: 'left' | 'right' | 'center';
  className?: string;
}

export function Stat({ label, value, sub, size = 'md', accent, trend, align = 'left', className }: StatProps) {
  const trendClass = trend === undefined ? '' : trend > 0 ? 'stat__trend--up' : trend < 0 ? 'stat__trend--down' : 'stat__trend--flat';
  const trendIcon = trend === undefined ? '' : trend > 0 ? '▲' : trend < 0 ? '▼' : '·';

  return (
    <div className={`stat stat--${align}${className ? ` ${className}` : ''}`}>
      <span className="stat__label">{label}</span>
      <div
        className={`stat__value stat__value--${size}`}
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </div>
      {(sub !== undefined || trend !== undefined) && (
        <div className={`stat__sub${align === 'right' ? ' stat__sub--right' : ''}`}>
          {trend !== undefined && (
            <span className={`stat__trend ${trendClass}`} style={{ fontSize: size === 'hero' ? 12 : size === 'md' ? 11 : 10 }}>
              {trendIcon} {Math.abs(trend)}
            </span>
          )}
          {sub !== undefined && (
            <span className={`stat__sub-text stat__sub-text--${size}`}>{sub}</span>
          )}
        </div>
      )}
    </div>
  );
}

export function StatBlock(props: StatProps) {
  return (
    <div className="stat-block">
      <Stat {...props} />
    </div>
  );
}
