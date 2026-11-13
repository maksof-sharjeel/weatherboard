export interface Place {
  id: string
  name: string
  region?: string
  country: string
  lat: number
  lon: number
}

export type Condition =
  | 'clear'
  | 'partly-cloudy'
  | 'cloudy'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'snow'
  | 'thunder'

export type WeatherSource = 'openweathermap' | 'open-meteo'

export interface CurrentConditions {
  tempC: number
  feelsLikeC: number
  humidity: number
  windMs: number
  condition: Condition
  description: string
  isDay: boolean
}

export interface DailyForecast {
  /** Local calendar date for the city, YYYY-MM-DD */
  date: string
  minC: number
  maxC: number
  condition: Condition
  description: string
  /** Probability of precipitation, 0–100, or null when the source doesn't provide it */
  pop: number | null
}

export interface WeatherReport {
  place: Place
  source: WeatherSource
  /** epoch ms when this report was fetched */
  fetchedAt: number
  current: CurrentConditions
  daily: DailyForecast[]
}

export type Units = 'metric' | 'imperial'
export type ThemePref = 'system' | 'light' | 'dark'

export interface ReminderConfig {
  enabled: boolean
  /** HH:MM, 24h, in the user's local time */
  time: string
  /** YYYY-MM-DD of the last day a reminder was shown */
  lastSentDate?: string
}
