const PITCH_COLORS: Record<string, string> = {
  FF: "#e53e3e", // 4-Seam Fastball
  SI: "#c53030", // Sinker
  FC: "#e57c3e", // Cutter
  SL: "#38a169", // Slider
  CU: "#805ad5", // Curveball
  KC: "#6b46c1", // Knuckle Curve
  CH: "#3182ce", // Changeup
  FS: "#0987a0", // Splitter
  KN: "#718096", // Knuckleball
  EP: "#b7791f", // Eephus
};

const FALLBACK_COLOR = "#a0aec0";

export function getPitchColor(code: string | undefined): string {
  if (code == null) return FALLBACK_COLOR;
  return PITCH_COLORS[code.toUpperCase()] ?? FALLBACK_COLOR;
}

export function getPitchColorMuted(code: string | undefined): string {
  const base = getPitchColor(code);
  return base + "26"; // 15% opacity as hex8 alpha
}
