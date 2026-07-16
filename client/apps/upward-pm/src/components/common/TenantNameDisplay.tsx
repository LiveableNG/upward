import React from 'react'
import { formatTenantName } from '@/lib/utils'

interface TenantNameDisplayProps {
  tenant?: {
    commercialName?: string
    firstName?: string
    lastName?: string
  } | null
  className?: string
  fallback?: string
}

export const TenantNameDisplay: React.FC<TenantNameDisplayProps> = ({ 
  tenant, 
  className,
  fallback = 'No Tenant'
}) => {
  if (!tenant) {
    return <span className={className}>{fallback}</span>
  }

  const name = formatTenantName(tenant)
  
  if (!name) {
    return (
      <span className={`text-destructive font-medium bg-destructive/10 px-2 py-0.5 rounded text-xs whitespace-nowrap ${className || ''}`}>
        Unnamed Tenant
      </span>
    )
  }

  return <span className={className}>{name}</span>
}
