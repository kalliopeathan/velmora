import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import DeliveryHelper from "@/components/DeliveryHelper";
import EmailSignup from "@/components/EmailSignup";
import { helperFormOptions } from "@/lib/helper";
import { organizationJsonLd, serializeJsonLd } from "@/lib/jsonld";
import { getInStock, getOccasions, occasionDisplayName } from "@/lib/products";
import { MADE_TO_ORDER_LEAD_DAYS, RETURNS, SHIPPING_DAYS } from "@/lib/brand";

const container = "mx-auto w-full max-w-6xl px-5 md:px-10";
const section = "border-t border-stone py-16 md:py-24";
const h2 = "font-serif text-4xl leading-[1.1] md:text-5xl";

function range(min: number, max: number): string {
  return min === max ? `${min}` : `${min} to ${max}`;
}

export default function Home() {
  const occasions = getOccasions();
  const inStock = getInStock();
  const stockLeadDays = inStock.map((p) => p.lead_time_days);
  const stockLead = range(Math.min(...stockLeadDays), Math.max(...stockLeadDays));
  const lead = range(MADE_TO_ORDER_LEAD_DAYS.min, MADE_TO_ORDER_LEAD_DAYS.max);
  const uk = range(SHIPPING_DAYS.UK.min, SHIPPING_DAYS.UK.max);
  const eu = range(SHIPPING_DAYS.EU.min, SHIPPING_DAYS.EU.max);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(organizationJsonLd()) }}
      />
      <section className={`${container} pt-16 pb-16 md:pt-28 md:pb-32`}>
        <h1 className="max-w-4xl font-serif text-5xl leading-[1.1] md:text-7xl lg:text-8xl">
          Evening wear, made to order in our London studio.
        </h1>
        <p className="mt-6 max-w-md text-base leading-relaxed text-ink/80">
          Made-to-order pieces take {lead} days, plus shipping.
        </p>
        <Link
          href="/occasions/winter-wedding"
          className="mt-10 inline-flex min-h-12 items-center bg-oxblood px-7 text-[13px] tracking-[0.06em] text-ivory hover:bg-ink"
        >
          Shop for a winter wedding
        </Link>
      </section>

      <section id="helper" className={section} aria-labelledby="helper-heading">
        <div className={container}>
          <h2 id="helper-heading" className={h2}>
            Delivery dates
          </h2>
          <div className="mt-10">
            <DeliveryHelper {...helperFormOptions()} />
          </div>
        </div>
      </section>

      <section id="occasions" className={section} aria-labelledby="occasions-heading">
        <div className={container}>
          <h2 id="occasions-heading" className={h2}>
            Shop by occasion
          </h2>
          <ul className="mt-10 grid grid-cols-2 gap-x-4 md:grid-cols-4 md:gap-x-10">
            {occasions.map((o) => (
              <li key={o.slug}>
                <Link
                  href={`/occasions/${o.slug}`}
                  className="group flex h-full min-h-28 flex-col justify-between border-t border-stone pt-4 pb-6"
                >
                  <span className="font-serif text-xl leading-tight underline-offset-4 group-hover:underline">
                    {occasionDisplayName(o.name)}
                  </span>
                  <span className="mt-4 text-[13px] tracking-[0.06em] text-ink/70">
                    {o.count} {o.count === 1 ? "piece" : "pieces"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="ready-to-ship" className={section} aria-labelledby="ready-heading">
        <div className={container}>
          <h2 id="ready-heading" className={h2}>
            Ready to ship
          </h2>
          <p className="mt-4 max-w-md text-base leading-relaxed text-ink/80">
            In stock and ready to send.
          </p>
          <ul className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-10">
            {inStock.map((p) => (
              <li key={p.id}>
                <ProductCard product={p} />
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className={section} aria-labelledby="how-heading">
        <div className={`${container} md:grid md:grid-cols-12 md:gap-10`}>
          <h2 id="how-heading" className={`${h2} md:col-span-5`}>
            How made to order works
          </h2>
          <ol className="mt-10 md:col-span-7 md:mt-0">
            <li className="border-t border-stone py-6 first:border-t-0 first:pt-0 md:first:border-t md:first:pt-6">
              <h3 className="font-serif text-xl">1. Made in London</h3>
              <p className="mt-2 max-w-prose leading-relaxed text-ink/80">
                Each piece is made in our London studio after you order. This takes {lead} days.
              </p>
            </li>
            <li className="border-t border-stone py-6">
              <h3 className="font-serif text-xl">2. Shipped to you</h3>
              <p className="mt-2 max-w-prose leading-relaxed text-ink/80">
                Shipping takes {uk} days to the UK and {eu} days to the EU, after making.
              </p>
            </li>
            <li className="border-t border-stone py-6">
              <h3 className="font-serif text-xl">3. Returns</h3>
              <p className="mt-2 max-w-prose leading-relaxed text-ink/80">
                Return within {RETURNS.days} days, {RETURNS.condition}. {RETURNS.exclusion}
              </p>
            </li>
          </ol>
          <p className="max-w-prose border-t border-stone pt-6 leading-relaxed text-ink/80 md:col-span-7 md:col-start-6">
            Ready-to-ship pieces ship from stock. Their lead time is {stockLead}{" "}
            {stockLead === "1" ? "day" : "days"}, then shipping as above.
          </p>
        </div>
      </section>

      <section className={section} aria-labelledby="signup-heading">
        <div className={container}>
          <h2 id="signup-heading" className={`${h2} max-w-xl`}>
            Christmas order-by dates and early access to the ready-to-ship edit.
          </h2>
          <EmailSignup />
        </div>
      </section>
    </>
  );
}
