// Convert MLB innings-pitched string (decimal thirds: "5.1", "5.2", "3.0")
// to display form: "5 1/3", "5 2/3", "3". Even innings drop the fraction.
export function formatIP(ip: string | null | undefined): string {
  if (ip == null || ip === "—") return "—";
  const dot = ip.indexOf(".");
  if (dot === -1) return ip;
  const whole = parseInt(ip.slice(0, dot), 10);
  const frac = parseInt(ip.slice(dot + 1), 10);
  if (isNaN(whole)) return ip;
  if (frac === 1) return `${whole} 1/3`;
  if (frac === 2) return `${whole} 2/3`;
  return String(whole);
}
