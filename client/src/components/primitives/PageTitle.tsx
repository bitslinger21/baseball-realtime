import './PageTitle.css';
import { LogoLockup } from '../LogoLockup';

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
      {eyebrow && (
        <div className="page-title-row__top">
          <div className="page-title-row__eyebrow">{eyebrow}</div>
        </div>
      )}
      <div className="page-title-row__main">
        <div className="page-title-row__title-group">
          {navMenu}
          <div className="page-title-row__brand"><LogoLockup variant="allcaps" /></div>
          <h1 className="page-title-row__heading">{title}</h1>
        </div>
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
