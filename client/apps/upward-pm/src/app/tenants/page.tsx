'use client'

import React, { Suspense, useState } from 'react'
import { Users } from 'lucide-react'
import { TenantList } from '@/features/pm/components/tenants/TenantList'
import { AddTenantModal } from '@/features/pm/components/tenants/modals/AddTenantModal'
import { TableSkeleton } from '@/components/skeletons'

export default function TenantsPage() {
  const [showAddModal, setShowAddModal] = useState(false)

  return (
    <div className="properties-page animate-fade-only">
      <header className="properties-header">
        <div>
          <h1 className="dashboard__title">Tenants Directory</h1>
          <p className="dashboard__subtitle">Manage your tenants across all properties and units.</p>
        </div>
        <button className="btn btn--primary" onClick={() => setShowAddModal(true)}>
          <Users size={18} />
          Add Tenant
        </button>
      </header>

    <Suspense fallback={<TableSkeleton />}>
        <TenantList />
      </Suspense>

      <AddTenantModal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)} 
      />
    </div>
  )
}
