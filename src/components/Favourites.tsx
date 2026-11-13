import { Info, Star, X } from 'lucide-react'
import { useState } from 'react'
import { MAX_FAVOURITES } from '../hooks/useFavourites'
import type { Place } from '../lib/types'
import { ConfirmDialog } from './ConfirmDialog'

interface Props {
  favourites: Place[]
  activeId: string | null
  persistent: boolean
  onSelect: (p: Place) => void
  onRemove: (id: string) => void
}

export function Favourites({ favourites, activeId, persistent, onSelect, onRemove }: Props) {
  const [pendingRemoval, setPendingRemoval] = useState<Place | null>(null)

  return (
    <section aria-labelledby="fav-heading" className="card p-4">
      <div className="flex items-center justify-between">
        <h2 id="fav-heading" className="text-xs font-semibold tracking-wide text-muted uppercase">
          Favourites
        </h2>
        <span className="tabular text-xs text-faint" aria-label={`${favourites.length} of ${MAX_FAVOURITES} saved`}>
          {favourites.length}/{MAX_FAVOURITES}
        </span>
      </div>

      {favourites.length === 0 ? (
        <div className="mt-3 flex items-start gap-3 rounded-xl border border-dashed border-line px-3 py-4 text-sm text-muted">
          <Star className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>
            Tap the star on a city to keep it here. You can save up to {MAX_FAVOURITES} for one-tap access.
          </p>
        </div>
      ) : (
        <ul className="mt-3 flex flex-wrap gap-2 lg:flex-col lg:flex-nowrap">
          {favourites.map((p) => {
            const active = p.id === activeId
            return (
              <li key={p.id} className="min-w-0 lg:w-full">
                <div
                  className={`flex items-center rounded-xl border transition-colors ${
                    active ? 'border-accent bg-accent-soft' : 'border-line hover:bg-surface-2'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(p)}
                    aria-current={active ? 'true' : undefined}
                    className="flex h-11 min-w-0 flex-1 items-center gap-2 pr-1 pl-3 text-left text-sm"
                  >
                    <span className={`truncate font-medium ${active ? 'text-accent' : 'text-ink'}`}>{p.name}</span>
                    <span className="hidden truncate text-xs text-faint lg:inline">{p.country}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingRemoval(p)}
                    className="grid size-11 shrink-0 place-items-center rounded-xl text-faint hover:text-danger"
                    aria-label={`Remove ${p.name} from favourites`}
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {!persistent && (
        <p className="mt-3 flex items-start gap-2 text-xs text-warn">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          Your browser is blocking storage (private mode?), so favourites will be forgotten when you close this tab.
        </p>
      )}

      <ConfirmDialog
        open={pendingRemoval !== null}
        title={`Remove ${pendingRemoval?.name ?? ''}?`}
        description="It will disappear from your favourites. You can add it back any time by searching for it."
        confirmLabel="Remove"
        onCancel={() => setPendingRemoval(null)}
        onConfirm={() => {
          if (pendingRemoval) onRemove(pendingRemoval.id)
          setPendingRemoval(null)
        }}
      />
    </section>
  )
}
