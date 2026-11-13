import { useEffect, useSyncExternalStore } from 'react'
import { KEYS } from '../lib/storage'
import type { ThemePref } from '../lib/types'
import { usePersistentState } from './usePersistentState'

const isTheme = (v: unknown): v is ThemePref => v === 'system' || v === 'light' || v === 'dark'
const query = '(prefers-color-scheme: dark)'

function subscribe(cb: () => void) {
  const mq = window.matchMedia(query)
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}

export function useTheme() {
  const [pref, setPref] = usePersistentState<ThemePref>(KEYS.theme, 'system', isTheme)
  const systemDark = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  )
  const resolved: 'light' | 'dark' = pref === 'system' ? (systemDark ? 'dark' : 'light') : pref

  useEffect(() => {
    document.documentElement.dataset.theme = resolved
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'dark' ? '#0c0e13' : '#f5f6f8')
  }, [resolved])

  return { pref, setPref, resolved }
}
