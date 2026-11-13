/** Letters from any script, spaces, and the punctuation real city names use (St. John's, Aix-en-Provence). */
const CITY_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M}\s.'’-]*$/u

export function validateCityQuery(value: string): string | null {
  const v = value.trim()
  if (!v) return 'Enter a city name to search.'
  if (v.length < 2) return 'Type at least 2 letters so we can find matching cities.'
  if (v.length > 60) return 'That’s longer than any city name — try a shorter search.'
  if (/\d/.test(v)) return 'City names don’t contain numbers. Remove them and try again.'
  if (!CITY_PATTERN.test(v)) return 'Use letters only — spaces, hyphens, apostrophes and full stops are fine.'
  return null
}

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/

export function validateReminderTime(value: string): string | null {
  if (!value) return 'Choose a time for your daily reminder.'
  if (!TIME_PATTERN.test(value)) return 'Enter a valid time, for example 07:30.'
  return null
}
