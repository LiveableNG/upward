'use client'

import React, { Suspense, useState } from 'react'
import { Users } from 'lucide-react'
import { TenantList } from '@/features/pm/components/tenants/TenantList'
import { AddTenantModal } from '@/features/pm/components/tenants/modals/AddTenantModal'
import { TableSkeleton } from '@/components/skeletons'

export function TenantsPageClient({ initialTenants }: { initialTenants?: any }) {
  const [showAddModal, setShowAddModal] = useState(false)

  return (
    <div className="properties-page animate-fade-only">
      <Suspense fallback={<TableSkeleton />}>
        <TenantList 
          initialTenants={initialTenants} 
          onAddTenant={() => setShowAddModal(true)} 
        />
      </Suspense>

      <AddTenantModal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)} 
      />
    </div>
  )
}
