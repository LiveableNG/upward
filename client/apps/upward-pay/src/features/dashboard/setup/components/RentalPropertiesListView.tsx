'use client'

import { useRouter } from 'next/navigation'
import { ChevronRight, Home, Plus } from 'lucide-react'
import { PayPageShell } from '@/features/dashboard/components/payment/PayPageShell'
import { formatCurrency, formatDate } from '@/lib/utils'
import { type UserProfile } from '@/features/auth/types'
import { setupAddPropertyEditPath, setupEditPropertyPath, SETUP_PATHS } from '../setupPaths'
import { ManualAccountModal } from '@/features/dashboard/components/payment/ManualAccountModal'
import { useState } from 'react'

type Property = NonNullable<UserProfile['properties']>[number]

function formatPropertyAddress(prop: Property): string {
  const parts = [
    prop.location?.address || prop.address,
    prop.location?.area,
    prop.location?.state,
  ].filter(Boolean)
  return parts.join(', ') || 'Address not set'
}

function formatManagerLabel(prop: Property): string {
  const nested = prop as Property & {
    company?: { name?: string }
    manager?: { firstName?: string; lastName?: string }
  }
  const company = prop.companyName || nested.company?.name
  if (company) return company
  if (prop.managerName) return prop.managerName
  if (nested.manager?.firstName) {
    return [nested.manager.firstName, nested.manager.lastName].filter(Boolean).join(' ')
  }
  return 'Manager not set'
}

interface RentalPropertiesListViewProps {
  properties: Property[]
}

export function RentalPropertiesListView({ properties }: RentalPropertiesListViewProps) {
  const router = useRouter()
  const [manualAccountModalProperty, setManualAccountModalProperty] = useState<{ id: number, name: string, initialData?: any } | null>(null)

  return (
    <PayPageShell
      title="Rental details"
      subtitle="View and manage your linked properties."
      showBack
      onBack={() => router.push(SETUP_PATHS.profile)}
    >
      <section className="pay-flow__section">
        <p className="pay-flow__section-label">Your properties</p>
        <div className="pay-flow__property-list">
          {properties.map((prop) => {
            const address = formatPropertyAddress(prop)
            const manager = formatManagerLabel(prop)

            return (
              <div
                key={prop.uuid || address}
                role="button"
                tabIndex={0}
                className="pay-flow__card pay-flow__property-card"
                onClick={() => {
                  if (prop.uuid) {
                    router.push(setupEditPropertyPath(prop.uuid))
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    if (prop.uuid) {
                      router.push(setupEditPropertyPath(prop.uuid))
                    }
                  }
                }}
              >
                <div className="pay-flow__card-icon pay-flow__card-icon--home">
                  <Home size={20} />
                </div>
                <div className="pay-flow__card-body">
                  <div className="pay-flow__card-title">
                    {prop.location?.area || prop.address || 'Property'}
                    {prop.isVerified ? (
                      <span className="pay-flow__badge">
                        <span className="pay-flow__badge-dot" />
                        Verified
                      </span>
                    ) : null}
                  </div>
                  <div className="pay-flow__card-meta">{address}</div>
                  <div className="pay-flow__card-meta pay-flow__card-meta--muted">
                    {manager}
                    {prop.rentAmount
                      ? ` · ${formatCurrency(prop.rentAmount, 'NGN')}/yr`
                      : ''}
                  </div>
                  {prop.rentEndDate ? (
                    <div className="pay-flow__card-meta pay-flow__card-meta--muted">
                      Next due {formatDate(prop.rentEndDate)}
                    </div>
                  ) : null}
                  <div style={{ marginTop: 12 }}>
                    {prop.pmManualAccount ? (
                      <div className="pay-flow__card-meta pay-flow__card-meta--muted" style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--forest)' }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--forest)' }} />
                        Bank configured by Property Manager
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="btn btn--secondary btn--sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setManualAccountModalProperty({ 
                              id: prop.id, 
                              name: prop.location?.area || prop.address || 'Property',
                              initialData: prop.manualAccount
                            })
                          }}
                          style={{ fontSize: 12, padding: '6px 12px', borderRadius: 8 }}
                        >
                          {prop.manualAccount ? 'Edit Manual Transfer' : 'Setup Manual Transfer'}
                        </button>
                        {prop.manualAccount && (
                          <div className="pay-flow__card-meta pay-flow__card-meta--muted" style={{ marginTop: 8 }}>
                            Bank: {prop.manualAccount.bankName} - {prop.manualAccount.accountNumber}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <ChevronRight size={18} className="pay-flow__card-trailing" />
              </div>
            )
          })}

          <button
            type="button"
            className="pay-flow__card pay-flow__card--dashed"
            onClick={() => router.push(setupAddPropertyEditPath())}
          >
            <div className="pay-flow__card-icon pay-flow__card-icon--soft">
              <Plus size={20} />
            </div>
            <div className="pay-flow__card-body">
              <div className="pay-flow__card-title">Add property</div>
              <div className="pay-flow__card-meta pay-flow__card-meta--muted">
                Link another rental to your profile
              </div>
            </div>
            <span className="pay-flow__card-trailing">
              <ChevronRight size={18} />
            </span>
          </button>
        </div>
      </section>

      {manualAccountModalProperty && (
        <ManualAccountModal
          propertyId={manualAccountModalProperty.id}
          propertyName={manualAccountModalProperty.name}
          initialData={manualAccountModalProperty.initialData}
          onClose={() => setManualAccountModalProperty(null)}
        />
      )}
    </PayPageShell>
  )
}
