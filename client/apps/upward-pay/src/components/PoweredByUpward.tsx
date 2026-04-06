export function UpwardLogo({
  size = 20,
  color = '#d97757',
  className = '',
}: {
  size?: number
  color?: string
  className?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect x="7" y="15" width="10" height="17" rx="5" fill={color} />
      <rect x="23" y="15" width="10" height="17" rx="5" fill={color} />
      <path
        d="M12 30 Q12 37 20 37 Q28 37 28 30"
        stroke={color}
        strokeWidth="5.5"
        strokeLinecap="round"
        fill="none"
      />
      <polyline
        points="7,19 20,8 33,19"
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="20" cy="5" r="3" fill="#22c55e" />
    </svg>
  )
}
export function UpwardPayLockup({
  size = 'md',
  theme = 'light',
  className = '',
}: {
  size?: 'sm' | 'md' | 'lg'
  theme?: 'light' | 'dark'
  className?: string
}) {
  const scales = { sm: 0.65, md: 1, lg: 1.4 }
  const sc = scales[size]
  const textColor = theme === 'dark' ? '#faf9f5' : '#0a0a0f'

  return (
    <svg
      width={sc * 180}
      height={sc * 48}
      viewBox="0 0 180 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect x="2" y="14" width="8" height="18" rx="4" fill="#d97757" />
      <rect x="16" y="14" width="8" height="18" rx="4" fill="#d97757" />
      <path
        d="M6 30 Q6 38 13 38 Q20 38 20 30"
        stroke="#d97757"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
      <polyline
        points="2,18 13,8 24,18"
        stroke="#d97757"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="13" cy="5" r="2.5" fill="#22c55e" />
      <text
        x="34"
        y="30"
        fontFamily="Inter, system-ui, sans-serif"
        fontWeight="600"
        fontSize="20"
        letterSpacing="-0.3"
        fill={textColor}
      >
        upward
      </text>
      <text
        x="36"
        y="43"
        fontFamily="Inter, system-ui, sans-serif"
        fontWeight="500"
        fontSize="9"
        letterSpacing="3.5"
        fill="#d97757"
      >
        PAY
      </text>
    </svg>
  )
}
/*Usage
<UpwardPayLockup size="md" theme="light" />
<UpwardPayLockup size="sm" theme="dark" />
*/
export default function PoweredByUpward({ className = '' }: { className?: string }) {
  return (
    <div className={`powered-badge ${className}`}>
      <div className="powered-badge__icon">
        <UpwardLogo size={14} color="#fff" />
      </div>
      <span className="powered-badge__text">Powered by Upward</span>
    </div>
  )
}
