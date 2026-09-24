import { useId, useMemo } from 'react'

export interface Point {
  label: string
  a: number
  b: number
}

export function AreaTrend({
  data,
  aLabel,
  bLabel,
  aColor = '#2ec5ff',
  bColor = '#ff2e97',
}: {
  data: Point[]
  aLabel: string
  bLabel: string
  aColor?: string
  bColor?: string
}) {
  const id = useId().replace(/:/g, '')
  const w = 720
  const h = 240
  const pad = { l: 36, r: 18, t: 28, b: 36 }
  const max = Math.max(1, ...data.flatMap((d) => [d.a, d.b]))
  const innerW = w - pad.l - pad.r
  const innerH = h - pad.t - pad.b
  const x = (i: number) => pad.l + (data.length <= 1 ? innerW / 2 : (i / (data.length - 1)) * innerW)
  const y = (v: number) => pad.t + innerH - (v / max) * innerH

  const path = (key: 'a' | 'b') => {
    const line = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(d[key])}`).join(' ')
    const area = `${line} L${x(data.length - 1)},${pad.t + innerH} L${x(0)},${pad.t + innerH} Z`
    return { line, area }
  }
  const A = path('a')
  const B = path('b')
  const ticks = useMemo(() => {
    if (data.length <= 8) return data.map((d, i) => ({ i, label: d.label }))
    const last = data.length - 1
    const idxs = [0, Math.round(last / 3), Math.round((2 * last) / 3), last]
    return [...new Set(idxs)].map((i) => ({ i, label: data[i].label }))
  }, [data])

  if (!data.length) return null

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${w} ${h}`} className="chart-svg" role="img">
        <defs>
          <linearGradient id={`${id}-a`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={aColor} stopOpacity="0.35" />
            <stop offset="100%" stopColor={aColor} stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`${id}-b`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={bColor} stopOpacity="0.28" />
            <stop offset="100%" stopColor={bColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((p) => (
          <line
            key={p}
            x1={pad.l}
            x2={w - pad.r}
            y1={pad.t + innerH * p}
            y2={pad.t + innerH * p}
            className="chart-grid"
          />
        ))}
        <path d={A.area} fill={`url(#${id}-a)`} />
        <path d={B.area} fill={`url(#${id}-b)`} />
        <path d={A.line} fill="none" stroke={aColor} strokeWidth="2.4" />
        <path d={B.line} fill="none" stroke={bColor} strokeWidth="2.4" />
        {data.map((d, i) => {
          const same = d.a === d.b && d.a > 0
          return (
            <g key={`${d.label}-${i}`}>
              <circle cx={x(i)} cy={y(d.a)} r="3.2" fill={aColor} />
              <circle cx={x(i)} cy={y(d.b)} r="3.2" fill={bColor} />
              {d.a > 0 && (
                <text
                  x={x(i) + (same ? -7 : 0)}
                  y={y(d.a) - 8}
                  textAnchor="middle"
                  className="chart-val"
                  fill={aColor}
                >
                  {d.a}
                </text>
              )}
              {d.b > 0 && (
                <text
                  x={x(i) + (same ? 7 : 0)}
                  y={Math.min(pad.t + innerH - 4, y(d.b) + 14)}
                  textAnchor="middle"
                  className="chart-val"
                  fill={bColor}
                >
                  {d.b}
                </text>
              )}
            </g>
          )
        })}
        {ticks.map((tk) => (
          <text key={tk.i} x={x(tk.i)} y={h - 10} textAnchor="middle" className="chart-tick">
            {tk.label}
          </text>
        ))}
      </svg>
      <div className="chart-legend">
        <span>
          <i style={{ background: aColor }} /> {aLabel}
        </span>
        <span>
          <i style={{ background: bColor }} /> {bLabel}
        </span>
      </div>
    </div>
  )
}

export function Bars({
  items,
}: {
  items: { label: string; value: number; color: string }[]
}) {
  const max = Math.max(1, ...items.map((i) => i.value))
  return (
    <div className="bars">
      {items.map((it) => (
        <div key={it.label} className="bar-row">
          <span className="bar-label">{it.label}</span>
          <div className="bar-track">
            <div
              className="bar-fill"
              style={{ width: `${(it.value / max) * 100}%`, background: it.color }}
            />
          </div>
          <span className="bar-val">{it.value}</span>
        </div>
      ))}
    </div>
  )
}
