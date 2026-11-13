import type { Condition } from '../lib/types'

interface Props {
  condition: Condition
  isDay?: boolean
  size?: number
  className?: string
  /** Decorative by default; pass a label when the icon is the only carrier of meaning. */
  label?: string
}

const SUN = '#f6b73c'
const MOON = '#c9d3f5'
const CLOUD_FRONT = '#e7ebf3'
const CLOUD_BACK = '#aeb7c8'
const RAIN = '#5b8cff'
const SNOW = '#cfe0ff'
const BOLT = '#ffc93c'

const cloudPath = 'M19 46h27a10 10 0 0 0 1.5-19.9A13 13 0 0 0 22.4 23 11.5 11.5 0 0 0 19 46z'

function Sun({ cx = 32, cy = 32, r = 10 }: { cx?: number; cy?: number; r?: number }) {
  const rays = Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4
    return (
      <line
        key={i}
        x1={cx + Math.cos(a) * (r + 4)}
        y1={cy + Math.sin(a) * (r + 4)}
        x2={cx + Math.cos(a) * (r + 8)}
        y2={cy + Math.sin(a) * (r + 8)}
        stroke={SUN}
        strokeWidth={3}
        strokeLinecap="round"
      />
    )
  })
  return (
    <g>
      <g className="wi-sun-rays" style={{ transformOrigin: `${cx}px ${cy}px` }}>
        {rays}
      </g>
      <circle cx={cx} cy={cy} r={r} fill={SUN} />
    </g>
  )
}

function Moon({ cx = 32, cy = 30, r = 12 }: { cx?: number; cy?: number; r?: number }) {
  return (
    <path
      d={`M${cx + r * 0.35} ${cy - r} a${r} ${r} 0 1 0 ${r * 0.65} ${r * 1.6} a${r * 0.85} ${r * 0.85} 0 0 1 -${r * 0.65} -${r * 1.6}z`}
      fill={MOON}
    />
  )
}

function Cloud({ dy = 0, back = false }: { dy?: number; back?: boolean }) {
  return (
    <g className={back ? 'wi-cloud-back' : 'wi-cloud'}>
      <path
        d={cloudPath}
        transform={back ? `translate(-8 ${dy - 7}) scale(0.85)` : `translate(0 ${dy})`}
        fill={back ? CLOUD_BACK : CLOUD_FRONT}
        stroke={back ? 'none' : 'rgba(15,20,36,0.08)'}
        strokeWidth={1}
      />
    </g>
  )
}

export function WeatherIcon({ condition, isDay = true, size = 48, className, label }: Props) {
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true }
  let content: React.ReactNode

  switch (condition) {
    case 'clear':
      content = isDay ? <Sun /> : <Moon />
      break
    case 'partly-cloudy':
      content = (
        <>
          {isDay ? <Sun cx={24} cy={24} r={8} /> : <Moon cx={22} cy={20} r={9} />}
          <Cloud dy={4} />
        </>
      )
      break
    case 'cloudy':
      content = (
        <>
          <Cloud back />
          <Cloud dy={2} />
        </>
      )
      break
    case 'fog':
      content = (
        <>
          <Cloud dy={-6} />
          <line className="wi-fog-line" x1={14} y1={48} x2={46} y2={48} stroke={CLOUD_BACK} strokeWidth={3} strokeLinecap="round" />
          <line className="wi-fog-line" x1={20} y1={55} x2={52} y2={55} stroke={CLOUD_BACK} strokeWidth={3} strokeLinecap="round" />
        </>
      )
      break
    case 'drizzle':
    case 'rain': {
      const len = condition === 'rain' ? 7 : 4
      content = (
        <>
          <g>
            {[24, 33, 42].map((x) => (
              <line key={x} className="wi-drop" x1={x} y1={46} x2={x - 2} y2={46 + len} stroke={RAIN} strokeWidth={3} strokeLinecap="round" />
            ))}
          </g>
          <Cloud dy={-6} />
        </>
      )
      break
    }
    case 'snow':
      content = (
        <>
          <g>
            {[24, 33, 42].map((x) => (
              <circle key={x} className="wi-flake" cx={x} cy={49} r={2.6} fill={SNOW} stroke={RAIN} strokeWidth={0.8} />
            ))}
          </g>
          <Cloud dy={-6} />
        </>
      )
      break
    case 'thunder':
      content = (
        <>
          <Cloud back />
          <Cloud dy={-4} />
          <path className="wi-bolt" d="M34 38l-7 11h6l-3 9 9-13h-6l3-7z" fill={BOLT} />
        </>
      )
      break
  }

  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} {...a11y}>
      {label && <title>{label}</title>}
      {content}
    </svg>
  )
}
