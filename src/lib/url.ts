const IMAGE_CHECK_TIMEOUT_MS = 8000;

/** Prefixes bare hosts like "amazon.com" with https://. */
export function normalizeUrl(value: string): string {
  return value.startsWith("http") ? value : `https://${value}`;
}

/** Empty is valid (the field is optional); otherwise requires a dotted hostname. */
export function isValidLink(value: string): boolean {
  if (!value) return true;
  try {
    const url = new URL(normalizeUrl(value));
    return /^([^.]+\.)+[^.]{2,}$/.test(url.hostname);
  } catch {
    return false;
  }
}

export function linkHostname(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(normalizeUrl(url)).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Resolves true if the URL loads as an image within the timeout. */
export function loadsAsImage(
  url: string,
  timeoutMs = IMAGE_CHECK_TIMEOUT_MS,
): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new window.Image();
    const timeout = setTimeout(() => finish(false), timeoutMs);
    let settled = false;
    function finish(result: boolean) {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve(result);
    }
    img.onload = () => finish(true);
    img.onerror = () => finish(false);
    img.src = url;
  });
}
