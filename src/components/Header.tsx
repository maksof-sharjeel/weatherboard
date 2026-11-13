import { Download, Monitor, Moon, Sun } from 'lucide-react'
import type { ThemePref, Units } from '../lib/types'

interface Props {
  units: Units
  onUnits: (u: Units) => void
  theme: ThemePref
  onTheme: (t: ThemePref) => void
  canInstall: boolean
  onInstall: () => void
}

const THEMES: { value: ThemePref; label: string; Icon: typeof Sun }[] = [
  { value: 'light', label: 'Light theme', Icon: Sun },
  { value: 'system', label: 'Match system theme', Icon: Monitor },
  { value: 'dark', label: 'Dark theme', Icon: Moon },
]

export function Header({ units, onUnits, theme, onTheme, canInstall, onInstall }: Props) {
  return (
    <header className="flex items-center justify-between gap-3">
      <a href="/" className="flex h-11 min-w-0 items-center gap-2.5" aria-label="WeatherBoard home">
        <img src="/icons/icon.svg" alt="" className="size-9 shrink-0 rounded-xl" />
        <span className="truncate text-lg font-semibold tracking-tight">WeatherBoard</span>
      </a>

      <div className="flex shrink-0 items-center gap-2">
        {canInstall && (
          <button
            type="button"
            onClick={onInstall}
            className="hidden h-12 items-center gap-1.5 rounded-xl border border-line bg-surface px-3 text-sm font-medium hover:bg-surface-2 sm:inline-flex"
          >
            <Download className="size-4" aria-hidden /> Install
          </button>
        )}

        <div role="radiogroup" aria-label="Temperature unit" className="flex rounded-xl border border-line bg-surface p-0.5">
          {(['metric', 'imperial'] as const).map((u) => (
            <button
              key={u}
              type="button"
              role="radio"
              aria-checked={units === u}
              onClick={() => onUnits(u)}
              className={`size-11 rounded-[10px] text-sm font-semibold transition-colors ${
                units === u ? 'bg-ink text-bg' : 'text-muted hover:text-ink'
              }`}
            >
              {u === 'metric' ? '°C' : '°F'}
            </button>
          ))}
        </div>

        <div role="radiogroup" aria-label="Colour theme" className="hidden rounded-xl border border-line bg-surface p-0.5 sm:flex">
          {THEMES.map(({ value, label, Icon }) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={theme === value}
              aria-label={label}
              title={label}
              onClick={() => onTheme(value)}
              className={`grid size-11 place-items-center rounded-[10px] transition-colors ${
                theme === value ? 'bg-surface-2 text-ink' : 'text-faint hover:text-ink'
              }`}
            >
              <Icon className="size-4" aria-hidden />
            </button>
          ))}
        </div>

        {/* Mobile: one button that cycles, to save width at 375px */}
        <button
          type="button"
          onClick={() => onTheme(theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light')}
          className="grid size-12 place-items-center rounded-xl border border-line bg-surface text-muted sm:hidden"
          aria-label={`Theme: ${theme}. Tap to change.`}
        >
          {theme === 'light' ? <Sun className="size-4" /> : theme === 'dark' ? <Moon className="size-4" /> : <Monitor className="size-4" />}
        </button>
      </div>
    </header>
  )
}
