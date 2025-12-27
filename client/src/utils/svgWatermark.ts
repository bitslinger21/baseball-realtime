// client/src/utils/svgWatermark.ts

export type WatermarkMonoColor = "white" | "black";

/**
 * Fetch an SVG from `url`, strip existing fill/stroke styles, and force it to a single color.
 * Returns a data URI suitable for <img src="...">.
 *
 * If the fetched asset is not an SVG (e.g., PNG/JPG), we return the original URL.
 */
export async function svgToMonochromeDataUri(
  url: string,
  color: WatermarkMonoColor | string = "white",
): Promise<string> {
  const res: Response = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch logo (${res.status}) from ${url}`);
  }

  const contentType: string = (res.headers.get("content-type") ?? "").toLowerCase();
  const looksLikeSvg: boolean =
    contentType.includes("image/svg") || url.toLowerCase().includes(".svg");

  // If it isn't an SVG, don't try to parse/rewrite it.
  if (!looksLikeSvg) {
    return url;
  }

  const svgText: string = await res.text();

  // Strip BOM / XML prolog / doctype (common in some feeds)
  const cleaned: string = svgText
    .replace(/^\uFEFF/, "")
    .replace(/<\?xml[^>]*\?>\s*/gi, "")
    .replace(/<!DOCTYPE[^>]*>\s*/gi, "");

  // Remove explicit fill/stroke and fill/stroke in inline style attributes
  const mono: string = cleaned
    .replace(/\sfill="[^"]*"/gi, "")
    .replace(/\sstroke="[^"]*"/gi, "")
    .replace(/\sstyle="([^"]*)"/gi, (_m: string, s: string) => {
      const next = s
        .replace(/(^|;)\s*fill\s*:[^;]*/gi, "")
        .replace(/(^|;)\s*stroke\s*:[^;]*/gi, "")
        .trim();
      return next ? ` style="${next}"` : "";
    })
    // Force the root svg element to the desired color
    .replace(
      /<svg\b([^>]*)>/i,
      (_match: string, attrs: string) =>
        `<svg${attrs} fill="${String(color)}" stroke="${String(color)}">`,
    );

  // Encode as a data URI (avoids base64/unicode gotchas)
  const encoded: string = encodeURIComponent(mono)
    .replace(/'/g, "%27")
    .replace(/"/g, "%22");

  return `data:image/svg+xml;charset=utf-8,${encoded}`;
}