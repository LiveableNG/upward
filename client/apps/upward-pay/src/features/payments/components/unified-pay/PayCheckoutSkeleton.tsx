'use client'

import React from 'react'

export function PayCheckoutSkeleton() {
  return (
    <div
      className="pay-flow pay-flow--skeleton pay-flow--checkout-skeleton dashboard--nav-offset"
      aria-busy="true"
      aria-label="Loading payment checkout"
    >
      <div className="pay-flow__shell">
        <header className="pay-flow__header">
          <div className="pay-flow__header-row pay-flow__header-row--centered">
            <div className="pay-flow__skel-block pay-flow__skel-circle pay-flow__skel-back" />
            <div className="pay-flow__skel-block pay-flow__skel-title" style={{ width: '130px' }} />
            <span className="pay-flow__back-spacer" aria-hidden />
          </div>
        </header>

        <div className="pay-flow__scroll">
          <div className="pay-flow__inner">
            {/* Recipient card preview */}
            <div className="pay-flow__skel-block pay-flow__skel-recipient">
              <div
                className="pay-flow__skel-block pay-flow__skel-circle"
                style={{ width: '40px', height: '40px', flexShrink: 0, background: '#ded4c7' }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                <div
                  className="pay-flow__skel-block"
                  style={{ width: '140px', height: '14px', background: '#ded4c7' }}
                />
                <div
                  className="pay-flow__skel-block"
                  style={{ width: '180px', height: '10px', background: '#ded4c7' }}
                />
              </div>
            </div>

            {/* Amount Hero card */}
            <div className="pay-flow__skel-block pay-flow__skel-hero">
              <div
                className="pay-flow__skel-block"
                style={{ width: '90px', height: '12px', background: '#ded4c7' }}
              />
              <div
                className="pay-flow__skel-block"
                style={{ width: '180px', height: '32px', background: '#ded4c7' }}
              />
            </div>

            {/* Receipt / allocation section label */}
            <div
              className="pay-flow__skel-block pay-flow__skel-label"
              style={{ width: '110px', height: '12px', marginBottom: '12px' }}
            />

            {/* Breakdown rows */}
            <div className="pay-flow__skel-block pay-flow__skel-row">
              <div
                className="pay-flow__skel-block"
                style={{ width: '100px', height: '12px', background: '#ded4c7' }}
              />
              <div
                className="pay-flow__skel-block"
                style={{ width: '70px', height: '12px', background: '#ded4c7' }}
              />
            </div>

            <div className="pay-flow__skel-block pay-flow__skel-row">
              <div
                className="pay-flow__skel-block"
                style={{ width: '120px', height: '12px', background: '#ded4c7' }}
              />
              <div
                className="pay-flow__skel-block"
                style={{ width: '60px', height: '12px', background: '#ded4c7' }}
              />
            </div>

            <div className="pay-flow__skel-block pay-flow__skel-row" style={{ marginBottom: '28px' }}>
              <div
                className="pay-flow__skel-block"
                style={{ width: '80px', height: '14px', background: '#ded4c7' }}
              />
              <div
                className="pay-flow__skel-block"
                style={{ width: '90px', height: '14px', background: '#ded4c7' }}
              />
            </div>

            {/* CTA button placeholder */}
            <div className="pay-flow__skel-block pay-flow__skel-cta" />
          </div>
        </div>
      </div>
    </div>
  )
}
