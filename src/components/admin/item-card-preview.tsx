// Read-only rendition of the dashboard's item card, for the admin view.
// Deliberately dumbed down from the dashboard version (src/app/dashboard/page.tsx)
// - no edit/delete/drag/broken-photo-fallback - this is just a preview of
// what the user sees, not an editable surface.

export type AdminCardItem = {
  name: string;
  price: number;
  link: string | null;
  photo_url: string | null;
  emoji: string | null;
  quantity: number;
};

function ExternalLinkIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </svg>
  );
}

function linkHostname(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(
      url.startsWith("http") ? url : `https://${url}`,
    ).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

export function ItemCardPreview({ item }: { item: AdminCardItem }) {
  const hostname = linkHostname(item.link);

  return (
    <div className="w-56 rounded-2xl border border-sky-100 bg-white p-3 shadow-sm">
      <p className="line-clamp-2 font-display text-2xl leading-tight tracking-wide text-slate-800">
        {item.name}
        {item.quantity > 1 && (
          <span className="text-slate-400"> ×{item.quantity}</span>
        )}
      </p>

      <div className="relative my-2 flex h-32 items-center justify-center overflow-hidden rounded-xl bg-sky-50">
        {item.photo_url ? (
          // biome-ignore lint/performance/noImgElement: photo_url can be an arbitrary external URL
          <img
            src={item.photo_url}
            alt={item.name}
            className="h-full w-full object-contain"
          />
        ) : (
          <span className="text-4xl text-slate-300">{item.emoji ?? "📦"}</span>
        )}
      </div>

      <div>
        <p className="truncate font-ui text-base font-semibold text-slate-700">
          ${item.price.toFixed(2)}
        </p>
        {hostname && item.link && (
          <a
            href={
              item.link.startsWith("http") ? item.link : `https://${item.link}`
            }
            target="_blank"
            rel="noreferrer"
            className="flex min-w-0 items-center gap-1 font-ui text-xs text-sky-400 transition-colors hover:text-sky-500"
          >
            <span className="truncate">{hostname}</span>
            <ExternalLinkIcon />
          </a>
        )}
      </div>
    </div>
  );
}
