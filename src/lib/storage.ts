/**
 * localStorage that never throws. Safari private mode, disabled cookies, sandboxed iframes and full
 * quotas all make localStorage throw; in that case we keep state in memory for this session and
 * expose `persistent === false` so the UI can tell the user their favourites won't survive a reload.
 */

function probe(): Storage | null {
  try {
    const k = '__wb_probe__'
    window.localStorage.setItem(k, k)
    window.localStorage.removeItem(k)
    return window.localStorage
  } catch {
    return null
  }
}

const ls = typeof window !== 'undefined' ? probe() : null
const memory = new Map<string, string>()

export const storage = {
  persistent: ls !== null,

  get(key: string): string | null {
    if (ls) {
      try {
        return ls.getItem(key)
      } catch {
        /* fall through */
      }
    }
    return memory.get(key) ?? null
  },

  /** Returns false if the value could only be kept in memory (e.g. quota exceeded). */
  set(key: string, value: string): boolean {
    memory.set(key, value)
    if (!ls) return false
    try {
      ls.setItem(key, value)
      return true
    } catch {
      return false
    }
  },

  remove(key: string): void {
    memory.delete(key)
    try {
      ls?.removeItem(key)
    } catch {
      /* ignore */
    }
  },
}

export function readJSON<T>(key: string, fallback: T, isValid: (v: unknown) => v is T): T {
  const raw = storage.get(key)
  if (raw == null) return fallback
  try {
    const parsed: unknown = JSON.parse(raw)
    return isValid(parsed) ? parsed : fallback
  } catch {
    return fallback
  }
}

export function writeJSON(key: string, value: unknown): boolean {
  return storage.set(key, JSON.stringify(value))
}

export const KEYS = {
  favourites: 'wb:favourites',
  units: 'wb:units',
  theme: 'wb:theme',
  lastReport: 'wb:last-report',
} as const
