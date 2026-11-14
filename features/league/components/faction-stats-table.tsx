import Image from "next/image";
import { formatMatchCount, formatPercent } from "../format";
import { SMALL_SAMPLE_MATCHES, type CountStat, type FactionStatsRow, type FactionStatsView } from "../stats";

interface FactionStatsTableProps extends FactionStatsView {
  scopeLabel: string;
}

const SECTION = "flex flex-col gap-3 rounded-2xl border border-stone-700 bg-stone-900/60 p-5";
const SECTION_TITLE = "text-lg font-semibold text-amber-200";
const HINT = "text-sm text-stone-400";
const ROW = "rounded-xl border-l-8 bg-stone-800/60 ring-1 ring-stone-700";
const ROW_SUMMARY = "flex cursor-pointer list-none items-center gap-3 p-3";
const ICON = "size-10 shrink-0 rounded-full object-contain p-1";
const NUMBERS = "ml-auto grid shrink-0 grid-cols-3 gap-3 text-right text-sm tabular-nums";
const NUMBER_LABEL = "block text-[10px] uppercase tracking-wide text-stone-500";
const SMALL_SAMPLE_TAG = "rounded bg-stone-700 px-1.5 py-0.5 text-xs text-stone-300";
const BREAKDOWN = "grid grid-cols-1 gap-4 border-t border-stone-700 p-3 sm:grid-cols-3";
const BREAKDOWN_ROW = "flex justify-between gap-2 text-sm";
const EMPTY = "rounded-xl border border-dashed border-stone-700 p-6 text-center text-sm text-stone-400";

function Breakdown({ title, items }: { title: string; items: CountStat[] }) {
  return (
    <div className="flex flex-col gap-1">
      <h4 className="text-xs font-medium uppercase tracking-wide text-stone-400">{title}</h4>
      {items.length === 0 ? (
        <span className="text-sm text-stone-500">Não registrado</span>
      ) : (
        items.map((item) => (
          <span key={item.id} className={BREAKDOWN_ROW}>
            <span className="truncate">{item.label}</span>
            <span className="shrink-0 tabular-nums text-stone-400">
              {item.wins}/{item.matches}
            </span>
          </span>
        ))
      )}
    </div>
  );
}

function FactionGroup({ title, rows }: { title: string; rows: FactionStatsRow[] }) {
  return (
    <section className={SECTION}>
      <h2 className={SECTION_TITLE}>{title}</h2>
      {rows.length === 0 ? (
        <p className={HINT}>Nenhuma partida com essas facções neste período.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((row) => (
            <li key={row.key}>
              <details className={ROW} style={{ borderLeftColor: row.color }}>
                <summary className={ROW_SUMMARY}>
                  {row.icon && <Image src={row.icon} alt="" width={40} height={40} className={ICON} style={{ backgroundColor: row.color }} />}
                  <span className="flex min-w-0 flex-col">
                    <span className="font-medium">
                      {row.name}
                      {row.version && <span className="ml-1 text-xs text-stone-400">({row.version})</span>}
                    </span>
                    {row.isSmallSample && <span className={SMALL_SAMPLE_TAG}>Amostra pequena: {formatMatchCount(row.matches)}</span>}
                  </span>
                  <span className={NUMBERS}>
                    <span>
                      <span className={NUMBER_LABEL}>Partidas</span>
                      {row.matches}
                    </span>
                    <span>
                      <span className={NUMBER_LABEL}>Vitórias</span>
                      {row.wins} · {formatPercent(row.winRate)}
                    </span>
                    <span>
                      <span className={NUMBER_LABEL}>Uso</span>
                      {formatPercent(row.pickRate)}
                    </span>
                  </span>
                </summary>
                <div className={BREAKDOWN}>
                  <Breakdown title="Jogadores" items={row.players} />
                  <Breakdown title="Mapas" items={row.maps} />
                  <Breakdown title="Baralhos" items={row.decks} />
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function FactionStatsTable({ totalMatches, official, fan, scopeLabel }: FactionStatsTableProps) {
  if (totalMatches === 0) return <p className={EMPTY}>Nenhuma partida registrada em {scopeLabel}.</p>;

  return (
    <>
      <p className={HINT}>
        {formatMatchCount(totalMatches)} em {scopeLabel}. “Uso” é a porcentagem de partidas em que a facção apareceu. Com menos de{" "}
        {SMALL_SAMPLE_MATCHES} partidas a taxa de vitória ainda diz pouco, por isso não calculamos força das facções. Versões diferentes de uma
        facção aparecem separadas.
      </p>
      <FactionGroup title="Facções oficiais" rows={official} />
      <FactionGroup title="Facções de fã" rows={fan} />
    </>
  );
}
