import Image from "next/image";
import type { FactionKind } from "../factions";
import type { DraftBoardView, FactionBoardView, PoolCardStatus } from "../use-adset-draft";
import { BAN_ICON, STAR_ICON } from "./faction-gallery";

interface DraftBoardProps extends DraftBoardView {
  isBusy: boolean;
  openedFactionBoard: FactionBoardView | null;
  onPick: (factionId: string) => void;
  onOpenFactionBoard: (factionId: string) => void;
  onCloseFactionBoard: () => void;
  onUndo: () => void;
}

const SECTION = "flex flex-col gap-3 rounded-2xl border border-stone-700 bg-stone-900/60 p-5";
const SECTION_TITLE = "text-lg font-semibold text-amber-200";
const HINT = "text-sm text-stone-400";
const BANNER = "rounded-2xl border border-amber-400/60 bg-amber-400/10 p-5 text-center";
const BANNER_TITLE = "text-2xl font-bold text-amber-200";
const PLAYER_ROW = "flex items-center gap-3 rounded-lg border px-3 py-2";
const PLAYER_ROW_CURRENT = "border-amber-400 bg-amber-400/10";
const PLAYER_ROW_IDLE = "border-stone-700";
const ORDER_BADGE = "flex size-7 shrink-0 items-center justify-center rounded-full bg-stone-800 text-sm font-semibold";
const FIRST_TAG = "rounded bg-amber-500 px-1.5 py-0.5 text-xs font-semibold text-stone-950";
const PLAYER_FACTION_ICON = "size-7 shrink-0 rounded-full object-contain p-0.5";
const CARD_ICON = "size-14 shrink-0 rounded-full object-contain p-1.5";
const POOL_GRID = "grid grid-cols-1 gap-3 sm:grid-cols-2";
const CARD_BASE = "flex flex-col gap-3 rounded-xl border-l-8 p-4 transition";
const CARD_KIND: Record<FactionKind, string> = {
  militant: "bg-red-900/70",
  insurgent: "bg-stone-700/70",
};
const CARD_STATUS: Record<PoolCardStatus, string> = {
  available: "ring-1 ring-stone-600 hover:ring-amber-400",
  locked: "opacity-60 ring-1 ring-stone-700",
  excluded: "opacity-40 ring-1 ring-red-900",
  taken: "opacity-40 ring-1 ring-stone-800",
};
const CARD_PICK_AREA = "flex items-center gap-4 text-left disabled:cursor-not-allowed";
const CARD_BOARD_BUTTON = "self-start rounded-md border border-stone-400/50 px-2.5 py-1 text-xs text-stone-100 transition hover:bg-black/30";
const MODAL_OVERLAY = "fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 p-4";
const MODAL_PANEL = "flex w-full max-w-5xl flex-col gap-4 rounded-2xl border-t-8 bg-stone-900 p-4";
const MODAL_HEADER = "flex items-center justify-between gap-4";
const BOARD_IMAGE = "h-auto w-full rounded-lg";
const BOARD_IMAGE_SIZES = "(max-width: 1024px) 100vw, 1024px";
const CARD_DETAIL = "text-sm text-stone-300";
const CARD_STATUS_LABEL = "text-xs font-semibold uppercase tracking-wide text-stone-300";
const RESOLUTION_GRID = "grid grid-cols-1 gap-2 sm:grid-cols-2";
const RESOLUTION_ITEM = "flex animate-reveal items-center gap-3 rounded-lg px-3 py-2 text-sm";
const RESOLUTION_SELECTED = "bg-amber-400/15 ring-1 ring-amber-400";
const RESOLUTION_UNSELECTED = "bg-stone-800/70 ring-1 ring-stone-700";
const RESOLUTION_BANNED = "bg-red-950/50 ring-1 ring-red-900 opacity-80";
const RESOLUTION_ICON = "size-8 shrink-0 rounded-full object-contain p-0.5";
const RESOLUTION_STAGGER_MS = 120;
const FAVORITE_TAG = "inline-flex items-center gap-1 self-start rounded bg-amber-400 px-1.5 py-0.5 text-xs font-semibold text-stone-950";
const COMPONENT_GRID = "grid grid-cols-1 gap-3 sm:grid-cols-2";
const COMPONENT_CARD = "flex items-start gap-4 rounded-xl bg-stone-800/60 p-4 ring-1 ring-stone-700";
const COMPONENT_IMAGE = "h-auto w-28 shrink-0 rounded-lg";
const ACTIONS = "flex flex-wrap gap-3";
const SECONDARY_BUTTON = "rounded-lg border border-stone-600 px-4 py-2 text-sm text-stone-200 transition hover:bg-stone-800 disabled:opacity-40";

export function DraftBoard({
  isBusy,
  map,
  deck,
  players,
  pool,
  currentPlayer,
  isComplete,
  canUndo,
  resolution,
  openedFactionBoard,
  onPick,
  onOpenFactionBoard,
  onCloseFactionBoard,
  onUndo,
}: DraftBoardProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className={BANNER}>
        {isComplete ? (
          <p className={BANNER_TITLE}>Draft concluído!</p>
        ) : (
          <>
            <p className={HINT}>Vez de escolher</p>
            <p className={BANNER_TITLE}>{currentPlayer}</p>
            <p className={HINT}>Escolha uma facção e monte-a no tabuleiro antes de passar a vez.</p>
          </>
        )}
      </div>

      {resolution && (
        <section className={SECTION}>
          <h2 className={SECTION_TITLE}>Resultado dos banimentos e favoritos</h2>
          <p className={HINT}>
            {resolution.favorites.length > 2
              ? `${resolution.favorites.length} favoritas disputaram 2 vagas garantidas; as não sorteadas continuaram no sorteio normal.`
              : "Até 2 favoritas entram garantidas; o resto do pool foi sorteado normalmente."}
          </p>
          <ul className={RESOLUTION_GRID}>
            {resolution.favorites.map(({ faction, player, isSelected }, index) => (
              <li
                key={faction.id}
                className={`${RESOLUTION_ITEM} ${isSelected ? RESOLUTION_SELECTED : RESOLUTION_UNSELECTED}`}
                style={{ animationDelay: `${index * RESOLUTION_STAGGER_MS}ms` }}
              >
                <Image src={faction.icon} alt="" width={32} height={32} className={RESOLUTION_ICON} style={{ backgroundColor: faction.color }} />
                <span className="flex flex-col">
                  <span className="font-medium">
                    <span aria-hidden>{STAR_ICON}</span> {faction.name}
                  </span>
                  <span className="text-xs text-stone-400">
                    Favoritada por {player} · {isSelected ? "vaga garantida" : "não sorteada, seguiu elegível"}
                  </span>
                </span>
              </li>
            ))}
            {resolution.bans.map(({ faction, player }, index) => (
              <li
                key={faction.id}
                className={`${RESOLUTION_ITEM} ${RESOLUTION_BANNED}`}
                style={{ animationDelay: `${(resolution.favorites.length + index) * RESOLUTION_STAGGER_MS}ms` }}
              >
                <Image src={faction.icon} alt="" width={32} height={32} className={`${RESOLUTION_ICON} grayscale`} style={{ backgroundColor: faction.color }} />
                <span className="flex flex-col">
                  <span className="font-medium line-through">
                    <span aria-hidden>{BAN_ICON}</span> {faction.name}
                  </span>
                  <span className="text-xs text-stone-400">Banida por {player}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

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
                <span className={CARD_STATUS_LABEL}>{label}</span>
                <span className="text-lg font-semibold">{component.name}</span>
                <span className={CARD_DETAIL}>{component.source === "official" ? "Oficial" : "Fã"}</span>
                {component.setupNote && <span className={CARD_DETAIL}>{component.setupNote}</span>}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className={SECTION}>
        <h2 className={SECTION_TITLE}>Ordem de turno</h2>
        <p className={HINT}>As escolhas vão do último ao primeiro jogador.</p>
        <ol className="flex flex-col gap-2">
          {players.map((player, index) => (
            <li key={player.name} className={`${PLAYER_ROW} ${player.isCurrent ? PLAYER_ROW_CURRENT : PLAYER_ROW_IDLE}`}>
              <span className={ORDER_BADGE}>{index + 1}</span>
              <span className="font-medium">{player.name}</span>
              {player.isFirst && <span className={FIRST_TAG}>1º jogador</span>}
              {player.faction && (
                <span className="ml-auto flex items-center gap-2 text-sm">
                  <Image src={player.faction.icon} alt="" width={24} height={24} className={PLAYER_FACTION_ICON} style={{ backgroundColor: player.faction.color }} />
                  {player.faction.name}
                  {player.faction.characterName && ` (${player.faction.characterName})`}
                </span>
              )}
            </li>
          ))}
        </ol>
      </section>

      <section className={SECTION}>
        <h2 className={SECTION_TITLE}>Facções disponíveis</h2>
        <div className={POOL_GRID}>
          {pool.map((card) => (
            <div
              key={card.id}
              className={`${CARD_BASE} ${CARD_KIND[card.kind]} ${CARD_STATUS[card.status]}`}
              style={{ borderLeftColor: card.color }}
            >
              <button type="button" disabled={isBusy || card.status !== "available"} onClick={() => onPick(card.id)} className={CARD_PICK_AREA}>
                <Image src={card.icon} alt="" width={56} height={56} className={CARD_ICON} style={{ backgroundColor: card.color }} />
                <span className="flex flex-col gap-1">
                  <span className="font-semibold">{card.name}</span>
                  {card.isFavorite && (
                    <span className={FAVORITE_TAG}>
                      <span aria-hidden>{STAR_ICON}</span> Favorita
                    </span>
                  )}
                  <span className={CARD_DETAIL}>{card.kindLabel}</span>
                  {card.characterName && <span className={CARD_DETAIL}>Personagem: {card.characterName}</span>}
                  {card.note && <span className={CARD_DETAIL}>{card.note}</span>}
                  {card.status === "locked" && <span className={CARD_STATUS_LABEL}>Bloqueada até alguém escolher uma militante</span>}
                  {card.status === "excluded" && <span className={CARD_STATUS_LABEL}>Indisponível: não pode jogar com {card.excludedBy}</span>}
                  {card.status === "taken" && <span className={CARD_STATUS_LABEL}>Escolhida por {card.takenBy}</span>}
                </span>
              </button>
              {card.hasBoard && (
                <button type="button" className={CARD_BOARD_BUTTON} onClick={() => onOpenFactionBoard(card.id)}>
                  Ver tabuleiro
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {openedFactionBoard && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Tabuleiro: ${openedFactionBoard.name}`}
          className={MODAL_OVERLAY}
          onClick={onCloseFactionBoard}
        >
          <div
            className={MODAL_PANEL}
            style={{ borderTopColor: openedFactionBoard.color }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={MODAL_HEADER}>
              <h2 className={SECTION_TITLE}>{openedFactionBoard.name}</h2>
              <button type="button" className={SECONDARY_BUTTON} onClick={onCloseFactionBoard}>
                Fechar
              </button>
            </div>
            <Image src={openedFactionBoard.front} alt={`Frente do tabuleiro: ${openedFactionBoard.name}`} width={1600} height={1242} sizes={BOARD_IMAGE_SIZES} className={BOARD_IMAGE} />
            <Image src={openedFactionBoard.back} alt={`Verso do tabuleiro: ${openedFactionBoard.name}`} width={1600} height={1242} sizes={BOARD_IMAGE_SIZES} className={BOARD_IMAGE} />
          </div>
        </div>
      )}

      <div className={ACTIONS}>
        <button type="button" className={SECONDARY_BUTTON} disabled={isBusy || !canUndo} onClick={onUndo}>
          Desfazer última escolha
        </button>
      </div>
    </div>
  );
}
