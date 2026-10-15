// Brand facts, transcribed from data/brand.md. Change them there first.

// "Most pieces are made to order in the London studio, in 14 to 21 days."
export const MADE_TO_ORDER_LEAD_DAYS = { min: 14, max: 21 } as const;

// "Shipping: UK 3 to 5 days after making, EU 5 to 8 days."
export const SHIPPING_DAYS = {
  UK: { min: 3, max: 5 },
  EU: { min: 5, max: 8 },
} as const;

// "Returns: 14 days, unworn, with tags. Made-to-order pieces in a
// non-standard size cannot be returned."
export const RETURNS = {
  days: 14,
  condition: "unworn, with tags",
  exclusion: "Made-to-order pieces in a non-standard size cannot be returned.",
} as const;