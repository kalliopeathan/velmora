import { Suspense } from "react";
import { connection } from "next/server";
import { SHIPPING_DAYS } from "@/lib/brand";
import {
  arrivalWindow,
  formatDate,
  getStatus,
  nextDate,
  orderByDate,
  toUtcDay,
  type Country,
} from "@/lib/delivery";
import type { Product } from "@/lib/products";

const COUNTRIES: Country[] = ["UK", "EU"];

// The dates people dress for, as [month, day].
const EVENTS: [number, number][] = [
  [12, 24],
  [12, 31],
];

function plural(n: number, word: string): string {
  return `${n} ${n === 1 ? word : `${word}s`}`;
}

/** e.g. "14 days making + 3–5 days UK shipping". */
function calculation(product: Product, country: Country): string {
  const step = getStatus(product) === "made_to_order" ? "making" : "to dispatch";
  const { min, max } = SHIPPING_DAYS[country];
  return `${plural(product.lead_time_days, "day")} ${step} + ${min}–${max} days ${country} shipping`;
}

export default function DeliveryBox({ product }: { product: Product }) {
  const status = getStatus(product);

  return (
    <section aria-labelledby="delivery-heading" className="border border-stone p-5 md:p-6">
      <h2 id="delivery-heading" className="text-[13px] tracking-[0.06em]">
        Delivery
      </h2>
      {status === "unavailable" ? (
        <p className="mt-3 font-serif text-2xl leading-snug">Not currently available.</p>
      ) : (
        <>
          <p className="mt-3 font-serif text-2xl leading-snug">
            {status === "made_to_order"
              ? `Made to order in ${plural(product.lead_time_days, "day")}.`
              : "Ready to ship."}
          </p>
          {/* cacheComponents: the box is prerendered; only today's dates stream in per request. */}
          <Suspense fallback={<div className="mt-4 min-h-24" />}>
            <TodayDates product={product} />
          </Suspense>
          <ul className="mt-5 space-y-1 border-t border-stone pt-4 text-[13px] leading-relaxed text-ink/70">
            {COUNTRIES.map((country) => (
              <li key={country}>{calculation(product, country)}</li>
            ))}
          </ul>
          {status === "made_to_order" && (
            <p className="mt-2 text-[13px] leading-relaxed text-ink/70">
              Dates assume the studio&rsquo;s queue is clear.
            </p>
          )}
        </>
      )}
    </section>
  );
}

// Depends on today's date, so it renders per request rather than at build time.
async function TodayDates({ product }: { product: Product }) {
  await connection();
  const today = toUtcDay(new Date());

  return (
    <>
      <p className="mt-4 text-sm">Ordered today, it arrives:</p>
      <dl className="mt-1 text-sm leading-relaxed">
        {COUNTRIES.map((country) => {
          const window = arrivalWindow(product, country, today);
          if (!window) return null;
          return (
            <div key={country} className="flex gap-2">
              <dt className="w-8">{country}</dt>
              <dd>
                {formatDate(window.earliest)} to {formatDate(window.latest)}
              </dd>
            </div>
          );
        })}
      </dl>
      {getStatus(product) === "made_to_order" && (
        <ul className="mt-4 space-y-2 text-sm leading-relaxed">
          {EVENTS.map(([month, day]) => (
            <li key={`${month}-${day}`}>{orderByLine(product, nextDate(month, day, today), today)}</li>
          ))}
        </ul>
      )}
    </>
  );
}

// Only order-by dates still ahead (today counts). Order-by uses maximum shipping,
// so after it has passed, arrival by the event is not guaranteed, but not certain to be late.
function orderByLine(product: Product, event: Date, today: Date): string {
  const ahead: string[] = [];
  const passed: Country[] = [];
  for (const country of COUNTRIES) {
    const date = orderByDate(product, country, event);
    if (date && date.getTime() >= today.getTime()) {
      ahead.push(`${formatDate(date)} (${country})`);
    } else {
      passed.push(country);
    }
  }
  const eventText = formatDate(event);
  if (ahead.length === 0) return `Ordered today, it may not arrive by ${eventText}.`;
  const orderBy = `To wear it by ${eventText}, order by ${ahead.join(" / ")}.`;
  if (passed.length === 0) return orderBy;
  return `${orderBy} Ordered today, it may not arrive in the ${passed.join(" and ")} by ${eventText}.`;
}
