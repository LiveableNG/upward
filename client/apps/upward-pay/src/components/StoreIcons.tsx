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
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
    </svg>
  )
}

export function PlayStoreIcon({ className, size = 18, colored = false }: { className?: string; size?: number; colored?: boolean }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill={colored ? undefined : "currentColor"} 
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Left part (Blue) */}
      <path d="M3.609 1.814L13.792 12l-10.183 10.186c-.307-.272-.493-.659-.493-1.085V2.899c0-.426.186-.813.493-1.085z" fill={colored ? "#00a0ff" : "currentColor"} />
      {/* Bottom part (Red) */}
      <path d="M14.656 12.864l2.673 2.673L4.549 22.91a1.982 1.982 0 0 1-.418.156L14.656 12.864z" fill={colored ? "#ff3c00" : "currentColor"} />
      {/* Top part (Green) */}
      <path d="M14.656 11.136L4.131.933a1.983 1.983 0 0 1 .418-.156l12.78 7.373-2.673 2.986z" fill={colored ? "#00e676" : "currentColor"} />
      {/* Right part (Yellow) */}
      <path d="M18.156 10.871l3.523 2.035c.441.255.441.674 0 .929l-3.523 2.035-3.045-3.045 3.045-3.045z" fill={colored ? "#ffbb00" : "currentColor"} />
    </svg>
  )
}
