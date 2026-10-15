import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import DeliveryHelper from "@/components/DeliveryHelper";
import ProductCard from "@/components/ProductCard";
import { getStatus } from "@/lib/delivery";
import { helperFormOptions } from "@/lib/helper";
import { occasionJsonLd, serializeJsonLd } from "@/lib/jsonld";
import {
  deadlineText,
  occasionDescription,
  occasionFaq,
  occasionSummary,
  openingAnswer,
} from "@/lib/occasions";
import {
  getOccasionBySlug,
  getOccasionProducts,
  getOccasions,
  occasionDisplayName,
  occasionPhrase,
  type Product,
} from "@/lib/products";

// cacheComponents doesn't allow dynamicParams: unknown slugs call notFound() below.
export function generateStaticParams() {
  return getOccasions().map((o) => ({ slug: o.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/occasions/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const occasion = getOccasionBySlug(slug);
  if (!occasion) notFound();
  const summary = occasionSummary(getOccasionProducts(occasion.name));
  return {
    title: `${occasionDisplayName(occasion.name)} evening wear | Velmora`,
    description: occasionDescription(occasion.name, summary),
  };
}

const container = "mx-auto w-full max-w-6xl px-5 md:px-10";
const section = "border-t border-stone py-16 md:py-24";
const h2 = "font-serif text-4xl leading-[1.1] md:text-5xl";

function deliveryLine(p: Product): string {
  return getStatus(p) === "made_to_order"
    ? `Made to order in ${p.lead_time_days} ${p.lead_time_days === 1 ? "day" : "days"}`
    : "Ready to ship";
}

export default async function OccasionPage({ params }: PageProps<"/occasions/[slug]">) {
  const { slug } = await params;
  const occasion = getOccasionBySlug(slug);
  if (!occasion) notFound();

  const products = getOccasionProducts(occasion.name);
  const summary = occasionSummary(products);
  const deadline = deadlineText(summary);
  const faq = occasionFaq();
  const others = getOccasions().filter((o) => o.slug !== occasion.slug);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(occasionJsonLd(occasion, products, faq)),
        }}
      />

      <section className={`${container} pt-16 pb-16 md:pt-28 md:pb-24`}>
        <h1 className="max-w-4xl font-serif text-5xl leading-[1.1] md:text-7xl">
          Evening wear {occasionPhrase(occasion.name)}
        </h1>
        <p className="mt-6 max-w-prose text-base leading-relaxed text-ink/80">
          {openingAnswer(occasion.name, summary).join(" ")}
        </p>
        {deadline && <p className="mt-4 max-w-prose text-base leading-relaxed">{deadline}</p>}
      </section>

      <section id="helper" className={section} aria-labelledby="helper-heading">
        <div className={container}>
          <h2 id="helper-heading" className={h2}>
            Delivery dates
          </h2>
          <div className="mt-10">
            <DeliveryHelper {...helperFormOptions()} defaultOccasion={occasion.name} />
          </div>
        </div>
      </section>

      <section className={section} aria-labelledby="pieces-heading">
        <div className={container}>
          <h2 id="pieces-heading" className={h2}>
            Pieces
          </h2>
          <ul className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-10">
            {products.map((p) => (
              <li key={p.id}>
                <ProductCard product={p} delivery={deliveryLine(p)} />
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className={section} aria-labelledby="faq-heading">
        <div className={`${container} md:grid md:grid-cols-12 md:gap-10`}>
          <h2 id="faq-heading" className={`${h2} md:col-span-5`}>
            Questions
          </h2>
          <dl className="mt-10 md:col-span-7 md:mt-0">
            {faq.map((item) => (
              <div
                key={item.question}
                className="border-t border-stone py-6 first:border-t-0 first:pt-0 md:first:border-t md:first:pt-6"
              >
                <dt className="font-serif text-xl">{item.question}</dt>
                <dd className="mt-2 max-w-prose leading-relaxed text-ink/80">{item.answer}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <nav className={section} aria-labelledby="others-heading">
        <div className={container}>
          <h2 id="others-heading" className={h2}>
            Other occasions
          </h2>
          <ul className="mt-8 flex flex-wrap gap-x-6">
            {others.map((o) => (
              <li key={o.slug}>
                <Link
                  href={`/occasions/${o.slug}`}
                  className="flex min-h-11 items-center font-serif text-xl underline underline-offset-4 hover:text-oxblood"
                >
                  {occasionDisplayName(o.name)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </>
  );
}
