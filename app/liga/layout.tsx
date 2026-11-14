import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Root · Liga",
  description: "Ranking, temporadas e estatísticas da liga de Root",
};

const PAGE = "flex flex-1 justify-center bg-stone-950 px-4 py-10 text-stone-100";
const CONTAINER = "flex w-full max-w-4xl flex-col gap-6";
const TITLE = "text-3xl font-bold text-amber-300";
const SUBTITLE = "text-stone-400";
const SUBNAV = "flex flex-wrap gap-4 border-b border-stone-800 pb-3 text-sm";
const SUBNAV_LINK = "text-stone-300 hover:text-amber-300";
const LINKS = [
  { href: "/liga", label: "Ranking" },
  { href: "/liga/faccoes", label: "Facções" },
  { href: "/liga/admin", label: "Administração" },
] as const;

export default function LeagueLayout({ children }: LayoutProps<"/liga">) {
  return (
    <main className={PAGE}>
      <div className={CONTAINER}>
        <header className="flex flex-col gap-1">
          <h1 className={TITLE}>Root · Liga</h1>
          <p className={SUBTITLE}>Ranking de habilidade com OpenSkill, temporadas e estatísticas das facções.</p>
        </header>
        <nav aria-label="Liga" className={SUBNAV}>
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={SUBNAV_LINK}>
              {link.label}
            </Link>
          ))}
        </nav>
        {children}
      </div>
    </main>
  );
}
