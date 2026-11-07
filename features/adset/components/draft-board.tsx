import Image from "next/image";
import type { FactionKind } from "../factions";
import type { DraftBoardView, FactionBoardView, PoolCardStatus } from "../use-adset-draft";

interface DraftBoardProps extends DraftBoardView {
  matchId: string;
  error: string | null;
  isBusy: boolean;
  onCopyMatchId: () => void;
  openedFactionBoard: FactionBoardView | null;
  onPick: (factionId: string) => void;
  onOpenFactionBoard: (factionId: string) => void;
  onCloseFactionBoard: () => void;
  onUndo: () => void;
  onLeave: () => void;
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
const MATCH_BAR = "flex items-center justify-between gap-4 rounded-2xl border border-stone-700 bg-stone-900/60 px-5 py-3";
const MATCH_ID = "font-mono text-2xl font-bold tracking-widest text-amber-200";
const ERROR_BOX = "rounded-xl border border-red-500/50 bg-red-950/40 p-4 text-sm text-red-200";
const COMPONENT_GRID = "grid grid-cols-1 gap-3 sm:grid-cols-2";
const COMPONENT_CARD = "flex items-start gap-4 rounded-xl bg-stone-800/60 p-4 ring-1 ring-stone-700";
const COMPONENT_IMAGE = "h-auto w-28 shrink-0 rounded-lg";
const ACTIONS = "flex flex-wrap gap-3";
const SECONDARY_BUTTON = "rounded-lg border border-stone-600 px-4 py-2 text-sm text-stone-200 transition hover:bg-stone-800 disabled:opacity-40";

export function DraftBoard({
  matchId,
  error,
  isBusy,
  onCopyMatchId,
  map,
  deck,
  players,
  pool,
  currentPlayer,
  isComplete,
  canUndo,
  openedFactionBoard,
  onPick,
  onOpenFactionBoard,
  onCloseFactionBoard,
  onUndo,
  onLeave,
}: DraftBoardProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className={MATCH_BAR}>
        <span className="flex flex-col">
          <span className={HINT}>ID da partida</span>
          <span className={MATCH_ID}>{matchId}</span>
        </span>
        <button type="button" className={SECONDARY_BUTTON} onClick={onCopyMatchId}>
          Copiar ID
        </button>
      </div>

      {error && <p className={ERROR_BOX}>{error}</p>}

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
                  <span className={CARD_DETAIL}>{card.kindLabel}</span>
                  {card.characterName && <span className={CARD_DETAIL}>Personagem: {card.characterName}</span>}
                  {card.note && <span className={CARD_DETAIL}>{card.note}</span>}
                  {card.status === "locked" && <span className={CARD_STATUS_LABEL}>Bloqueada até alguém escolher uma militante</span>}
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
        <button type="button" className={SECONDARY_BUTTON} onClick={onLeave}>
          Sair da partida
        </button>
      </div>
    </div>
  );
}
