import './PageTitle.css';

interface PageTitleProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}

export function PageTitle({ title, subtitle, right, className }: PageTitleProps) {
  return (
    <div className={`page-title-row${className ? ` ${className}` : ''}`}>
      <div className="page-title-row__left">
        <h1 className="page-title-row__heading">{title}</h1>
        {subtitle && <div className="page-title-row__subtitle">{subtitle}</div>}
      </div>
      {right && <div className="page-title-row__right">{right}</div>}
    </div>
  );
}
