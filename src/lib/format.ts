import type { Units } from './types'

export function convertTemp(c: number, units: Units): number {
  return units === 'imperial' ? (c * 9) / 5 + 32 : c
}

export function formatTemp(c: number, units: Units): string {
  return `${Math.round(convertTemp(c, units))}°`
}

export function formatWind(ms: number, units: Units): string {
  return units === 'imperial' ? `${Math.round(ms * 2.23694)} mph` : `${Math.round(ms * 3.6)} km/h`
}

/** "Today", "Tomorrow", then short weekday. `date` is a YYYY-MM-DD in the city's local calendar. */
export function dayLabel(date: string, index: number): string {
  if (index === 0) return 'Today'
  if (index === 1) return 'Tomorrow'
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' })
}

export function relativeTime(ts: number, now = Date.now()): string {
  const s = Math.round((now - ts) / 1000)
  if (s < 45) return 'just now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} h ago`
  const d = Math.round(h / 24)
  return `${d} day${d === 1 ? '' : 's'} ago`
}

/** Local YYYY-MM-DD for the device (not UTC). */
export function todayKey(now = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function formatClock(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}
