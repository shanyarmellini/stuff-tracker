function decodeQuotedPrintable(input: string): string {
  const joined = input.replace(/=\r?\n/g, "");
  const bytes: number[] = [];
  for (let i = 0; i < joined.length; i++) {
    const hex = joined.slice(i + 1, i + 3);
    if (joined[i] === "=" && /^[0-9A-Fa-f]{2}$/.test(hex)) {
      bytes.push(Number.parseInt(hex, 16));
      i += 2;
    } else {
      bytes.push(joined.charCodeAt(i));
    }
  }
  return Buffer.from(bytes).toString("utf-8");
}

function unfoldHeaders(block: string): Map<string, string> {
  const unfolded = block.replace(/\r\n/g, "\n").replace(/\n[ \t]+/g, " ");
  const headers = new Map<string, string>();
  for (const line of unfolded.split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const name = line.slice(0, idx).trim().toLowerCase();
    if (!headers.has(name)) headers.set(name, line.slice(idx + 1).trim());
  }
  return headers;
}

function splitHeadersAndBody(raw: string): {
  headers: Map<string, string>;
  body: string;
} {
  const normalized = raw.replace(/\r\n/g, "\n");
  const sepIndex = normalized.indexOf("\n\n");
  if (sepIndex === -1) {
    return { headers: unfoldHeaders(normalized), body: "" };
  }
  return {
    headers: unfoldHeaders(normalized.slice(0, sepIndex)),
    body: normalized.slice(sepIndex + 2),
  };
}

function extractBoundary(contentType: string): string | null {
  const match = contentType.match(/boundary=("?)([^;"\n]+)\1/i);
  return match ? match[2].trim() : null;
}

function decodeBody(body: string, encoding: string | undefined): string {
  const normalized = (encoding ?? "7bit").toLowerCase();
  if (normalized === "quoted-printable") return decodeQuotedPrintable(body);
  if (normalized === "base64") {
    try {
      return Buffer.from(body.replace(/\s+/g, ""), "base64").toString("utf-8");
    } catch {
      return body;
    }
  }
  return body;
}

type EmailBody = { html: string | null; text: string | null };

function findBestBodyPart(raw: string): EmailBody {
  const { headers, body } = splitHeadersAndBody(raw);
  const contentType = headers.get("content-type") ?? "text/plain";

  if (/^multipart\//i.test(contentType)) {
    const boundary = extractBoundary(contentType);
    if (!boundary) return { html: null, text: null };
    const parts = body.split(`--${boundary}`).slice(1, -1);
    let html: string | null = null;
    let text: string | null = null;
    for (const part of parts) {
      const result = findBestBodyPart(part.replace(/^\n/, ""));
      if (result.html && !html) html = result.html;
      if (result.text && !text) text = result.text;
    }
    return { html, text };
  }

  const decoded = decodeBody(body, headers.get("content-transfer-encoding"));
  if (/^text\/html/i.test(contentType)) return { html: decoded, text: null };
  if (/^text\/plain/i.test(contentType)) return { html: null, text: decoded };
  return { html: null, text: null };
}

export const LOOKS_LIKE_RAW_EMAIL = /^mime-version:\s*1\.0/im;

/** Parses a raw RFC 822 message (e.g. Gmail's "Show original"), decoding
 * quoted-printable/base64 and walking multipart boundaries to find the
 * html and/or plain-text body. */
export function parseRawEmail(raw: string): EmailBody {
  return findBestBodyPart(raw);
}
