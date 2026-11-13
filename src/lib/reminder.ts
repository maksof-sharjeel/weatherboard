import { formatTemp, todayKey } from './format'
import type { ReminderConfig, Units, WeatherReport } from './types'

/** Don't send a "morning" reminder if the browser only woke us up this long after the chosen time. */
export const LATE_WINDOW_MINUTES = 4 * 60

/**
 * Pure decision used by both the page and the service worker:
 * fire once per day, at or after the chosen time, but not hours late.
 */
export function shouldSendReminder(cfg: ReminderConfig | undefined, now = new Date()): boolean {
  if (!cfg?.enabled) return false
  if (cfg.lastSentDate === todayKey(now)) return false
  const [h, m] = cfg.time.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return false
  const due = new Date(now)
  due.setHours(h, m, 0, 0)
  const lateBy = (now.getTime() - due.getTime()) / 60_000
  return lateBy >= 0 && lateBy <= LATE_WINDOW_MINUTES
}

/** Milliseconds until the next occurrence of HH:MM (today if still ahead, else tomorrow). */
export function msUntil(hhmm: string, now = new Date()): number {
  const [h, m] = hhmm.split(':').map(Number)
  const next = new Date(now)
  next.setHours(h, m, 0, 0)
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1)
  return next.getTime() - now.getTime()
}

export function reminderBody(report: WeatherReport | undefined, units: Units): { title: string; body: string } {
  if (!report) {
    return { title: 'Good morning ☀️', body: 'Tap to check today’s weather.' }
  }
  const today = report.daily[0]
  const c = report.current
  const parts = [`${formatTemp(c.tempC, units)} and ${c.description.toLowerCase()}`]
  if (today) parts.push(`High ${formatTemp(today.maxC, units)}, low ${formatTemp(today.minC, units)}`)
  if (today?.pop != null && today.pop >= 40) parts.push(`${today.pop}% chance of rain — take an umbrella`)
  return { title: `Good morning — ${report.place.name}`, body: parts.join(' · ') }
}
