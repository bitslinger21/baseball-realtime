// "Autoplay video" preference (Settings). Covers every in-app player: game
// view clips and the postseason drawer's recaps. On by default — the
// behavior both had before this was a setting.
const AUTOPLAY_VIDEO_STORAGE_KEY = "br-autoplay-video";

export function getAutoplayVideo(): boolean {
  try {
    return window.localStorage.getItem(AUTOPLAY_VIDEO_STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setAutoplayVideo(on: boolean): void {
  try {
    window.localStorage.setItem(AUTOPLAY_VIDEO_STORAGE_KEY, on ? "on" : "off");
  } catch {
    // ignore — falls back to the default
  }
}
