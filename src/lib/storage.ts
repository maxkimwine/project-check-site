const STORAGE_KEY = 'project-check-site:v1';

export interface PersistedState {
  projects: unknown[];
  nodes: unknown[];
  edges: unknown[];
  memos: unknown[];
  replies: unknown[];
}

export function loadState<T extends PersistedState>(): T | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function saveState(state: PersistedState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
