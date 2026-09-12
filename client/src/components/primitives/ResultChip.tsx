import './ResultChip.css';
import type { CSSProperties } from 'react';

export type ResultChipVariant = 'pill' | 'circle';

interface ResultChipProps {
  result: 'W' | 'L';
  /** Text to display — defaults to the bare letter. Pass e.g. "W3" for a streak. */
  label?: string;
  variant?: ResultChipVariant;
  className?: string;
  style?: CSSProperties;
}

/**
 * The one win/loss result chip. Pale tinted background, coloured letter, 1px
 * border in the letter colour at 20% opacity. Two shapes, same colours —
 * `pill` for inline use (schedule result cell, player last-5, player history,
 * standings streak), `circle` for the team-page Recent form row, where chips
 * sit above a chart and must line up. See PROMPT_consistency_pass.md §1.
 */
export function ResultChip({ result, label, variant = 'pill', className, style }: ResultChipProps) {
  const isWin = result === 'W';
  return (
    <span
      className={`result-chip result-chip--${variant} ${isWin ? 'result-chip--win' : 'result-chip--loss'}${className ? ` ${className}` : ''}`}
      style={style}
    >
      {label ?? result}
    </span>
  );
}
