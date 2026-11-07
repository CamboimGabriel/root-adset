import { AdsetApp } from "@/features/adset/components/adset-app";

const PAGE = "flex flex-1 justify-center bg-stone-950 px-4 py-10 text-stone-100";
const CONTAINER = "flex w-full max-w-2xl flex-col gap-8";
const TITLE = "text-3xl font-bold text-amber-300";
const SUBTITLE = "text-stone-400";

export default function Home() {
  return (
    <main className={PAGE}>
      <div className={CONTAINER}>
        <header className="flex flex-col gap-1">
          <h1 className={TITLE}>Root · Sorteador ADSET</h1>
          <p className={SUBTITLE}>Sorteio de mapa, baralho e draft de facções da Preparação Avançada (As Leis de Root, Apêndice A).</p>
        </header>
        <AdsetApp />
      </div>
    </main>
  );
}
