import { useCallback, useEffect, useState } from 'react'
import { readJSON, writeJSON } from '../lib/storage'

/** useState backed by localStorage (via the safe wrapper), kept in sync across tabs. */
export function usePersistentState<T>(key: string, fallback: T, isValid: (v: unknown) => v is T) {
  const [value, setValue] = useState<T>(() => readJSON(key, fallback, isValid))

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) setValue(readJSON(key, fallback, isValid))
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
    // fallback/isValid are expected to be stable module-level values
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? (next as (p: T) => T)(prev) : next
        writeJSON(key, resolved)
        return resolved
      })
    },
    [key],
  )

  return [value, update] as const
}
