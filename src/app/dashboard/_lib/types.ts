export type Item = {
  id: string;
  name: string;
  price: number;
  link: string | null;
  photo_url: string | null;
  emoji: string | null;
  /** Category id: the lowercased category label. */
  category: string | null;
  sort_order: number;
  created_at: string;
  quantity: number;
};

export type Category = { id: string; label: string };

export type EditableItemField = "name" | "price" | "link" | "category";

export type HistoryRecord =
  | {
      type: "field-edit";
      id: string;
      field: EditableItemField;
      oldValue: string | number | null;
      newValue: string | number | null;
    }
  | {
      type: "photo-edit";
      id: string;
      oldPhotoUrl: string | null;
      oldEmoji: string | null;
      newPhotoUrl: string | null;
      newEmoji: string | null;
    }
  | { type: "reorder"; order: string[]; prevOrder: string[] }
  | { type: "delete"; id: string; item: Item; index: number }
  | { type: "add-category"; id: string; label: string; index: number }
  | { type: "delete-category"; id: string; label: string; index: number }
  | { type: "rename-category"; id: string; oldLabel: string; newLabel: string };
