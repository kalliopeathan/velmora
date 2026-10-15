"use client";

import { useState, type FormEvent } from "react";

export default function EmailSignup() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-10 max-w-md">
      <label htmlFor="signup-email" className="block text-[13px] tracking-[0.06em]">
        Email address
      </label>
      <div className="mt-2 flex flex-col gap-4 sm:flex-row">
        <input
          id="signup-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="min-h-12 flex-1 border border-ink/70 bg-transparent px-4 text-base focus:border-ink"
        />
        <button
          type="submit"
          className="min-h-12 bg-oxblood px-6 text-[13px] tracking-[0.06em] text-ivory hover:bg-ink"
        >
          Sign up
        </button>
      </div>
      <p aria-live="polite" className="mt-2 min-h-6 text-sm text-ink/70">
        {submitted ? "This is a concept site. Nothing was sent." : ""}
      </p>
    </form>
  );
}