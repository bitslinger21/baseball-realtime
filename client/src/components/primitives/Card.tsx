import './Card.css';

interface CardProps {
  children: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  padless?: boolean;
  className?: string;
}

export function Card({ children, title, subtitle, action, padless, className }: CardProps) {
  return (
    <div className={`card${className ? ` ${className}` : ''}`}>
      {(title || action) && (
        <div className="card__header">
          <div>
            <div className="card__title">{title}</div>
            {subtitle && <div className="card__subtitle">{subtitle}</div>}
          </div>
          {action}
        </div>
      )}
      <div className={`card__body${padless ? ' card__body--padless' : ''}`}>
        {children}
      </div>
    </div>
  );
}
