import Link from "next/link";
import { displayLabel, formatPrice, hasValue, type Product } from "@/lib/products";

export default function ProductCard({
  product,
  delivery,
}: {
  product: Product;
  /** Optional line under the price, e.g. "Made to order in 14 days". */
  delivery?: string;
}) {
  const label = displayLabel(product);

  return (
    <Link href={`/products/${product.id}`} className="group block">
      <div
        role="img"
        aria-label={`Placeholder image for ${label}`}
        className="aspect-[3/4] w-full bg-stone"
      />
      <p className="mt-4 font-serif text-lg leading-snug md:text-xl underline-offset-4 group-hover:underline">
        {label}
      </p>
      {hasValue(product.price_gbp) && (
        <p className="mt-1 text-sm tracking-[0.02em] text-ink/70">
          {formatPrice(product.price_gbp)}
        </p>
      )}
      {delivery && <p className="mt-1 text-[13px] tracking-[0.02em] text-ink/70">{delivery}</p>}
    </Link>
  );
}
