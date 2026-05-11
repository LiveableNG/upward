'use client'

import React from 'react'
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  icon?: LucideIcon
  trend?: {
    value: number
    label: string
    isUp: boolean
  }
  variant?: 'default' | 'accent'
}

export function StatCard({ label, value, icon: Icon, trend, variant = 'default' }: StatCardProps) {
  return (
    <div className={`upward-stat-card ${variant === 'accent' ? 'upward-stat-card--accent' : ''}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <p className="upward-stat-card__label">{label}</p>
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
