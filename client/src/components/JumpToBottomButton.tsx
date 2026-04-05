import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactElement,
  type RefObject,
} from "react";

type Props = {
  containerRef: RefObject<HTMLDivElement | null>;
  anchorRef?: RefObject<HTMLElement | HTMLDivElement | null>;
};

type FloatingPosition = {
  left: number;
  top: number;
};

const BASE_BUTTON_STYLE: CSSProperties = {
  width: "32px",
  height: "32px",
  minWidth: "32px",
  minHeight: "32px",
  maxWidth: "32px",
  maxHeight: "32px",
  padding: 0,
  borderRadius: "9999px",
  border: "none",
  boxSizing: "border-box",
  background: "rgba(0, 0, 0, 0.72)",
  color: "white",
  fontSize: "16px",
  lineHeight: 1,
  cursor: "pointer",
  boxShadow: "0 2px 6px rgba(0, 0, 0, 0.2)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  appearance: "none",
  WebkitAppearance: "none",
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function JumpToBottomButton({ containerRef, anchorRef }: Props): ReactElement | null {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState<FloatingPosition | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function updateVisibility(): void {
      const currentEl = containerRef.current;
      if (!currentEl) return;

      const canScroll = currentEl.scrollHeight > currentEl.clientHeight + 1;
      const threshold = 40;
      const distanceFromBottom =
        currentEl.scrollHeight - currentEl.scrollTop - currentEl.clientHeight;

      setVisible(canScroll && distanceFromBottom > threshold);
    }

    const resizeObserver = new ResizeObserver((): void => {
      updateVisibility();
    });

    resizeObserver.observe(el);

    const firstChild = el.firstElementChild;
    if (firstChild instanceof HTMLElement) {
      resizeObserver.observe(firstChild);
    }

    el.addEventListener("scroll", updateVisibility);
    window.addEventListener("resize", updateVisibility);
    updateVisibility();

    return () => {
      resizeObserver.disconnect();
      el.removeEventListener("scroll", updateVisibility);
      window.removeEventListener("resize", updateVisibility);
    };
  }, [containerRef]);

  useEffect(() => {
    function updatePosition(): void {
      const anchorEl = anchorRef?.current;
      if (!anchorEl) {
        setPosition(null);
        return;
      }

      const rect = anchorEl.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const buttonSize = 32;
      const gutterInset = 0;
      const bottomInset = 20;

      const left = clamp(rect.left + gutterInset, 8, viewportWidth - buttonSize - 8);
      const top = clamp(
        Math.min(rect.bottom - buttonSize - bottomInset, viewportHeight - buttonSize - 8),
        Math.max(8, rect.top + 8),
        viewportHeight - buttonSize - 8,
      );

      setPosition({ left, top });
    }

    updatePosition();

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    const anchorEl = anchorRef?.current;
    let resizeObserver: ResizeObserver | null = null;
    if (anchorEl instanceof HTMLElement) {
      resizeObserver = new ResizeObserver((): void => {
        updatePosition();
      });
      resizeObserver.observe(anchorEl);
    }

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      resizeObserver?.disconnect();
    };
  }, [anchorRef]);

  function scrollToBottom(event: MouseEvent<HTMLButtonElement>): void {
    event.preventDefault();
    event.stopPropagation();

    const el = containerRef.current;
    if (!el) return;

    el.scrollTo({
      top: el.scrollHeight,
      behavior: "smooth",
    });
  }

  const fixedStyle = useMemo<CSSProperties | null>(() => {
    if (position == null) return null;

    return {
      ...BASE_BUTTON_STYLE,
      position: "fixed",
      left: `${position.left}px`,
      top: `${position.top}px`,
      zIndex: 60,
    };
  }, [position]);

  if (!visible || fixedStyle == null) return null;

  return (
    <button
      type="button"
      className="jump-to-bottom"
      style={fixedStyle}
      onClick={scrollToBottom}
      onMouseDown={(event): void => {
        event.preventDefault();
        event.stopPropagation();
      }}
      title="Jump to latest"
      aria-label="Jump to latest"
    >
      <span style={{ fontSize: 18, transform: "translateY(-1px)" }}>↓</span>
    </button>
  );
}