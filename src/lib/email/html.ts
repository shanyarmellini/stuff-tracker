export function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(
      /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
      (_match, href: string, text: string) => {
        const label = text.replace(/<[^>]+>/g, " ").trim();
        return label ? `${label} (${href})` : href;
      },
    )
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractFirstImageUrl(html: string): string | null {
  const tags = html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi);
  for (const [tag, src] of tags) {
    if (!src?.startsWith("http") || /track|pixel|spacer|beacon/i.test(src))
      continue;
    const width = Number(tag.match(/width=["']?(\d+)/i)?.[1] ?? "");
    const height = Number(tag.match(/height=["']?(\d+)/i)?.[1] ?? "");
    if ((width && width < 40) || (height && height < 40)) continue;
    return src;
  }
  return null;
}
