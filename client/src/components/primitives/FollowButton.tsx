import { useState } from "react";
import type { ReactElement } from "react";
import { follow, isFollowing, unfollow, useFollowing, MAX_FOLLOWED } from "../../utils/following";
import "./FollowButton.css";

interface FollowButtonProps {
  kind: "team" | "player";
  id: string;
  name: string;
}

// The follow gesture (PROMPT_home_page.md §6.4). A star icon was rejected —
// the word says what happens, and the followed state must be readable at a
// glance. Hover swaps "Following" to "Unfollow" so the destructive action is
// never a surprise click.
export function FollowButton({ kind, id, name }: FollowButtonProps): ReactElement {
  const list = useFollowing();
  const [hover, setHover] = useState(false);
  const following = isFollowing(kind, id);
  const atCap = !following && list.length >= MAX_FOLLOWED;

  const label = following ? (hover ? "Unfollow" : "Following") : "+ Follow";

  return (
    <button
      type="button"
      className={`follow-btn${following ? " follow-btn--following" : ""}${hover && following ? " follow-btn--unfollow" : ""}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      disabled={atCap}
      title={atCap ? "You're following eight — remove one to add another" : undefined}
      onClick={() => (following ? unfollow(kind, id) : follow({ kind, id, name }))}
    >
      {label}
    </button>
  );
}
