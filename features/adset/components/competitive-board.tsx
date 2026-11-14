import Image from "next/image";
import type { ReactNode } from "react";
import { ACTIONS_PER_PLAYER } from "../competitive-draft";
import type { CompetitiveBoardView, SnakeStepView } from "../use-adset-draft";
import { BAN_ICON, STAR_ICON } from "./faction-gallery";

interface CompetitiveBoardProps extends CompetitiveBoardView {
  gallery: ReactNode;
}

const SECTION = "flex flex-col gap-3 rounded-2xl border border-stone-700 bg-stone-900/60 p-5";
const SECTION_TITLE = "text-lg font-semibold text-amber-200";
const HINT = "text-sm text-stone-400";
const BANNER = "rounded-2xl border border-amber-400/60 bg-amber-400/10 p-5 text-center";
const BANNER_TITLE = "text-2xl font-bold text-amber-200";
const ROUND_ROW = "flex flex-wrap items-center gap-2";
const ROUND_LABEL = "w-20 shrink-0 text-xs font-medium uppercase tracking-wide text-stone-400";
const STEP_BASE = "rounded-full px-3 py-1 text-sm transition";
const STEP_STATUS: Record<SnakeStepView["status"], string> = {
  done: "bg-stone-800 text-stone-500 line-through",
  current: "bg-amber-500 font-semibold text-stone-950 ring-2 ring-amber-300",
  upcoming: "bg-stone-800 text-stone-200",
};
const PLAYER_GRID = "grid grid-cols-1 gap-2 sm:grid-cols-2";
const PLAYER_CARD = "flex flex-col gap-2 rounded-lg border px-3 py-2";
const PLAYER_CARD_CURRENT = "border-amber-400 bg-amber-400/10";
const PLAYER_CARD_IDLE = "border-stone-700";
const ACTION_DOT = "size-2.5 rounded-full";
const ACTION_DOT_LEFT = "bg-amber-400";
const ACTION_DOT_USED = "bg-stone-700";
const TAG_FAVORITE = "inline-flex items-center gap-1 rounded bg-amber-400/20 px-1.5 py-0.5 text-xs text-amber-200";
const TAG_BAN = "inline-flex items-center gap-1 rounded bg-red-900/60 px-1.5 py-0.5 text-xs text-red-100";
const TAG_MUTED = "text-xs text-stone-500";
const HISTORY_LIST = "flex flex-col gap-2";
const HISTORY_ITEM = "flex animate-pop-in items-center gap-3 rounded-lg bg-stone-800/70 px-3 py-2 text-sm";
const HISTORY_INDEX = "w-6 shrink-0 text-right text-xs text-stone-500";
const HISTORY_ICON = "size-7 shrink-0 rounded-full object-contain p-0.5";
const EMPTY = "text-sm text-stone-500";

export function CompetitiveBoard({ currentPlayer, players, steps, history, gallery }: CompetitiveBoardProps) {
  const currentStep = steps.find((step) => step.status === "current");
  const rounds = [1, 2].map((round) => steps.filter((step) => step.round === round));

  return (
    <div className="flex flex-col gap-6">
      <div className={BANNER} aria-live="polite">
        <p className={HINT}>Banimentos e favoritos · Rodada {currentStep?.round ?? 2} de 2</p>
        <p className={BANNER_TITLE}>{currentPlayer ?? "Resolvendo…"}</p>
        <p className={HINT}>
          Cada jogador tem {ACTIONS_PER_PLAYER} ações: banir duas facções, ou banir uma e favoritar outra. Tudo é público e irrevogável.
        </p>
      </div>

      <section className={SECTION}>
        <h2 className={SECTION_TITLE}>Ordem das ações</h2>
        {rounds.map((roundSteps, roundIndex) => (
          <div key={roundIndex} className={ROUND_ROW}>
            <span className={ROUND_LABEL}>Rodada {roundIndex + 1}</span>
            {roundSteps.map((step, index) => (
              <span key={`${step.player}-${index}`} className={`${STEP_BASE} ${STEP_STATUS[step.status]}`}>
                {step.player}
              </span>
            ))}
          </div>
        ))}
      </section>

      <section className={SECTION}>
        <h2 className={SECTION_TITLE}>Jogadores</h2>
        <ul className={PLAYER_GRID}>
          {players.map((player) => (
            <li key={player.name} className={`${PLAYER_CARD} ${player.isCurrent ? PLAYER_CARD_CURRENT : PLAYER_CARD_IDLE}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{player.name}</span>
                <span className="flex gap-1" aria-label={`${player.remainingActions} ações restantes`}>
                  {Array.from({ length: ACTIONS_PER_PLAYER }, (_, index) => (
                    <span key={index} className={`${ACTION_DOT} ${index < player.remainingActions ? ACTION_DOT_LEFT : ACTION_DOT_USED}`} />
                  ))}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {player.favorite ? (
                  <span className={TAG_FAVORITE}>
                    <span aria-hidden>{STAR_ICON}</span> {player.favorite.name}
                  </span>
                ) : (
                  <span className={TAG_MUTED}>Favorito disponível</span>
                )}
                {player.bans.map((faction) => (
                  <span key={faction.id} className={TAG_BAN}>
                    <span aria-hidden>{BAN_ICON}</span> {faction.name}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className={SECTION}>
        <h2 className={SECTION_TITLE}>Histórico</h2>
        {history.length === 0 ? (
          <p className={EMPTY}>Nenhuma ação ainda. {currentPlayer} começa.</p>
        ) : (
          <ol className={HISTORY_LIST}>
            {history.map((action, index) => (
              <li key={index} className={HISTORY_ITEM}>
                <span className={HISTORY_INDEX}>{index + 1}</span>
                <Image src={action.faction.icon} alt="" width={28} height={28} className={HISTORY_ICON} style={{ backgroundColor: action.faction.color }} />
                <span>
                  <strong>{action.player}</strong> {action.type === "ban" ? "baniu" : "favoritou"} <strong>{action.faction.name}</strong>
                </span>
                <span className={action.type === "ban" ? TAG_BAN : TAG_FAVORITE}>
                  <span aria-hidden>{action.type === "ban" ? BAN_ICON : STAR_ICON}</span> R{action.round}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className={SECTION}>
        <h2 className={SECTION_TITLE}>Facções</h2>
        {gallery}
      </section>
    </div>
  );
}
