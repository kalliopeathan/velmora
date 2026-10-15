// AI shopping helper. Code filters products and calculates every date; the
// model only extracts the request (step 1) and picks ids from a shortlist
// (step 3). No prices, dates or names are ever sent to the model.
import { readFileSync } from "node:fs";
import path from "node:path";
import { ThinkingLevel, Type, type GoogleGenAI, type Schema } from "@google/genai";
import { SHIPPING_DAYS } from "./brand";
import {
  arrivalWindow,
  arrivesInTime,
  formatDate,
  getStatus,
  orderByDate,
  toUtcDay,
  type Country,
} from "./delivery";
import {
  displayLabel,
  formatPrice,
  getAllProducts,
  hasValue,
  occasionDisplayName,
  type Product,
} from "./products";

// Pinned, not -latest, so output stays consistent.
export const MODEL = "gemini-3.5-flash-lite";
export const MAX_MESSAGE_LENGTH = 400;
const MAX_PICKS = 3;
const MAX_REASON_LENGTH = 160;
const MODEL_TIMEOUT_MS = 8000;
// Extracting fields and picking ids need no reasoning: lowest thinking level.
const THINKING = { thinkingLevel: ThinkingLevel.MINIMAL };
// Voice rules from CLAUDE.md: a reason using these is dropped, not edited.
const BANNED_REASON = /luxury|stunning|must-have|!/i;
const ONE_SIZE = "one size";
const QUEUE_NOTE = "Dates assume the studio's queue is clear.";

const OTHER_COUNTRY_TEXT = "Velmora ships to the UK and the EU only.";

export type Extraction = {
  occasion: string | null;
  event_date: string | null; // YYYY-MM-DD, UTC
  size: string | null;
  sizeUnavailable: boolean; // a size was given but Velmora doesn't make it
  country: "UK" | "EU" | "OTHER" | null;
  budget: number | null;
};

export type Pick = {
  id: string;
  label: string;
  price: string | null;
  size: string | null; // the shopper's size, or "one size" for accessories
  arrival: { earliest: string; latest: string };
  orderBy: string;
  calculation: { leadTimeDays: number; shippingDays: { min: number; max: number } };
  queueNote: string | null;
  reason: string | null;
};

export type HelperResponse =
  | { type: "message"; text: string }
  | { type: "question"; missing: ("occasion" | "event_date")[] }
  | { type: "none"; text: string }
  | {
      type: "results";
      country: Country;
      countryAssumed: boolean;
      occasion: string;
      eventDate: string;
      picks: Pick[];
    };

/** Structured input from the helper's list form. */
export type HelperFields = {
  occasion: string | null;
  event_date: string | null;
  size: string | null;
  country: string | null;
};

// ---------- shared data (CODE) ----------

const iso = (date: Date) => date.toISOString().slice(0, 10);

export function allOccasions(): string[] {
  return [...new Set(getAllProducts().flatMap((p) => p.occasions ?? []))].sort();
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

/** Dropdown options for the helper's list form, from the data. */
export function helperFormOptions() {
  return {
    occasions: allOccasions().map((o) => ({ value: o, label: occasionDisplayName(o) })),
    sizes: allSizes(),
  };
}

const plural = (category: string) =>
  category.endsWith("y") ? `${category.slice(0, -1)}ies` : `${category}s`;

/** CODE. e.g. "UK 6 to UK 18, and one size for accessories", built from the data. */
export function sizesText(): string {
  const sizes = allSizes();
  const uk = sizes.filter((s) => !Number.isNaN(ukSizeNumber(s)));
  const nums = uk.map(ukSizeNumber);
  const evenRun = nums.every((n, i) => i === 0 || n - nums[i - 1] === 2);
  const parts: string[] = [];
  if (uk.length > 0) {
    parts.push(evenRun && uk.length > 2 ? `${uk[0]} to ${uk.at(-1)}` : uk.join(", "));
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

function loadPrompt(name: string): string {
  return readFileSync(path.join(process.cwd(), "prompts", name), "utf8");
}

export function extractInstruction(now: Date): string {
  return loadPrompt("extract.txt")
    .replaceAll("{{TODAY}}", iso(toUtcDay(now)))
    .replaceAll("{{OCCASIONS}}", JSON.stringify(allOccasions()))
    .replaceAll("{{SIZES}}", JSON.stringify(allSizes()));
}

function parseJson(text: string | undefined): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Server log for a failed model call: error name and message only. The key and
 * the shopper's message are redacted in case an error ever echoes them.
 */
export function logModelError(step: "extract" | "rank", error: unknown, message: string): void {
  const name = error instanceof Error ? error.name : typeof error;
  let text = error instanceof Error ? error.message : String(error);
  for (const secret of [process.env.GEMINI_API_KEY, message]) {
    if (secret) text = text.replaceAll(secret, "[redacted]");
  }
  console.error(`[helper] ${step} failed (${MODEL}): ${name}: ${text}`);
}

// ---------- step 1: EXTRACT (MODEL) ----------

function extractSchema(): Schema {
  return {
    type: Type.OBJECT,
    properties: {
      occasion: { type: Type.STRING, format: "enum", enum: allOccasions(), nullable: true },
      event_date: { type: Type.STRING, nullable: true },
      // Free string, not an enum: a size we don't make must reach code to be flagged.
      size: { type: Type.STRING, nullable: true },
      country: { type: Type.STRING, format: "enum", enum: ["UK", "EU", "OTHER"], nullable: true },
      max_budget_gbp: { type: Type.NUMBER, nullable: true },
    },
    required: ["occasion", "event_date", "size", "country", "max_budget_gbp"],
  };
}

/** MODEL. Throws on API failure (caller returns 503). Invalid JSON -> all nulls. */
export async function extract(ai: GoogleGenAI, message: string, now: Date): Promise<Extraction> {
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: message,
    config: {
      systemInstruction: extractInstruction(now),
      responseMimeType: "application/json",
      responseSchema: extractSchema(),
      thinkingConfig: THINKING,
      abortSignal: AbortSignal.timeout(MODEL_TIMEOUT_MS),
    },
  });
  return validateExtraction(parseJson(response.text), {
    today: now,
    occasions: allOccasions(),
    sizes: allSizes(),
  });
}

// ---------- step 1b: validate extraction (CODE) ----------

/** A real calendar date "YYYY-MM-DD" (UTC), or null. Rejects e.g. 2026-02-30. */
function parseIsoDate(value: unknown): Date | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && iso(date) === value ? date : null;
}

export function validateExtraction(
  raw: unknown,
  ctx: { today: Date; occasions: string[]; sizes: string[] },
): Extraction {
  const r = (raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {}) as Record<
    string,
    unknown
  >;
  const pick = <T extends string>(value: unknown, allowed: readonly T[]): T | null =>
    typeof value === "string" && (allowed as readonly string[]).includes(value)
      ? (value as T)
      : null;

  // Sizes match ignoring case and spacing ("uk  10" -> "UK 10").
  const normalise = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();
  const givenSize = typeof r.size === "string" && r.size.trim() ? r.size : null;
  const size = givenSize
    ? (ctx.sizes.find((s) => normalise(s) === normalise(givenSize)) ?? null)
    : null;

  const date = parseIsoDate(r.event_date);
  const notPast = date !== null && date.getTime() >= toUtcDay(ctx.today).getTime();
  const budget = r.max_budget_gbp;

  return {
    occasion: pick(r.occasion, ctx.occasions),
    event_date: notPast ? (r.event_date as string) : null,
    size,
    sizeUnavailable: givenSize !== null && size === null,
    country: pick(r.country, ["UK", "EU", "OTHER"] as const),
    budget:
      typeof budget === "number" && Number.isFinite(budget) && budget > 0 ? budget : null,
  };
}

// ---------- step 2: FILTER (CODE) ----------

function latestArrival(p: Product, country: Country, now: Date): number {
  return arrivalWindow(p, country, now)?.latest.getTime() ?? Infinity;
}

/** Everything but the date: occasion, size (one size fits any), available, budget. */
function matchesRequest(p: Product, e: Extraction): boolean {
  if (!e.occasion || !(p.occasions ?? []).includes(e.occasion)) return false;
  if (e.size && !(p.sizes ?? []).some((s) => s === e.size || s === ONE_SIZE)) return false;
  if (getStatus(p) === "unavailable") return false;
  if (e.budget !== null && !(hasValue(p.price_gbp) && p.price_gbp <= e.budget)) return false;
  return true;
}

export type FilterResult =
  | { type: "message"; text: string }
  | { type: "question"; missing: ("occasion" | "event_date")[] }
  | { type: "none"; text: string }
  | { type: "shortlist"; country: Country; eventDate: Date; products: Product[] };

export function filterProducts(e: Extraction, now: Date): FilterResult {
  if (e.country === "OTHER") return { type: "message", text: OTHER_COUNTRY_TEXT };
  if (e.sizeUnavailable) {
    return {
      type: "message",
      text: `Velmora doesn't make that size. Sizes are ${sizesText()}.`,
    };
  }

  const missing: ("occasion" | "event_date")[] = [];
  if (!e.occasion) missing.push("occasion");
  if (!e.event_date) missing.push("event_date");
  if (missing.length > 0) return { type: "question", missing };

  const country: Country = e.country ?? "UK";
  const eventDate = parseIsoDate(e.event_date)!;

  // Soonest latest-arrival first, then id, so the fallback "first 3" are the
  // safest bets for the date.
  const candidates = getAllProducts()
    .filter((p) => matchesRequest(p, e))
    .sort(
      (a, b) =>
        latestArrival(a, country, now) - latestArrival(b, country, now) ||
        a.id.localeCompare(b.id),
    );
  const products = candidates.filter((p) => arrivesInTime(p, country, now, eventDate));

  if (products.length === 0) {
    return { type: "none", text: noneText(candidates[0], country, now, eventDate) };
  }
  return { type: "shortlist", country, eventDate, products };
}

/** CODE writes every "I don't know" answer. */
function noneText(soonest: Product | undefined, country: Country, now: Date, eventDate: Date) {
  if (!soonest) return "No piece matches all of those details.";
  const w = arrivalWindow(soonest, country, now)!;
  return (
    `Ordered today, the matching pieces may not arrive by ${formatDate(eventDate)}. ` +
    `The soonest is ${displayLabel(soonest)}: ${formatDate(w.earliest)} to ${formatDate(w.latest)} to the ${country}.`
  );
}

// ---------- step 3: RANK (MODEL) ----------

const rankSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    picks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: { id: { type: Type.STRING }, reason: { type: Type.STRING } },
        required: ["id", "reason"],
      },
    },
  },
  required: ["picks"],
};

/** Only the fields the model may see: no prices, dates or names. */
export function shortlistForModel(products: Product[]) {
  return products.map(({ id, category, colours, fabric, fit, occasions }) => ({
    id,
    category,
    colours,
    fabric,
    fit,
    occasions,
  }));
}

/** MODEL. Returns parsed JSON, or null on any failure (API error, rate limit, timeout, bad JSON). */
export async function rank(
  ai: GoogleGenAI,
  message: string,
  products: Product[],
): Promise<unknown> {
  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents:
        `Shopper's message:\n${message}\n\n` +
        `Shortlist:\n${JSON.stringify(shortlistForModel(products))}`,
      config: {
        systemInstruction: loadPrompt("rank.txt"),
        responseMimeType: "application/json",
        responseSchema: rankSchema,
        thinkingConfig: THINKING,
        abortSignal: AbortSignal.timeout(MODEL_TIMEOUT_MS),
      },
    });
    return parseJson(response.text);
  } catch (error) {
    logModelError("rank", error, message);
    return null;
  }
}

// ---------- step 4: VALIDATE picks (CODE) ----------

function cleanReason(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const reason = value.trim();
  if (
    !reason ||
    reason.length > MAX_REASON_LENGTH ||
    /[\d£]/.test(reason) ||
    BANNED_REASON.test(reason)
  ) {
    return null;
  }
  return reason;
}

/**
 * Keeps up to 3 picks whose id is in the shortlist (no duplicates), with
 * unsafe reasons nulled. Returns [] if the model output has no usable picks.
 */
export function validatePicks(
  raw: unknown,
  shortlistIds: string[],
): { id: string; reason: string | null }[] {
  const list =
    raw && typeof raw === "object" && Array.isArray((raw as { picks?: unknown }).picks)
      ? ((raw as { picks: unknown[] }).picks)
      : [];
  const allowed = new Set(shortlistIds);
  const seen = new Set<string>();
  const picks: { id: string; reason: string | null }[] = [];
  for (const item of list) {
    if (picks.length === MAX_PICKS) break;
    if (!item || typeof item !== "object") continue;
    const { id, reason } = item as { id?: unknown; reason?: unknown };
    if (typeof id !== "string" || !allowed.has(id) || seen.has(id)) continue;
    seen.add(id);
    picks.push({ id, reason: cleanReason(reason) });
  }
  return picks;
}

// ---------- results: attach facts (CODE) ----------

/** The size that matched: the shopper's own, else "one size" (fits any). */
function matchedSize(p: Product, size: string | null): string | null {
  const sizes = p.sizes ?? [];
  if (size && sizes.includes(size)) return size;
  return sizes.includes(ONE_SIZE) ? ONE_SIZE : null;
}

export function buildPick(
  p: Product,
  reason: string | null,
  size: string | null,
  country: Country,
  now: Date,
  eventDate: Date,
): Pick {
  const w = arrivalWindow(p, country, now)!;
  return {
    id: p.id,
    label: displayLabel(p),
    price: hasValue(p.price_gbp) ? formatPrice(p.price_gbp) : null,
    size: matchedSize(p, size),
    arrival: { earliest: iso(w.earliest), latest: iso(w.latest) },
    orderBy: iso(orderByDate(p, country, eventDate)!),
    calculation: { leadTimeDays: p.lead_time_days, shippingDays: { ...SHIPPING_DAYS[country] } },
    queueNote: getStatus(p) === "made_to_order" ? QUEUE_NOTE : null,
    reason,
  };
}

// ---------- pipeline ----------

export async function runHelper(
  ai: GoogleGenAI,
  message: string,
  now: Date = new Date(),
): Promise<HelperResponse> {
  const extraction = await extract(ai, message, now); // MODEL (throws -> 503)
  const filtered = filterProducts(extraction, now); // CODE
  if (filtered.type !== "shortlist") return filtered;

  const { products } = filtered;
  const ranked = await rank(ai, message, products); // MODEL
  const picks = validatePicks(ranked, products.map((p) => p.id)); // CODE
  return toResults(extraction, filtered, picks, now);
}

/**
 * CODE only, no model: the list form's path. Same validation and filter as
 * free text, then the first 3 of the shortlist (safest dates first), no reasons.
 */
export function runStructured(fields: HelperFields, now: Date = new Date()): HelperResponse {
  const extraction = validateExtraction(
    { ...fields, max_budget_gbp: null },
    { today: now, occasions: allOccasions(), sizes: allSizes() },
  );
  const filtered = filterProducts(extraction, now);
  if (filtered.type !== "shortlist") return filtered;
  return toResults(extraction, filtered, [], now);
}

/** Attaches every fact in code. No usable picks -> the first 3 of the shortlist. */
function toResults(
  extraction: Extraction,
  { products, country, eventDate }: Extract<FilterResult, { type: "shortlist" }>,
  picks: { id: string; reason: string | null }[],
  now: Date,
): HelperResponse {
  if (picks.length === 0) {
    picks = products.slice(0, MAX_PICKS).map((p) => ({ id: p.id, reason: null }));
  }
  const byId = new Map(products.map((p) => [p.id, p]));
  return {
    type: "results",
    country,
    countryAssumed: extraction.country === null,
    occasion: extraction.occasion!,
    eventDate: iso(eventDate),
    picks: picks.map((pk) =>
      buildPick(byId.get(pk.id)!, pk.reason, extraction.size, country, now, eventDate),
    ),
  };
}
