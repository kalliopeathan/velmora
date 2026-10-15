# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this repo is

A website build for **Velmora**, a fictional London evening-wear label (an assessment brief). The Next.js app in `app/` is still the untouched `create-next-app` starter; the real inputs are the client files in `data/`:

- `data/brand.md` — the brief: brand facts, goals (more web sales before Black Friday; be recommended by AI assistants for "an evening dress for a winter wedding"), audience, voice rules, palette and fonts. Read it before writing any copy or UI.
- `data/products.json` — 48 products (`id`, `name`, `category`, `price_gbp`, `colours`, `fabric`, `fit`, `sizes`, `occasions`, `made_to_order`, `lead_time_days`, `description`, `in_stock`). This is the product catalogue source of truth.
- `data/analytics.csv` — six months (2026-04 to 2026-09) of funnel data by `month` × `channel` × `device`.
- `analysis/verify_numbers.py` — pandas script that recomputes the funnel figures (totals, social vs non-social by device, Instagram-on-mobile, monthly cart→checkout, paid social, email). Any number quoted in copy or reports should match its output.

## Commands

```bash
npm run dev      # dev server at http://localhost:3000
npm run build
npm run lint     # ESLint 9 flat config (next core-web-vitals + typescript)
python3 analysis/verify_numbers.py   # run from repo root (uses relative path data/analytics.csv); needs pandas
```

There is no test suite.

## Stack notes

- Next.js 16.4 / React 19.3, App Router, TypeScript. Per `AGENTS.md`, check `node_modules/next/dist/docs/` before using Next APIs — they differ from older versions.
- `next.config.ts` enables `cacheComponents`, `partialPrefetching` and `experimental.agentFeedback`, and runs CSS through Tailwind v4 via a Turbopack loader rule (`@tailwindcss/turbopack`), not PostCSS.
- Tailwind v4 is configured in CSS (`app/globals.css`, `@import "tailwindcss"` + `@theme inline`); there is no `tailwind.config`.
- Layouts use the global `LayoutProps<"/">` type helper.
- Path alias: `@/*` → repo root.

## Brand constraints (from `data/brand.md`)

- Palette: ink `#1E1B1A`, ivory `#F6F1EA`, stone `#CFC6BA`, accent oxblood `#6B1F2A`. Fonts: Cormorant Garamond (headings), Inter (body) — the starter's Geist fonts should be replaced.
- Voice: calm, precise, short sentences; state fabric, fit and delivery date plainly. Never use "luxury", "stunning", "must-have", exclamation marks, invented reviews or invented scarcity (e.g. "only 2 left"). There are no customer reviews.
- No product photography exists: use credited Unsplash/Pexels images or plain placeholders; never a real brand's images or logo.
- Delivery promises must reflect made-to-order lead times (14–21 days, per product `lead_time_days`) plus shipping (UK 3–5 days, EU 5–8 days); accessories ship from stock. Studio capacity is 20 made-to-order pieces/week.

## Data caveats

- `analytics.csv` has rows where `checkouts_started > add_to_carts` (email/desktop, 2026-06 to 2026-08). The last section of `verify_numbers.py` lists them; treat them as a data-quality issue to flag rather than silently aggregate.
- Only `paid_social` has non-zero `ad_spend_gbp`, and only on mobile rows; `paid_social` rows are all zeros before 2026-08 (the test ran August–September).

## Velmora project rules (override anything above that conflicts)

### Build
- Next.js App Router, TypeScript, Tailwind v4 as configured. No extra UI libraries without asking.
- Mobile first: design at 375px wide, then scale up. Tap targets at least 44px. No sideways scrolling.
- Palette as Tailwind theme colours in app/globals.css: ink #1E1B1A, ivory #F6F1EA, stone #CFC6BA, oxblood #6B1F2A. Ink text on ivory.
- Fonts via next/font/google: Cormorant Garamond (headings), Inter (body). Remove Geist.
- Images: stone-coloured placeholder blocks with alt text. No real brand assets.
- Accessible: labelled inputs, alt text, sufficient contrast, aria-live for dynamic results.

### Pages required
- Home page: hero, shop by occasion, ready-to-ship (in-stock pieces), how made to order works, delivery helper, email sign-up.
- Product page (/products/[id], all products, VLM-010 showcased): facts, delivery box, returns line, helper.
- Occasion pages (/occasions/[slug]) and a Black Friday home page (/black-friday).

### Facts
- Every product fact comes from data/products.json via lib/; never typed by hand, never invented.
- Brand facts (shipping, returns, capacity) come only from data/brand.md.
- Identify products by id. Display label = name + first colour + fabric, built in code (names repeat).
- A missing field is omitted, never filled. VLM-021 is neither made to order nor in stock: unavailable.

### Delivery dates
- Arrival = order date + lead_time_days + shipping (UK 3–5, EU 5–8 days). Order-by = event date − (lead time + max shipping).
- Calendar days, UTC dates. Show the calculation. Add "Dates assume the studio's queue is clear."

### Voice and offers
- Calm, precise, warm, short sentences. State fabric, fit and delivery date plainly.
- Never: "luxury", "stunning", "must-have", exclamation marks, reviews, ratings, invented scarcity, countdown timers.
- Black Friday leads with order-by dates, not discounts. Any discount applies to in-stock pieces only, from one constant marked as a proposal.

### Structured data
- JSON-LD generated from the data: Product (sku = id, name = display label), Offer (GBP, MadeToOrder/InStock/OutOfStock), shipping details, 14-day return policy. Organization on home; ItemList + FAQPage on occasion pages. Never ratings or reviews.
- robots allows AI crawlers (GPTBot, OAI-SearchBot, PerplexityBot, ClaudeBot); sitemap lists all pages.

### AI helper (Gemini, @google/genai)
- Code filters products and calculates dates; the model only extracts the request and picks from shortlist ids.
- Never send prices, dates or names to the model. Validate every id it returns; drop reasons containing a digit or £.
- Code writes every "I don't know" answer. If the model fails, show the shortlist without reasons.
- Key is GEMINI_API_KEY, read only in server code. Messages capped at 400 characters.

### Tests
- Vitest, run with npm test. I write the test cases myself; set up the runner only when asked.

### Git
- Do not commit or push. I review every diff and commit myself.