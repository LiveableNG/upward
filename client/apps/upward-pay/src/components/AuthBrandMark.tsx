type AuthBrandMarkSize = 'sm' | 'md' | 'lg'

const SIZE_MAP: Record<AuthBrandMarkSize, { box: number; radius: number; font: number }> = {
  sm: { box: 34, radius: 10, font: 19 },
  md: { box: 38, radius: 11, font: 21 },
  lg: { box: 96, radius: 26, font: 40 },
}

export function AuthBrandMark({
  size = 'md',
  className = '',
}: {
  size?: AuthBrandMarkSize
  className?: string
}) {
  const { box, radius, font } = SIZE_MAP[size]

  return (
    <div
      className={`auth-brand-mark ${className}`.trim()}
      style={{
        width: box,
        height: box,
        borderRadius: radius,
        fontSize: font,
      }}
      aria-hidden
    >
      ↑
    </div>
  )
}
