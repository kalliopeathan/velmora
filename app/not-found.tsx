import Link from "next/link";

export default function NotFound() {
  return (
    <section className="mx-auto w-full max-w-6xl px-5 pt-16 pb-24 md:px-10 md:pt-28">
      <h1 className="font-serif text-4xl leading-[1.1] md:text-5xl">This page does not exist.</h1>
      <Link
        href="/"
        className="mt-6 inline-flex min-h-11 items-center underline underline-offset-4 hover:text-oxblood"
      >
        Back to the home page
      </Link>
    </section>
  );
}
