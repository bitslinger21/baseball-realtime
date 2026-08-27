import { Segmented } from '../../components/primitives/Segmented';
import './FilterStrip.css';

export type Filter = 'all' | 'live' | 'final' | 'upcoming';

interface FilterStripProps {
  filter: Filter;
  onChange: (f: Filter) => void;
  counts: { live: number; final: number; upcoming: number };
}

const FILTERS: Filter[] = ['all', 'live', 'final', 'upcoming'];

export function FilterStrip({ filter, onChange, counts }: FilterStripProps) {
  const items = [
    'All',
    `Live · ${counts.live}`,
    `Final · ${counts.final}`,
    `Upcoming · ${counts.upcoming}`,
  ];
  const activeIdx = FILTERS.indexOf(filter);

  return (
    <div className="filter-strip">
      <Segmented items={items} active={activeIdx} onClick={(i) => onChange(FILTERS[i])} size="sm" />
    </div>
  );
}
