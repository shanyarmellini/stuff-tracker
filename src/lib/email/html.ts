function isQualifyingImage(tag: string, src: string): boolean {
  if (!src?.startsWith("http") || /track|pixel|spacer|beacon/i.test(src))
    return false;
  const width = Number(tag.match(/width=["']?(\d+)/i)?.[1] ?? "");
  const height = Number(tag.match(/height=["']?(\d+)/i)?.[1] ?? "");
  if ((width && width < 40) || (height && height < 40)) return false;
  return true;
}

// Replaces qualifying <img> tags with an inline "[photo: url]" marker so
// each product photo stays adjacent to its own name/price text once
// stripped, instead of being lost — this lets the AI match photos to
// individual items in multi-item order confirmations.
export function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi, (tag, src: string) =>
      isQualifyingImage(tag, src) ? ` [photo: ${src}] ` : " ",
    )
    .replace(
      /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
      (_match, href: string, text: string) => {
        const label = text.replace(/<[^>]+>/g, " ").trim();
        return label ? `${label} (${href})` : href;
      },
    )
    .replace(/<[^>]+>/g, " ")
    .replace(/&zwnj;|&zwj;|&shy;|&#8203;|&#x200[bcd];/gi, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractFirstImageUrl(html: string): string | null {
  const tags = html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi);
  let best: { src: string; area: number } | null = null;
  for (const [tag, src] of tags) {
    if (!isQualifyingImage(tag, src)) continue;
    // Prefer the largest qualifying image (product photos tend to dwarf
    // logos/icons), falling back to the first one when sizes are unknown.
    const width = Number(tag.match(/width=["']?(\d+)/i)?.[1] ?? "");
    const height = Number(tag.match(/height=["']?(\d+)/i)?.[1] ?? "");
    const area = width && height ? width * height : 0;
    if (!best || area > best.area) best = { src, area };
  }
  return best?.src ?? null;
}
