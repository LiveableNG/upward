import React from 'react'
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react'

export interface TargetStat {
  target: string
  count: number
}

export interface TypeStat {
  type: string
  count: number
}

export interface DayTrend {
  date: string
  count: number
}

export function delta(a: number, b: number): { pct: number; dir: 'up' | 'down' | 'flat' } {
  if (b === 0) return { pct: 0, dir: 'flat' }
  const pct = Math.round(((a - b) / b) * 100)
  return { pct: Math.abs(pct), dir: pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat' }
}

export function Sparkline({
  data,
  color,
  height = 48,
}: {
  data: DayTrend[]
  color: string
  height?: number
}) {
  if (data.length < 2) return null
  const width = 160
  const max = Math.max(...data.map((d) => d.count), 1)
  const points = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * width
      const y = height - (d.count / max) * height
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ opacity: 0.8 }}
      />
    </svg>
  )
}

export function StatCard({
  label,
  valueA,
  valueB,
  icon: Icon,
  format = (v: number) => v.toLocaleString(),
  suffix = '',
  colorA,
  colorB,
}: {
  label: string
  valueA: number
  valueB: number
  icon: React.ElementType
  format?: (v: number) => string
  suffix?: string
  colorA: string
  colorB: string
}) {
  const d = delta(valueB, valueA)
  const DeltaIcon = d.dir === 'up' ? ArrowUpRight : d.dir === 'down' ? ArrowDownRight : Minus
  const deltaColor = d.dir === 'up' ? '#10b981' : d.dir === 'down' ? '#ef4444' : '#6b7280'

  return (
    <div
      className="card"
      style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: '1 1 200px' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            backgroundColor: 'var(--surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
          }}
        >
          <Icon size={18} />
        </div>
        <span className="section-label">{label}</span>
      </div>

      <div style={{ display: 'flex', gap: '20px' }}>
        {/* Variant A */}
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: '10px',
              fontWeight: 700,
              color: colorA,
              textTransform: 'uppercase',
              marginBottom: '2px',
            }}
          >
            Variant A
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text)' }}>
            {format(valueA)}
            {suffix}
          </div>
        </div>

        <div style={{ width: '1px', backgroundColor: 'var(--border)', alignSelf: 'stretch' }} />

        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: '10px',
              fontWeight: 700,
              color: colorB,
              textTransform: 'uppercase',
              marginBottom: '2px',
            }}
          >
            Variant B
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text)' }}>
            {format(valueB)}
            {suffix}
          </div>
          {d.pct > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
                fontSize: '11px',
                fontWeight: 700,
                color: deltaColor,
                marginTop: '2px',
              }}
            >
              <DeltaIcon size={12} />
              {d.pct}% vs A
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function BarChart({
  data,
  color,
  max,
}: {
  data: { label: string; count: number }[]
  color: string
  max: number
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {data.map((item, i) => {
        const pct = max > 0 ? Math.round((item.count / max) * 100) : 0
        return (
          <div key={i}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '12px',
                marginBottom: '4px',
              }}
            >
              <span
                style={{
                  fontWeight: 600,
                  color: 'var(--text)',
                  maxWidth: '180px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={item.label}
              >
                {item.label}
              </span>
              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{item.count}</span>
            </div>
            <div
              style={{
                height: '6px',
                background: 'var(--surface-hover)',
                borderRadius: '3px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${pct}%`,
                  height: '100%',
                  background: color,
                  borderRadius: '3px',
                  transition: 'width 0.6s ease',
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function TrendChart({
  variantA,
  variantB,
  colorA,
  colorB,
}: {
  variantA: DayTrend[]
  variantB: DayTrend[]
  colorA: string
  colorB: string
}) {
  // Merge dates from both
  const allDates = Array.from(
    new Set([
      ...variantA.map((d) =>
        new Date(d.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
      ),
      ...variantB.map((d) =>
        new Date(d.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
      ),
    ]),
  ).sort()

  if (allDates.length === 0) {
    return (
      <div
        style={{
          padding: '40px',
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: '13px',
        }}
      >
        No trend data yet
      </div>
    )
  }

  const getCount = (data: DayTrend[], label: string) => {
    const entry = data.find(
      (d) =>
        new Date(d.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) === label,
    )
    return entry?.count ?? 0
  }

  const maxVal = Math.max(
    ...allDates.map((d) => getCount(variantA, d)),
    ...allDates.map((d) => getCount(variantB, d)),
    1,
  )

  const chartH = 120
  const chartW = 600

  const toPoints = (data: DayTrend[]) =>
    allDates
      .map((label, i) => {
        const x = allDates.length > 1 ? (i / (allDates.length - 1)) * chartW : chartW / 2
        const y = chartH - (getCount(data, label) / maxVal) * chartH
        return `${x.toFixed(1)},${y.toFixed(1)}`
      })
      .join(' ')

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg
        viewBox={`0 0 ${chartW} ${chartH + 20}`}
        style={{ width: '100%', minWidth: '300px', height: `${chartH + 20}px` }}
      >
        {/* grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => (
          <line
            key={frac}
            x1={0}
            x2={chartW}
            y1={chartH * (1 - frac)}
            y2={chartH * (1 - frac)}
            stroke="var(--border)"
            strokeWidth={1}
          />
        ))}
        <polyline
          points={toPoints(variantA)}
          fill="none"
          stroke={colorA}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polyline
          points={toPoints(variantB)}
          fill="none"
          stroke={colorB}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* x-axis labels — show every Nth */}
        {allDates
          .filter((_, i) => i % Math.ceil(allDates.length / 7) === 0 || i === allDates.length - 1)
          .map((label, _, arr) => {
            const i = allDates.indexOf(label)
            const x = allDates.length > 1 ? (i / (allDates.length - 1)) * chartW : chartW / 2
            return (
              <text
                key={label}
                x={x}
                y={chartH + 14}
                fontSize="9"
                fill="var(--text-muted)"
                textAnchor={arr.indexOf(label) === arr.length - 1 ? 'end' : 'middle'}
              >
                {label}
              </text>
            )
          })}
      </svg>
    </div>
  )
}
