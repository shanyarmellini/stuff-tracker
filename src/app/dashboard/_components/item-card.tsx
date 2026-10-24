import type { DragEvent } from "react";
import { ExternalLinkIcon, TrashIcon } from "~/components/icons";
import { formatPrice } from "~/lib/format";
import { linkHostname, normalizeUrl } from "~/lib/url";
import { cn } from "~/lib/utils";
import { CARD_SURFACE } from "../_lib/styles";
import type { Item } from "../_lib/types";
import { ItemPhoto } from "./item-photo";

export function ItemCard({
  item,
  isEditing,
  isDragging,
  photoBroken,
  onPhotoError,
  onOpen,
  onDelete,
  onDragStart,
  onDragOver,
  onDragEnd,
}: {
  item: Item;
  isEditing: boolean;
  isDragging: boolean;
  photoBroken: boolean;
  onPhotoError: () => void;
  onOpen: () => void;
  onDelete: () => void;
  onDragStart: (e: DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
}) {
  const hostname = linkHostname(item.link);
  const stacked = item.quantity > 1;

  return (
    <div className="relative h-full">
      {stacked && (
        <>
          <div
            aria-hidden="true"
            className={cn(
              "absolute inset-x-3 -top-2 bottom-1 -z-20 rounded-2xl",
              CARD_SURFACE,
            )}
          />
          <div
            aria-hidden="true"
            className={cn(
              "absolute inset-x-1.5 -top-1 bottom-0.5 -z-10 rounded-2xl",
              CARD_SURFACE,
            )}
          />
        </>
      )}
      {/* biome-ignore lint/a11y/useSemanticElements: contains nested buttons/links, which <button> cannot */}
      <div
        role="button"
        tabIndex={0}
        aria-label={`${isEditing ? "Edit" : "View"} ${item.name}`}
        draggable={isEditing}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={(e) => e.preventDefault()}
        onDragEnd={onDragEnd}
        onClick={onOpen}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpen();
          }
        }}
        className={cn(
          "relative flex h-full flex-col rounded-2xl bg-card p-3 shadow-sm transition-all hover:shadow-md",
          isEditing
            ? "cursor-grab border-2 border-brand active:cursor-grabbing"
            : "cursor-pointer border border-border",
          isDragging && "opacity-40",
        )}
      >
        {isEditing && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="absolute -right-2 -top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow transition-colors hover:bg-destructive/90"
            aria-label={`Delete ${item.name}`}
          >
            <TrashIcon />
          </button>
        )}

        <p className="line-clamp-2 font-display text-2xl leading-tight tracking-wide text-foreground">
          {item.name}
          {stacked && (
            <span className="text-subtle-foreground"> ×{item.quantity}</span>
          )}
        </p>

        <div className="relative my-2 flex-1 overflow-hidden rounded-xl bg-muted">
          <ItemPhoto
            photoUrl={item.photo_url}
            emoji={item.emoji}
            alt={item.name}
            broken={photoBroken}
            onError={onPhotoError}
            draggable={false}
            emojiClassName="text-4xl"
          />
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
              draggable={false}
              onClick={(e) => e.stopPropagation()}
              className="flex min-w-0 items-center gap-1 font-ui text-xs text-brand transition-colors hover:text-brand-strong"
            >
              <span className="truncate">{hostname}</span>
              <ExternalLinkIcon />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
