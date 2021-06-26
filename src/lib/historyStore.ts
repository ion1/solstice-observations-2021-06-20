import { writable } from "svelte/store";

export type Notifier<T> = (value: T) => void;
export type Unsubscriber = () => void;
export type Updater<T> = (value: T) => T;

export type HistoryStore<T> = {
  subscribe: (notifier: Notifier<T>) => Unsubscriber;
  set: (value: T) => void;
  pushSet: (value: T) => void;
  update: (fn: Updater<T>) => void;
  pushUpdate: (fn: Updater<T>) => void;
};

/**
 * A store which uses history.state[key] as storage.
 *
 * @param key The key in the history state object.
 * @param initValue Initial value.
 */
export function historyStore<T>(key: string, initValue: T): HistoryStore<T> {
  if (typeof window === "undefined" || typeof history === "undefined") {
    // We don't seem to be running in a browser, return a fake store instead.
    const store = writable(initValue);
    return {
      subscribe: store.subscribe,
      set: store.set,
      pushSet: store.set,
      update: store.update,
      pushUpdate: store.update,
    };
  }

  const subscribers = new Set<Notifier<T>>();

  function patchState(value: T): Record<string | number | symbol, unknown> {
    return {
      ...(history.state ?? {}),
      [key]: value,
    };
  }

  if ((history.state ?? {})[key] === undefined) {
    history.replaceState(patchState(initValue), document.title);
  }

  function notifySubscribers(value: T): void {
    for (const notify of subscribers) {
      notify(value);
    }
  }

  function eventListener(this: Window, event: PopStateEvent): void {
    const value: T | undefined = (event.state ?? {})[key];
    if (value !== undefined) {
      notifySubscribers(value);
    }
  }

  function subscribe(notifier: Notifier<T>): Unsubscriber {
    if (subscribers.size === 0) {
      window.addEventListener("popstate", eventListener);
    }
    subscribers.add(notifier);

    const state = (history.state ?? {})[key];
    if (state !== undefined) {
      notifier(state);
    }

    return () => {
      subscribers.delete(notifier);
      if (subscribers.size === 0) {
        window.removeEventListener("popstate", eventListener);
      }
    };
  }

  function set(replaceState: typeof history.replaceState, value: T): void {
    const oldValue = (history.state ?? {})[key];
    if (value !== oldValue) {
      replaceState(patchState(value), document.title);
      notifySubscribers(value);
    }
  }

  function update(
    replaceState: typeof history.replaceState,
    fn: Updater<T>
  ): void {
    const value: T | undefined = (history.state ?? {})[key];
    if (value === undefined) {
      throw new Error(`No previous state to update`);
    }
    set(replaceState, fn(value));
  }

  return {
    subscribe,
    set: (value) => set(history.replaceState.bind(history), value),
    pushSet: (value) => set(history.pushState.bind(history), value),
    update: (fn) => update(history.replaceState.bind(history), fn),
    pushUpdate: (fn) => update(history.pushState.bind(history), fn),
  };
}
