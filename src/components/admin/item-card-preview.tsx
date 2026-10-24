// Read-only rendition of the dashboard's item card, for the admin view.
// Deliberately dumbed down from the dashboard version (src/app/dashboard/_components/item-card.tsx)
// - no edit/delete/drag/broken-photo-fallback - this is just a preview of
// what the user sees, not an editable surface.

import { ExternalLinkIcon } from "~/components/icons";
import { formatPrice } from "~/lib/format";
import { linkHostname, normalizeUrl } from "~/lib/url";

export type AdminCardItem = {
  name: string;
  price: number;
  link: string | null;
  photo_url: string | null;
  emoji: string | null;
  quantity: number;
};

export function ItemCardPreview({ item }: { item: AdminCardItem }) {
  const hostname = linkHostname(item.link);

  return (
    <div className="w-56 rounded-2xl border border-border bg-card p-3 shadow-sm">
      <p className="line-clamp-2 font-display text-2xl leading-tight tracking-wide text-foreground">
        {item.name}
        {item.quantity > 1 && (
          <span className="text-subtle-foreground"> ×{item.quantity}</span>
        )}
      </p>

      <div className="relative my-2 flex h-32 items-center justify-center overflow-hidden rounded-xl bg-muted">
        {item.photo_url ? (
          // biome-ignore lint/performance/noImgElement: photo_url can be an arbitrary external URL
          <img
            src={item.photo_url}
            alt={item.name}
            className="h-full w-full object-contain"
          />
        ) : (
          <span className="text-4xl text-subtle-foreground">
            {item.emoji ?? "📦"}
          </span>
        )}
      </div>

      <div>
        <p className="truncate font-ui text-base font-semibold text-foreground">
          {formatPrice(item.price)}
        </p>
        {hostname && item.link && (
          <a
            href={normalizeUrl(item.link)}
            target="_blank"
            rel="noreferrer"
            className="flex min-w-0 items-center gap-1 font-ui text-xs text-brand transition-colors hover:text-brand-strong"
          >
            <span className="truncate">{hostname}</span>
            <ExternalLinkIcon />
          </a>
        )}
      </div>
    </div>
  );
}
