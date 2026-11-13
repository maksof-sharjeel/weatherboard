/// <reference lib="webworker" />
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import { idbGet, idbSet, IDB_KEYS } from './lib/idb'
import { fetchWeather } from './lib/weather'
import { reminderBody, shouldSendReminder } from './lib/reminder'
import { todayKey } from './lib/format'
import type { Place, ReminderConfig, Units } from './lib/types'

declare const self: ServiceWorkerGlobalScope

// ---------- App shell ----------
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html')))

self.addEventListener('install', () => void self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

// ---------- Weather data ----------
// Network first so users always see fresh data online; the cached response for the last-viewed
// city is served when offline. (The page also keeps its own snapshot — see useWeather.)
registerRoute(
  ({ url }) => url.hostname === 'api.openweathermap.org' || url.hostname === 'api.open-meteo.com',
  new NetworkFirst({
    cacheName: 'weather-api',
    networkTimeoutSeconds: 8,
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxEntries: 12, maxAgeSeconds: 7 * 24 * 60 * 60 }),
    ],
  }),
)

registerRoute(
  ({ url }) => url.hostname === 'fonts.googleapis.com',
  new StaleWhileRevalidate({ cacheName: 'google-fonts-css' }),
)
registerRoute(
  ({ url }) => url.hostname === 'fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts-files',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 365 * 24 * 60 * 60 }),
    ],
  }),
)

// ---------- Daily reminder ----------

async function sendReminder(opts: { test: boolean }): Promise<void> {
  if (Notification.permission !== 'granted') return
  const cfg = await idbGet<ReminderConfig>(IDB_KEYS.reminder)

  if (!opts.test) {
    if (!shouldSendReminder(cfg)) return
    // Claim today's slot *before* the network call so an overlapping periodicsync + page message
    // can't both send one.
    await idbSet(IDB_KEYS.reminder, { ...cfg, lastSentDate: todayKey() })
  }

  const place = await idbGet<Place>(IDB_KEYS.lastPlace)
  const units = (await idbGet<Units>(IDB_KEYS.units)) ?? 'metric'
  let report
  if (place) {
    try {
      report = await fetchWeather(place)
    } catch {
      // Still remind — the body falls back to a generic "check the weather" message.
    }
  }

  const { title, body } = reminderBody(report, units)
  await self.registration.showNotification(opts.test ? `${title} (test)` : title, {
    body,
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-96.png',
    tag: 'daily-reminder',
    data: { url: '/' },
  })
}

interface PeriodicSyncEvent extends ExtendableEvent {
  tag: string
}

// Chromium (installed PWA): the browser wakes the SW periodically even with every tab closed.
self.addEventListener('periodicsync' as keyof ServiceWorkerGlobalScopeEventMap, (event) => {
  const e = event as PeriodicSyncEvent
  if (e.tag === 'daily-reminder') e.waitUntil(sendReminder({ test: false }))
})

self.addEventListener('message', (event) => {
  const type = (event.data as { type?: string } | undefined)?.type
  if (type === 'check-reminder') event.waitUntil(sendReminder({ test: false }))
  if (type === 'test-reminder') event.waitUntil(sendReminder({ test: true }))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data as { url?: string } | undefined)?.url ?? '/'
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const existing = windows.find((w) => new URL(w.url).origin === self.location.origin)
      if (existing) return existing.focus()
      return self.clients.openWindow(url)
    })(),
  )
})
