"use client";

import { useState, type FormEvent } from "react";

// Size choice and add to bag. UI only: nothing is added to a real bag.
export default function ProductPurchase({ sizes }: { sizes: string[] }) {
  const [size, setSize] = useState(sizes.length === 1 ? sizes[0] : "");
  const [message, setMessage] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(size ? "This is a concept site. Nothing was added." : "Choose a size.");
  }

  return (
    <form onSubmit={handleSubmit}>
      <fieldset>
        <legend className="text-[13px] tracking-[0.06em]">Size</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {sizes.map((s) => (
            <label key={s} className="relative">
              <input
                type="radio"
                name="size"
                value={s}
                checked={size === s}
                onChange={() => {
                  setSize(s);
                  setMessage("");
                }}
                className="peer sr-only"
              />
              <span className="flex min-h-11 min-w-16 cursor-pointer items-center justify-center border border-ink/40 px-3 text-sm hover:border-ink peer-checked:border-ink peer-checked:bg-ink peer-checked:text-ivory peer-focus-visible:outline-2 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-oxblood motion-safe:transition-colors">
                {s}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <button
        type="submit"
        className="mt-6 min-h-12 w-full bg-oxblood px-6 text-[13px] tracking-[0.06em] text-ivory hover:bg-ink motion-safe:transition-colors md:w-auto"
      >
        Add to bag
      </button>
      <p aria-live="polite" className="mt-2 min-h-6 text-sm text-ink/70">
        {message}
      </p>
    </form>
  );
}
