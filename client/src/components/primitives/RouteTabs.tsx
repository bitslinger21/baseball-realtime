import { Link } from 'react-router-dom';
import type { ReactElement } from 'react';
import './RouteTabs.css';

interface RouteTabItem {
  label: string;
  to: string;
}

interface RouteTabsProps {
  items: RouteTabItem[];
  activeIndex: number;
}

/**
 * A tab strip that navigates between real routes rather than switching local
 * state — same visual language as the shared `Tabs` component (which is for
 * in-page tabs), for the case where each "tab" is actually its own page
 * (e.g. a team's Overview vs Schedule). Active tab: ink text, rust underline.
 */
export function RouteTabs({ items, activeIndex }: RouteTabsProps): ReactElement {
  return (
    <div className="route-tabs" role="tablist">
      {items.map((item, i) => (
        <Link
          key={item.label}
          to={item.to}
          role="tab"
          aria-current={i === activeIndex ? 'page' : undefined}
          className={`route-tabs__item${i === activeIndex ? ' route-tabs__item--active' : ''}`}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
