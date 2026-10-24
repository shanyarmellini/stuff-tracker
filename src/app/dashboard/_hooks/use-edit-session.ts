import {
  type Dispatch,
  type DragEvent,
  type SetStateAction,
  useCallback,
  useRef,
  useState,
} from "react";
import { createClient } from "~/lib/supabase/client";
import {
  categoryIdFor,
  categoryLabels,
  reconcileCategoryIds,
} from "../_lib/categories";
import { ALL_CATEGORY_ID } from "../_lib/constants";
import type {
  Category,
  EditableItemField,
  HistoryRecord,
  Item,
} from "../_lib/types";
import { useEditHistory } from "./use-edit-history";

type Setter<T> = Dispatch<SetStateAction<T>>;

type Snapshot = { items: Item[]; categories: Category[] };

const SAVE_ERROR = "Some of your changes couldn't be saved. Please try again.";

function insertAt<T>(list: T[], index: number, value: T): T[] {
  const next = [...list];
  next.splice(index, 0, value);
  return next;
}

function sameOrder(a: { id: string }[], b: { id: string }[]) {
  return a.map((x) => x.id).join(",") === b.map((x) => x.id).join(",");
}

function hasItemChanged(orig: Item, item: Item) {
  return (
    orig.name !== item.name ||
    orig.price !== item.price ||
    orig.link !== item.link ||
    orig.photo_url !== item.photo_url ||
    orig.emoji !== item.emoji ||
    orig.category !== item.category ||
    orig.sort_order !== item.sort_order
  );
}

/**
 * Edit mode: local item/category edits with undo/redo, saved to Supabase on
 * Done or rolled back on Cancel.
 */
export function useEditSession({
  items,
  setItems,
  categories,
  setCategories,
  setActiveCategory,
  userId,
}: {
  items: Item[];
  setItems: Setter<Item[]>;
  categories: Category[];
  setCategories: Setter<Category[]>;
  setActiveCategory: Setter<string>;
  userId: string | null;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [pendingDeletes, setPendingDeletes] = useState<string[]>([]);
  // Bumped to remount uncontrolled inputs after undo/redo/cancel.
  const [editKey, setEditKey] = useState(0);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const dragStartOrderRef = useRef<string[] | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const updateItem = useCallback(
    (id: string, patch: Partial<Item>) =>
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      ),
    [setItems],
  );

  const removeCategory = useCallback(
    (id: string) => {
      setCategories((prev) => prev.filter((c) => c.id !== id));
      setActiveCategory((active) => (active === id ? ALL_CATEGORY_ID : active));
    },
    [setCategories, setActiveCategory],
  );

  const applyRecord = useCallback(
    (record: HistoryRecord, isUndo: boolean) => {
      switch (record.type) {
        case "field-edit":
          updateItem(record.id, {
            [record.field]: isUndo ? record.oldValue : record.newValue,
          });
          break;
        case "photo-edit":
          updateItem(record.id, {
            photo_url: isUndo ? record.oldPhotoUrl : record.newPhotoUrl,
            emoji: isUndo ? record.oldEmoji : record.newEmoji,
          });
          break;
        case "add-category":
        case "delete-category": {
          const restore = (record.type === "add-category") !== isUndo;
          if (restore) {
            const { id, label, index } = record;
            setCategories((prev) => insertAt(prev, index, { id, label }));
          } else {
            removeCategory(record.id);
          }
          break;
        }
        case "rename-category": {
          const label = isUndo ? record.oldLabel : record.newLabel;
          setCategories((prev) =>
            prev.map((c) => (c.id === record.id ? { ...c, label } : c)),
          );
          break;
        }
        case "reorder": {
          const order = isUndo ? record.prevOrder : record.order;
          setItems((prev) => {
            const byId = new Map(prev.map((item) => [item.id, item]));
            return order
              .map((id) => byId.get(id))
              .filter((item): item is Item => item !== undefined);
          });
          break;
        }
        case "delete":
          if (isUndo) {
            setItems((prev) => insertAt(prev, record.index, record.item));
            setPendingDeletes((prev) => prev.filter((id) => id !== record.id));
          } else {
            setItems((prev) => prev.filter((item) => item.id !== record.id));
            setPendingDeletes((prev) => [...prev, record.id]);
          }
          break;
      }
      setEditKey((k) => k + 1);
    },
    [updateItem, removeCategory, setCategories, setItems],
  );

  const history = useEditHistory(applyRecord);

  const start = () => {
    setSnapshot({ items: [...items], categories: [...categories] });
    history.reset();
    setSaveError(null);
    setIsEditing(true);
  };

  const end = () => {
    setIsEditing(false);
    setSnapshot(null);
    setPendingDeletes([]);
    history.reset();
  };

  const cancel = () => {
    if (snapshot) {
      setItems(snapshot.items);
      setCategories(snapshot.categories);
    }
    end();
    setEditKey((k) => k + 1);
  };

  /** Saves the session; takes items/deletes explicitly so callers can pass
   * state that hasn't rendered yet. */
  const commit = async (current: {
    items: Item[];
    pendingDeletes: string[];
  }) => {
    const snap = snapshot;
    end();
    const supabase = createClient();
    const saves: PromiseLike<{ error: { message: string } | null }>[] = [];

    if (snap) {
      const reconciled = reconcileCategoryIds(
        current.items,
        categories,
        snap.categories,
      );
      const orderChanged = !sameOrder(reconciled.items, snap.items);
      const finalItems = orderChanged
        ? reconciled.items.map((item, index) => ({
            ...item,
            sort_order: index,
          }))
        : reconciled.items;
      if (finalItems.length > 0) setItems(finalItems);
      setCategories(reconciled.categories);
      setActiveCategory(
        (active) => reconciled.renamedIds.get(active) ?? active,
      );

      const originals = new Map(snap.items.map((item) => [item.id, item]));
      for (const item of finalItems) {
        const orig = originals.get(item.id);
        if (!orig || !hasItemChanged(orig, item)) continue;
        const { name, price, link, photo_url, emoji, category, sort_order } =
          item;
        saves.push(
          supabase
            .from("items")
            .update({
              name,
              price,
              link,
              photo_url,
              emoji,
              category,
              sort_order,
            })
            .eq("id", item.id),
        );
      }

      const newTypes = categoryLabels(categories);
      if (
        userId &&
        JSON.stringify(newTypes) !==
          JSON.stringify(categoryLabels(snap.categories))
      ) {
        saves.push(
          supabase
            .from("profiles")
            .update({ item_types: newTypes })
            .eq("user_id", userId),
        );
      }
    }
    if (current.pendingDeletes.length > 0) {
      saves.push(
        supabase.from("items").delete().in("id", current.pendingDeletes),
      );
    }

    const failures = (await Promise.all(saves)).filter((r) => r.error);
    for (const { error } of failures) {
      console.error("Failed to save item changes:", error?.message);
    }
    if (failures.length > 0) setSaveError(SAVE_ERROR);
  };

  const done = () => commit({ items, pendingDeletes });

  const editItemField = (
    id: string,
    field: EditableItemField,
    newValue: string | number | null,
  ) => {
    const item = items.find((i) => i.id === id);
    if (!item || item[field] === newValue) return;
    history.push({
      type: "field-edit",
      id,
      field,
      oldValue: item[field],
      newValue,
    });
    updateItem(id, { [field]: newValue });
  };

  const editItemPhoto = (
    id: string,
    photoUrl: string | null,
    emoji: string | null,
  ) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    history.push({
      type: "photo-edit",
      id,
      oldPhotoUrl: item.photo_url,
      oldEmoji: item.emoji,
      newPhotoUrl: photoUrl,
      newEmoji: emoji,
    });
    updateItem(id, { photo_url: photoUrl, emoji });
  };

  const deleteItem = (id: string) => {
    const index = items.findIndex((item) => item.id === id);
    if (index === -1) return;
    history.push({ type: "delete", id, item: items[index], index });
    const next = items.filter((item) => item.id !== id);
    const nextDeletes = [...pendingDeletes, id];
    setItems(next);
    setPendingDeletes(nextDeletes);
    // The grid (and its Done button) disappears with the last item, so
    // commit instead of silently dropping the pending deletes.
    if (next.length === 0) commit({ items: next, pendingDeletes: nextDeletes });
  };

  const addCategory = (label: string) => {
    const id = categoryIdFor(label);
    if (categories.some((c) => c.id === id)) return;
    history.push({ type: "add-category", id, label, index: categories.length });
    setCategories((prev) => [...prev, { id, label }]);
  };

  const deleteCategory = (category: Category) => {
    const index = categories.findIndex((c) => c.id === category.id);
    history.push({ type: "delete-category", ...category, index });
    removeCategory(category.id);
  };

  const renameCategory = (category: Category, newLabel: string) => {
    if (newLabel === category.label) return;
    history.push({
      type: "rename-category",
      id: category.id,
      oldLabel: category.label,
      newLabel,
    });
    setCategories((prev) =>
      prev.map((c) => (c.id === category.id ? { ...c, label: newLabel } : c)),
    );
  };

  const dragStart = (e: DragEvent<HTMLDivElement>, id: string) => {
    dragStartOrderRef.current = items.map((item) => item.id);
    setDraggedItemId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const dragOver = (e: DragEvent<HTMLDivElement>, targetId: string) => {
    e.preventDefault();
    if (!draggedItemId || draggedItemId === targetId) return;
    setItems((prev) => {
      const from = prev.findIndex((item) => item.id === draggedItemId);
      const to = prev.findIndex((item) => item.id === targetId);
      if (from === -1 || to === -1 || from === to) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const dragEnd = () => {
    const prevOrder = dragStartOrderRef.current;
    dragStartOrderRef.current = null;
    setDraggedItemId(null);
    if (!prevOrder) return;
    const order = items.map((item) => item.id);
    if (prevOrder.join(",") !== order.join(",")) {
      history.push({ type: "reorder", prevOrder, order });
    }
  };

  return {
    isEditing,
    editKey,
    saveError,
    start,
    done,
    cancel,
    undo: history.undo,
    redo: history.redo,
    canUndo: history.canUndo,
    canRedo: history.canRedo,
    editItemField,
    editItemPhoto,
    deleteItem,
    addCategory,
    deleteCategory,
    renameCategory,
    draggedItemId,
    dragStart,
    dragOver,
    dragEnd,
  };
}

export type EditSession = ReturnType<typeof useEditSession>;
