/**
 * The broad categories a user can limit email scanning to during onboarding
 * (`profiles.scan_categories` stores their ids, or a typed "Other" name as
 * typed). Each one expands into the subcategories that become the user's
 * dashboard categories (`profiles.item_types`).
 *
 * `itemKeywords` are specific words for items of that kind ("mascara",
 * "jeans"). An email naming one of a picked category's items is kept without
 * asking Jev; an email naming none still gets the Jev content check, since
 * items are often described in words not on any list. Vague words that fit
 * many categories ("set", "case", "bag", "top") are left out on purpose.
 */
export const SCAN_CATEGORIES = [
  {
    id: "clothing",
    label: "Clothing",
    subcategories: [
      "Tops",
      "Bottoms",
      "Dresses",
      "Outerwear",
      "Shoes",
      "Activewear",
      "Loungewear",
      "Swimwear",
    ],
    itemKeywords: [
      "t-shirt",
      "tee",
      "shirt",
      "blouse",
      "sweater",
      "hoodie",
      "sweatshirt",
      "cardigan",
      "jeans",
      "pants",
      "trousers",
      "shorts",
      "skirt",
      "dress",
      "jacket",
      "coat",
      "blazer",
      "leggings",
      "sneakers",
      "boots",
      "sandals",
      "heels",
      "loafers",
      "socks",
      "underwear",
      "bra",
      "pajamas",
      "swimsuit",
      "bikini",
    ],
  },
  {
    id: "beauty",
    label: "Beauty",
    subcategories: [
      "Makeup",
      "Skincare",
      "Hair",
      "Fragrance",
      "Nails",
      "Beauty Tools",
    ],
    itemKeywords: [
      "lipstick",
      "lip gloss",
      "lip balm",
      "balm",
      "mascara",
      "eyeliner",
      "eyeshadow",
      "foundation",
      "concealer",
      "blush",
      "bronzer",
      "brow",
      "serum",
      "moisturizer",
      "cleanser",
      "sunscreen",
      "face mask",
      "shampoo",
      "hair oil",
      "perfume",
      "eau de parfum",
      "eau de toilette",
      "cologne",
      "nail polish",
    ],
  },
  {
    id: "accessories",
    label: "Accessories",
    subcategories: [
      "Jewelry",
      "Bags",
      "Watches",
      "Sunglasses",
      "Hats",
      "Belts",
    ],
    itemKeywords: [
      "necklace",
      "bracelet",
      "earring",
      "pendant",
      "anklet",
      "handbag",
      "purse",
      "tote",
      "backpack",
      "wallet",
      "clutch",
      "crossbody",
      "wristwatch",
      "sunglasses",
      "beanie",
      "baseball cap",
      "bucket hat",
      "belt",
      "scarf",
    ],
  },
  {
    id: "electronics",
    label: "Electronics",
    subcategories: [
      "Phones",
      "Computers",
      "Audio",
      "Gaming",
      "Smart Home",
      "Tech Accessories",
    ],
    itemKeywords: [
      "laptop",
      "iphone",
      "smartphone",
      "tablet",
      "ipad",
      "headphones",
      "earbuds",
      "airpods",
      "speaker",
      "charger",
      "usb-c",
      "hdmi",
      "monitor",
      "keyboard",
      "smartwatch",
      "playstation",
      "xbox",
      "nintendo switch",
    ],
  },
  {
    id: "home",
    label: "Home",
    subcategories: ["Furniture", "Decor", "Kitchen", "Bedding & Bath"],
    itemKeywords: [
      "sofa",
      "couch",
      "armchair",
      "mattress",
      "duvet",
      "comforter",
      "pillow",
      "sheet set",
      "towel",
      "rug",
      "curtain",
      "lamp",
      "candle",
      "vase",
      "mug",
      "cookware",
      "frying pan",
      "skillet",
      "blender",
      "dinnerware",
    ],
  },
  {
    id: "books-hobbies",
    label: "Books & Hobbies",
    subcategories: ["Books", "Art Supplies", "Games & Puzzles", "Crafts"],
    itemKeywords: [
      "paperback",
      "hardcover",
      "kindle edition",
      "novel",
      "puzzle",
      "board game",
      "yarn",
      "sketchbook",
      "paint set",
      "acrylic paint",
      "watercolor",
      "crochet",
      "knitting",
    ],
  },
  {
    id: "fitness",
    label: "Fitness",
    subcategories: [
      "Workout Gear",
      "Supplements",
      "Sports Equipment",
      "Outdoor Gear",
    ],
    itemKeywords: [
      "protein powder",
      "whey",
      "pre-workout",
      "creatine",
      "dumbbell",
      "kettlebell",
      "yoga mat",
      "resistance band",
      "foam roller",
      "treadmill",
      "tent",
      "sleeping bag",
      "running shoes",
      "gym bag",
    ],
  },
  {
    id: "transportation",
    label: "Transportation",
    subcategories: ["Rideshare", "Public Transit", "Flights", "Gas & Parking"],
    itemKeywords: [
      "ride",
      "rideshare",
      "trip fare",
      "boarding pass",
      "flight",
      "airfare",
      "transit pass",
      "parking",
      "fuel",
      "gasoline",
    ],
  },
  {
    id: "food",
    label: "Food",
    subcategories: ["Groceries", "Restaurants", "Food Delivery", "Coffee"],
    itemKeywords: [
      "uber eats",
      "doordash",
      "grubhub",
      "instacart",
      "grocery",
      "groceries",
      "restaurant",
      "takeout",
      "latte",
      "espresso",
      "coffee",
      "burrito",
      "pizza",
      "sandwich",
      "salad",
    ],
  },
] as const satisfies readonly {
  id: string;
  label: string;
  subcategories: readonly string[];
  itemKeywords: readonly string[];
}[];

export const MAX_SCAN_CATEGORIES = 3;

/** Longest name accepted for a typed-in "Other" scan category. */
export const MAX_OTHER_CATEGORY_LENGTH = 30;

type KnownScanCategory = (typeof SCAN_CATEGORIES)[number];

function findKnownCategory(id: string): KnownScanCategory | undefined {
  return SCAN_CATEGORIES.find((c) => c.id === id);
}

/**
 * Turns one pick into what is stored in `profiles.scan_categories`: a listed
 * category's id (matched by id or label, any case), or otherwise the typed
 * "Other" name itself.
 */
export function toScanCategoryId(value: string): string {
  const lower = value.trim().toLowerCase();
  return (
    SCAN_CATEGORIES.find(
      (c) => c.id === lower || c.label.toLowerCase() === lower,
    )?.id ?? value.trim()
  );
}

/**
 * Picks as categories: listed ones as defined above, and a typed "Other"
 * name as a category of its own with itself as its only subcategory.
 */
function resolveScanCategories(ids: readonly string[]) {
  return ids.map(
    (id) =>
      findKnownCategory(id) ?? { id, label: id, subcategories: [id] as const },
  );
}

/** The dashboard categories (`profiles.item_types`) for the picks. */
export function subcategoriesFor(ids: readonly string[]): string[] {
  return resolveScanCategories(ids).flatMap((c) => c.subcategories);
}

/**
 * The categories extraction may use: the picked subcategories plus the
 * user's own dashboard categories (so renamed or added ones still work).
 * Empty when the user has no scan categories, which means "no limit".
 */
export function allowedCategoriesFor(
  ids: readonly string[],
  itemTypes: readonly string[],
): string[] {
  if (ids.length === 0) return [];
  const byLower = new Map<string, string>();
  for (const label of [...itemTypes, ...subcategoriesFor(ids)]) {
    if (!byLower.has(label.toLowerCase()))
      byLower.set(label.toLowerCase(), label);
  }
  return [...byLower.values()];
}

/** "clothing (tops, bottoms, …), pet supplies", for AI instructions. */
export function describeScanCategories(ids: readonly string[]): string {
  return resolveScanCategories(ids)
    .map((c) =>
      findKnownCategory(c.id)
        ? `${c.label.toLowerCase()} (${c.subcategories.join(", ").toLowerCase()})`
        : c.label.toLowerCase(),
    )
    .join(", ");
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * A matcher for item words from the picked categories (whole words, any
 * case, with an optional plural "s"/"es"), or null when no picked category
 * has keywords (no picks, or only typed "Other" picks).
 */
export function pickedItemKeywordPattern(
  ids: readonly string[],
): RegExp | null {
  const words = SCAN_CATEGORIES.filter((c) => ids.includes(c.id)).flatMap(
    (c) => c.itemKeywords,
  );
  if (words.length === 0) return null;
  return new RegExp(
    `\\b(?:${words.map(escapeRegExp).join("|")})(?:s|es)?\\b`,
    "i",
  );
}
