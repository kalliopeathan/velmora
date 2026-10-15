import { test, expect } from "vitest";
import {
  allOccasions,
  allSizes,
  runStructured,
  validateExtraction,
  validatePicks,
} from "./helper";

//today is fixed so "past date" doesn't drift.
const ctx = {
  today: new Date("2026-10-15T09:00:00Z"),
  occasions: allOccasions(),
  sizes: allSizes(),
};

const base = {
  occasion: "winter wedding",
  event_date: "2026-12-19",
  size: "UK 12",
  country: "UK",
  max_budget_gbp: 600,
};

// validateExtraction

test("valid extraction passes through", () => {
  expect(validateExtraction(base, ctx)).toEqual({
    occasion: "winter wedding",
    event_date: "2026-12-19",
    size: "UK 12",
    sizeUnavailable: false,
    country: "UK",
    budget: 600,
  });
});

test("a size Velmora doesn't make is flagged, not ignored", () => {
  const e = validateExtraction({ ...base, size: "UK 22" }, ctx);
  expect(e.size).toBeNull();
  expect(e.sizeUnavailable).toBe(true);
});

test('a bare size "20" is read as UK 20 and flagged', () => {
  const e = validateExtraction({ ...base, size: "20" }, ctx);
  expect(e.size).toBeNull();
  expect(e.sizeUnavailable).toBe(true);
});

test("no size given is not flagged", () => {
  const e = validateExtraction({ ...base, size: null }, ctx);
  expect(e.size).toBeNull();
  expect(e.sizeUnavailable).toBe(false);
});

test("2026-02-30 is not a real date", () => {
  expect(validateExtraction({ ...base, event_date: "2026-02-30" }, ctx).event_date).toBeNull();
});

test("a past date is rejected", () => {
  expect(validateExtraction({ ...base, event_date: "2026-10-14" }, ctx).event_date).toBeNull();
});

// validatePicks

const shortlist = ["VLM-009", "VLM-010", "VLM-016"];

test("an id outside the shortlist is dropped", () => {
  const picks = validatePicks(
    { picks: [{ id: "VLM-999", reason: "Velvet, relaxed fit." }, { id: "VLM-010", reason: "Velvet." }] },
    shortlist,
  );
  expect(picks).toEqual([{ id: "VLM-010", reason: "Velvet." }]);
});

test("a reason with £ or a digit is nulled", () => {
  const picks = validatePicks(
    {
      picks: [
        { id: "VLM-009", reason: "Under £400." },
        { id: "VLM-010", reason: "Arrives in 3 weeks." },
      ],
    },
    shortlist,
  );
  expect(picks.map((p) => p.reason)).toEqual([null, null]);
});

test('a reason with "stunning" is nulled', () => {
  const picks = validatePicks({ picks: [{ id: "VLM-016", reason: "A Stunning velvet dress." }] }, shortlist);
  expect(picks).toEqual([{ id: "VLM-016", reason: null }]);
});

// runStructured (list form: code only, no model)

const fields = {
  occasion: "winter wedding",
  event_date: "2026-12-19",
  size: "UK 12",
  country: "UK",
};

test("valid fields return results with no reasons", () => {
  const response = runStructured(fields, ctx.today);
  expect(response.type).toBe("results");
  if (response.type !== "results") return;
  expect(response.picks.length).toBeGreaterThan(0);
  expect(response.picks.length).toBeLessThanOrEqual(3);
  expect(response.picks.every((p) => p.reason === null)).toBe(true);
});

test("a size Velmora doesn't make returns the size message", () => {
  const response = runStructured({ ...fields, size: "UK 22" }, ctx.today);
  expect(response.type).toBe("message");
  if (response.type !== "message") return;
  expect(response.text).toMatch(/^Velmora doesn't make that size\./);
});

test("a past date returns the question", () => {
  expect(runStructured({ ...fields, event_date: "2026-10-14" }, ctx.today)).toEqual({
    type: "question",
    missing: ["event_date"],
  });
});
