import { useCallback, useEffect, useRef, useState } from 'react'
import { AppError, isAbort, toAppError } from '../lib/errors'
import { idbSet, IDB_KEYS } from '../lib/idb'
import { KEYS, readJSON, writeJSON } from '../lib/storage'
import type { Place, WeatherReport } from '../lib/types'
import { fetchWeather, isWeatherReport } from '../lib/weather'

export type WeatherStatus = 'idle' | 'loading' | 'ready' | 'error'

interface State {
  status: WeatherStatus
  report: WeatherReport | null
  error: AppError | null
  /** true while a refresh is in flight on top of an already-visible report */
  refreshing: boolean
}

const isReportOrNull = (v: unknown): v is WeatherReport | null => v === null || isWeatherReport(v)

export function loadSnapshot(): WeatherReport | null {
  return readJSON<WeatherReport | null>(KEYS.lastReport, null, isReportOrNull)
}

/**
 * Fetches weather for `place`. The last successful report is persisted so the app can paint
 * instantly on the next visit and keep working offline; a failed refresh keeps the old report
 * on screen (marked stale) instead of blanking the page.
 */
export function useWeather(place: Place | null) {
  const [state, setState] = useState<State>(() => {
    const snap = loadSnapshot()
    return snap && place && snap.place.id === place.id
      ? { status: 'ready', report: snap, error: null, refreshing: false }
      : { status: 'idle', report: null, error: null, refreshing: false }
  })
  const controllerRef = useRef<AbortController | null>(null)

  const load = useCallback(async (target: Place) => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller

    setState((prev) => {
      const sameCity = prev.report?.place.id === target.id
      const snap = !sameCity ? loadSnapshot() : null
      const reuse = sameCity ? prev.report : snap?.place.id === target.id ? snap : null
      return reuse
        ? { status: 'ready', report: reuse, error: null, refreshing: true }
        : { status: 'loading', report: null, error: null, refreshing: false }
    })

    try {
      const report = await fetchWeather(target, controller.signal)
      if (controller.signal.aborted) return
      writeJSON(KEYS.lastReport, report)
      void idbSet(IDB_KEYS.lastPlace, report.place)
      setState({ status: 'ready', report, error: null, refreshing: false })
    } catch (err) {
      if (isAbort(err) || controller.signal.aborted) return
      const error = toAppError(err, 'the weather service')
      setState((prev) =>
        prev.report?.place.id === target.id
          ? { status: 'ready', report: prev.report, error, refreshing: false }
          : { status: 'error', report: null, error, refreshing: false },
      )
    }
  }, [])

  useEffect(() => {
    if (place) void load(place)
    return () => controllerRef.current?.abort()
  }, [place, load])

  const retry = useCallback(() => {
    if (place) void load(place)
  }, [place, load])

  return { ...state, retry }
}
