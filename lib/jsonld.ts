// schema.org JSON-LD built from data/products.json and lib/brand.ts.
// Never ratings or reviews: there are none.
import { MADE_TO_ORDER_LEAD_DAYS, RETURNS, SHIPPING_DAYS } from "./brand";
import { getStatus, type Country } from "./delivery";
import type { FaqItem } from "./occasions";
import { displayLabel, hasValue, occasionDisplayName, type Occasion, type Product } from "./products";
import { SITE_URL } from "./site";

// brand.md only says "EU". These are the 27 EU member states' ISO 3166-1 codes.
export const EU_COUNTRY_CODES = [
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE",
  "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
] as const;

const COUNTRY_CODES: Record<Country, readonly string[]> = {
  UK: ["GB"],
  EU: EU_COUNTRY_CODES,
};

const AVAILABILITY = {
  made_to_order: "https://schema.org/MadeToOrder",
  in_stock: "https://schema.org/InStock",
  unavailable: "https://schema.org/OutOfStock",
} as const;

function days(min: number, max: number) {
  return { "@type": "QuantitativeValue", minValue: min, maxValue: max, unitCode: "DAY" };
}

function shippingDetails(product: Product, country: Country) {
  const shipping = SHIPPING_DAYS[country];
  return {
    "@type": "OfferShippingDetails",
    shippingDestination: COUNTRY_CODES[country].map((code) => ({
      "@type": "DefinedRegion",
      addressCountry: code,
    })),
    deliveryTime: {
      "@type": "ShippingDeliveryTime",
      handlingTime: days(product.lead_time_days, product.lead_time_days),
      transitTime: days(shipping.min, shipping.max),
    },
  };
}

export function productJsonLd(product: Product) {
  const status = getStatus(product);
  const offer: Record<string, unknown> = {
    "@type": "Offer",
    price: product.price_gbp,
    priceCurrency: "GBP",
    availability: AVAILABILITY[status],
    hasMerchantReturnPolicy: {
      "@type": "MerchantReturnPolicy",
      applicableCountry: [...COUNTRY_CODES.UK, ...COUNTRY_CODES.EU],
      returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
      merchantReturnDays: RETURNS.days,
    },
  };
  if (status !== "unavailable" && hasValue(product.lead_time_days)) {
    offer.shippingDetails = [shippingDetails(product, "UK"), shippingDetails(product, "EU")];
  }

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    sku: product.id,
    name: displayLabel(product),
    brand: { "@type": "Brand", name: "Velmora" },
    offers: offer,
  };
  if (hasValue(product.description)) jsonLd.description = product.description;
  if (hasValue(product.fabric)) jsonLd.material = product.fabric;
  if (hasValue(product.colours)) jsonLd.color = product.colours.join(", ");
  return jsonLd;
}

// Facts from data/brand.md only, via lib/brand.ts.
export function organizationJsonLd() {
  const lead = MADE_TO_ORDER_LEAD_DAYS;
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Velmora",
    url: SITE_URL,
    description: `London evening-wear label. Most pieces are made to order in the London studio, in ${lead.min} to ${lead.max} days.`,
  };
}

/** ItemList of the pieces shown, FAQPage of the visible FAQ, and Home > occasion. */
export function occasionJsonLd(occasion: Occasion, products: Product[], faq: FaqItem[]) {
  const url = `${SITE_URL}/occasions/${occasion.slug}`;
  const name = occasionDisplayName(occasion.name);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ItemList",
        name,
        url,
        numberOfItems: products.length,
        itemListElement: products.map((p, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: displayLabel(p),
          url: `${SITE_URL}/products/${p.id}`,
        })),
      },
      {
        "@type": "FAQPage",
        mainEntity: faq.map(({ question, answer }) => ({
          "@type": "Question",
          name: question,
          acceptedAnswer: { "@type": "Answer", text: answer },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name, item: url },
        ],
      },
    ],
  };
}

/** JSON for a <script> tag, with "<" escaped so the payload cannot close the tag. */
export function serializeJsonLd(jsonLd: object): string {
  return JSON.stringify(jsonLd).replace(/</g, "\\u003c");
}
