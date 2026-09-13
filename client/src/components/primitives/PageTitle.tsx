import './PageTitle.css';

interface ReturnTo {
  label: string;
  onClick: () => void;
}

interface PageTitleProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  subtitleRight?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
  /** The contextual "← label" return line, rendered above the h1. Present
   * only when the previous screen was a specific instance (a game/team/
   * player), never when it was a nav destination — see utils/backLabel.ts. */
  returnTo?: ReturnTo;
}

// Page header — owned by each page, two rows: h1 (+ status) on top,
// eyebrow/context text (+ controls) below. The wordmark/nav/hamburger live
// one level up in BrandHeader, mounted once per page above this; the
// contextual return (when present) lives here instead, above the h1.
export function PageTitle({ title, subtitle, subtitleRight, right, className, returnTo }: PageTitleProps) {
  return (
    <div className={`page-title-row${returnTo ? ' page-title-row--has-return' : ''}${className ? ` ${className}` : ''}`}>
      {returnTo && (
        <button type="button" className="page-title-row__return" onClick={returnTo.onClick}>
          ← {returnTo.label}
        </button>
      )}
      <div className="page-title-row__main">
        <h1 className="page-title-row__heading">{title}</h1>
        {right && <div className="page-title-row__right">{right}</div>}
      </div>
      {(subtitle || subtitleRight) && (
        <div className="page-title-row__bottom">
          {subtitle && <div className="page-title-row__subtitle">{subtitle}</div>}
          {subtitleRight && <div className="page-title-row__subtitle-right">{subtitleRight}</div>}
        </div>
      )}
    </div>
  );
}
