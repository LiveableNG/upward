'use client'

import { useRouter } from 'next/navigation'
import { ChevronRight, Home, Plus, ArrowRight, Activity, Clock } from 'lucide-react'
import { PayPageShell } from '@/features/dashboard/components/payment/PayPageShell'
import { formatCurrency, formatDate } from '@/lib/utils'
import { type UserProfile } from '@/features/auth/types'
import { setupAddPropertyEditPath, setupEditPropertyPath, SETUP_PATHS } from '../setupPaths'
import { ManualAccountModal } from '@/features/dashboard/components/payment/ManualAccountModal'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

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

  const { data: pendingPayments } = useQuery({
    queryKey: ['pendingPayments'],
    queryFn: () => api.getPendingPayments().catch(() => []),
  })

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

            const activeRequest = Array.isArray(pendingPayments)
              ? pendingPayments.find(
                  (p: any) =>
                    p.userPropertyId === prop.id || p.userPropertyUuid === prop.uuid,
                )
              : null

            const pAny = prop as any
            const isPartial = pAny.amountRemaining && pAny.amountRemaining > 0 && pAny.amountPaid && pAny.amountPaid > 0
            const totalRent = prop.rentAmount || (pAny.amountPaid ? pAny.amountPaid + (pAny.amountRemaining || 0) : 0)
            const amountPaid = pAny.amountPaid || activeRequest?.amountPaid || 0
            const pctPaid = totalRent > 0 ? Math.min(100, Math.round((amountPaid / totalRent) * 100)) : 0

            const rawRemaining = activeRequest?.remainingBalance ?? pAny.amountRemaining ?? (totalRent > 0 ? Math.max(0, totalRent - amountPaid) : 0)
            const remainingAmount = Math.max(0, rawRemaining)
            const showRenewalCard = remainingAmount > 0 && pctPaid < 100 && activeRequest?.status !== 'PAID' && (isPartial || (activeRequest && activeRequest.status !== 'PAID'))

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
                        Verified Term
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
                  {prop.rentStartDate && prop.rentEndDate ? (
                    <div className="pay-flow__card-meta pay-flow__card-meta--muted">
                      Verified Period: {formatDate(prop.rentStartDate)} - {formatDate(prop.rentEndDate)}
                    </div>
                  ) : prop.rentEndDate ? (
                    <div className="pay-flow__card-meta pay-flow__card-meta--muted">
                      Next due {formatDate(prop.rentEndDate)}
                    </div>
                  ) : null}

                  {/* Partial Payment / Renewal Progress Banner */}
                  {showRenewalCard && (
                    <div
                      style={{
                        marginTop: 14,
                        padding: '12px',
                        borderRadius: 10,
                        background: 'var(--bg)',
                        border: '1px solid var(--border-solid)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: 'var(--clay)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          <Activity size={13} />
                          Renewal in Progress ({pctPaid}% Paid)
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>
                          {formatCurrency(amountPaid)} of {formatCurrency(totalRent)}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div style={{ width: '100%', height: 6, borderRadius: 99, background: 'var(--border-solid)', overflow: 'hidden' }}>
                        <div style={{ width: `${pctPaid}%`, height: '100%', background: 'var(--clay)', borderRadius: 99, transition: 'width 300ms ease' }} />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          Remaining: <strong style={{ color: 'var(--text)' }}>{formatCurrency(remainingAmount)}</strong>
                        </span>
                        <button
                          type="button"
                          className="btn btn--primary btn--sm"
                          style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4 }}
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            router.push('/dashboard/pay-rent')
                          }}
                        >
                          Complete Payment <ArrowRight size={12} />
                        </button>
                      </div>
                    </div>
                  )}
                  <div style={{ marginTop: 12 }}>
                    {prop.pmManualAccount || ((prop.isManaged || prop.isPlatformLinked || prop.companyName) && prop.manualAccount) ? (
                      <div className="pay-flow__card-meta pay-flow__card-meta--muted" style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--forest)' }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--forest)' }} />
                        Bank configured by Property Manager
                      </div>
                    ) : prop.isVerified && !prop.manualAccount ? (
                      <div className="pay-flow__card-meta pay-flow__card-meta--muted" style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--error)' }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--error)' }} />
                        PM hasn't configured your bank account details for this property
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="btn btn--secondary btn--sm"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setManualAccountModalProperty({ 
                              id: prop.id, 
                              name: prop.location?.area || prop.address || 'Property',
                              initialData: prop.manualAccount
                            })
                          }}
                          onPointerDown={(e) => e.stopPropagation()}
                          style={{ fontSize: 12, padding: '6px 12px', borderRadius: 8, position: 'relative', zIndex: 10 }}
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
