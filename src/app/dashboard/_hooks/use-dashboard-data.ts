import { useCallback, useEffect, useState } from "react";
import { createClient } from "~/lib/supabase/client";
import { getExtractionsUsed } from "~/lib/usage";
import { categoryLabels, deriveCategories } from "../_lib/categories";
import { ALL_CATEGORY } from "../_lib/constants";
import type { Category, Item } from "../_lib/types";

/** The signed-in user's items, categories, and AI extraction usage. */
export function useDashboardData() {
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([ALL_CATEGORY]);
  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [itemsLoaded, setItemsLoaded] = useState(false);
  const [extractionsUsed, setExtractionsUsed] = useState<number | null>(null);

  const loadItemsAndCategories = useCallback(async (uid: string) => {
    const supabase = createClient();
    const [{ data: profile }, { data: itemsData }] = await Promise.all([
      supabase
        .from("profiles")
        .select("item_types")
        .eq("user_id", uid)
        .single(),
      supabase.from("items").select("*").order("sort_order", {
        ascending: true,
      }),
    ]);
    const loaded = (itemsData ?? []) as Item[];
    const derived = deriveCategories(profile?.item_types ?? [], loaded);
    if (derived) setCategories(derived);
    setItems(loaded);
  }, []);

  const loadExtractionsUsed = useCallback(async (uid: string) => {
    setExtractionsUsed(await getExtractionsUsed(createClient(), uid));
  }, []);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data: { user } }) => {
        if (!user) return;
        setEmail(user.email ?? null);
        setUserId(user.id);
        loadItemsAndCategories(user.id).then(() => setItemsLoaded(true));
        loadExtractionsUsed(user.id);
      });
  }, [loadItemsAndCategories, loadExtractionsUsed]);

  const refreshItems = useCallback(async () => {
    if (userId) await loadItemsAndCategories(userId);
  }, [userId, loadItemsAndCategories]);

  const refreshExtractionsUsed = useCallback(() => {
    if (userId) loadExtractionsUsed(userId);
  }, [userId, loadExtractionsUsed]);

  /** Adds a category outside edit mode and saves it to the profile. */
  const appendCategory = (category: Category) => {
    if (!userId) return;
    const next = [...categories, category];
    setCategories(next);
    createClient()
      .from("profiles")
      .update({ item_types: categoryLabels(next) })
      .eq("user_id", userId)
      .then(({ error }) => {
        if (error) console.error("Failed to save category:", error.message);
      });
  };

  return {
    items,
    setItems,
    categories,
    setCategories,
    email,
    userId,
    itemsLoaded,
    extractionsUsed,
    refreshItems,
    refreshExtractionsUsed,
    appendCategory,
  };
}
