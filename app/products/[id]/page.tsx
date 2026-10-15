import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import DeliveryBox from "@/components/DeliveryBox";
import ProductPurchase from "@/components/ProductPurchase";
import { RETURNS } from "@/lib/brand";
import { getStatus } from "@/lib/delivery";
import { productJsonLd, serializeJsonLd } from "@/lib/jsonld";
import {
  displayLabel,
  formatPrice,
  getAllProducts,
  getProduct,
  hasValue,
  occasionDisplayName,
  occasionSlug,
} from "@/lib/products";

export function generateStaticParams() {
  return getAllProducts().map((p) => ({ id: p.id }));
}

export async function generateMetadata({
  params,
}: PageProps<"/products/[id]">): Promise<Metadata> {
  const { id } = await params;
  const product = getProduct(id);
  if (!product) notFound();
  return {
    title: `${displayLabel(product)} | Velmora`,
    ...(hasValue(product.description) && { description: product.description }),
  };
}

const label = "text-[13px] tracking-[0.06em] text-ink/70";

export default async function ProductPage({ params }: PageProps<"/products/[id]">) {
  const { id } = await params;
  const product = getProduct(id);
  if (!product) notFound();

  const title = displayLabel(product);
  const available = getStatus(product) !== "unavailable";
  const facts = [
    { term: "Colours", value: hasValue(product.colours) ? product.colours.join(", ") : null },
    { term: "Fabric", value: product.fabric },
    { term: "Fit", value: product.fit },
    // Without add to bag, sizes are listed as text instead of buttons.
    { term: "Sizes", value: !available && hasValue(product.sizes) ? product.sizes.join(", ") : null },
  ].filter((fact) => hasValue(fact.value));

  return (
    <article className="mx-auto w-full max-w-6xl px-5 pt-8 pb-16 md:grid md:grid-cols-12 md:gap-10 md:px-10 md:pt-12 md:pb-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(productJsonLd(product)) }}
      />

      <div
        role="img"
        aria-label={`Placeholder image for ${title}`}
        className="aspect-[3/4] w-full bg-stone md:sticky md:top-8 md:col-span-6 md:self-start"
      />

      <div className="mt-8 md:col-span-6 md:mt-0 lg:col-span-5 lg:col-start-8">
        <h1 className="font-serif text-4xl leading-[1.1] md:text-5xl">{title}</h1>
        {hasValue(product.price_gbp) && (
          <p className="mt-3 text-lg">{formatPrice(product.price_gbp)}</p>
        )}
        {hasValue(product.description) && (
          <p className="mt-5 max-w-prose leading-relaxed text-ink/80">{product.description}</p>
        )}

        {facts.length > 0 && (
          <dl className="mt-8 border-t border-stone">
            {facts.map((fact) => (
              <div key={fact.term} className="flex gap-4 border-b border-stone py-3">
                <dt className={`${label} w-20 shrink-0 pt-0.5`}>{fact.term}</dt>
                <dd className="text-sm leading-relaxed">{fact.value}</dd>
              </div>
            ))}
          </dl>
        )}

        {available && hasValue(product.sizes) && (
          <div className="mt-8">
            <ProductPurchase sizes={product.sizes} />
          </div>
        )}

        <div className="mt-6">
          <DeliveryBox product={product} />
        </div>
        <div id="helper"></div>

        <p className="mt-6 text-sm leading-relaxed text-ink/80">
          Return within {RETURNS.days} days, {RETURNS.condition}. {RETURNS.exclusion}
        </p>

        {hasValue(product.occasions) && (
          <nav aria-labelledby="occasions-heading" className="mt-10">
            <h2 id="occasions-heading" className={label}>
              Worn for
            </h2>
            <ul className="mt-2 flex flex-wrap gap-x-5">
              {product.occasions.map((o) => (
                <li key={o}>
                  <Link
                    href={`/occasions/${occasionSlug(o)}`}
                    className="flex min-h-11 items-center font-serif text-xl underline underline-offset-4 hover:text-oxblood"
                  >
                    {occasionDisplayName(o)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    </article>
  );
}
