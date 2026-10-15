import { test, expect } from "vitest";
import { arrivalWindow, orderByDate, getStatus, nextDate } from "./delivery";
import { getProduct } from "./products";

//helpers to build a UTC date from "YYYY-MM-DD", and turn a date back into "YYYY-MM-DD".
const d = (s: string) => new Date(s + "T00:00:00Z");
const iso = (date: Date) => date.toISOString().slice(0, 10);

//test products (checked in data/products.json):
//VLM-003  Isola dress  made to order, 21 days, VLM-010  Livia dress  made to order, 14 days, VLM-021  Isola dress not made to order nor in stock -> unavailable
//shipping from brand.md: UK 3–5 days, EU 5–8 days(All dates are calendar days).
//arrival = order date + lead time + shipping (min for earliest, max for latest).

test("21-day piece, UK, ordered on Black Friday", () => {
  const w = arrivalWindow(getProduct("VLM-003")!, "UK", d("2026-11-27"))!;
  expect(iso(w.earliest)).toBe("2026-12-21");
  expect(iso(w.latest)).toBe("2026-12-23");
});

test("21-day piece, EU, ordered on Black Friday, arrives after Christmas", () => {
  const w = arrivalWindow(getProduct("VLM-003")!, "EU", d("2026-11-27"))!;
  expect(iso(w.latest)).toBe("2026-12-26");
});

//order-by = event date − (lead time + max shipping).

test("21-day piece, UK: order by 28 Nov to arrive by Christmas Eve", () => {
  const date = orderByDate(getProduct("VLM-003")!, "UK", d("2026-12-24"))!;
  expect(iso(date)).toBe("2026-11-28");
});

test("21-day piece, EU: order by 25 Nov to arrive by Christmas Eve", () => {
  const date = orderByDate(getProduct("VLM-003")!, "EU", d("2026-12-24"))!;
  expect(iso(date)).toBe("2026-11-25");
});

test("14-day piece, EU: order by 9 Dec to arrive by New Year's Eve", () => {
  const date = orderByDate(getProduct("VLM-010")!, "EU", d("2026-12-31"))!;
  expect(iso(date)).toBe("2026-12-09");
});

//unavailable products must never get a date.
test("VLM-021 is unavailable and gets no dates", () => {
  const p = getProduct("VLM-021")!;
  expect(getStatus(p)).toBe("unavailable");
  expect(arrivalWindow(p, "UK", d("2026-11-27"))).toBeNull();
  expect(orderByDate(p, "UK", d("2026-12-24"))).toBeNull();
});

//nextDate: the next given day on or after the start date.
test("nextDate from 1 December 2026 is 24 December 2026", () => {
  expect(iso(nextDate(12, 24, d("2026-12-01")))).toBe("2026-12-24");
});

test("nextDate from 25 December 2026 is 24 December 2027", () => {
  expect(iso(nextDate(12, 24, d("2026-12-25")))).toBe("2027-12-24");
});
