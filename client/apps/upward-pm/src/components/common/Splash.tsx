import React from 'react'
import { UpwardLogo } from './UpwardLogo'

export function Splash() {
  return (
    <div className="splash">
      <div className="splash__logo">
        <UpwardLogo size={52} color="var(--forest)" />
      </div>
    </div>
  )
}
