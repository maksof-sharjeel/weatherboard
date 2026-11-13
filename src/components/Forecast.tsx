import { Droplet } from 'lucide-react'
import { convertTemp, dayLabel, formatTemp } from '../lib/format'
import type { DailyForecast, Units } from '../lib/types'
import { WeatherIcon } from './WeatherIcon'

interface Props {
  days: DailyForecast[]
  units: Units
}

/**
 * Rows with a shared min→max scale: the bar's position shows how each day compares
 * to the whole week at a glance, which a list of numbers alone doesn't.
 */
export function Forecast({ days, units }: Props) {
  const lo = Math.min(...days.map((d) => d.minC))
  const hi = Math.max(...days.map((d) => d.maxC))
  const span = Math.max(hi - lo, 1)

  return (
    <section aria-labelledby="forecast-heading" className="card fade-in p-2 sm:p-3">
      <h2 id="forecast-heading" className="px-3 pt-2 pb-1 text-xs font-semibold tracking-wide text-muted uppercase">
        {days.length}-day forecast
      </h2>
      <ul>
        {days.map((d, i) => {
          const left = ((d.minC - lo) / span) * 100
          const width = Math.max(((d.maxC - d.minC) / span) * 100, 4)
          return (
            <li
              key={d.date}
              className="grid grid-cols-[4.75rem_2.25rem_1fr] items-center gap-x-2 border-b border-line px-3 py-2.5 last:border-b-0 sm:grid-cols-[5.5rem_2.5rem_minmax(0,9rem)_3rem_minmax(0,1fr)] sm:gap-x-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">{dayLabel(d.date, i)}</p>
                <p className="truncate text-xs text-muted sm:hidden">{d.description}</p>
              </div>
              <WeatherIcon condition={d.condition} size={36} label={d.description} />
              <p className="hidden truncate text-sm text-muted sm:block">{d.description}</p>
              <p className="hidden items-center gap-1 text-xs font-medium text-accent sm:flex" title="Chance of precipitation">
                {d.pop != null && d.pop >= 10 ? (
                  <>
                    <Droplet className="size-3" aria-hidden />
                    {d.pop}%
                  </>
                ) : null}
              </p>
              <div className="tabular flex items-center gap-2 text-sm sm:gap-3">
                <span className="w-9 text-right text-muted" aria-label={`Low ${formatTemp(d.minC, units)}`}>
                  {Math.round(convertTemp(d.minC, units))}°
                </span>
                <span className="relative h-1.5 min-w-0 flex-1 rounded-full bg-surface-2" aria-hidden>
                  <span
                    className="absolute inset-y-0 rounded-full bg-gradient-to-r from-sky-400 to-amber-400"
                    style={{ left: `${left}%`, width: `${width}%` }}
                  />
                </span>
                <span className="w-9 font-semibold text-ink" aria-label={`High ${formatTemp(d.maxC, units)}`}>
                  {Math.round(convertTemp(d.maxC, units))}°
                </span>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
