import type { Metadata } from "next";
import Link from "next/link";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Velmora",
  description:
    "Evening wear, made to order in a London studio. Delivered to the UK and the EU.",
};

const nav = [
  { href: "/#ready-to-ship", label: "Shop" },
  { href: "/#occasions", label: "Occasions" },
  { href: "/#helper", label: "Delivery dates" },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-ivory text-ink">
        <header className="border-b border-stone">
          <div className="mx-auto flex w-full max-w-6xl flex-col px-5 pt-4 md:flex-row md:items-center md:justify-between md:px-10 md:py-2">
            <Link
              href="/"
              className="flex min-h-11 items-center self-start font-serif text-3xl tracking-[0.04em]"
            >
              Velmora
            </Link>
            <nav aria-label="Main">
              <ul className="-mx-3 flex text-[13px] tracking-[0.06em]">
                {nav.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="flex min-h-11 items-center px-3 underline-offset-4 hover:underline"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-stone">
          <div className="mx-auto w-full max-w-6xl px-5 py-12 md:px-10">
            <p className="font-serif text-2xl tracking-[0.04em]">Velmora</p>
            <p className="mt-3 text-sm text-ink/70">
              Evening wear, made to order in London.
              <br />
              Shipped to the UK and the EU.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
