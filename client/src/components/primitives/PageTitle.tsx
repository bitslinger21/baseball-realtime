import './PageTitle.css';

interface PageTitleProps {
  title: React.ReactNode;
  eyebrow?: React.ReactNode;
  subtitle?: React.ReactNode;
  subtitleRight?: React.ReactNode;
  right?: React.ReactNode;
  navMenu?: React.ReactNode;
  className?: string;
}

export function PageTitle({ title, eyebrow, subtitle, subtitleRight, right, navMenu, className }: PageTitleProps) {
  return (
    <div className={`page-title-row${className ? ` ${className}` : ''}`}>
      {(eyebrow || subtitleRight) && (
        <div className="page-title-row__top">
          {eyebrow && <div className="page-title-row__eyebrow">{eyebrow}</div>}
          {subtitleRight && <div className="page-title-row__subtitle-right">{subtitleRight}</div>}
        </div>
      )}
      <div className="page-title-row__main">
        <div className="page-title-row__title-group">
          {navMenu}
          <h1 className="page-title-row__heading">{title}</h1>
        </div>
        {right && <div className="page-title-row__right">{right}</div>}
      </div>
      {subtitle && <div className="page-title-row__subtitle">{subtitle}</div>}
    </div>
  );
}
