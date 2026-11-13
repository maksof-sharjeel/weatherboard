import { describe, expect, it } from 'vitest'
import { conditionFromOwm, conditionFromWmo } from './conditions'
import { convertTemp, dayLabel, formatWind, todayKey } from './format'
import { msUntil, reminderBody, shouldSendReminder } from './reminder'
import type { WeatherReport } from './types'
import { validateCityQuery, validateReminderTime } from './validation'
import { aggregateOwmForecast, normaliseOpenMeteo } from './weather'

describe('validateCityQuery', () => {
  it.each([
    ['', 'Enter a city name'],
    ['   ', 'Enter a city name'],
    ['a', 'at least 2 letters'],
    ['Lahore1', 'numbers'],
    ['<script>', 'letters only'],
  ])('rejects %j', (input, msg) => {
    expect(validateCityQuery(input)).toContain(msg)
  })

  it.each(['Lahore', 'São Paulo', "St. John's", 'Aix-en-Provence', 'کراچی', '東京'])('accepts %j', (input) => {
    expect(validateCityQuery(input)).toBeNull()
  })
})

describe('validateReminderTime', () => {
  it('requires a value', () => expect(validateReminderTime('')).toMatch(/Choose a time/))
  it('rejects malformed input', () => expect(validateReminderTime('25:00')).toMatch(/valid time/))
  it('accepts HH:MM', () => expect(validateReminderTime('07:30')).toBeNull())
})

describe('aggregateOwmForecast', () => {
  // Karachi is UTC+5. 2026-11-13 19:00 UTC = 2026-11-14 00:00 local.
  const tz = 5 * 3600
  const at = (iso: string) => Date.parse(iso) / 1000
  const item = (iso: string, min: number, max: number, id = 800, pop = 0) => ({
    dt: at(iso),
    main: { temp_min: min, temp_max: max },
    weather: [{ id, description: 'clear sky' }],
    pop,
  })

  it('groups 3-hourly slots by the city’s local date, not UTC', () => {
    const days = aggregateOwmForecast(
      [
        item('2026-11-13T15:00:00Z', 20, 22), // 20:00 local, 13th
        item('2026-11-13T18:00:00Z', 18, 19), // 23:00 local, 13th
        item('2026-11-13T21:00:00Z', 15, 16), // 02:00 local, 14th
        item('2026-11-14T06:00:00Z', 24, 28, 500, 0.6), // 11:00 local, 14th
      ],
      tz,
    )
    expect(days.map((d) => d.date)).toEqual(['2026-11-13', '2026-11-14'])
    expect(days[1]).toMatchObject({ minC: 15, maxC: 28, condition: 'rain', pop: 60 })
  })

  it('returns at most 5 days', () => {
    const list = Array.from({ length: 40 }, (_, i) => ({
      dt: at('2026-11-13T00:00:00Z') + i * 3 * 3600,
      main: { temp_min: 10, temp_max: 20 },
      weather: [{ id: 800, description: 'clear' }],
    }))
    expect(aggregateOwmForecast(list, 0)).toHaveLength(5)
  })
})

describe('normaliseOpenMeteo', () => {
  it('maps WMO codes and fields', () => {
    const r = normaliseOpenMeteo(
      { id: 'x', name: 'Lahore', country: 'Pakistan', lat: 31.5, lon: 74.3 },
      {
        current: {
          temperature_2m: 21,
          apparent_temperature: 20,
          relative_humidity_2m: 55,
          wind_speed_10m: 3,
          weather_code: 61,
          is_day: 1,
        },
        daily: {
          time: ['2026-11-13', '2026-11-14'],
          weather_code: [0, 95],
          temperature_2m_max: [25, 22],
          temperature_2m_min: [12, 11],
          precipitation_probability_max: [0, 80],
        },
      },
    )
    expect(r.current).toMatchObject({ condition: 'rain', description: 'Light rain', isDay: true })
    expect(r.daily[1]).toMatchObject({ condition: 'thunder', pop: 80 })
  })
})

describe('condition mapping', () => {
  it('maps OWM ids', () => {
    expect(conditionFromOwm(800)).toBe('clear')
    expect(conditionFromOwm(802)).toBe('partly-cloudy')
    expect(conditionFromOwm(804)).toBe('cloudy')
    expect(conditionFromOwm(511)).toBe('snow')
    expect(conditionFromOwm(741)).toBe('fog')
  })
  it('maps WMO codes', () => {
    expect(conditionFromWmo(3)).toBe('cloudy')
    expect(conditionFromWmo(81)).toBe('rain')
    expect(conditionFromWmo(86)).toBe('snow')
  })
})

describe('format', () => {
  it('converts units', () => {
    expect(convertTemp(100, 'imperial')).toBe(212)
    expect(formatWind(10, 'metric')).toBe('36 km/h')
    expect(formatWind(10, 'imperial')).toBe('22 mph')
  })
  it('labels days', () => {
    expect(dayLabel('2026-11-13', 0)).toBe('Today')
    expect(dayLabel('2026-11-14', 1)).toBe('Tomorrow')
    expect(dayLabel('2026-11-15', 2)).toBe('Sun')
  })
})

describe('shouldSendReminder', () => {
  const now = new Date(2026, 10, 13, 7, 45) // 07:45 local
  it('fires at or after the chosen time', () => {
    expect(shouldSendReminder({ enabled: true, time: '07:30' }, now)).toBe(true)
  })
  it('does not fire before the chosen time', () => {
    expect(shouldSendReminder({ enabled: true, time: '08:00' }, now)).toBe(false)
  })
  it('fires only once a day', () => {
    expect(shouldSendReminder({ enabled: true, time: '07:30', lastSentDate: todayKey(now) }, now)).toBe(false)
  })
  it('skips if the browser woke us far too late', () => {
    expect(shouldSendReminder({ enabled: true, time: '02:00' }, now)).toBe(false)
  })
  it('respects disabled', () => {
    expect(shouldSendReminder({ enabled: false, time: '07:30' }, now)).toBe(false)
  })
})

describe('msUntil', () => {
  const now = new Date(2026, 10, 13, 7, 0)
  it('targets later today', () => expect(msUntil('07:30', now)).toBe(30 * 60_000))
  it('rolls to tomorrow', () => expect(msUntil('06:00', now)).toBe(23 * 3600_000))
})

describe('reminderBody', () => {
  it('summarises and warns about rain', () => {
    const report = {
      place: { name: 'Lahore' },
      current: { tempC: 18.4, description: 'Light rain' },
      daily: [{ maxC: 24, minC: 12, pop: 70 }],
    } as unknown as WeatherReport
    const { title, body } = reminderBody(report, 'metric')
    expect(title).toContain('Lahore')
    expect(body).toBe('18° and light rain · High 24°, low 12° · 70% chance of rain — take an umbrella')
  })
  it('has a generic fallback with no data', () => {
    expect(reminderBody(undefined, 'metric').body).toMatch(/check today/)
  })
})
