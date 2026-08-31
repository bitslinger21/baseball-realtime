import './PageTitle.css';

interface PageTitleProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  subtitleRight?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}

// Page header — owned by each page, two rows: h1 (+ status) on top,
// eyebrow/context text (+ controls) below. The wordmark/back/hamburger live
// one level up in BrandHeader, mounted once per page above this.
export function PageTitle({ title, subtitle, subtitleRight, right, className }: PageTitleProps) {
  return (
    <div className={`page-title-row${className ? ` ${className}` : ''}`}>
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
