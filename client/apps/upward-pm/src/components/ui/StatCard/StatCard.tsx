'use client'

import React, { useState } from 'react'
import { LucideIcon, TrendingUp, TrendingDown, Info } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  icon?: LucideIcon
  tooltip?: React.ReactNode | string
  onClick?: () => void
  trend?: {
    value: number
    label: string
    isUp: boolean
  }
  variant?: 'default' | 'accent' | 'warning'
}

export function StatCard({ label, value, icon: Icon, tooltip, onClick, trend, variant = 'default' }: StatCardProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  return (
    <div 
      className={`upward-stat-card upward-stat-card--${variant}`}
      style={onClick ? { cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' } : {}}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(-2px)'
          e.currentTarget.style.boxShadow = 'var(--shadow-md)'
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
        }
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, position: 'relative' }}>
          <p className="upward-stat-card__label">{label}</p>
          {tooltip && (
            <div 
              style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
            >
              <Info size={14} color="var(--text-muted)" style={{ cursor: 'help' }} />
              {showTooltip && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  marginTop: 10,
                  padding: '8px 12px',
                  background: 'var(--dark)',
                  color: 'white',
                  fontSize: 12,
                  lineHeight: 1.4,
                  borderRadius: 6,
                  width: 'max-content',
                  maxWidth: 220,
                  textAlign: 'center',
                  zIndex: 9999,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  pointerEvents: 'none'
                }}>
                  {tooltip}
                  <div style={{
                    position: 'absolute',
                    top: -4,
                    left: '50%',
                    transform: 'translateX(-50%) rotate(45deg)',
                    width: 8,
                    height: 8,
                    background: 'var(--dark)'
                  }} />
                </div>
              )}
            </div>
          )}
        </div>
        {Icon && (
          <div className="upward-stat-card__icon">
            <Icon size={18} />
          </div>
        )}
      </div>
      
      <h3 className="upward-stat-card__value">{value}</h3>
      
      {trend && (
        <div className={`upward-stat-card__trend ${trend.isUp ? 'upward-stat-card__trend--up' : 'upward-stat-card__trend--down'}`}>
          {trend.isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          <span>{trend.value}%</span>
          <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 2 }}>{trend.label}</span>
        </div>
      )}
    </div>
  )
}
