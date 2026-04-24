import React from 'react'

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
