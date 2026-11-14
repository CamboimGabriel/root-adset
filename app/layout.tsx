import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const TOP_NAV = "flex justify-center gap-6 border-b border-stone-800 bg-stone-950 px-4 py-3 text-sm";
const TOP_NAV_LINK = "font-medium text-stone-300 transition hover:text-amber-300";

export const metadata: Metadata = {
  title: "Root · Sorteador ADSET",
  description: "Sorteio de mapa, baralho e draft de facções da Preparação Avançada de Root",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-stone-950">
        <nav aria-label="Principal" className={TOP_NAV}>
          <Link href="/" className={TOP_NAV_LINK}>
            Sorteio
          </Link>
          <Link href="/liga" className={TOP_NAV_LINK}>
            Liga
          </Link>
        </nav>
        {children}
      </body>
    </html>
  );
}
