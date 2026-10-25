"use client";

import { useState } from "react";
import { SearchIcon } from "~/components/icons";
import { cn } from "~/lib/utils";
import { AddItemModal } from "./_components/add-item-modal";
import { CategorySidebar } from "./_components/category-sidebar";
import { DashboardToolbar } from "./_components/dashboard-toolbar";
import { GmailImportModal } from "./_components/gmail-import-modal";
import { ItemDetailModal } from "./_components/item-detail-modal";
import { ItemGrid } from "./_components/item-grid";
import { StatsRow } from "./_components/stats-row";
import { useDashboardData } from "./_hooks/use-dashboard-data";
import { useEditSession } from "./_hooks/use-edit-session";
import { findCategoryLabel } from "./_lib/categories";
import { ALL_CATEGORY_ID } from "./_lib/constants";
import { TEXT_FIELD } from "./_lib/styles";

export default function DashboardPage() {
  const data = useDashboardData();
  const { items, setItems, categories, setCategories, userId } = data;
  const [activeCategory, setActiveCategory] = useState(ALL_CATEGORY_ID);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showGmailModal, setShowGmailModal] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [brokenPhotoIds, setBrokenPhotoIds] = useState<Set<string>>(
    () => new Set(),
  );
  const session = useEditSession({
    items,
    setItems,
    categories,
    setCategories,
    setActiveCategory,
    userId,
  });

  const selectedItem = items.find((item) => item.id === selectedItemId);
  const markPhotoBroken = (id: string) =>
    setBrokenPhotoIds((prev) => new Set(prev).add(id));

  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) &&
      (activeCategory === ALL_CATEGORY_ID ||
        (item.category ?? "").toLowerCase() === activeCategory.toLowerCase()),
  );
  const totalSpent = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const sectionTitle =
    activeCategory === ALL_CATEGORY_ID
      ? "All Items"
      : (findCategoryLabel(categories, activeCategory) ?? activeCategory);
  const newItemSortOrder =
    (items.length > 0 ? Math.min(...items.map((i) => i.sort_order)) : 1) - 1;

  return (
    <>
      <div className="relative flex h-[calc(100vh-3.5rem)] overflow-hidden bg-muted">
        <CategorySidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          categories={categories}
          activeCategory={activeCategory}
          onSelect={setActiveCategory}
          isEditing={session.isEditing}
          onAdd={session.addCategory}
          onRename={session.renameCategory}
          onDelete={session.deleteCategory}
        />

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <DashboardToolbar
            onOpenSidebar={() => setSidebarOpen(true)}
            onOpenGmail={() => setShowGmailModal(true)}
          />

          <div className="flex-1 overflow-y-auto px-4 pb-10 sm:px-8">
            <div className="mb-5">
              <h1 className="font-display text-4xl tracking-wide text-foreground">
                My Items
              </h1>
              {data.email && (
                <p className="font-ui text-sm text-subtle-foreground">
                  {data.email}
                </p>
              )}
            </div>

            <div className="relative mb-6">
              <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-subtle-foreground">
                <SearchIcon />
              </div>
              <input
                type="search"
                placeholder="Search items…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={cn(TEXT_FIELD, "py-3 pl-11 pr-4")}
              />
            </div>

            <StatsRow
              itemCount={items.length}
              totalSpent={totalSpent}
              isEditing={session.isEditing}
              onCancel={session.cancel}
              onDone={session.done}
            />

            {session.saveError && (
              <p className="mb-4 font-ui text-sm text-destructive">
                {session.saveError}
              </p>
            )}

            {data.itemsLoaded && (
              <ItemGrid
                title={sectionTitle}
                hasItems={items.length > 0}
                items={filteredItems}
                session={session}
                isPhotoBroken={(id) => brokenPhotoIds.has(id)}
                onPhotoError={markPhotoBroken}
                onAdd={() => setShowAddModal(true)}
                onOpenItem={setSelectedItemId}
              />
            )}
          </div>
        </div>
      </div>

      {showAddModal && (
        <AddItemModal
          userId={userId}
          categories={categories}
          sortOrder={newItemSortOrder}
          onAdded={(item, newCategory) => {
            if (newCategory) data.appendCategory(newCategory);
            setItems((prev) => [item, ...prev]);
          }}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {showGmailModal && (
        <GmailImportModal
          email={data.email}
          onItemsChanged={data.refreshItems}
          onClose={() => setShowGmailModal(false)}
        />
      )}

      {selectedItem && (
        <ItemDetailModal
          item={selectedItem}
          categories={categories}
          isEditing={session.isEditing}
          userId={userId}
          photoBroken={brokenPhotoIds.has(selectedItem.id)}
          onPhotoError={() => markPhotoBroken(selectedItem.id)}
          onEditField={(field, value) =>
            session.editItemField(selectedItem.id, field, value)
          }
          onEditPhoto={(photoUrl, emoji) =>
            session.editItemPhoto(selectedItem.id, photoUrl, emoji)
          }
          onClose={() => setSelectedItemId(null)}
        />
      )}
    </>
  );
}
