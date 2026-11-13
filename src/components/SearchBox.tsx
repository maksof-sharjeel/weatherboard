import { AlertCircle, Loader2, MapPin, RotateCw, Search, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { AppError, isAbort, toAppError } from '../lib/errors'
import { placeLabel, searchCities, type GeoSource } from '../lib/geo'
import type { Place } from '../lib/types'
import { validateCityQuery } from '../lib/validation'

interface Props {
  onSelect: (place: Place) => void
}

type Lookup =
  | { status: 'idle' }
  | { status: 'loading'; query: string }
  | { status: 'ready'; query: string; places: Place[]; source: GeoSource }
  | { status: 'error'; query: string; error: AppError }

/** 250 ms debounce + a fast API keeps suggestions inside the 300 ms "after the user pauses" budget. */
const DEBOUNCE_MS = 250

export function SearchBox({ onSelect }: Props) {
  const [value, setValue] = useState('')
  const [dirty, setDirty] = useState(false)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [lookup, setLookup] = useState<Lookup>({ status: 'idle' })
  const [retryNonce, setRetryNonce] = useState(0)

  const inputRef = useRef<HTMLInputElement>(null)
  const ids = { input: useId(), list: useId(), error: useId(), hint: useId() }

  const query = value.trim()
  const debounced = useDebouncedValue(query, DEBOUNCE_MS)
  const queryValid = validateCityQuery(query) === null

  useEffect(() => {
    if (validateCityQuery(debounced) !== null) {
      setLookup({ status: 'idle' })
      return
    }
    const controller = new AbortController()
    setLookup({ status: 'loading', query: debounced })
    searchCities(debounced, controller.signal)
      .then((res) => setLookup({ status: 'ready', query: debounced, places: res.places, source: res.source }))
      .catch((err) => {
        if (isAbort(err) || controller.signal.aborted) return
        setLookup({ status: 'error', query: debounced, error: toAppError(err, 'City search') })
      })
    return () => controller.abort()
  }, [debounced, retryNonce])

  const places = lookup.status === 'ready' && lookup.query === query ? lookup.places : []
  const typingAhead = queryValid && query !== debounced
  const showPanel = open && queryValid

  function choose(place: Place) {
    setValue(place.name)
    setFieldError(null)
    setOpen(false)
    setActive(-1)
    onSelect(place)
  }

  async function submit() {
    const err = validateCityQuery(value)
    if (err) {
      setFieldError(err)
      inputRef.current?.focus()
      return
    }
    if (active >= 0 && places[active]) return choose(places[active])
    if (places.length) return choose(places[0])

    // User hit Enter before suggestions arrived — resolve directly instead of making them wait and retry.
    setLookup({ status: 'loading', query })
    try {
      const res = await searchCities(query)
      setLookup({ status: 'ready', query, places: res.places, source: res.source })
      if (res.places.length) choose(res.places[0])
      else setFieldError(`No cities match “${query}”. Check the spelling, or try a nearby larger city.`)
    } catch (e) {
      const appErr = toAppError(e, 'City search')
      setLookup({ status: 'error', query, error: appErr })
      setFieldError(`${appErr.title} ${appErr.hint}`)
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActive((i) => (places.length ? (i + 1) % places.length : -1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => (places.length ? (i <= 0 ? places.length - 1 : i - 1) : -1))
    } else if (e.key === 'Escape') {
      if (open) {
        e.preventDefault()
        setOpen(false)
        setActive(-1)
      } else if (value) {
        setValue('')
        setFieldError(null)
      }
    }
  }

  const describedBy = [fieldError ? ids.error : null, ids.hint].filter(Boolean).join(' ')

  return (
    <form
      role="search"
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
      className="relative"
    >
      <label htmlFor={ids.input} className="sr-only">
        Search for a city
      </label>
      <div
        className={`flex items-center gap-2 rounded-2xl border bg-surface pl-4 pr-1.5 shadow-sm transition-colors focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/15 ${
          fieldError ? 'border-danger' : 'border-line'
        }`}
      >
        <Search className="size-5 shrink-0 text-faint" aria-hidden />
        <input
          ref={inputRef}
          id={ids.input}
          type="text"
          inputMode="search"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="Search any city…"
          value={value}
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={ids.list}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${ids.list}-${active}` : undefined}
          aria-invalid={!!fieldError}
          aria-describedby={describedBy}
          onChange={(e) => {
            const next = e.target.value
            setValue(next)
            setDirty(true)
            setOpen(true)
            setActive(-1)
            // Once an error is showing, re-check live so it disappears the moment it's fixed.
            if (fieldError) setFieldError(validateCityQuery(next))
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            setOpen(false)
            setActive(-1)
            if (dirty || value) setFieldError(validateCityQuery(value))
          }}
          onKeyDown={onKeyDown}
          className="h-12 min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-faint focus-visible:outline-none"
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              setValue('')
              setFieldError(null)
              inputRef.current?.focus()
            }}
            className="grid size-11 shrink-0 place-items-center rounded-xl text-faint hover:bg-surface-2 hover:text-ink"
            aria-label="Clear search"
          >
            <X className="size-4" />
          </button>
        )}
        <button
          type="submit"
          className="h-11 shrink-0 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-ink transition hover:opacity-90 active:scale-[0.98]"
        >
          Search
        </button>
      </div>

      <p id={ids.hint} className="sr-only">
        Type at least two letters, then use the arrow keys to choose a suggestion.
      </p>

      {fieldError && (
        <p id={ids.error} role="alert" className="mt-2 flex items-start gap-1.5 px-1 text-sm text-danger">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {fieldError}
        </p>
      )}

      {showPanel && (
        <div
          className="fade-in absolute inset-x-0 top-[3.75rem] z-30 overflow-hidden rounded-2xl border border-line bg-surface shadow-xl shadow-black/10"
          // Keep focus in the input while interacting with the panel, so blur-validation doesn't fire mid-click.
          onMouseDown={(e) => e.preventDefault()}
        >
          {(typingAhead || lookup.status === 'loading') && places.length === 0 && (
            <div className="flex items-center gap-2 px-4 py-3.5 text-sm text-muted" aria-live="polite">
              <Loader2 className="size-4 animate-spin" aria-hidden /> Searching for “{query}”…
            </div>
          )}

          {!typingAhead && lookup.status === 'error' && lookup.query === query && (
            <div className="flex items-start gap-3 px-4 py-3.5" role="alert">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden />
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-medium text-ink">{lookup.error.title}</p>
                <p className="text-muted">{lookup.error.hint}</p>
              </div>
              <button
                type="button"
                onClick={() => setRetryNonce((n) => n + 1)}
                className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl border border-line px-3 text-sm font-medium hover:bg-surface-2"
              >
                <RotateCw className="size-3.5" aria-hidden /> Retry
              </button>
            </div>
          )}

          {!typingAhead && lookup.status === 'ready' && lookup.query === query && places.length === 0 && (
            <div className="px-4 py-3.5 text-sm" aria-live="polite">
              <p className="font-medium text-ink">No cities match “{query}”</p>
              <p className="text-muted">Check the spelling, or try a nearby larger city.</p>
            </div>
          )}

          {places.length > 0 && (
            <ul id={ids.list} role="listbox" aria-label="City suggestions" className="max-h-80 overflow-y-auto py-1.5">
              {places.map((p, i) => (
                <li
                  key={p.id}
                  id={`${ids.list}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  onClick={() => choose(p)}
                  onMouseEnter={() => setActive(i)}
                  className={`mx-1.5 flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 py-2 ${
                    i === active ? 'bg-accent-soft' : ''
                  }`}
                >
                  <MapPin className="size-4 shrink-0 text-faint" aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-sm">
                    <span className="font-medium text-ink">{p.name}</span>
                    <span className="text-muted">{placeLabel(p).slice(p.name.length)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}

          {lookup.status === 'ready' && places.length > 0 && (
            <p className="border-t border-line px-4 py-2 text-[11px] text-faint">
              {lookup.source === 'geodb' ? 'Suggestions by GeoDB Cities' : 'Suggestions by Open-Meteo Geocoding'}
            </p>
          )}
        </div>
      )}
    </form>
  )
}
