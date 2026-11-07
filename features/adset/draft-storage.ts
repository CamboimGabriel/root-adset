import type { DraftState } from "./draft";
import { isValidDraftState } from "./validators";

const STORAGE_KEY = "root-sorteador:adset-draft";
const listeners = new Set<() => void>();

let cachedRaw: string | null = null;
let cachedDraft: DraftState | null = null;

function parseDraft(raw: string | null): DraftState | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isValidDraftState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function subscribeDraft(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export function getDraftSnapshot(): DraftState | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedDraft = parseDraft(raw);
  }
  return cachedDraft;
}

export function getServerDraftSnapshot(): undefined {
  return undefined;
}

export function saveDraft(draft: DraftState | null): void {
  if (draft) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
  listeners.forEach((listener) => listener());
}
