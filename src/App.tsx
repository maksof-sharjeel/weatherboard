import { useEffect, useState } from 'react'
import { ConfirmDialog } from './components/ConfirmDialog'
import { CurrentWeather } from './components/CurrentWeather'
import { Favourites } from './components/Favourites'
import { Forecast } from './components/Forecast'
import { Header } from './components/Header'
import { ReminderCard } from './components/ReminderCard'
import { SearchBox } from './components/SearchBox'
import { EmptyState, Notice, WeatherError, WeatherSkeleton } from './components/States'
import { useFavourites } from './hooks/useFavourites'
import { useInstallPrompt } from './hooks/useInstallPrompt'
import { useMediaQuery } from './hooks/useMediaQuery'
import { useOnline } from './hooks/useOnline'
import { usePersistentState } from './hooks/usePersistentState'
import { useTheme } from './hooks/useTheme'
import { loadSnapshot, useWeather } from './hooks/useWeather'
import { relativeTime } from './lib/format'
import { SUGGESTED_PLACES } from './lib/geo'
import { idbSet, IDB_KEYS } from './lib/idb'
import { KEYS } from './lib/storage'
import type { Place, Units } from './lib/types'

const isUnits = (v: unknown): v is Units => v === 'metric' || v === 'imperial'

export default function App() {
  const [place, setPlace] = useState<Place | null>(() => loadSnapshot()?.place ?? null)
  const [units, setUnits] = usePersistentState<Units>(KEYS.units, 'metric', isUnits)
  const { pref: theme, setPref: setTheme } = useTheme()
  const online = useOnline()
  const { canInstall, install } = useInstallPrompt()
  const fav = useFavourites()
  const weather = useWeather(place)
  const [confirmUnstar, setConfirmUnstar] = useState(false)
  const [favNotice, setFavNotice] = useState<string | null>(null)
  const desktop = useMediaQuery('(min-width: 1024px)')

  // The service worker can't read localStorage; mirror what the morning reminder needs.
  useEffect(() => {
    void idbSet(IDB_KEYS.units, units)
  }, [units])

  // Auto-refresh when the connection comes back, so the offline banner never lingers on stale data.
  useEffect(() => {
    if (online && weather.error?.kind === 'offline') weather.retry()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online])

  useEffect(() => {
    if (!favNotice) return
    const t = setTimeout(() => setFavNotice(null), 4000)
    return () => clearTimeout(t)
  }, [favNotice])

  const select = (p: Place) => {
    setPlace(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const report = weather.report
  const isFav = report ? fav.isFavourite(report.place.id) : false
  const stale = !!report && (!online || !!weather.error)

  const toggleFavourite = () => {
    if (!report) return
    if (isFav) {
      setConfirmUnstar(true)
      return
    }
    const res = fav.add(report.place)
    if (!res.ok && res.reason === 'full') {
      setFavNotice('You already have 5 favourites. Remove one to save this city.')
    }
  }

  const favouritesPanel = (
    <Favourites
      favourites={fav.favourites}
      activeId={place?.id ?? null}
      persistent={fav.persistent}
      onSelect={select}
      onRemove={fav.remove}
    />
  )

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-4 pb-12 sm:px-6 sm:pt-6 lg:px-8">
      <Header
        units={units}
        onUnits={setUnits}
        theme={theme}
        onTheme={setTheme}
        canInstall={canInstall}
        onInstall={() => void install()}
      />

      {!online && (
        <div className="mt-4">
          <Notice tone="warn" title="Offline mode">
            {report
              ? `Showing ${report.place.name} as saved ${relativeTime(report.fetchedAt)}. Search and refresh return when you reconnect.`
              : 'You’re not connected. Search needs a connection — reconnect to look up a city.'}
          </Notice>
        </div>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-6">
        <main className="min-w-0 space-y-4">
          <SearchBox onSelect={select} />

          {/* Favourites sit right under search on small screens for one-tap access */}
          {!desktop && favouritesPanel}

          {favNotice && <Notice tone="danger" title={favNotice} />}

          {online && report && weather.error && (
            <Notice
              tone="danger"
              title={`Couldn’t refresh ${report.place.name}. ${weather.error.title}`}
              action={
                <button
                  type="button"
                  onClick={weather.retry}
                  className="h-9 shrink-0 rounded-lg border border-current/30 px-3 text-sm font-medium"
                >
                  Retry
                </button>
              }
            >
              {weather.error.hint} Showing data from {relativeTime(report.fetchedAt)}.
            </Notice>
          )}

          {!place && <EmptyState suggestions={SUGGESTED_PLACES} onPick={select} />}
          {place && weather.status === 'loading' && <WeatherSkeleton />}
          {place && weather.status === 'error' && weather.error && (
            <WeatherError error={weather.error} onRetry={weather.retry} placeName={place.name} />
          )}
          {report && weather.status === 'ready' && (
            <>
              <CurrentWeather
                report={report}
                units={units}
                refreshing={weather.refreshing}
                stale={stale}
                isFavourite={isFav}
                favouritesFull={fav.favourites.length >= 5}
                onToggleFavourite={toggleFavourite}
                onRefresh={weather.retry}
                online={online}
              />
              <Forecast days={report.daily} units={units} />
            </>
          )}
        </main>

        <aside className="min-w-0 space-y-4">
          {desktop && favouritesPanel}
          <ReminderCard cityName={report?.place.name ?? null} />
        </aside>
      </div>

      <footer className="mt-10 text-center text-xs text-faint">
        Weather by OpenWeatherMap &amp; Open-Meteo · Cities by GeoDB
      </footer>

      <ConfirmDialog
        open={confirmUnstar}
        title={`Remove ${report?.place.name ?? ''}?`}
        description="It will disappear from your favourites. You can add it back any time by tapping the star."
        confirmLabel="Remove"
        onCancel={() => setConfirmUnstar(false)}
        onConfirm={() => {
          if (report) fav.remove(report.place.id)
          setConfirmUnstar(false)
        }}
      />
    </div>
  )
}
