import './StatInfo.css';
import { useState, useEffect, useRef } from 'react';
import type { ReactElement } from 'react';

export interface StatInfoProps {
  title: string;
  body: string;
  scale?: string;
}

export function StatInfo({ title, body, scale }: StatInfoProps): ReactElement {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const show = open || hover;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <span
      ref={ref}
      className="si"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <button
        type="button"
        aria-label={`What is ${title}?`}
        className={`si__btn${show ? ' si__btn--active' : ''}`}
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
      >
        ?
      </button>
      {show && (
        <span role="tooltip" className="si__tip">
          <span className="si__tip-title">{title}</span>
          <span className="si__tip-body">{body}</span>
          {scale && <span className="si__tip-scale">{scale}</span>}
          <span className="si__tip-arrow" />
        </span>
      )}
    </span>
  );
}
