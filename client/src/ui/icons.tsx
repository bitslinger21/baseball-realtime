import type { ReactElement } from "react";

type IconProps = {
  size?: number;
};

export function RadioIcon({ size = 20 }: IconProps): ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      fill="currentColor"
    >
      <path d="M12 18a2 2 0 1 0 .001-4.001A2 2 0 0 0 12 18Zm-6.364-1.636a9 9 0 0 1 0-8.728l1.732 1a7 7 0 0 0 0 6.728l-1.732 1Zm12.728 0-1.732-1a7 7 0 0 0 0-6.728l1.732-1a9 9 0 0 1 0 8.728ZM8.2 13.8a4.5 4.5 0 0 1 0-3.6l1.732 1a2.5 2.5 0 0 0 0 1.6l-1.732 1Zm7.6 0-1.732-1a2.5 2.5 0 0 0 0-1.6l1.732-1a4.5 4.5 0 0 1 0 3.6Z" />
    </svg>
  );
}

export function ExternalLinkIcon({ size = 20 }: IconProps): ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      fill="currentColor"
    >
      <path d="M14 3h7v7h-2V6.41l-9.29 9.3-1.42-1.42 9.3-9.29H14V3ZM5 5h6v2H7v10h10v-4h2v6H5V5Z" />
    </svg>
  );
}
