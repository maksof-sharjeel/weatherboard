import { useCallback } from 'react'
import { KEYS, storage } from '../lib/storage'
import type { Place } from '../lib/types'
import { usePersistentState } from './usePersistentState'

export const MAX_FAVOURITES = 5

function isPlaceList(v: unknown): v is Place[] {
  return (
    Array.isArray(v) &&
    v.every(
      (p) =>
        p && typeof p === 'object' && typeof p.id === 'string' && typeof p.name === 'string' && typeof p.lat === 'number',
    )
  )
}

const EMPTY: Place[] = []

export type AddResult = { ok: true } | { ok: false; reason: 'full' | 'duplicate' }

export function useFavourites() {
  const [favourites, setFavourites] = usePersistentState<Place[]>(KEYS.favourites, EMPTY, isPlaceList)

  const isFavourite = useCallback((id: string) => favourites.some((f) => f.id === id), [favourites])

  const add = useCallback(
    (place: Place): AddResult => {
      if (favourites.some((f) => f.id === place.id)) return { ok: false, reason: 'duplicate' }
      if (favourites.length >= MAX_FAVOURITES) return { ok: false, reason: 'full' }
      setFavourites((prev) => [...prev, place])
      return { ok: true }
    },
    [favourites, setFavourites],
  )

  const remove = useCallback(
    (id: string) => setFavourites((prev) => prev.filter((f) => f.id !== id)),
    [setFavourites],
  )

  return { favourites, isFavourite, add, remove, persistent: storage.persistent }
}
