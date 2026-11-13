import { AlertCircle, Bell, BellOff, CheckCircle2, Info, Send } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { useReminder } from '../hooks/useReminder'
import { formatClock } from '../lib/format'
import { validateReminderTime } from '../lib/validation'

type Step = 'idle' | 'explain' | 'editing'

export function ReminderCard({ cityName }: { cityName: string | null }) {
  const { support, permission, config, loaded, background, enable, disable, sendTest } = useReminder()
  const [step, setStep] = useState<Step>('idle')
  const [time, setTime] = useState(config.time)
  const [timeError, setTimeError] = useState<string | null>(null)
  const [testSent, setTestSent] = useState<'idle' | 'sent' | 'failed'>('idle')
  const [busy, setBusy] = useState(false)
  const ids = { time: useId(), err: useId() }

  useEffect(() => setTime(config.time), [config.time])

  async function confirmEnable() {
    const err = validateReminderTime(time)
    if (err) {
      setTimeError(err)
      return
    }
    setBusy(true)
    try {
      await enable(time)
    } finally {
      setBusy(false)
      setStep('idle')
    }
  }

  function startEnable() {
    const err = validateReminderTime(time)
    setTimeError(err)
    if (err) return
    // Explain *before* the browser prompt — a cold permission prompt is usually denied, and denial is sticky.
    if (permission === 'granted') void confirmEnable()
    else setStep('explain')
  }

  const header = (
    <div className="flex items-center gap-2">
      <Bell className="size-4 text-muted" aria-hidden />
      <h2 className="text-xs font-semibold tracking-wide text-muted uppercase">Morning reminder</h2>
    </div>
  )

  if (support.kind !== 'supported') {
    return (
      <section className="card p-4" aria-label="Morning reminder">
        {header}
        <div className="mt-3 flex items-start gap-3 rounded-xl bg-surface-2 px-3 py-3 text-sm">
          <BellOff className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
          {support.kind === 'ios-needs-install' ? (
            <p className="text-muted">
              On iPhone and iPad, reminders only work once WeatherBoard is on your Home Screen. Tap{' '}
              <strong className="text-ink">Share → Add to Home Screen</strong>, then open it from there.
            </p>
          ) : (
            <p className="text-muted">
              {support.reason} Daily reminders aren’t available here, but everything else in WeatherBoard works normally.
            </p>
          )}
        </div>
      </section>
    )
  }

  if (permission === 'denied') {
    return (
      <section className="card p-4" aria-label="Morning reminder">
        {header}
        <div className="mt-3 flex items-start gap-3 rounded-xl bg-surface-2 px-3 py-3 text-sm">
          <BellOff className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
          <p className="text-muted">
            Notifications are blocked for this site, so we can’t send your morning reminder. To allow them, click the{' '}
            <strong className="text-ink">site settings icon</strong> next to the address bar →{' '}
            <strong className="text-ink">Notifications → Allow</strong>, then reload.
          </p>
        </div>
      </section>
    )
  }

  if (!loaded) {
    return (
      <section className="card space-y-3 p-4" aria-busy="true" aria-label="Morning reminder">
        {header}
        <div className="skeleton h-11" />
      </section>
    )
  }

  const timeField = (
    <div>
      <label htmlFor={ids.time} className="text-sm font-medium text-ink">
        Remind me at
      </label>
      <input
        id={ids.time}
        type="time"
        required
        value={time}
        onChange={(e) => {
          setTime(e.target.value)
          if (timeError) setTimeError(validateReminderTime(e.target.value))
        }}
        onBlur={(e) => setTimeError(validateReminderTime(e.target.value))}
        aria-invalid={!!timeError}
        aria-describedby={timeError ? ids.err : undefined}
        className={`tabular mt-1.5 block h-11 w-full rounded-xl border bg-surface px-3 text-base text-ink outline-none focus:border-accent ${
          timeError ? 'border-danger' : 'border-line'
        }`}
      />
      {timeError && (
        <p id={ids.err} role="alert" className="mt-1.5 flex items-center gap-1.5 text-sm text-danger">
          <AlertCircle className="size-4 shrink-0" aria-hidden />
          {timeError}
        </p>
      )}
    </div>
  )

  // ---- Enabled ----
  if (config.enabled && permission === 'granted' && step !== 'editing') {
    return (
      <section className="card p-4" aria-label="Morning reminder">
        {header}
        <div className="mt-3 flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-ok" aria-hidden />
          <div className="min-w-0 text-sm">
            <p className="font-medium text-ink">Every day at {formatClock(config.time)}</p>
            <p className="text-muted">
              {cityName ? `With today’s forecast for ${cityName}.` : 'With the forecast for your last viewed city.'}
            </p>
          </div>
        </div>

        {background === false && (
          <p className="mt-3 flex items-start gap-2 rounded-xl bg-surface-2 px-3 py-2.5 text-xs text-muted">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <span>
              To get the reminder with WeatherBoard closed, <strong className="text-ink">install the app</strong> (Chrome
              or Edge). Until then it arrives while WeatherBoard is open in a tab.
            </span>
          </p>
        )}

        <div className="mt-4 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setStep('editing')}
            className="h-11 rounded-xl border border-line text-sm font-medium hover:bg-surface-2"
          >
            Change
          </button>
          <button
            type="button"
            onClick={async () => setTestSent((await sendTest()) ? 'sent' : 'failed')}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-line text-sm font-medium hover:bg-surface-2"
          >
            <Send className="size-3.5" aria-hidden /> Test
          </button>
          <button
            type="button"
            onClick={() => void disable()}
            className="h-11 rounded-xl border border-line text-sm font-medium text-danger hover:bg-danger-soft"
          >
            Turn off
          </button>
        </div>
        {testSent !== 'idle' && (
          <p className="mt-2 text-xs text-muted" role="status">
            {testSent === 'sent'
              ? 'Test sent — it should appear in a few seconds.'
              : 'Couldn’t reach the background worker. Reload the page once and try again.'}
          </p>
        )}
      </section>
    )
  }

  // ---- Off / editing ----
  return (
    <section className="card p-4" aria-label="Morning reminder">
      {header}
      {step === 'explain' ? (
        <div className="fade-in mt-3 rounded-xl border border-accent/30 bg-accent-soft p-3.5 text-sm">
          <p className="font-medium text-ink">One quick permission</p>
          <p className="mt-1 text-muted">
            Your browser will ask to allow notifications. We use it for exactly one thing: a short weather summary at{' '}
            {formatClock(time)} each day. No marketing, and you can turn it off here any time.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => void confirmEnable()}
              disabled={busy}
              className="h-11 flex-1 rounded-xl bg-accent text-sm font-semibold text-accent-ink hover:opacity-90 disabled:opacity-60"
            >
              {busy ? 'Waiting for browser…' : 'Continue'}
            </button>
            <button
              type="button"
              onClick={() => setStep('idle')}
              className="h-11 rounded-xl border border-line px-4 text-sm font-medium hover:bg-surface-2"
            >
              Not now
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-2 text-sm text-muted">
            Get a one-line forecast every morning so you know whether to grab a jacket — before you leave.
          </p>
          <div className="mt-3 space-y-3">
            {timeField}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={startEnable}
                className="h-11 flex-1 rounded-xl bg-accent text-sm font-semibold text-accent-ink hover:opacity-90"
              >
                {step === 'editing' ? 'Save time' : 'Turn on reminder'}
              </button>
              {step === 'editing' && (
                <button
                  type="button"
                  onClick={() => {
                    setTime(config.time)
                    setTimeError(null)
                    setStep('idle')
                  }}
                  className="h-11 rounded-xl border border-line px-4 text-sm font-medium hover:bg-surface-2"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  )
}
