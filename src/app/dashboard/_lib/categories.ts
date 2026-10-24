import { ALL_CATEGORY, ALL_CATEGORY_ID } from "./constants";
import type { Category, Item } from "./types";

/** Category ids are the lowercased label; items reference categories by id. */
export function categoryIdFor(label: string): string {
  return label.toLowerCase();
}

/** Every category except the synthetic "All" entry. */
export function realCategories(categories: Category[]): Category[] {
  return categories.filter((c) => c.id !== ALL_CATEGORY_ID);
}

/** The labels persisted to profiles.item_types. */
export function categoryLabels(categories: Category[]): string[] {
  return realCategories(categories).map((c) => c.label);
}

export function findCategoryLabel(
  categories: Category[],
  id: string | null,
): string | undefined {
  return categories.find((c) => c.id === id)?.label;
}

/**
 * Profile categories plus any category found on an item but missing from the
 * profile. Returns null when there are none (keep the current list).
 */
export function deriveCategories(
  profileTypes: string[],
  items: Item[],
): Category[] | null {
  const knownIds = new Set(profileTypes.map(categoryIdFor));
  const labels = [...profileTypes];
  for (const item of items) {
    if (item.category && !knownIds.has(categoryIdFor(item.category))) {
      labels.push(item.category);
      knownIds.add(categoryIdFor(item.category));
    }
  }
  if (labels.length === 0) return null;
  return [
    ALL_CATEGORY,
    ...labels.map((label) => ({ id: categoryIdFor(label), label })),
  ];
}

/**
 * Renaming a category only changes its label, and deleting one leaves items
 * pointing at it. Before saving, move items of renamed categories to the new
 * id and uncategorize items whose category was deleted, so the change
 * survives the reload (categories are re-derived from items on load).
 */
export function reconcileCategoryIds(
  items: Item[],
  categories: Category[],
  previousCategories: Category[],
): { items: Item[]; categories: Category[]; renamedIds: Map<string, string> } {
  const renamedIds = new Map<string, string>();
  const nextCategories: Category[] = [];
  for (const c of categories) {
    const id = c.id === ALL_CATEGORY_ID ? c.id : categoryIdFor(c.label);
    if (id !== c.id) renamedIds.set(c.id, id);
    if (!nextCategories.some((n) => n.id === id)) {
      nextCategories.push({ id, label: c.label });
    }
  }
  const currentIds = new Set(categories.map((c) => c.id));
  const deletedIds = new Set(
    previousCategories.map((c) => c.id).filter((id) => !currentIds.has(id)),
  );

  const nextItems = items.map((item) => {
    if (!item.category) return item;
    const id = categoryIdFor(item.category);
    if (deletedIds.has(id)) return { ...item, category: null };
    const renamed = renamedIds.get(id);
    return renamed ? { ...item, category: renamed } : item;
  });

  return { items: nextItems, categories: nextCategories, renamedIds };
}
