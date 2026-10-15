// Occasion page copy, built in code from data/products.json and lib/brand.ts.
// Nothing here is typed by hand except the sentence frames.
import { RETURNS, SHIPPING_DAYS } from "./brand";
import { getStatus } from "./delivery";
import {
  formatPrice,
  getAllProducts,
  hasValue,
  occasionPhrase,
  sizesText,
  type Product,
} from "./products";

export type FaqItem = { question: string; answer: string };

const UNCOUNTABLE = new Set(["outerwear"]);

function categoryPlural(category: string): string {
  if (UNCOUNTABLE.has(category)) return category;
  if (category.endsWith("y")) return `${category.slice(0, -1)}ies`;
  if (/(s|sh|ch|x)$/.test(category)) return `${category}es`;
  return `${category}s`;
}

/** "a, b and c" */
function list(items: string[]): string {
  return items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

/** "14 to 21" or "14" when both ends match. */
function range(min: number, max: number): string {
  return min === max ? `${min}` : `${min} to ${max}`;
}

const unique = <T,>(values: T[]) => [...new Set(values)];

export type OccasionSummary = {
  count: number;
  categories: string[];
  fabrics: string[];
  price: { min: number; max: number } | null;
  madeToOrder: number;
  inStock: number;
  lead: { min: number; max: number } | null; // made-to-order pieces only
};

/** Expects available pieces only (see getOccasionProducts). */
export function occasionSummary(products: Product[]): OccasionSummary {
  const prices = products.map((p) => p.price_gbp).filter((v) => hasValue(v));
  const mto = products.filter((p) => getStatus(p) === "made_to_order");
  const leads = mto.map((p) => p.lead_time_days).filter((v) => hasValue(v));
  return {
    count: products.length,
    categories: unique(products.map((p) => p.category).filter((v) => hasValue(v))),
    fabrics: unique(products.map((p) => p.fabric).filter((v) => hasValue(v))),
    price: prices.length ? { min: Math.min(...prices), max: Math.max(...prices) } : null,
    madeToOrder: mto.length,
    inStock: products.filter((p) => getStatus(p) === "in_stock").length,
    lead: leads.length ? { min: Math.min(...leads), max: Math.max(...leads) } : null,
  };
}

function priceText(price: { min: number; max: number }): string {
  return price.min === price.max
    ? formatPrice(price.min)
    : `from ${formatPrice(price.min)} to ${formatPrice(price.max)}`;
}

/** The opening answer: 2–3 sentences. */
export function openingAnswer(name: string, s: OccasionSummary): string[] {
  const pieces = `${s.count} ${s.count === 1 ? "piece" : "pieces"} ${occasionPhrase(name)}`;
  const details = [
    s.categories.length > 0 && list(s.categories.map(categoryPlural)),
    s.fabrics.length > 0 && `in ${list(s.fabrics)}`,
  ].filter(Boolean);
  const sentences = [`Velmora has ${pieces}${details.length ? `: ${details.join(", ")}` : ""}.`];

  if (s.price) {
    sentences.push(
      s.price.min === s.price.max
        ? `The price is ${formatPrice(s.price.min)}.`
        : `Prices run from ${formatPrice(s.price.min)} to ${formatPrice(s.price.max)}.`,
    );
  }

  const making = s.lead
    ? `made to order in our London studio in ${range(s.lead.min, s.lead.max)} days`
    : "made to order in our London studio";
  if (s.madeToOrder > 0 && s.inStock > 0) {
    sentences.push(
      `Of these, ${s.madeToOrder} ${s.madeToOrder === 1 ? "is" : "are"} ${making}, ` +
        `and ${s.inStock} ${s.inStock === 1 ? "ships" : "ship"} from stock.`,
    );
  } else if (s.madeToOrder > 0) {
    sentences.push(s.madeToOrder === 1 ? `It is ${making}.` : `All ${s.madeToOrder} are ${making}.`);
  } else if (s.inStock > 0) {
    sentences.push(s.inStock === 1 ? "It ships from stock." : `All ${s.inStock} ship from stock.`);
  }
  return sentences;
}

/** Longest made-to-order lead time + maximum shipping. Null with no made-to-order pieces. */
export function deadlineText(s: OccasionSummary): string | null {
  if (!s.lead) return null;
  const uk = s.lead.max + SHIPPING_DAYS.UK.max;
  const eu = s.lead.max + SHIPPING_DAYS.EU.max;
  return `For made-to-order pieces, order at least ${uk} days before your date for UK delivery, or ${eu} days for the EU.`;
}

/** Meta description, built like the opening answer. */
export function occasionDescription(name: string, s: OccasionSummary): string {
  const first = `${s.count} ${s.count === 1 ? "piece" : "pieces"} ${occasionPhrase(name)}${
    s.price ? `, ${priceText(s.price)}` : ""
  }.`;
  const making = s.lead ? `Made to order in London in ${range(s.lead.min, s.lead.max)} days` : null;
  const second =
    making && s.inStock > 0
      ? `${making}, or ready to ship.`
      : making
        ? `${making}.`
        : s.inStock > 0
          ? "Ready to ship."
          : null;
  return [first, second, "Delivered to the UK and the EU."].filter(Boolean).join(" ");
}

/** Same on every occasion page. Answers from the data and lib/brand.ts only. */
export function occasionFaq(): FaqItem[] {
  const all = getAllProducts();
  const mtoLeads = all.filter((p) => getStatus(p) === "made_to_order").map((p) => p.lead_time_days);
  const stockLeads = all.filter((p) => getStatus(p) === "in_stock").map((p) => p.lead_time_days);
  const uk = SHIPPING_DAYS.UK;
  const eu = SHIPPING_DAYS.EU;

  const making = [
    `Most pieces are made to order in our London studio in ${range(Math.min(...mtoLeads), Math.max(...mtoLeads))} days.`,
    stockLeads.length > 0 &&
      `Pieces marked Ready to ship leave the studio within ${Math.max(...stockLeads)} ${Math.max(...stockLeads) === 1 ? "day" : "days"}.`,
  ].filter(Boolean);

  return [
    { question: "How long does making take?", answer: making.join(" ") },
    {
      question: "How long does shipping take?",
      answer: `${range(uk.min, uk.max)} days to the UK and ${range(eu.min, eu.max)} days to the EU, after making.`,
    },
    { question: "What sizes do you make?", answer: `${sizesText({ short: true })}.` },
    {
      question: "Can I return a piece?",
      answer: `Within ${RETURNS.days} days, ${RETURNS.condition}. ${RETURNS.exclusion}`,
    },
  ];
}
