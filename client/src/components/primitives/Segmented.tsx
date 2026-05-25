import './Segmented.css';

interface SegmentedProps {
  items: string[];
  active?: number;
  onClick?: (index: number) => void;
  size?: 'md' | 'sm';
  className?: string;
}

export function Segmented({ items, active = 0, onClick, size = 'md', className }: SegmentedProps) {
  return (
    <div className={`segmented${className ? ` ${className}` : ''}`}>
      {items.map((item, i) => (
        <button
          key={item}
          className={`segmented__btn segmented__btn--${size}${i === active ? ' segmented__btn--active' : ''}`}
          onClick={() => onClick?.(i)}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
