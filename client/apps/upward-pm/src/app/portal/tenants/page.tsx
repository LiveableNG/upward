'use client'

import React, { Suspense, useState } from 'react'
import { Users, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { TenantList } from '@/features/pm/components/tenants/TenantList'
import { AddTenantModal } from '@/features/pm/components/tenants/modals/AddTenantModal'
import { Splash } from '@/components/common/Splash'

export default function LandlordTenantsPage() {
  const router = useRouter()
  const [showAddModal, setShowAddModal] = useState(false)

  return (
    <div className="properties-page animate-fade-only" style={{ padding: '24px 40px' }}>
      <button 
        onClick={() => router.push('/portal')} 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          background: 'none', 
          border: 'none', 
          color: 'var(--text-muted)', 
          cursor: 'pointer', 
          fontWeight: 600, 
          fontSize: '14px', 
          marginBottom: '24px', 
          padding: 0 
        }}
      >
        <ArrowLeft size={18} /> Back to Dashboard
      </button>

      <header className="properties-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 className="dashboard__title">Tenants Directory</h1>
          <p className="dashboard__subtitle">Manage your tenants across all properties and units.</p>
        </div>
        <button className="btn btn--primary" onClick={() => setShowAddModal(true)} style={{ background: 'var(--forest)', color: 'white', borderColor: 'var(--forest)' }}>
          <Users size={18} />
          Add Tenant
        </button>
      </header>

      <Suspense fallback={<Splash />}>
        <TenantList />
      </Suspense>

      <AddTenantModal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)} 
      />
    </div>
  )
}
