import { useState, type State } from '../core/state.js';

export type PersistStorage = 'local' | 'session';

export interface PersistStateOptions {
    storage?: PersistStorage;
}

function getStorage(kind: PersistStorage): Storage | null {
    if (typeof window === 'undefined') return null;
    try {
        return kind === 'session' ? window.sessionStorage : window.localStorage;
    } catch {
        return null;
    }
}

function readStored<T>(storage: Storage | null, key: string): T | undefined {
    if (!storage) return undefined;
    try {
        const raw = storage.getItem(key);
        if (raw == null) return undefined;
        return JSON.parse(raw) as T;
    } catch {
        return undefined;
    }
}

function writeStored(storage: Storage | null, key: string, value: unknown): void {
    if (!storage) return;
    try {
        storage.setItem(key, JSON.stringify(value));
    } catch {
        /* quota / private mode */
    }
}

/**
 * `useState` that hydrates from and writes back to `localStorage` or `sessionStorage`.
 * Invalid JSON and quota errors are ignored; the in-memory cell still works.
 */
export function persistState<T>(
    key: string,
    initial: T,
    options: PersistStateOptions = {}
): State<T> {
    const storage = getStorage(options.storage ?? 'local');
    const stored = readStored<T>(storage, key);
    const state = useState<T>(stored === undefined ? initial : stored);

    writeStored(storage, key, state.value);
    state.watch(value => {
        writeStored(storage, key, value);
    });

    return state;
}
