import { useCallback, useEffect, useState } from 'react'
import { idbGet, idbSet, IDB_KEYS } from '../lib/idb'
import { msUntil } from '../lib/reminder'
import { postToServiceWorker, registerPeriodicSync, unregisterPeriodicSync } from '../lib/sw-client'
import type { ReminderConfig } from '../lib/types'

export type ReminderSupport =
  | { kind: 'supported' }
  | { kind: 'ios-needs-install' }
  | { kind: 'unsupported'; reason: string }

function detectSupport(): ReminderSupport {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const standalone = window.matchMedia('(display-mode: standalone)').matches
  if (isIOS && !standalone) return { kind: 'ios-needs-install' }
  if (!('Notification' in window)) return { kind: 'unsupported', reason: 'This browser doesn’t support notifications.' }
  if (!('serviceWorker' in navigator)) {
    return { kind: 'unsupported', reason: 'This browser can’t run background tasks (no service worker support).' }
  }
  return { kind: 'supported' }
}

const DEFAULT_CONFIG: ReminderConfig = { enabled: false, time: '07:30' }

export function useReminder() {
  const [support] = useState(detectSupport)
  const [permission, setPermission] = useState<NotificationPermission>(() =>
    'Notification' in window ? Notification.permission : 'denied',
  )
  const [config, setConfig] = useState<ReminderConfig>(DEFAULT_CONFIG)
  const [loaded, setLoaded] = useState(false)
  /** null = unknown yet; false = reminders only fire while WeatherBoard is open */
  const [background, setBackground] = useState<boolean | null>(null)

  useEffect(() => {
    void idbGet<ReminderConfig>(IDB_KEYS.reminder).then((cfg) => {
      if (cfg) setConfig(cfg)
      setLoaded(true)
    })
  }, [])

  // Keep background registration in sync (e.g. after the user installs the app).
  useEffect(() => {
    if (!config.enabled || permission !== 'granted') return
    void registerPeriodicSync().then(setBackground)
  }, [config.enabled, permission])

  // While a tab is open: fire exactly at the chosen time, and catch up when the tab regains focus.
  useEffect(() => {
    if (!config.enabled || permission !== 'granted') return
    const check = () => void postToServiceWorker({ type: 'check-reminder' })
    check()
    const timer = setTimeout(check, msUntil(config.time))
    const onVisible = () => document.visibilityState === 'visible' && check()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [config.enabled, config.time, permission])

  const save = useCallback(async (next: ReminderConfig) => {
    setConfig(next)
    await idbSet(IDB_KEYS.reminder, next)
  }, [])

  /** Asks for permission (if needed) and turns the reminder on. Returns the resulting permission. */
  const enable = useCallback(
    async (time: string): Promise<NotificationPermission> => {
      let perm = Notification.permission
      if (perm === 'default') perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm !== 'granted') return perm
      // Changing the time resets "already sent today" so a later time today still fires.
      await save({ enabled: true, time, lastSentDate: time === config.time ? config.lastSentDate : undefined })
      return perm
    },
    [save, config.time, config.lastSentDate],
  )

  const disable = useCallback(async () => {
    await save({ ...config, enabled: false })
    await unregisterPeriodicSync()
    setBackground(null)
  }, [config, save])

  const sendTest = useCallback(() => postToServiceWorker({ type: 'test-reminder' }), [])

  return { support, permission, config, loaded, background, enable, disable, sendTest }
}
