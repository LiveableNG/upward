'use client'

import React from 'react'

export function PayRentSkeleton() {
  return (
    <div className="pay-flow pay-flow--skeleton dashboard--nav-offset">
      <div className="pay-flow__container">
        <header className="pay-flow__header">
          <div className="pay-flow__header-row">
            <div className="pay-flow__skel-block pay-flow__skel-circle" style={{ width: 40, height: 40 }} />
            <div style={{ flex: 1, paddingTop: 8 }}>
              <div className="pay-flow__skel-block" style={{ width: 120, height: 22, marginBottom: 8 }} />
              <div className="pay-flow__skel-block" style={{ width: '80%', height: 14 }} />
            </div>
          </div>
        </header>

        <div className="pay-flow__skel-block" style={{ width: '100%', height: 14, marginBottom: 20 }} />

        <div className="pay-flow__skel-block" style={{ width: 140, height: 12, marginBottom: 12 }} />

        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="pay-flow__skel-block"
            style={{ width: '100%', height: 72, marginBottom: 10, borderRadius: 13 }}
          />
        ))}
      </div>
    </div>
  )
}
