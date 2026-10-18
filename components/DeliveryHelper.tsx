"use client";

import Link from "next/link";
import { useId, useState, useSyncExternalStore, type FormEvent } from "react";
import { UNAVAILABLE_TEXT } from "@/lib/copy";
import { formatDate } from "@/lib/delivery";
import type { HelperResponse, Pick } from "@/lib/helper";

// Matches the server cap in lib/helper.ts. Not imported: that module uses node:fs and
// Gemini, so only its types (import type) may reach the browser.
const MAX_MESSAGE_LENGTH = 400;
const FALLBACK_TEXT = "Choose from the list below instead.";

const labelClass = "block text-[13px] tracking-[0.06em]";
const fieldClass =
  "mt-2 min-h-12 w-full rounded-none border border-ink/70 bg-transparent px-4 text-base focus:border-ink";
const buttonClass =
  "min-h-12 bg-oxblood px-6 text-[13px] tracking-[0.06em] text-ivory hover:bg-ink disabled:bg-ink/60";
const textLinkClass =
  "flex min-h-11 items-center text-sm underline underline-offset-4 hover:text-oxblood";
const smallClass = "text-[13px] leading-relaxed text-ink/70";

type Option = { value: string; label: string };

type Props = {
  /** From the data, built on the server: value = data name, label = display name. */
  occasions: Option[];
  sizes: string[];
  /** Data name of an occasion to preselect; the list form then starts open. */
  defaultOccasion?: string;
};

type Shown = Exclude<HelperResponse, { type: "question" }>;

// ISO "YYYY-MM-DD" from the API -> "19 December" (UTC).
const day = (isoDate: string) => formatDate(new Date(`${isoDate}T00:00:00Z`));

const plural = (n: number, word: string) => `${n} ${n === 1 ? word : `${word}s`}`;

/** CODE writes the question line: names only what's missing. */
function questionText(missing: ("occasion" | "event_date")[]): string {
  const parts = [
    missing.includes("occasion") && "the occasion",
    missing.includes("event_date") && "the date",
  ].filter(Boolean);
  return `Choose ${parts.join(" and ")} below.`;
}

// Today's UTC date on the client; undefined during server render and hydration,
// so the date input's min never causes a hydration mismatch.
const noSubscribe = () => () => {};
const todayUtc = () => new Date().toISOString().slice(0, 10);
const noDate = () => undefined;

export default function DeliveryHelper({ occasions, sizes, defaultOccasion }: Props) {
  const id = useId();
  const [formShown, setFormShown] = useState(defaultOccasion !== undefined);
  const minDate = useSyncExternalStore(noSubscribe, todayUtc, noDate);
  const [note, setNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [shown, setShown] = useState<Shown | null>(null);

  function showForm() {
    setFormShown(true);
  }

  async function send(body: object, fromText: boolean) {
    setLoading(true);
    setNote(null);
    setShown(null);
    try {
      const res = await fetch("/api/helper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => null)) as HelperResponse | null;
      // Only free text needs Gemini; on 503 the list form (code only) still works.
      if (res.status === 503 && fromText) {
        showForm();
        setNote(FALLBACK_TEXT);
      } else if (!res.ok || !data?.type) {
        setShown({ type: "message", text: UNAVAILABLE_TEXT });
      } else if (data.type === "question") {
        showForm();
        setNote(questionText(data.missing));
      } else {
        setShown(data);
      }
    } catch {
      setShown({ type: "message", text: UNAVAILABLE_TEXT });
    } finally {
      setLoading(false);
    }
  }

  function submitText(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = String(new FormData(event.currentTarget).get("message") ?? "").trim();
    if (message) send({ message }, true);
  }

  function submitFields(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const value = (name: string) => String(data.get(name) ?? "") || null;
    send(
      {
        fields: {
          occasion: value("occasion"),
          event_date: value("event_date"),
          size: value("size"),
          country: value("country"),
        },
      },
      false,
    );
  }

  // Labels come from props: importing lib/products would ship the catalogue to the browser.
  const occasionLabel = (name: string) =>
    occasions.find((o) => o.value === name)?.label ?? name;

  return (
    <div className="max-w-xl">
      <form onSubmit={submitText}>
        <label htmlFor={`${id}-message`} className={labelClass}>
          Tell us the occasion, the date, your size and where you are
        </label>
        <textarea
          id={`${id}-message`}
          name="message"
          required
          maxLength={MAX_MESSAGE_LENGTH}
          rows={3}
          className={`${fieldClass} py-3 leading-relaxed`}
        />
        <button type="submit" disabled={loading} className={`${buttonClass} mt-4 w-full sm:w-auto`}>
          {loading ? "Checking…" : "Check dates"}
        </button>
      </form>

      {!formShown && (
        <button type="button" onClick={showForm} className={`${textLinkClass} mt-4`}>
          Or choose from a list
        </button>
      )}

      <p aria-live="polite" className="mt-4 text-sm leading-relaxed empty:mt-0">
        {note}
      </p>

      {formShown && (
        <form onSubmit={submitFields} className="mt-4 border-t border-stone pt-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor={`${id}-occasion`} className={labelClass}>
                Occasion
              </label>
              <select id={`${id}-occasion`} name="occasion" required defaultValue={defaultOccasion ?? ""} className={fieldClass}>
                <option value="" disabled>
                  Choose an occasion
                </option>
                {occasions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor={`${id}-date`} className={labelClass}>
                Event date
              </label>
              <input
                id={`${id}-date`}
                name="event_date"
                type="date"
                required
                min={minDate}
                className={fieldClass}
              />
            </div>
            <div>
              <label htmlFor={`${id}-size`} className={labelClass}>
                Size
              </label>
              <select id={`${id}-size`} name="size" defaultValue="" className={fieldClass}>
                <option value="">Any size</option>
                {sizes.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <fieldset>
              <legend className={labelClass}>Delivery to</legend>
              <div className="mt-2 flex gap-6">
                {(["UK", "EU"] as const).map((c) => (
                  <label key={c} className="flex min-h-12 items-center gap-3 text-base">
                    <input
                      type="radio"
                      name="country"
                      value={c}
                      defaultChecked={c === "UK"}
                      className="size-5 accent-oxblood"
                    />
                    {c}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
          <button type="submit" disabled={loading} className={`${buttonClass} mt-6 w-full sm:w-auto`}>
            {loading ? "Checking…" : "Check dates"}
          </button>
        </form>
      )}

      <div aria-live="polite" aria-busy={loading} className="mt-8">
        {shown && shown.type !== "results" && (
          <p className="text-base leading-relaxed">{shown.text}</p>
        )}
        {shown?.type === "results" && (
          <>
            {shown.countryAssumed && (
              <p className="text-sm leading-relaxed">Dates are for UK delivery.</p>
            )}
            <ul className="mt-2 border-b border-stone">
              {shown.picks.map((pick) => (
                <PickCard
                  key={pick.id}
                  pick={pick}
                  country={shown.country}
                  occasion={occasionLabel(shown.occasion)}
                  eventDate={shown.eventDate}
                />
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

function PickCard({
  pick,
  country,
  occasion,
  eventDate,
}: {
  pick: Pick;
  country: "UK" | "EU";
  occasion: string;
  eventDate: string;
}) {
  const { leadTimeDays, shippingDays } = pick.calculation;
  const step = pick.queueNote ? "making" : "to dispatch";
  const calculation = `${plural(leadTimeDays, "day")} ${step} + ${shippingDays.min}–${shippingDays.max} days ${country} shipping`;
  const why = [occasion, pick.size, `arrives by ${day(eventDate)}`, calculation].filter(Boolean);

  return (
    <li className="border-t border-stone py-5">
      <h3 className="font-serif text-xl leading-snug">
        <Link
          href={`/products/${pick.id}`}
          className="inline-flex min-h-11 items-center underline-offset-4 hover:underline"
        >
          {pick.label}
        </Link>
      </h3>
      {pick.price && <p className="text-base">{pick.price}</p>}
      <dl className="mt-3 text-sm leading-relaxed">
        <div className="flex gap-2">
          <dt className="w-20 shrink-0 text-ink/70">Arrives</dt>
          <dd>
            {day(pick.arrival.earliest)} to {day(pick.arrival.latest)}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-20 shrink-0 text-ink/70">Order by</dt>
          <dd>{day(pick.orderBy)}</dd>
        </div>
      </dl>
      {pick.reason && <p className="mt-3 text-sm leading-relaxed">{pick.reason}</p>}
      <p className={`mt-3 ${smallClass}`}>Why this piece: {why.join(" · ")}</p>
      {pick.queueNote && <p className={`mt-1 ${smallClass}`}>{pick.queueNote}</p>}
    </li>
  );
}
