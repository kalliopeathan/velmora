// Catalogue access and display helpers; every product fact is read from data/products.json.
import productsData from "@/data/products.json";
import { getStatus } from "./delivery";

export type Product = {
  id: string;
  name: string;
  category: string;
  price_gbp: number;
  colours: string[];
  fabric: string;
  fit: string;
  sizes: string[];
  occasions: string[];
  made_to_order: boolean;
  lead_time_days: number;
  description: string;
  in_stock: boolean;
};

export type Occasion = {
  name: string;
  slug: string;
  count: number;
};

const products = productsData as Product[];

// Empty strings and empty arrays count as missing: omit, never fill.
export function hasValue<T>(value: T | null | undefined | ""): value is T {
  if (value === null || value === undefined || value === "") return false;
  if (Array.isArray(value) && value.length === 0) return false;
  return true;
}

export function getAllProducts(): Product[] {
  return products;
}

export function getProduct(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}

export function getInStock(): Product[] {
  return products.filter((p) => p.in_stock === true);
}

// "new year's eve" -> "new-years-eve", "winter wedding" -> "winter-wedding"
export function occasionSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Holidays are proper nouns; everything else stays sentence case.
const HOLIDAYS: Record<string, string> = {
  "new year's eve": "New Year's Eve",
  christmas: "Christmas",
};

// Display only: "new year's eve" -> "New Year's Eve", "christmas party" -> "Christmas party".
export function occasionDisplayName(name: string): string {
  let display = name;
  for (const [holiday, proper] of Object.entries(HOLIDAYS)) {
    display = display.replace(new RegExp(`\\b${holiday}\\b`, "gi"), proper);
  }
  return display.charAt(0).toUpperCase() + display.slice(1);
}

export function getOccasions(): Occasion[] {
  const counts = new Map<string, number>();
  for (const p of products) {
    for (const o of p.occasions ?? []) {
      counts.set(o, (counts.get(o) ?? 0) + 1);
    }
  }
  return [...counts]
    .map(([name, count]) => ({ name, slug: occasionSlug(name), count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

// Name + first colour + fabric, e.g. "Isola dress, black velvet". Names repeat across
// products, so the name alone can't identify a piece.
export function displayLabel(product: Product): string {
  const detail = [product.colours?.[0], product.fabric]
    .filter((part) => hasValue(part))
    .join(" ");
  return detail ? `${product.name}, ${detail}` : product.name;
}

const gbp = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

export function formatPrice(priceGbp: number): string {
  return gbp.format(priceGbp);
}

const ukSizeNumber = (size: string) => Number(/^UK (\d+)$/.exec(size)?.[1] ?? NaN);

/** UK sizes in numeric order, then any others ("one size"). */
export function allSizes(): string[] {
  return [...new Set(getAllProducts().flatMap((p) => p.sizes ?? []))].sort((a, b) => {
    const na = ukSizeNumber(a);
    const nb = ukSizeNumber(b);
    if (Number.isNaN(na) || Number.isNaN(nb)) return Number.isNaN(na) ? 1 : -1;
    return na - nb;
  });
}

const plural = (category: string) =>
  category.endsWith("y") ? `${category.slice(0, -1)}ies` : `${category}s`;

/**
 * Built from the data, e.g. "UK 6 to UK 18, and one size for accessories".
 * short: "UK 6 to 18, and one size for accessories".
 */
export function sizesText({ short = false }: { short?: boolean } = {}): string {
  const sizes = allSizes();
  const uk = sizes.filter((s) => !Number.isNaN(ukSizeNumber(s)));
  const nums = uk.map(ukSizeNumber);
  const evenRun = nums.every((n, i) => i === 0 || n - nums[i - 1] === 2);
  const parts: string[] = [];
  if (uk.length > 0) {
    parts.push(evenRun && uk.length > 2 ? `${uk[0]} to ${short ? ukSizeNumber(uk.at(-1)!) : uk.at(-1)}` : uk.join(", "));
  }
  for (const other of sizes.filter((s) => Number.isNaN(ukSizeNumber(s)))) {
    const categories = [
      ...new Set(
        getAllProducts()
          .filter((p) => (p.sizes ?? []).includes(other))
          .map((p) => plural(p.category)),
      ),
    ];
    parts.push(`${other} for ${categories.join(" and ")}`);
  }
  return parts.join(", and ");
}

// ---------- occasions ----------

// Words after "Evening wear" in each occasion page's h1. Keyed by the data's
// occasion name; no word the data doesn't have.
const OCCASION_PHRASE: Record<string, string> = {
  "black tie": "for black tie",
  "christmas party": "for a Christmas party",
  cocktail: "for cocktails",
  dinner: "for dinner",
  "engagement party": "for an engagement party",
  gala: "for a gala",
  "new year's eve": "for New Year's Eve",
  "winter wedding": "for a winter wedding",
};

/** e.g. "for a winter wedding". Unmapped occasions fall back to "for <name>". */
export function occasionPhrase(name: string): string {
  return OCCASION_PHRASE[name] ?? `for ${occasionDisplayName(name).toLowerCase()}`;
}

export function getOccasionBySlug(slug: string): Occasion | undefined {
  return getOccasions().find((o) => o.slug === slug);
}

/** Pieces for an occasion that can be bought: unavailable pieces are left out. */
export function getOccasionProducts(name: string): Product[] {
  return products.filter(
    (p) => (p.occasions ?? []).includes(name) && getStatus(p) !== "unavailable",
  );
}
