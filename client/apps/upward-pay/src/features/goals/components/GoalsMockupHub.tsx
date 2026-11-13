'use client'

import React, { useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'

export function GoalsMockupHub() {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const searchParams = useSearchParams()
  const cat = searchParams.get('cat')
  const screen = searchParams.get('screen')

  const targetUrl = React.useMemo(() => {
    const params = new URLSearchParams()
    if (screen) {
      params.set('screen', screen)
      if (cat) params.set('cat', cat)
    } else if (cat === 'all') {
      params.set('screen', 'all-goals')
    } else if (cat === 'custom') {
      params.set('screen', 'custom-goal')
    } else if (cat) {
      params.set('screen', 'questionnaire')
      params.set('cat', cat)
    } else {
      params.set('screen', 'all-goals')
    }
    const query = params.toString()
    return `/goals-mockup.html?${query}`
  }, [cat, screen])

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100dvh',
        backgroundColor: '#faf9f5',
        zIndex: 1200,
        overflow: 'hidden',
      }}
    >
      <iframe
        ref={iframeRef}
        src={targetUrl}
        title="Upward Goals Mockup"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          display: 'block',
        }}
      />
    </div>
  )
}
