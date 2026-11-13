import { capitalise, conditionFromOwm, conditionFromWmo, wmoLabel } from './conditions'
import { AppError, fetchJson, isAbort } from './errors'
import type { DailyForecast, Place, WeatherReport } from './types'

const OWM_KEY = import.meta.env.VITE_OWM_API_KEY as string | undefined
const FORECAST_DAYS = 5

// ---------- OpenWeatherMap (primary) ----------

interface OwmCurrent {
  weather: { id: number; description: string; icon: string }[]
  main: { temp: number; feels_like: number; humidity: number }
  wind: { speed: number }
  dt: number
  sys: { sunrise: number; sunset: number }
}

interface OwmForecastItem {
  dt: number
  main: { temp_min: number; temp_max: number }
  weather: { id: number; description: string }[]
  pop?: number
}

interface OwmForecast {
  list: OwmForecastItem[]
  city: { timezone: number }
}

/** YYYY-MM-DD of a unix timestamp, shifted into the city's UTC offset. */
export function localDateKey(unixSeconds: number, tzOffsetSeconds: number): string {
  return new Date((unixSeconds + tzOffsetSeconds) * 1000).toISOString().slice(0, 10)
}

/**
 * OWM's free forecast is 3-hourly. Collapse it into calendar days in the city's own timezone:
 * min/max across the day, the condition from the slot nearest midday, and the highest rain chance.
 */
export function aggregateOwmForecast(list: OwmForecastItem[], tzOffsetSeconds: number): DailyForecast[] {
  const byDay = new Map<string, OwmForecastItem[]>()
  for (const item of list) {
    const key = localDateKey(item.dt, tzOffsetSeconds)
    const bucket = byDay.get(key)
    if (bucket) bucket.push(item)
    else byDay.set(key, [item])
  }

  const days: DailyForecast[] = []
  for (const [date, items] of byDay) {
    const midday = items.reduce((best, item) => {
      const hour = new Date((item.dt + tzOffsetSeconds) * 1000).getUTCHours()
      const bestHour = new Date((best.dt + tzOffsetSeconds) * 1000).getUTCHours()
      return Math.abs(hour - 13) < Math.abs(bestHour - 13) ? item : best
    })
    days.push({
      date,
      minC: Math.min(...items.map((i) => i.main.temp_min)),
      maxC: Math.max(...items.map((i) => i.main.temp_max)),
      condition: conditionFromOwm(midday.weather[0]?.id ?? 800),
      description: capitalise(midday.weather[0]?.description ?? ''),
      pop: Math.round(Math.max(...items.map((i) => i.pop ?? 0)) * 100),
    })
  }
  return days.slice(0, FORECAST_DAYS)
}

async function fetchFromOwm(place: Place, signal?: AbortSignal): Promise<WeatherReport> {
  if (!OWM_KEY) throw new AppError('auth', 'OpenWeatherMap key not configured.', 'Using the fallback source.')
  const qs = `lat=${place.lat}&lon=${place.lon}&units=metric&appid=${OWM_KEY}`
  const base = 'https://api.openweathermap.org/data/2.5'
  const [current, forecast] = await Promise.all([
    fetchJson<OwmCurrent>(`${base}/weather?${qs}`, { service: 'OpenWeatherMap', signal }),
    fetchJson<OwmForecast>(`${base}/forecast?${qs}`, { service: 'OpenWeatherMap', signal }),
  ])
  const w = current.weather[0]
  if (!w || !forecast.list?.length) {
    throw new AppError('bad-response', 'OpenWeatherMap sent incomplete data.', 'Try again in a moment.')
  }

  return {
    place,
    source: 'openweathermap',
    fetchedAt: Date.now(),
    current: {
      tempC: current.main.temp,
      feelsLikeC: current.main.feels_like,
      humidity: current.main.humidity,
      windMs: current.wind.speed,
      condition: conditionFromOwm(w.id),
      description: capitalise(w.description),
      isDay: current.dt >= current.sys.sunrise && current.dt < current.sys.sunset,
    },
    daily: aggregateOwmForecast(forecast.list, forecast.city.timezone),
  }
}

// ---------- Open-Meteo (fallback, no key) ----------

interface OpenMeteoResponse {
  current: {
    temperature_2m: number
    apparent_temperature: number
    relative_humidity_2m: number
    wind_speed_10m: number
    weather_code: number
    is_day: number
  }
  daily: {
    time: string[]
    weather_code: number[]
    temperature_2m_max: number[]
    temperature_2m_min: number[]
    precipitation_probability_max?: (number | null)[]
  }
}

export function normaliseOpenMeteo(place: Place, data: OpenMeteoResponse): WeatherReport {
  const c = data.current
  return {
    place,
    source: 'open-meteo',
    fetchedAt: Date.now(),
    current: {
      tempC: c.temperature_2m,
      feelsLikeC: c.apparent_temperature,
      humidity: c.relative_humidity_2m,
      windMs: c.wind_speed_10m,
      condition: conditionFromWmo(c.weather_code),
      description: wmoLabel(c.weather_code),
      isDay: c.is_day === 1,
    },
    daily: data.daily.time.slice(0, FORECAST_DAYS).map((date, i) => ({
      date,
      minC: data.daily.temperature_2m_min[i],
      maxC: data.daily.temperature_2m_max[i],
      condition: conditionFromWmo(data.daily.weather_code[i]),
      description: wmoLabel(data.daily.weather_code[i]),
      pop: data.daily.precipitation_probability_max?.[i] ?? null,
    })),
  }
}

async function fetchFromOpenMeteo(place: Place, signal?: AbortSignal): Promise<WeatherReport> {
  const params = new URLSearchParams({
    latitude: String(place.lat),
    longitude: String(place.lon),
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,is_day',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    wind_speed_unit: 'ms',
    timezone: 'auto',
    forecast_days: String(FORECAST_DAYS),
  })
  const data = await fetchJson<OpenMeteoResponse>(`https://api.open-meteo.com/v1/forecast?${params}`, {
    service: 'Open-Meteo',
    signal,
  })
  return normaliseOpenMeteo(place, data)
}

// ---------- Public API ----------

/**
 * Try OpenWeatherMap first; on rate-limit, bad key, outage or timeout fall back to Open-Meteo.
 * If both fail, surface the *primary* error's explanation unless the fallback's is more useful
 * (e.g. the user is simply offline).
 */
export async function fetchWeather(place: Place, signal?: AbortSignal): Promise<WeatherReport> {
  try {
    return await fetchFromOwm(place, signal)
  } catch (primaryErr) {
    if (isAbort(primaryErr) || signal?.aborted) throw primaryErr
    if (primaryErr instanceof AppError && primaryErr.kind === 'offline') throw primaryErr
    try {
      return await fetchFromOpenMeteo(place, signal)
    } catch (fallbackErr) {
      if (isAbort(fallbackErr) || signal?.aborted) throw fallbackErr
      if (fallbackErr instanceof AppError && (fallbackErr.kind === 'offline' || fallbackErr.kind === 'network')) {
        throw fallbackErr
      }
      throw new AppError(
        'server',
        'Both weather services are unavailable right now.',
        'OpenWeatherMap and our backup, Open-Meteo, both failed. Try again in a few minutes.',
      )
    }
  }
}

export function isWeatherReport(v: unknown): v is WeatherReport {
  if (!v || typeof v !== 'object') return false
  const r = v as Partial<WeatherReport>
  return (
    !!r.place &&
    typeof r.place.lat === 'number' &&
    typeof r.fetchedAt === 'number' &&
    !!r.current &&
    typeof r.current.tempC === 'number' &&
    Array.isArray(r.daily)
  )
}
