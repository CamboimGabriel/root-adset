"use client";

import { useAdsetDraft } from "../use-adset-draft";
import { useFactionGallery } from "../use-faction-gallery";
import { useSetupForm } from "../use-setup-form";
import { CompetitiveBoard } from "./competitive-board";
import { DraftBoard } from "./draft-board";
import { FactionGallery } from "./faction-gallery";
import { SetupForm } from "./setup-form";

const LOADING = "text-center text-stone-400";
const MATCH_BAR = "flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-stone-700 bg-stone-900/60 px-5 py-3";
const MATCH_ID = "font-mono text-2xl font-bold tracking-widest text-amber-200";
const HINT = "text-sm text-stone-400";
const ERROR_BOX = "rounded-xl border border-red-500/50 bg-red-950/40 p-4 text-sm text-red-200";
const SECONDARY_BUTTON = "rounded-lg border border-stone-600 px-4 py-2 text-sm text-stone-200 transition hover:bg-stone-800";

export function AdsetApp() {
  const draft = useAdsetDraft();
  const setup = useSetupForm(draft.startDraft, draft.joinMatch);
  const gallery = useFactionGallery(draft.competitiveBoard?.factions ?? []);

  if (!draft.isHydrated) return null;

  if (draft.isLoadingMatch) return <p className={LOADING}>Carregando partida {draft.matchId}…</p>;

  if (draft.matchId && (draft.board || draft.competitiveBoard)) {
    return (
      <div className="flex flex-col gap-6">
        <div className={MATCH_BAR}>
          <span className="flex flex-col">
            <span className={HINT}>ID da partida</span>
            <span className={MATCH_ID}>{draft.matchId}</span>
          </span>
          <span className="flex gap-2">
            <button type="button" className={SECONDARY_BUTTON} onClick={draft.copyMatchId}>
              Copiar ID
            </button>
            <button type="button" className={SECONDARY_BUTTON} onClick={draft.leaveMatch}>
              Sair
            </button>
          </span>
        </div>

        {draft.error && (
          <p role="alert" className={ERROR_BOX}>
            {draft.error}
          </p>
        )}

        {draft.competitiveBoard ? (
          <CompetitiveBoard
            {...draft.competitiveBoard}
            gallery={
              <FactionGallery
                factions={gallery.visibleFactions}
                totalCount={gallery.totalCount}
                query={gallery.query}
                onQueryChange={gallery.changeQuery}
                source={gallery.source}
                onSourceChange={gallery.changeSource}
                kind={gallery.kind}
                onKindChange={gallery.changeKind}
                status={gallery.status}
                onStatusChange={gallery.changeStatus}
                onClearFilters={gallery.clearFilters}
                isBusy={draft.isBusy}
                onBan={draft.banFaction}
                onFavorite={draft.favoriteFaction}
              />
            }
          />
        ) : (
          draft.board && (
            <DraftBoard
              {...draft.board}
              isBusy={draft.isBusy}
              openedFactionBoard={draft.openedFactionBoard}
              onPick={draft.pick}
              onOpenFactionBoard={draft.openFactionBoard}
              onCloseFactionBoard={draft.closeFactionBoard}
              onUndo={draft.undo}
            />
          )
        )}
      </div>
    );
  }

  return (
    <SetupForm
      mode={setup.mode}
      onModeChange={setup.changeMode}
      joinMatchId={setup.joinMatchId}
      onJoinMatchIdChange={setup.changeJoinMatchId}
      onJoin={setup.handleJoin}
      matchError={draft.error}
      isBusy={draft.isBusy}
      playerNames={setup.playerNames}
      onNameChange={setup.changeName}
      onAddPlayer={setup.addPlayer}
      onRemovePlayer={setup.removePlayer}
      canAddPlayer={setup.canAddPlayer}
      canRemovePlayer={setup.canRemovePlayer}
      toggleGroups={setup.toggleGroups}
      onToggleItem={setup.toggleItem}
      onToggleGroup={setup.toggleGroup}
      errors={setup.errors}
      onSubmit={setup.handleSubmit}
    />
  );
}
