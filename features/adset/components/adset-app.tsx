"use client";

import { useAdsetDraft } from "../use-adset-draft";
import { useSetupForm } from "../use-setup-form";
import { DraftBoard } from "./draft-board";
import { SetupForm } from "./setup-form";

export function AdsetApp() {
  const { isHydrated, board, openedFactionBoard, openFactionBoard, closeFactionBoard, startDraft, pick, undo, reset } =
    useAdsetDraft();
  const setup = useSetupForm(startDraft);

  if (!isHydrated) return null;

  if (board) {
    return (
      <DraftBoard
        {...board}
        openedFactionBoard={openedFactionBoard}
        onPick={pick}
        onOpenFactionBoard={openFactionBoard}
        onCloseFactionBoard={closeFactionBoard}
        onUndo={undo}
        onReset={reset}
      />
    );
  }

  return (
    <SetupForm
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
