import { AppError, fetchJson } from './errors'
import type { Place } from './types'

const GEODB_KEY = import.meta.env.VITE_GEODB_API_KEY as string | undefined
const LIMIT = 6

export type GeoSource = 'geodb' | 'open-meteo'

export interface CitySearchResult {
  places: Place[]
  source: GeoSource
}

interface GeoDbResponse {
  data: {
    id: number
    name: string
    region?: string
    country: string
    latitude: number
    longitude: number
  }[]
}

interface OpenMeteoGeoResponse {
  results?: {
    id: number
    name: string
    admin1?: string
    country?: string
    latitude: number
    longitude: number
  }[]
}

const cache = new Map<string, CitySearchResult>()

async function searchGeoDb(query: string, signal?: AbortSignal): Promise<Place[]> {
  const params = new URLSearchParams({
    namePrefix: query,
    limit: String(LIMIT),
    sort: '-population',
    types: 'CITY',
  })
  const res = await fetchJson<GeoDbResponse>(`https://wft-geo-db.p.rapidapi.com/v1/geo/cities?${params}`, {
    service: 'City search (GeoDB)',
    signal,
    timeoutMs: 6000,
    headers: {
      'X-RapidAPI-Key': GEODB_KEY ?? '',
      'X-RapidAPI-Host': 'wft-geo-db.p.rapidapi.com',
    },
  })
  return res.data.map((c) => ({
    id: `geodb:${c.id}`,
    name: c.name,
    region: c.region,
    country: c.country,
    lat: c.latitude,
    lon: c.longitude,
  }))
}

async function searchOpenMeteo(query: string, signal?: AbortSignal): Promise<Place[]> {
  const params = new URLSearchParams({ name: query, count: String(LIMIT), language: 'en', format: 'json' })
  const res = await fetchJson<OpenMeteoGeoResponse>(`https://geocoding-api.open-meteo.com/v1/search?${params}`, {
    service: 'City search',
    signal,
    timeoutMs: 6000,
  })
  return (res.results ?? []).map((c) => ({
    id: `om:${c.id}`,
    name: c.name,
    region: c.admin1,
    country: c.country ?? '',
    lat: c.latitude,
    lon: c.longitude,
  }))
}

function dedupe(places: Place[]): Place[] {
  const seen = new Set<string>()
  return places.filter((p) => {
    const key = `${p.name}|${p.region ?? ''}|${p.country}`.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * GeoDB is the primary source. Its free tier allows ~1 request/second, which fast typists exceed,
 * so on a 429 (or a missing key / outage) we transparently fall back to Open-Meteo's geocoder
 * rather than showing the user an error mid-word.
 */
export async function searchCities(rawQuery: string, signal?: AbortSignal): Promise<CitySearchResult> {
  const query = rawQuery.trim()
  const cacheKey = query.toLowerCase()
  const hit = cache.get(cacheKey)
  if (hit) return hit

  let result: CitySearchResult
  if (GEODB_KEY) {
    try {
      result = { places: dedupe(await searchGeoDb(query, signal)), source: 'geodb' }
    } catch (err) {
      if (signal?.aborted) throw err
      if (err instanceof AppError && err.kind === 'offline') throw err
      result = { places: dedupe(await searchOpenMeteo(query, signal)), source: 'open-meteo' }
    }
  } else {
    result = { places: dedupe(await searchOpenMeteo(query, signal)), source: 'open-meteo' }
  }

  cache.set(cacheKey, result)
  return result
}

export function placeLabel(p: Place): string {
  return [p.name, p.region, p.country].filter(Boolean).join(', ')
}

/** Shown on the empty state so a first-time user is one tap away from real data. */
export const SUGGESTED_PLACES: Place[] = [
  { id: 'om:1174872', name: 'Karachi', region: 'Sindh', country: 'Pakistan', lat: 24.8608, lon: 67.0104 },
  { id: 'om:1172451', name: 'Lahore', region: 'Punjab', country: 'Pakistan', lat: 31.5580, lon: 74.3507 },
  { id: 'om:1176615', name: 'Islamabad', region: 'Islamabad', country: 'Pakistan', lat: 33.7215, lon: 73.0433 },
  { id: 'om:292223', name: 'Dubai', region: 'Dubai', country: 'United Arab Emirates', lat: 25.0772, lon: 55.3093 },
  { id: 'om:2643743', name: 'London', region: 'England', country: 'United Kingdom', lat: 51.5085, lon: -0.1257 },
]
