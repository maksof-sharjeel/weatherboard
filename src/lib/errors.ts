export type ErrorKind =
  | 'offline'
  | 'network'
  | 'timeout'
  | 'rate-limit'
  | 'auth'
  | 'not-found'
  | 'server'
  | 'bad-response'

/**
 * An error that already knows how to explain itself to a person:
 * `title` says what failed, `hint` says what they can do about it.
 */
export class AppError extends Error {
  readonly kind: ErrorKind
  readonly title: string
  readonly hint: string
  readonly status?: number

  constructor(kind: ErrorKind, title: string, hint: string, status?: number) {
    super(title)
    this.name = 'AppError'
    this.kind = kind
    this.title = title
    this.hint = hint
    this.status = status
  }
}

export function httpError(service: string, status: number): AppError {
  if (status === 429) {
    return new AppError(
      'rate-limit',
      `${service} is receiving too many requests right now.`,
      'Wait a few seconds and try again.',
      status,
    )
  }
  if (status === 401 || status === 403) {
    return new AppError(
      'auth',
      `${service} rejected our API key.`,
      'The key may be missing, expired or not yet activated. New OpenWeatherMap keys can take up to 2 hours to activate.',
      status,
    )
  }
  if (status === 404) {
    return new AppError('not-found', `${service} has no data for this location.`, 'Try a nearby larger city.', status)
  }
  if (status >= 500) {
    return new AppError(
      'server',
      `${service} is having problems on its end (error ${status}).`,
      'This usually clears up within a few minutes. Try again shortly.',
      status,
    )
  }
  return new AppError(
    'bad-response',
    `${service} returned an unexpected response (error ${status}).`,
    'Try again. If it keeps happening, search for a different city.',
    status,
  )
}

export function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false
}

export function toAppError(err: unknown, service: string): AppError {
  if (err instanceof AppError) return err
  if (err instanceof DOMException && err.name === 'TimeoutError') {
    return new AppError('timeout', `${service} took too long to respond.`, 'Your connection may be slow. Try again.')
  }
  if (isOffline()) {
    return new AppError('offline', "You're offline.", 'Reconnect to the internet and try again.')
  }
  // fetch() rejects with TypeError on DNS failures, CORS blocks, dropped connections…
  return new AppError(
    'network',
    `Couldn't reach ${service}.`,
    'Check your internet connection, or disable any ad/tracker blocker for this site, then try again.',
  )
}

interface FetchJsonOptions {
  service: string
  signal?: AbortSignal
  headers?: Record<string, string>
  timeoutMs?: number
}

/** fetch + JSON parse with timeout, caller cancellation and human-readable errors. */
export async function fetchJson<T>(url: string, opts: FetchJsonOptions): Promise<T> {
  const { service, signal, headers, timeoutMs = 10_000 } = opts
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(new DOMException('Timed out', 'TimeoutError')), timeoutMs)
  const onAbort = () => controller.abort(signal?.reason)
  signal?.addEventListener('abort', onAbort, { once: true })

  try {
    const res = await fetch(url, { headers, signal: controller.signal })
    if (!res.ok) throw httpError(service, res.status)
    try {
      return (await res.json()) as T
    } catch {
      throw new AppError('bad-response', `${service} sent data we couldn't read.`, 'Try again in a moment.')
    }
  } catch (err) {
    // Caller-initiated aborts (e.g. a newer keystroke) propagate untouched so callers can ignore them.
    if (signal?.aborted) throw signal.reason ?? err
    if (controller.signal.aborted) throw toAppError(controller.signal.reason, service)
    throw toAppError(err, service)
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onAbort)
  }
}

export function isAbort(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError'
}
