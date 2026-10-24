import { cn } from "~/lib/utils";
import { DEFAULT_ITEM_EMOJI } from "../_lib/constants";

/** The item's photo, or its emoji when there's no photo or it failed to load. */
export function ItemPhoto({
  photoUrl,
  emoji,
  alt,
  broken = false,
  onError,
  draggable,
  emojiClassName,
}: {
  photoUrl: string | null;
  emoji: string | null;
  alt: string;
  broken?: boolean;
  onError?: () => void;
  draggable?: boolean;
  emojiClassName: string;
}) {
  if (photoUrl && !broken) {
    return (
      // biome-ignore lint/performance/noImgElement: photoUrl can be an arbitrary external URL
      <img
        src={photoUrl}
        alt={alt}
        draggable={draggable}
        onError={onError}
        className="h-full w-full object-contain"
      />
    );
  }
  return (
    <div className="flex h-full items-center justify-center">
      <span className={cn("text-subtle-foreground", emojiClassName)}>
        {emoji ?? DEFAULT_ITEM_EMOJI}
      </span>
    </div>
  );
}
