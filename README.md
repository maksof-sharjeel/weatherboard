# WeatherBoard

A responsive, installable weather dashboard: search any city, see current conditions and a 5-day forecast, keep up to 5 favourites, get a daily morning reminder, and keep working offline for the last city you viewed.

**Live:** [weatherboard-psi.vercel.app](https://weatherboard-psi.vercel.app/) · **Repo:** [github.com/maksof-sharjeel/weatherboard](https://github.com/maksof-sharjeel/weatherboard)

Built with React 19, TypeScript, Vite, Tailwind CSS v4 and Workbox (via `vite-plugin-pwa`). There is no backend.

---

## Run locally

```bash
npm install
cp .env.example .env      # then fill in the two keys below
npm run dev               # http://localhost:5173
```

| Variable | Where to get it | Required? |
| --- | --- | --- |
| `VITE_OWM_API_KEY` | [openweathermap.org](https://home.openweathermap.org/api_keys) (free). New keys can take up to 2 h to activate. | No. Without it the app uses Open-Meteo. |
| `VITE_GEODB_API_KEY` | [GeoDB Cities on RapidAPI](https://rapidapi.com/wirefreethought/api/geodb-cities) (free Basic plan) | No. Without it, search uses Open-Meteo Geocoding. |

The app works with **zero keys**, because both fallbacks are keyless. That way a reviewer can clone it and run it without signing up for anything.

Other scripts:

```bash
npm test          # Vitest unit tests (validation, forecast aggregation, reminder timing…)
npm run build     # type-check + production build + service worker
npm run preview   # serve the production build (the service worker only runs here, not in dev)
node scripts/generate-icons.mjs   # re-render PWA PNG icons from scripts/icon-src/*.svg
```

To deploy on Vercel, import the repo, add the two env vars and deploy. The defaults (`npm run build`, output `dist`) work as they are.

---

## Architecture

```
src/
  lib/            framework-free logic: easy to unit-test, shared with the service worker
    weather.ts    OpenWeatherMap client → normalised WeatherReport, Open-Meteo fallback
    geo.ts        GeoDB autocomplete, Open-Meteo geocoding fallback, in-memory cache
    errors.ts     AppError { title: what failed, hint: what to do } + fetchJson with timeout/abort
    validation.ts city query + reminder time rules
    reminder.ts   pure "should we send today's reminder?" logic + notification text
    storage.ts    localStorage wrapper that never throws (falls back to memory)
    idb.ts        tiny IndexedDB key-value store (the service worker can't read localStorage)
  hooks/          useWeather, useFavourites, useReminder, useTheme, useOnline…
  components/     SearchBox, CurrentWeather, Forecast, Favourites, ReminderCard, ConfirmDialog…
  sw.ts           service worker: precache, runtime caching, periodic sync, notification click
```

### Key decisions

- **One normalised data model.** OpenWeatherMap and Open-Meteo return very different shapes. Both get mapped into a single `WeatherReport`, so the UI never needs to know which source answered. A small badge on the current-conditions card shows the source for transparency.
- **OWM's 3-hourly forecast is grouped by the city's local date, not UTC.** Without this, Karachi's "tomorrow" starts at 5 AM local time. The min/max cover the whole day, the icon comes from the slot nearest midday, and the rain chance is the highest of the day. Unit-tested.
- **Fallbacks, with honest errors when they fail too.**
  - Weather: OWM is tried first. Rate limits, bad keys, outages and timeouts fall back to Open-Meteo.
  - Search: GeoDB's free tier allows about 1 request/second, which fast typists exceed. A 429 silently falls back to Open-Meteo geocoding, so the user doesn't see an error halfway through a word.
  - If both sources fail, the user is told what failed and what to do (for example, "Couldn't reach City search. Check your connection or disable an ad blocker…"). There is no generic "Something went wrong".
- **Autocomplete latency.** Search waits 250 ms after typing stops, cancels in-flight requests with `AbortController`, and caches results. A "Searching…" row appears immediately, so the field always gives feedback. If the user presses Enter before suggestions arrive, the search resolves directly instead of making them wait and retry.
- **Validation follows the Stripe pattern.** Fields are validated on blur. Once an error is showing, it is re-checked on every keystroke so it clears the moment the input is fixed. A pristine field that is only tabbed through doesn't nag. Errors are linked to their field with `aria-describedby` / `role="alert"`.
- **Stale-while-revalidate UI.** The last report is saved locally and painted instantly on the next visit, then refreshed. If a refresh fails, the old data stays on screen with a "Couldn't refresh · showing data from 2 h ago" notice instead of a blank error page.
- **Offline support has two layers.**
  1. The service worker precaches the app shell and serves weather API calls network-first, so the cached response is used offline.
  2. The page keeps its own snapshot of the last report.

  An "Offline mode" banner says what is being shown and how old it is. The app refreshes itself automatically when the connection returns.
- **Favourites** are capped at 5, persisted in localStorage and synced across tabs through the `storage` event. Removing one always goes through a confirmation dialog, both from the panel and from the star. If localStorage is blocked (private mode, quota), favourites live in memory and a notice says they won't survive the tab.
- **Native `<dialog>`** for confirmation, which provides focus trapping, Esc handling and an inert background.
- **Custom animated SVG weather icons** (CSS keyframes) instead of OWM's PNGs. They stay crisp, match both themes, and respect `prefers-reduced-motion`.
- **Theme** has three states (light / dark / system). A tiny inline script applies the saved choice before first paint to prevent a flash. **Units** (°C/°F) are persisted, and temperatures are always stored in °C and converted at render time, so switching never refetches.

## The daily reminder, and its limits

The brief asks for a reminder that fires "even when the tab is closed" in a client-only app. Browsers have no client-only API that guarantees a notification at an exact time with every tab closed. (Notification Triggers was abandoned by Chrome.) The options are:

| Approach | Tab closed? | Exact time? | Needs a server? |
| --- | --- | --- | --- |
| `setTimeout` in the page | No | Yes | No |
| **Periodic Background Sync** (Chromium, installed PWA) | **Yes** | Approximately: the browser decides the cadence based on engagement | No |
| Web Push from a scheduled server job | Yes | Yes | **Yes** (VAPID keys + a cron job + subscription storage) |

**What's implemented:**

1. **Explain first, then ask.** The browser's permission prompt only appears after the user reads why and clicks *Continue*. A cold prompt is usually denied, and a denial is hard to undo.
2. With the PWA **installed in Chrome/Edge**, the service worker registers a `periodicsync` task and the browser wakes it up with no tab open. The service worker checks the user's chosen time, which is stored in IndexedDB. If the time has passed today and nothing has been sent yet, it fetches the forecast for the last-viewed city and shows the notification. It won't send a "morning" reminder more than 4 hours late, and it claims the day's slot before the network call so two triggers can't both fire.
3. **While WeatherBoard is open in any tab**, a timer fires at the exact minute, and the app catches up on focus.
4. The UI says plainly which mode the user is in ("Install the app to get it with WeatherBoard closed"). It also has a **Test** button.
5. **Fallbacks:** unsupported browsers, and iOS outside the Home Screen, get a clear explanation. A denied permission shows how to re-enable it. In all of these cases the rest of the app is unaffected.

The production-grade way to get an exact time with the browser closed is a small Web Push sender (for example a Vercel Cron function plus VAPID). The service worker's notification code would be reused unchanged. It was left out on purpose, to respect the brief's "no backend".

## Other known limitations

- **API keys are visible in the browser bundle.** This can't be avoided in a client-only app. Both are free-tier keys. In production they would sit behind a small proxy with rate limiting.
- GeoDB's free tier is rate-limited (about 1 request/second). The fallback hides this, but suggestions then come from Open-Meteo.
- The forecast is "today + 4 days", because OWM's free forecast covers 5 × 24 h from now.
- The service worker is disabled in `npm run dev`. Use `npm run build && npm run preview` to test PWA and offline behaviour.

## Testing

`npm test` runs 30 unit tests over the logic that is easiest to get subtly wrong: city/time validation (including non-Latin names), timezone-correct forecast grouping, Open-Meteo normalisation, condition mapping, unit conversion, and reminder timing (once per day, not too early, not hours late).

Manually verified at 375 / 768 / 1280 px: no horizontal scroll, every touch target is at least 44 × 44 px, light and dark themes, the confirmation dialog, and offline reload served by the service worker with the offline banner.

## APIs used

- [OpenWeatherMap](https://openweathermap.org/api): `/data/2.5/weather` and `/data/2.5/forecast` (primary weather)
- [Open-Meteo](https://open-meteo.com/): `/v1/forecast` (fallback weather) and Geocoding API (fallback search)
- [GeoDB Cities](https://rapidapi.com/wirefreethought/api/geodb-cities) via RapidAPI: `/v1/geo/cities` (autocomplete)
- Browser: Notifications API, Service Worker, Periodic Background Sync, IndexedDB, localStorage
