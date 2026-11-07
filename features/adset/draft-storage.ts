import { isValidMatchId } from "./validators";

const STORAGE_KEY = "root-sorteador:match-id";
const listeners = new Set<() => void>();

export function subscribeMatchId(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export function getMatchIdSnapshot(): string | null {
  const id = localStorage.getItem(STORAGE_KEY);
  return id && isValidMatchId(id) ? id : null;
}

export function getServerMatchIdSnapshot(): undefined {
  return undefined;
}

export function saveMatchId(id: string | null): void {
  if (id) {
    localStorage.setItem(STORAGE_KEY, id);
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
  listeners.forEach((listener) => listener());
}
