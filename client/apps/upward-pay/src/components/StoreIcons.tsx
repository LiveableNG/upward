import React from 'react'

export function AppleIcon({ className, size = 18 }: { className?: string; size?: number }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="currentColor" 
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M17.05 20.28c-.96.78-2.04 1.21-3.21 1.25-1.18.04-2.1-.31-3.11-.31-1.01 0-1.99.34-3.1.31-1.28-.03-2.52-.61-3.46-1.63-1.92-2.08-1.92-5.46-.11-7.81.9-1.17 2.13-1.89 3.47-1.91 1.05-.02 1.94.31 2.92.31.98 0 2.05-.38 3.29-.31.84.05 1.63.31 2.27.76-.17.11-1.68 1.13-1.68 3.19 0 2.47 2.1 3.32 2.14 3.33-.03.11-.32.96-1.42 1.83zM12.03 7.25c-.02-2.23 1.74-4.07 3.92-4.24.23 2.14-1.66 4.19-3.92 4.24z" />
    </svg>
  )
}

export function PlayStoreIcon({ className, size = 18 }: { className?: string; size?: number }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="currentColor" 
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M3.609 1.814L13.792 12l-10.183 10.186c-.307-.272-.493-.659-.493-1.085V2.899c0-.426.186-.813.493-1.085zM14.656 12.864l2.673 2.673L4.549 22.91a1.982 1.982 0 0 1-.418.156L14.656 12.864zM14.656 11.136L4.131.933a1.983 1.983 0 0 1 .418-.156l12.78 7.373-2.673 2.986zM18.156 10.871l3.523 2.035c.441.255.441.674 0 .929l-3.523 2.035-3.045-3.045 3.045-3.045z" />
    </svg>
  )
}
