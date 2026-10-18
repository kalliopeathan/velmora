// Delivery maths. Pure functions, UTC calendar dates only.
// UTC so a date never shifts with the server's or the shopper's time zone.
//
// Arrival  = order date + lead_time_days + shipping (min/max).
// Order-by = event date − (lead_time_days + max shipping).

// Shipping days after making come from lib/brand.ts (UK 3 to 5, EU 5 to 8).
// ASSUMPTION (needs client confirmation): these are calendar days, not
// working days, and lead_time_days is calendar days too.
import { SHIPPING_DAYS } from "./brand";

export type Country = "UK" | "EU";

export type DeliveryStatus = "made_to_order" | "in_stock" | "unavailable";

/** The product fields delivery needs, as they appear in data/products.json. */
export type DeliveryProduct = {
  made_to_order: boolean;
  in_stock: boolean;
  lead_time_days: number;
};

export type ArrivalWindow = { earliest: Date; latest: Date };

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Midnight UTC of the given instant's UTC calendar date. */
export function toUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

/** The next given day (month 1–12) on or after `from`, e.g. the next 24 December. */
export function nextDate(month: number, day: number, from: Date): Date {
  const start = toUtcDay(from);
  const year = start.getUTCFullYear();
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getTime() >= start.getTime()
    ? date
    : new Date(Date.UTC(year + 1, month - 1, day));
}

function addDays(date: Date, days: number): Date {
  return new Date(toUtcDay(date).getTime() + days * MS_PER_DAY);
}

export function getStatus(product: DeliveryProduct): DeliveryStatus {
  if (product.made_to_order) return "made_to_order";
  if (product.in_stock) return "in_stock";
  return "unavailable";
}

export function arrivalWindow(
  product: DeliveryProduct,
  country: Country,
  orderDate: Date,
): ArrivalWindow | null {
  if (getStatus(product) === "unavailable") return null;
  const shipping = SHIPPING_DAYS[country];
  return {
    earliest: addDays(orderDate, product.lead_time_days + shipping.min),
    latest: addDays(orderDate, product.lead_time_days + shipping.max),
  };
}

export function orderByDate(
  product: DeliveryProduct,
  country: Country,
  eventDate: Date,
): Date | null {
  if (getStatus(product) === "unavailable") return null;
  return addDays(
    eventDate,
    -(product.lead_time_days + SHIPPING_DAYS[country].max),
  );
}

/** True when the latest arrival is on or before the event date. False if unavailable. */
export function arrivesInTime(
  product: DeliveryProduct,
  country: Country,
  orderDate: Date,
  eventDate: Date,
): boolean {
  const window = arrivalWindow(product, country, orderDate);
  if (!window) return false;
  return window.latest.getTime() <= toUtcDay(eventDate).getTime();
}

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

/** e.g. "23 December" (UTC date). */
export function formatDate(date: Date): string {
  return dateFormat.format(date);
}
