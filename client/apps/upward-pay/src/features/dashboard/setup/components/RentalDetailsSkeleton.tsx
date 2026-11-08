'use client'

import React from 'react'
import { PayPageShell } from '@/features/dashboard/components/payment/PayPageShell'

export function RentalDetailsSkeleton({ onBack }: { onBack?: () => void }) {
  const handleBack = onBack || (() => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back()
    }
  })

  return (
    <PayPageShell
      title="Rental details"
      subtitle="View and manage your linked properties."
      showBack
      onBack={handleBack}
    >
      <section className="pay-flow__section animate-pulse">
        <div
          style={{
            width: 120,
            height: 12,
            background: '#EAE3D9',
            borderRadius: 4,
            marginBottom: 14,
          }}
        />

        {/* Primary property card skeleton */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1.5px solid #ECE4D9',
            borderRadius: 16,
            padding: 18,
            marginBottom: 14,
            boxShadow: '0 2px 8px rgba(60, 40, 20, 0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: '#F0EAE1',
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1 }}>
              <div
                style={{
                  width: '65%',
                  height: 16,
                  background: '#EAE3D9',
                  borderRadius: 6,
                  marginBottom: 8,
                }}
              />
              <div
                style={{
                  width: '40%',
                  height: 12,
                  background: '#F0EAE1',
                  borderRadius: 4,
                }}
              />
            </div>
          </div>

          <div
            style={{
              width: '100%',
              height: 1,
              background: '#F3EFEA',
              margin: '14px 0',
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div
              style={{
                width: '35%',
                height: 14,
                background: '#F0EAE1',
                borderRadius: 4,
              }}
            />
            <div
              style={{
                width: '28%',
                height: 16,
                background: '#EAE3D9',
                borderRadius: 4,
              }}
            />
          </div>
        </div>

        {/* Second card skeleton */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1.5px solid #ECE4D9',
            borderRadius: 16,
            padding: 18,
            boxShadow: '0 2px 8px rgba(60, 40, 20, 0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: '#F0EAE1',
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1 }}>
              <div
                style={{
                  width: '50%',
                  height: 16,
                  background: '#EAE3D9',
                  borderRadius: 6,
                  marginBottom: 8,
                }}
              />
              <div
                style={{
                  width: '30%',
                  height: 12,
                  background: '#F0EAE1',
                  borderRadius: 4,
                }}
              />
            </div>
          </div>
        </div>
      </section>
    </PayPageShell>
  )
}
