/** Page-side helpers for talking to the service worker. */

export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((err) => {
      console.warn('Service worker registration failed', err)
    })
  })
}

/** Resolves to the active registration, or null if none appears quickly (e.g. dev mode, blocked SW). */
export async function getRegistration(timeoutMs = 4000): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
  ])
}

export async function postToServiceWorker(message: { type: string }): Promise<boolean> {
  const reg = await getRegistration()
  if (!reg?.active) return false
  reg.active.postMessage(message)
  return true
}

interface PeriodicSyncManager {
  register(tag: string, options?: { minInterval: number }): Promise<void>
  unregister(tag: string): Promise<void>
}

/**
 * Periodic Background Sync lets the browser wake our service worker with no tab open.
 * Chromium only, and only once the PWA is installed; returns whether it was registered.
 */
export async function registerPeriodicSync(): Promise<boolean> {
  const reg = await getRegistration()
  const periodicSync = (reg as (ServiceWorkerRegistration & { periodicSync?: PeriodicSyncManager }) | null)
    ?.periodicSync
  if (!periodicSync) return false
  try {
    const status = await navigator.permissions.query({ name: 'periodic-background-sync' as PermissionName })
    if (status.state !== 'granted') return false
    await periodicSync.register('daily-reminder', { minInterval: 60 * 60 * 1000 })
    return true
  } catch {
    return false
  }
}

export async function unregisterPeriodicSync(): Promise<void> {
  const reg = await getRegistration()
  const periodicSync = (reg as (ServiceWorkerRegistration & { periodicSync?: PeriodicSyncManager }) | null)
    ?.periodicSync
  try {
    await periodicSync?.unregister('daily-reminder')
  } catch {
    /* ignore */
  }
}
