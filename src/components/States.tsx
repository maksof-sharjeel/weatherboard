import { AlertTriangle, CloudSun, RotateCw, WifiOff } from 'lucide-react'
import type { AppError } from '../lib/errors'
import type { Place } from '../lib/types'

export function WeatherSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading weather…</span>
      <div className="card space-y-5 rounded-3xl p-5 sm:p-7">
        <div className="skeleton h-7 w-40" />
        <div className="flex items-center gap-4">
          <div className="skeleton size-24 rounded-full" />
          <div className="space-y-2">
            <div className="skeleton h-14 w-32" />
            <div className="skeleton h-4 w-24" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-16 rounded-2xl" />
          ))}
        </div>
      </div>
      <div className="card space-y-3 p-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton h-8" />
        ))}
      </div>
    </div>
  )
}

export function WeatherError({ error, onRetry, placeName }: { error: AppError; onRetry: () => void; placeName: string }) {
  const Icon = error.kind === 'offline' ? WifiOff : AlertTriangle
  return (
    <div className="card fade-in flex flex-col items-center px-6 py-12 text-center" role="alert">
      <div className="grid size-12 place-items-center rounded-2xl bg-danger-soft text-danger">
        <Icon className="size-6" aria-hidden />
      </div>
      <h2 className="mt-4 text-lg font-semibold">Couldn’t load the weather for {placeName}</h2>
      <p className="mt-1 max-w-md text-sm text-ink">{error.title}</p>
      <p className="mt-1 max-w-md text-sm text-muted">{error.hint}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-5 text-sm font-semibold text-accent-ink hover:opacity-90"
      >
        <RotateCw className="size-4" aria-hidden /> Try again
      </button>
    </div>
  )
}

export function EmptyState({ suggestions, onPick }: { suggestions: Place[]; onPick: (p: Place) => void }) {
  return (
    <div className="card fade-in flex flex-col items-center px-6 py-12 text-center sm:py-16">
      <div className="grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent">
        <CloudSun className="size-7" aria-hidden />
      </div>
      <h2 className="mt-4 text-lg font-semibold">Check the weather anywhere</h2>
      <p className="mt-1 max-w-sm text-sm text-muted">
        Search for a city above to see current conditions and the next five days. Star the ones you check often.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {suggestions.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onPick(p)}
            className="h-11 rounded-full border border-line px-4 text-sm font-medium text-ink transition hover:border-accent hover:text-accent"
          >
            {p.name}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Non-blocking notice shown above a still-usable report (offline, or a refresh failed). */
export function Notice({
  tone,
  title,
  children,
  action,
}: {
  tone: 'warn' | 'danger'
  title: string
  children?: React.ReactNode
  action?: React.ReactNode
}) {
  const cls = tone === 'warn' ? 'bg-warn-soft text-warn border-warn/25' : 'bg-danger-soft text-danger border-danger/25'
  const Icon = tone === 'warn' ? WifiOff : AlertTriangle
  return (
    <div className={`fade-in flex items-start gap-3 rounded-2xl border px-4 py-3 ${cls}`} role="status">
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-semibold">{title}</p>
        {children && <p className="opacity-90">{children}</p>}
      </div>
      {action}
    </div>
  )
}
