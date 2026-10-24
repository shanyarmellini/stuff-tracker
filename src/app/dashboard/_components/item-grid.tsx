import type { ReactNode } from "react";
import { PencilIcon, PlusIcon, RedoIcon, UndoIcon } from "~/components/icons";
import { cn } from "~/lib/utils";
import type { EditSession } from "../_hooks/use-edit-session";
import { MODAL_TITLE, PRIMARY_BUTTON } from "../_lib/styles";
import type { Item } from "../_lib/types";
import { ItemCard } from "./item-card";

const EMPTY_STATE = "rounded-2xl border border-dashed border-input bg-card";

const HISTORY_BUTTON =
  "flex h-8 w-8 items-center justify-center rounded-full border border-input bg-card text-muted-foreground shadow-sm transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30";

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className={MODAL_TITLE}>{children}</h2>;
}

function GridTile({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-1 flex-col items-center justify-center gap-2 rounded-2xl border border-input bg-muted shadow-sm transition-colors hover:bg-input"
    >
      {icon}
      <span className="font-display text-lg tracking-wide text-brand-strong">
        {label}
      </span>
    </button>
  );
}

export function ItemGrid({
  title,
  hasItems,
  items,
  session,
  isPhotoBroken,
  onPhotoError,
  onAdd,
  onOpenItem,
}: {
  title: string;
  hasItems: boolean;
  /** Items after search/category filtering. */
  items: Item[];
  session: EditSession;
  isPhotoBroken: (id: string) => boolean;
  onPhotoError: (id: string) => void;
  onAdd: () => void;
  onOpenItem: (id: string) => void;
}) {
  if (!hasItems) {
    return (
      <>
        <div className="mb-4">
          <SectionTitle>{title}</SectionTitle>
        </div>
        <div
          className={cn(
            "flex flex-col items-center justify-center gap-4 py-16",
            EMPTY_STATE,
          )}
        >
          <p className="font-ui text-sm text-subtle-foreground">
            No items yet. Add something to get started.
          </p>
          <button
            type="button"
            onClick={onAdd}
            className={cn(
              "flex items-center gap-1.5 px-5 py-2.5",
              PRIMARY_BUTTON,
            )}
          >
            <PlusIcon />
            Add your first item
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <SectionTitle>{title}</SectionTitle>
        {session.isEditing && (
          <div className="flex gap-1">
            <button
              type="button"
              onClick={session.undo}
              disabled={!session.canUndo}
              className={HISTORY_BUTTON}
              aria-label="Undo"
            >
              <UndoIcon />
            </button>
            <button
              type="button"
              onClick={session.redo}
              disabled={!session.canRedo}
              className={HISTORY_BUTTON}
              aria-label="Redo"
            >
              <RedoIcon />
            </button>
          </div>
        )}
      </div>
      {items.length === 0 ? (
        <div
          className={cn("flex h-40 items-center justify-center", EMPTY_STATE)}
        >
          <p className="font-ui text-sm text-subtle-foreground">
            No items found.
          </p>
        </div>
      ) : (
        <div
          key={session.editKey}
          className="grid grid-cols-1 gap-4 [grid-auto-rows:240px] sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
        >
          <div className="flex h-full flex-col gap-4">
            <GridTile icon={<PlusIcon />} label="Add item" onClick={onAdd} />
            {!session.isEditing && (
              <GridTile
                icon={<PencilIcon />}
                label="Edit"
                onClick={session.start}
              />
            )}
          </div>
          {items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              isEditing={session.isEditing}
              isDragging={session.draggedItemId === item.id}
              photoBroken={isPhotoBroken(item.id)}
              onPhotoError={() => onPhotoError(item.id)}
              onOpen={() => onOpenItem(item.id)}
              onDelete={() => session.deleteItem(item.id)}
              onDragStart={(e) => session.dragStart(e, item.id)}
              onDragOver={(e) => session.dragOver(e, item.id)}
              onDragEnd={session.dragEnd}
            />
          ))}
        </div>
      )}
    </>
  );
}
