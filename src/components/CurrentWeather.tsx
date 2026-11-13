import { Droplets, RotateCw, Star, Thermometer, Wind } from 'lucide-react'
import { formatTemp, formatWind, relativeTime } from '../lib/format'
import { placeLabel } from '../lib/geo'
import type { Units, WeatherReport } from '../lib/types'
import { WeatherIcon } from './WeatherIcon'

interface Props {
  report: WeatherReport
  units: Units
  refreshing: boolean
  stale: boolean
  isFavourite: boolean
  favouritesFull: boolean
  onToggleFavourite: () => void
  onRefresh: () => void
  online: boolean
}

export function CurrentWeather({
  report,
  units,
  refreshing,
  stale,
  isFavourite,
  favouritesFull,
  onToggleFavourite,
  onRefresh,
  online,
}: Props) {
  const { current, place, daily } = report
  const today = daily[0]
  const region = placeLabel(place).slice(place.name.length + 2)
  const favDisabled = !isFavourite && favouritesFull

  return (
    <section aria-labelledby="current-heading" className="hero fade-in relative overflow-hidden rounded-3xl p-5 text-white sm:p-7">
      {/* soft light blob for depth */}
      <div className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-white/10 blur-3xl" aria-hidden />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="current-heading" className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">
            {place.name}
          </h2>
          {region && <p className="truncate text-sm text-white/70">{region}</p>}
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing || !online}
            className="grid size-11 place-items-center rounded-xl text-white/80 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
            aria-label={online ? 'Refresh weather' : 'Refresh unavailable while offline'}
            title={online ? 'Refresh' : 'Offline'}
          >
            <RotateCw className={`size-5 ${refreshing ? 'animate-spin' : ''}`} aria-hidden />
          </button>
          <button
            type="button"
            onClick={onToggleFavourite}
            disabled={favDisabled}
            aria-pressed={isFavourite}
            className="grid size-11 place-items-center rounded-xl text-white/80 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={
              isFavourite
                ? `Remove ${place.name} from favourites`
                : favDisabled
                  ? 'Favourites full — remove one to add this city'
                  : `Save ${place.name} to favourites`
            }
            title={favDisabled ? 'You can save up to 5 cities. Remove one first.' : undefined}
          >
            <Star className={`size-5 ${isFavourite ? 'fill-amber-300 text-amber-300' : ''}`} aria-hidden />
          </button>
        </div>
      </div>

      <div className="relative mt-4 flex items-center gap-4 sm:mt-6">
        <WeatherIcon condition={current.condition} isDay={current.isDay} size={96} className="-ml-2 shrink-0 sm:size-28" />
        <div className="min-w-0">
          <p className="tabular text-6xl font-semibold leading-none tracking-tighter sm:text-7xl">
            {formatTemp(current.tempC, units)}
          </p>
          <p className="mt-2 text-base font-medium text-white/90">{current.description}</p>
          {today && (
            <p className="tabular text-sm text-white/70">
              H {formatTemp(today.maxC, units)} · L {formatTemp(today.minC, units)}
            </p>
          )}
        </div>
      </div>

      <dl className="relative mt-6 grid grid-cols-3 gap-2 sm:gap-3">
        <Stat icon={<Thermometer className="size-4" aria-hidden />} label="Feels like" value={formatTemp(current.feelsLikeC, units)} />
        <Stat icon={<Droplets className="size-4" aria-hidden />} label="Humidity" value={`${Math.round(current.humidity)}%`} />
        <Stat icon={<Wind className="size-4" aria-hidden />} label="Wind" value={formatWind(current.windMs, units)} />
      </dl>

      <p className="relative mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/60">
        <span className="inline-flex items-center gap-1.5">
          <span
            className={`size-1.5 rounded-full ${stale ? 'bg-amber-300' : 'bg-emerald-300'}`}
            aria-hidden
          />
          {stale ? 'Saved' : 'Updated'} {relativeTime(report.fetchedAt)}
        </span>
        <span aria-hidden>·</span>
        <span>{report.source === 'openweathermap' ? 'OpenWeatherMap' : 'Open-Meteo'}</span>
      </p>
    </section>
  )
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-white/10 px-3 py-2.5 backdrop-blur-sm">
      <dt className="flex items-center gap-1.5 text-xs text-white/70">
        <span className="hidden sm:inline">{icon}</span>
        <span className="truncate">{label}</span>
      </dt>
      <dd className="tabular mt-1 truncate text-base font-semibold sm:text-lg">{value}</dd>
    </div>
  )
}
