import './Tabs.css';
import type { ReactElement } from 'react';

interface TabsProps {
  items: string[];
  active?: number;
  onClick?: (index: number) => void;
}

export function Tabs({ items, active = 0, onClick }: TabsProps): ReactElement {
  return (
    <div className="tabs" role="tablist">
      {items.map((item, i) => (
        <button
          key={item}
          type="button"
          role="tab"
          aria-selected={i === active}
          className={`tabs__btn${i === active ? ' tabs__btn--active' : ''}`}
          onClick={() => onClick?.(i)}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
