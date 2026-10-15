import productsData from "@/data/products.json";

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

// Name + first colour + fabric, e.g. "Isola dress, black velvet".
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
