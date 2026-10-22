import { useSyncExternalStore } from "react";

// The one reduced-motion setting for JS timing (PROMPT_scorecard_transition §3).
// CSS reads the same media query in styles/motion.css; keep the two in step.
const QUERY = "(prefers-reduced-motion: reduce)";

function mediaQuery(): MediaQueryList | null {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia(QUERY)
    : null;
}

/** Read the setting once, for code outside React (animation callbacks). */
export function prefersReducedMotion(): boolean {
  return mediaQuery()?.matches === true;
}

function subscribe(onChange: () => void): () => void {
  const mq = mediaQuery();
  if (mq == null) return () => {};
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/** The setting as state: re-renders when the user flips it while the page is open. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, prefersReducedMotion, () => false);
}
