import Image from "next/image";
import type { GameComponent } from "../maps-and-decks";

interface GameComponentsSectionProps {
  map: GameComponent;
  deck: GameComponent;
}

const SECTION = "flex flex-col gap-3 rounded-2xl border border-stone-700 bg-stone-900/60 p-5";
const SECTION_TITLE = "text-lg font-semibold text-amber-200";
const COMPONENT_GRID = "grid grid-cols-1 gap-3 sm:grid-cols-2";
const COMPONENT_CARD = "flex items-start gap-4 rounded-xl bg-stone-800/60 p-4 ring-1 ring-stone-700";
const COMPONENT_IMAGE = "h-auto w-28 shrink-0 rounded-lg";
const COMPONENT_LABEL = "text-xs font-semibold uppercase tracking-wide text-stone-300";
const COMPONENT_DETAIL = "text-sm text-stone-300";

export function GameComponentsSection({ map, deck }: GameComponentsSectionProps) {
  return (
    <section className={SECTION}>
      <h2 className={SECTION_TITLE}>Mapa e baralho</h2>
      <div className={COMPONENT_GRID}>
        {[
          { label: "Mapa", component: map },
          { label: "Baralho", component: deck },
        ].map(({ label, component }) => (
          <div key={label} className={COMPONENT_CARD}>
            <Image src={component.image} alt={component.name} width={350} height={320} className={COMPONENT_IMAGE} />
            <span className="flex flex-col gap-1">
              <span className={COMPONENT_LABEL}>{label}</span>
              <span className="text-lg font-semibold">{component.name}</span>
              <span className={COMPONENT_DETAIL}>{component.source === "official" ? "Oficial" : "Fã"}</span>
              {component.setupNote && <span className={COMPONENT_DETAIL}>{component.setupNote}</span>}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
