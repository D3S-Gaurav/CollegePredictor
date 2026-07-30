"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Reactive `localStorage` state.
 *
 * Replaces the "hydrate in useEffect, then setState" pattern that was
 * duplicated across the home, wishlist and compare pages. That pattern
 * writes state synchronously inside an effect — which React 19 flags via
 * `react-hooks/set-state-in-effect` because it forces a second render pass
 * on every mount.
 *
 * `useSyncExternalStore` is the sanctioned primitive for reading state that
 * lives outside React. It also gives us two things the effects did not:
 * a `getServerSnapshot` so server rendering is well defined, and cross-tab
 * synchronisation via the `storage` event.
 */

/** Components subscribed to same-tab writes. */
const listeners = new Set<() => void>();

/**
 * `getSnapshot` must return a referentially stable value for unchanged
 * storage, or React re-renders forever. Cache the parsed object against the
 * exact raw string it came from, keyed by storage key.
 */
const snapshotCache = new Map<string, { raw: string | null; parsed: unknown }>();

function notify(): void {
  for (const listener of listeners) listener();
}

function subscribe(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  // Fires when *another* tab writes to localStorage.
  window.addEventListener("storage", onStoreChange);

  return () => {
    listeners.delete(onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function readSnapshot<T>(key: string, fallback: T): T {
  const raw = window.localStorage.getItem(key);
  const cached = snapshotCache.get(key);

  // Same raw string as last read — hand back the identical object.
  if (cached && cached.raw === raw) return cached.parsed as T;

  let parsed: T;
  if (raw === null) {
    parsed = fallback;
  } else {
    try {
      parsed = JSON.parse(raw) as T;
    } catch {
      parsed = fallback;
    }
  }

  snapshotCache.set(key, { raw, parsed });
  return parsed;
}

/**
 * Reads and writes a JSON-serialised value in `localStorage`.
 *
 * `fallback` must be a stable reference — a module-level constant, not an
 * inline literal — so that the empty-storage snapshot stays identical
 * across renders.
 */
export function useLocalStorageState<T>(
  key: string,
  fallback: T,
): [T, (next: T | ((prev: T) => T)) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => readSnapshot(key, fallback),
    () => fallback, // Server render: storage does not exist yet.
  );

  /** Accepts a value or an updater, mirroring `useState`. */
  const setValue = useCallback(
    (next: T | ((prev: T) => T)) => {
      const resolved =
        typeof next === "function"
          ? (next as (prev: T) => T)(readSnapshot(key, fallback))
          : next;

      const raw = JSON.stringify(resolved);
      window.localStorage.setItem(key, raw);
      // Seed the cache so the next read returns this exact object.
      snapshotCache.set(key, { raw, parsed: resolved });
      notify();
    },
    [key, fallback],
  );

  return [value, setValue];
}
