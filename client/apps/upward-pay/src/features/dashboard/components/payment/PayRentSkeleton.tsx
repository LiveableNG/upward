'use client'

import React from 'react'

export function PayRentSkeleton() {
  return (
    <div className="pay-flow pay-flow--skeleton dashboard--nav-offset">
      <div className="pay-flow__shell">
        <header className="pay-flow__header">
          <div className="pay-flow__header-row pay-flow__header-row--centered">
            <div className="pay-flow__skel-block pay-flow__skel-circle pay-flow__skel-back" />
            <div className="pay-flow__skel-block pay-flow__skel-title" />
            <span className="pay-flow__back-spacer" aria-hidden />
          </div>
        </header>

        <div className="pay-flow__scroll">
          <div className="pay-flow__inner">
            <div className="pay-flow__skel-block pay-flow__skel-intro" />
            <div className="pay-flow__skel-block pay-flow__skel-label" />

            {[1, 2, 3].map((i) => (
              <div key={i} className="pay-flow__skel-block pay-flow__skel-card" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
