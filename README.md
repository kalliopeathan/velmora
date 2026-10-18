# Velmora

A concept site for a fictional London evening-wear label called Velmora - built for the GIS Analytics practical assessment.
Most of Velmora's pieces are made to order in 14 to 21 days, and the studio makes at most 20 a week. For a 21-day piece, the last UK order date for Christmas is 28 November, so for Velmora, Black Friday is a deadline more than a sale. The site is built around that so every piece says when it will arrive and nothing on the site is invented.


**Live site:** https://velmora-ashy.vercel.app
**One-page plan:** [docs/velmora-plan.pdf](docs/velmora-plan.pdf)
**Helper test log:** [TESTS.md](TESTS.md)

## What is included

- **Home page:** shop by occasion, ready-to-ship pieces, how made to order works, the delivery helper and an email sign-up.
- **Product pages:** all 48 products, generated from `products.json`. A holistic example is product [VLM-010](https://velmora-ashy.vercel.app/products/VLM-010), a made-to-order dress for winter weddings which shows every delivery feature. Each page shows the arrival window if ordered today and the order-by dates for 24 and 31 December, UK and EU. Once a deadline has passed it says the piece *may not* arrive in time, not that it will be late, because the dates assume the slowest shipping.
- **Occasion pages:** one per occasion, for example [/occasions/winter-wedding](https://velmora-ashy.vercel.app/occasions/winter-wedding).

Every product fact on the site (prices, fabrics, sizes, lead times) is read from the data while shipping and returns come from `brand.md`.

## The AI feature: delivery helper

A shopper describes their occasion, date, size and location, and gets up to three pieces that will arrive in time, each with its dates and a short reason.

The rule I built it around: the model reads the request but the code decides what is true. The pipeline includes:
1. **Extract (model):** Gemini turns the message into occasion, date, size, country and budget. Code then checks each field against the data so impossible dates, past dates and unknown values are excluded.
2. **Filter (code):** Code picks the pieces that match and will arrive in time. If nothing fits, code writes the answer ("Velmora doesn't make that size…", "Velmora ships to the UK and the EU only", "may not arrive by…") and the model isn't asked.
3. **Rank (model):** Gemini picks up to three ids from the shortlist and writes a reason. It never sees prices, dates or names, so it can't get them wrong.
4. **Validate (code):** Code drops any id that wasn't on the shortlist and any reason containing a number, a £ sign or a banned word ("luxury", "stunning", "must-have", "!"). Prices and dates on the cards come from the data.
5. **(Fallaback):** There's also a **list form** (occasion, date, size, UK/EU) that skips the model entirely. It's instant, works with no API key, and opens automatically if Gemini is slow or down, so the helper never just fails.

Model: `gemini-3.5-flash-lite`, pinned, with thinking set to minimal since the job is small and the code checks everything. I tried a flagship reasoning model first and dropped it for cost and speed. The API key only exists in server environment variables, and model errors are logged with the key redacted.

[TESTS.md](TESTS.md) has 15 tricky cases: an unmade size, a product that doesn't exist, a date that's already passed, a request to ignore instructions. All 15 pass. On the first run one failed (a size of 20 was silently ignored) but this was fixed (the cause and fix are recorded in the file).

## Optional extensions

### Helping AI assistants recommend Velmora

The founder wants Velmora to come up when someone asks an assistant for "an evening dress for a winter wedding".

- **Occasion pages** answer that question directly. Each opens with a two-sentence answer built from the data (how many pieces, fabrics, price range, making time, what ships from stock), then a deadline line ("order at least 26 days before your date for UK delivery"), the pieces, a short FAQ and links to the other occasions.
- **Structured data** on every page, generated from the same data as the visible page so the two do not differ:
  - Product pages: Product with price, availability (made to order or in stock), shipping times and the 14-day return policy
  - Occasion pages: ItemList, FAQPage and BreadcrumbList
  - Home page: Organization
  - No ratings or reviews since Velmora doesn't have any
- **Flag: Distinct names.** Product names repeat in the catalogue (eight "Isola dress" entries), so on the site and in the structured data each piece is labelled with its colour and fabric, e.g. "Isola dress, champagne jersey".
- **[robots.txt](https://velmora-ashy.vercel.app/robots.txt)** allows all crawlers and names the AI ones (GPTBot, OAI-SearchBot, PerplexityBot, ClaudeBot). **[sitemap.xml](https://velmora-ashy.vercel.app/sitemap.xml)** lists all 57 pages.
- Checked with Google's [Rich Results Test](https://search.google.com/test/rich-results) and [validator.schema.org](https://validator.schema.org).

Directly, this will not affect Black Friday sales as a new site with no reviews or backlinks takes months to be recommended. I'd measure it by referral visits from chatgpt.com and perplexity.ai.

### Performance and accessibility

Lighthouse, mobile, run on the live site:

| Page | Performance | Accessibility | Best practices | SEO |
|---|---|---|---|---|
| Home | 99 | 100 | 100 | 100 |
| Product (VLM-010) | 97 | 100 | 100 | 100 |

The full reports are in [`docs/lighthouse/`](docs/lighthouse/). GitHub shows HTML files as code, so download one and open it in a browser to read it. To run the same test yourself, paste the site into [PageSpeed Insights](https://pagespeed.web.dev/report?url=https%3A%2F%2Fvelmora-ashy.vercel.app), which runs Lighthouse online. Scores move a few points between runs. Lighthouse also listed a few small suggestions (some unused JavaScript, code for older browsers, and a stylesheet that loads before the page shows) but they all come from Next.js's own framework code, and fixing them would save only a little so I left them in the interest of the deeadline.

Specifics of Accessibility: a skip link, visible focus outlines on everything you can tab to, labelled inputs, AI helper results announced to screen readers, tap targets of at least 44px, and one contrast fix (the email field's border was 2.4:1, now about 6:1).

## How I used AI

I used Claude Code to write the code and Claude for a first pass at the data analysis before a thorough check of my own in the code (and Gemini inside the helper).

Claude Code ran in manual mode the whole time, so it had to ask before every file edit and command. I wrote detailed prompts, had it plan before larger changes, and read every plan and diff before approving, intervening if something was wrong. I also re-ran every number with my own script (`analysis/verify_numbers.py`).

Testing was shared. Claude Code drafted the unit tests and ran the 15 helper cases in TESTS.md while I made some changes over the drafts and I also worked out the expected delivery dates by hand before before the tests, checked each TESTS.md result, and tested every page myself.
Some things I caught and changed:

- Copy that wasn't in the brief: "each piece is cut and sewn", "Dresses for a winter wedding" (the set includes a top), and "only accessories ship from stock" (when actually the data has in-stock dresses).
- Shipping times defined twice, so the home page and the delivery dates could disagree. Now they come from one place.
- My own extraction prompt told the model to return only listed sizes, which hid unmade sizes from the code (the test 4 failure).
- An `rm` command with an unguarded variable path, rewritten before I approved it so it does not delete uncalled for files.
- Next.js's starter had `agentFeedback` switched on, which writes instructions into AGENTS.md asking AI agents to report session details. I turned it off.
- A trailing slash in the site URL that put `//` into every sitemap and structured-data link.

## Assumptions

- Lead times and shipping are calendar days.
- Dates assume the studio's queue is clear.
- In-stock pieces' 3-day lead time is dispatch time.

## Data issues to raise with the client

- Desktop email traffic shows more checkouts than add-to-carts in June to August - potential tracking issue.
- The catalogue runs £90–£680 - not £60–£690 (`brand.md`)
- There's no plain "wedding" occasion, only "winter wedding", so "a wedding in June" can't be matched.

## What I'd do next

- Return a real 404 status for unknown pages (they show the right page but return 200 on the first visit).
- Tell shoppers when a product they name doesn't exist, and say why a date was rejected.
- Show the year on order-by dates in late December.
- A size chart from the client, for a fit helper.
- Unique product names in the catalogue itself.
- A paid Gemini tier, so shopper messages aren't used for training.

## Running it locally

```bash
npm install
echo "GEMINI_API_KEY=your-key" > .env.local   # free key from aistudio.google.com
npm run dev                                   # http://localhost:3000
npm test                                      # unit tests (Vitest)
```

The helper's list form works without a key.

Built with Next.js 16, TypeScript, Tailwind CSS 4, Vitest and `@google/genai`, deployed on Vercel. GitHub Actions runs the tests and a build on every pull request.