// Contrôle HORS LIGNE uniquement : sous-ensemble de l'API zustand v5
// (create(init) et create<T>()(init), setState, getState, sélecteur).
import { useSyncExternalStore } from 'react';

type SetState<T> = (partial: Partial<T> | ((s: T) => Partial<T>)) => void;
type Init<T> = (set: SetState<T>, get: () => T) => T;

function createStore<T>(init: Init<T>) {
  let state: T;
  const listeners = new Set<() => void>();
  const setState: SetState<T> = (p) => {
    const next = typeof p === 'function' ? p(state) : p;
    state = { ...state, ...next };
    listeners.forEach((l) => l());
  };
  const getState = () => state;
  state = init(setState, getState);
  const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
  function useStore<U>(selector: (s: T) => U = (s) => s as unknown as U): U {
    return useSyncExternalStore(subscribe, () => selector(state));
  }
  return Object.assign(useStore, { setState, getState, subscribe });
}

export function create<T>(init?: Init<T>) {
  return init ? createStore(init) : (i: Init<T>) => createStore(i);
}
