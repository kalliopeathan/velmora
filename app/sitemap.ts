import type { MetadataRoute } from "next";
import { getAllProducts, getOccasions } from "@/lib/products";
import { SITE_URL } from "@/lib/site";

// Home, every product (including unavailable ones) and every occasion.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL },
    ...getOccasions().map((o) => ({ url: `${SITE_URL}/occasions/${o.slug}` })),
    ...getAllProducts().map((p) => ({ url: `${SITE_URL}/products/${p.id}` })),
  ];
}
