import React from 'react'

const pulse: React.CSSProperties = {
  background: 'linear-gradient(90deg, var(--surface-hover) 25%, var(--border) 50%, var(--surface-hover) 75%)',
  backgroundSize: '200% 100%',
  animation: 'skeleton-pulse 1.5s ease-in-out infinite',
  borderRadius: '6px',
}

export const SkeletonBlock: React.FC<{ width?: string; height?: string; style?: React.CSSProperties }> = ({
  width = '100%',
  height = '16px',
  style,
}) => (
  <div style={{ ...pulse, width, height, ...style }} />
)

export const MetricCardSkeleton: React.FC = () => (
  <div
    className="card"
    style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px' }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <SkeletonBlock width="100px" height="12px" />
      <SkeletonBlock width="36px" height="36px" style={{ borderRadius: '10px' }} />
    </div>
    <SkeletonBlock width="60%" height="28px" />
    <SkeletonBlock width="80%" height="12px" />
    <SkeletonBlock width="50%" height="10px" />
  </div>
)

export const TableRowSkeleton: React.FC<{ cols?: number }> = ({ cols = 5 }) => (
  <tr>
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} style={{ padding: '14px 16px' }}>
        <SkeletonBlock width={i === 0 ? '120px' : i === 1 ? '80px' : '60px'} height="13px" />
      </td>
    ))}
  </tr>
)

export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({ rows = 8, cols = 5 }) => (
  <tbody>
    {Array.from({ length: rows }).map((_, i) => (
      <TableRowSkeleton key={i} cols={cols} />
    ))}
  </tbody>
)

export const ActivityFeedSkeleton: React.FC = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        <SkeletonBlock width="32px" height="32px" style={{ borderRadius: '50%', flexShrink: 0 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <SkeletonBlock width={`${60 + (i % 3) * 10}%`} height="13px" />
          <SkeletonBlock width="40%" height="11px" />
        </div>
      </div>
    ))}
  </div>
)

// Inject keyframe animation globally once
const SkeletonStyles: React.FC = () => (
  <style>{`
    @keyframes skeleton-pulse {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `}</style>
)

export default SkeletonStyles
