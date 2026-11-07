"use client";

import { useAdsetDraft } from "../use-adset-draft";
import { useSetupForm } from "../use-setup-form";
import { DraftBoard } from "./draft-board";
import { SetupForm } from "./setup-form";

const LOADING = "text-center text-stone-400";

export function AdsetApp() {
  const draft = useAdsetDraft();
  const setup = useSetupForm(draft.startDraft, draft.joinMatch);

  if (!draft.isHydrated) return null;

  if (draft.isLoadingMatch) return <p className={LOADING}>Carregando partida {draft.matchId}…</p>;

  if (draft.board && draft.matchId) {
    return (
      <DraftBoard
        {...draft.board}
        matchId={draft.matchId}
        error={draft.error}
        isBusy={draft.isBusy}
        onCopyMatchId={draft.copyMatchId}
        openedFactionBoard={draft.openedFactionBoard}
        onPick={draft.pick}
        onOpenFactionBoard={draft.openFactionBoard}
        onCloseFactionBoard={draft.closeFactionBoard}
        onUndo={draft.undo}
        onLeave={draft.leaveMatch}
      />
    );
  }

  return (
    <SetupForm
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
