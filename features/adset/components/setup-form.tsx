import Image from "next/image";
import type { FormEvent } from "react";
import type { MatchMode } from "../match-repository";
import type { ToggleGroup } from "../use-setup-form";

interface SetupFormProps {
  mode: MatchMode;
  onModeChange: (mode: MatchMode) => void;
  joinMatchId: string;
  onJoinMatchIdChange: (matchId: string) => void;
  onJoin: (event: FormEvent<HTMLFormElement>) => void;
  matchError: string | null;
  isBusy: boolean;
  playerNames: string[];
  onNameChange: (index: number, name: string) => void;
  onAddPlayer: () => void;
  onRemovePlayer: (index: number) => void;
  canAddPlayer: boolean;
  canRemovePlayer: boolean;
  toggleGroups: ToggleGroup[];
  onToggleItem: (id: string) => void;
  onToggleGroup: (group: ToggleGroup) => void;
  errors: string[];
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

const SECTION = "flex flex-col gap-3 rounded-2xl border border-stone-700 bg-stone-900/60 p-5";
const SECTION_TITLE = "text-lg font-semibold text-amber-200";
const HINT = "text-sm text-stone-400";
const INPUT = "flex-1 rounded-lg border border-stone-600 bg-stone-950 px-3 py-2 text-stone-100 outline-none focus:border-amber-400";
const SECONDARY_BUTTON = "rounded-lg border border-stone-600 px-3 py-2 text-sm text-stone-200 transition hover:bg-stone-800 disabled:opacity-40";
const PRIMARY_BUTTON = "rounded-xl bg-amber-500 px-5 py-3 font-semibold text-stone-950 transition hover:bg-amber-400 disabled:opacity-60";
const JOIN_INPUT = `${INPUT} font-mono uppercase tracking-widest`;
const GROUP_HEADER = "flex items-center justify-between gap-2";
const GROUP_TITLE = "text-sm font-medium uppercase tracking-wide text-stone-400";
const GROUP_TOGGLE = "text-xs text-amber-300 hover:underline";
const TOGGLE_GRID = "grid grid-cols-1 gap-2 sm:grid-cols-2";
const TOGGLE_LABEL = "flex cursor-pointer items-center gap-3 rounded-lg border border-stone-700 px-3 py-2 has-[:checked]:border-amber-400/70 has-[:checked]:bg-amber-400/10";
const FACTION_ICON = "size-8 shrink-0 rounded-full object-contain p-0.5";
const COMPONENT_ICON = "size-8 shrink-0 rounded-md object-cover";
const TOGGLE_DETAIL = "ml-auto text-xs text-stone-400";
const ERROR_BOX = "rounded-xl border border-red-500/50 bg-red-950/40 p-4 text-sm text-red-200";
const MODE_GRID = "grid grid-cols-1 gap-3 sm:grid-cols-2";
const MODE_OPTION = "flex cursor-pointer flex-col gap-1 rounded-xl border border-stone-700 p-4 transition has-[:checked]:border-amber-400 has-[:checked]:bg-amber-400/10 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-amber-400";
const MODE_TITLE = "font-semibold text-stone-100";
const MODE_OPTIONS: { value: MatchMode; title: string; description: string }[] = [
  { value: "classic", title: "ADSET clássico", description: "Sorteio direto das facções, como no livro de regras." },
  {
    value: "competitive",
    title: "ADSET competitivo",
    description: "Antes do sorteio, cada jogador faz 2 ações em snake: banir facções ou favoritar uma.",
  },
];

export function SetupForm({
  mode,
  onModeChange,
  joinMatchId,
  onJoinMatchIdChange,
  onJoin,
  matchError,
  isBusy,
  playerNames,
  onNameChange,
  onAddPlayer,
  onRemovePlayer,
  canAddPlayer,
  canRemovePlayer,
  toggleGroups,
  onToggleItem,
  onToggleGroup,
  errors,
  onSubmit,
}: SetupFormProps) {
  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={onJoin} className={SECTION}>
        <h2 className={SECTION_TITLE}>Entrar numa partida</h2>
        <p className={HINT}>Digite o ID que o criador da partida compartilhou.</p>
        <div className="flex gap-2">
          <input
            className={JOIN_INPUT}
            value={joinMatchId}
            placeholder="ID da partida"
            aria-label="ID da partida"
            onChange={(event) => onJoinMatchIdChange(event.target.value)}
          />
          <button type="submit" className={SECONDARY_BUTTON}>
            Entrar
          </button>
        </div>
      </form>

      {matchError && <p className={ERROR_BOX}>{matchError}</p>}

      <form onSubmit={onSubmit} className="flex flex-col gap-6">
        <fieldset className={SECTION}>
          <legend className="sr-only">Modo de jogo</legend>
          <h2 className={SECTION_TITLE}>Modo</h2>
          <div className={MODE_GRID}>
            {MODE_OPTIONS.map((option) => (
              <label key={option.value} className={MODE_OPTION}>
                <input
                  type="radio"
                  name="mode"
                  className="sr-only"
                  checked={mode === option.value}
                  onChange={() => onModeChange(option.value)}
                />
                <span className={MODE_TITLE}>{option.title}</span>
                <span className={HINT}>{option.description}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <section className={SECTION}>
          <h2 className={SECTION_TITLE}>Jogadores</h2>
          <p className={HINT}>Digite na ordem em que estão sentados (sentido horário). O primeiro jogador será sorteado.</p>
          {playerNames.map((name, index) => (
            <div key={index} className="flex gap-2">
              <input
                className={INPUT}
                value={name}
                placeholder={`Jogador ${index + 1}`}
                onChange={(event) => onNameChange(index, event.target.value)}
              />
              <button type="button" className={SECONDARY_BUTTON} disabled={!canRemovePlayer} onClick={() => onRemovePlayer(index)}>
                Remover
              </button>
            </div>
          ))}
          <button type="button" className={SECONDARY_BUTTON} disabled={!canAddPlayer} onClick={onAddPlayer}>
            Adicionar jogador
          </button>
        </section>
  
        <section className={SECTION}>
          <h2 className={SECTION_TITLE}>Conteúdo no sorteio</h2>
          <p className={HINT}>Desmarque o que vocês não têm ou não querem usar.</p>
          {toggleGroups.map((group) => (
            <div key={group.title} className="flex flex-col gap-2">
              <div className={GROUP_HEADER}>
                <h3 className={GROUP_TITLE}>{group.title}</h3>
                <button type="button" className={GROUP_TOGGLE} onClick={() => onToggleGroup(group)}>
                  {group.allSelected ? "Desmarcar todas" : "Marcar todas"}
                </button>
              </div>
              <div className={TOGGLE_GRID}>
                {group.items.map((item) => (
                  <label key={item.id} className={TOGGLE_LABEL}>
                    <input type="checkbox" className="accent-amber-400" checked={item.selected} onChange={() => onToggleItem(item.id)} />
                    {item.icon && <Image src={item.icon} alt="" width={28} height={28} className={item.color ? FACTION_ICON : COMPONENT_ICON} style={{ backgroundColor: item.color }} />}
                    <span>{item.label}</span>
                    <span className={TOGGLE_DETAIL}>{item.detail}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </section>
  
        {errors.length > 0 && (
          <ul className={ERROR_BOX}>
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        )}
  
        <button type="submit" className={PRIMARY_BUTTON} disabled={isBusy}>
          {isBusy ? "Criando partida…" : mode === "competitive" ? "Criar partida e iniciar os banimentos" : "Criar partida e sortear"}
        </button>
      </form>
    </div>
  );
}
