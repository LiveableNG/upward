'use client'

import { useRouter } from 'next/navigation'
import { ChevronRight, Home, Plus, ArrowRight, Activity, Clock } from 'lucide-react'
import { PayPageShell } from '@/features/dashboard/components/payment/PayPageShell'
import { formatCurrency, formatDate } from '@/lib/utils'
import { type UserProfile } from '@/features/auth/types'
import { setupAddPropertyEditPath, setupEditPropertyPath, SETUP_PATHS } from '../setupPaths'
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
                  (p: any) => p.userPropertyId === prop.id || p.userPropertyUuid === prop.uuid,
                )
              : null

            const pAny = prop as any
            const isPartial =
              pAny.amountRemaining &&
              pAny.amountRemaining > 0 &&
              pAny.amountPaid &&
              pAny.amountPaid > 0
            const totalRent =
              prop.rentAmount ||
              (pAny.amountPaid ? pAny.amountPaid + (pAny.amountRemaining || 0) : 0)
            const amountPaid = pAny.amountPaid || activeRequest?.amountPaid || 0
            const pctPaid =
              totalRent > 0 ? Math.min(100, Math.round((amountPaid / totalRent) * 100)) : 0

            const rawRemaining =
              activeRequest?.remainingBalance ??
              pAny.amountRemaining ??
              (totalRent > 0 ? Math.max(0, totalRent - amountPaid) : 0)
            const remainingAmount = Math.max(0, rawRemaining)
            const showRenewalCard =
              remainingAmount > 0 &&
              pctPaid < 100 &&
              activeRequest?.status !== 'PAID' &&
              (isPartial || (activeRequest && activeRequest.status !== 'PAID'))

            return (
              <div
                key={prop.uuid || address}
                role="button"
                tabIndex={0}
                className="pay-flow__card pay-flow__property-card"
                style={{ alignItems: 'flex-start' }}
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
                <div
                  className="pay-flow__card-icon pay-flow__card-icon--home"
                  style={{ marginTop: 2 }}
                >
                  <Home size={20} />
                </div>
                <div className="pay-flow__card-body">
                  <div className="pay-flow__card-title">
                    {prop.location?.area || prop.address || 'Property'}
                    {prop.isVerified ? (
                      <span className="pay-flow__badge">
                        <span className="pay-flow__badge-dot" />
                        {prop.isPlatformLinked || prop.platformId || prop.company?.platformId
                          ? 'Verified by External Platform'
                          : 'Verified by Upward PM'}
                      </span>
                    ) : prop.isPlatformLinked || prop.platformId || prop.company?.platformId ? (
                      <span className="pay-flow__badge pay-flow__badge--pending">
                        <span className="pay-flow__badge-dot pay-flow__badge-dot--pending" />
                        Pending External Verification
                      </span>
                    ) : pAny.pmId ||
                      pAny.pm ||
                      pAny.managerId ||
                      pAny.manager ||
                      prop.managerName ||
                      prop.companyName ? (
                      <span className="pay-flow__badge pay-flow__badge--pending">
                        <span className="pay-flow__badge-dot pay-flow__badge-dot--pending" />
                        Pending PM Verification
                      </span>
                    ) : null}
                  </div>
                  <div className="pay-flow__card-meta">{address}</div>
                  <div className="pay-flow__card-meta pay-flow__card-meta--muted">
                    {manager}
                    {prop.rentAmount ? ` · ${formatCurrency(prop.rentAmount, 'NGN')}/yr` : ''}
                  </div>
                  {prop.rentStartDate && prop.rentEndDate ? (
                    <div className="pay-flow__card-meta pay-flow__card-meta--muted">
                      Tenancy Period: {formatDate(prop.rentStartDate)} -{' '}
                      {formatDate(prop.rentEndDate)}
                    </div>
                  ) : prop.rentEndDate ? (
                    <div className="pay-flow__card-meta pay-flow__card-meta--muted">
                      Next due {formatDate(prop.rentEndDate)}
                    </div>
                  ) : null}

                  {/* Sleek, Lightweight Integrated Payment / Renewal Inset */}
                  {showRenewalCard && (
                    <div
                      style={{
                        marginTop: 10,
                        padding: '10px 12px',
                        borderRadius: 12,
                        background: '#fbf9f6',
                        border: '1px solid #eee7dc',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 7,
                      }}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        router.push('/dashboard/pay-rent')
                      }}
                    >
                      {/* Top Row: Contextual Status Badge + Action Pill */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 8,
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            fontSize: 11,
                            fontWeight: 600,
                            color: 'var(--skin-primary, #c2501f)',
                            minWidth: 0,
                          }}
                        >
                          {amountPaid > 0 ? (
                            <Activity size={12} style={{ flexShrink: 0 }} />
                          ) : (
                            <Clock size={12} style={{ flexShrink: 0 }} />
                          )}
                          <span style={{ whiteSpace: 'nowrap' }}>
                            {amountPaid > 0 ? `Partial payment · ${pctPaid}%` : 'Rent payment due'}
                          </span>
                        </div>

                        <button
                          type="button"
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            padding: '3px 9px',
                            borderRadius: 99,
                            border: 'none',
                            background: 'var(--skin-primary, #c2501f)',
                            color: '#fff',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3,
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                            boxShadow: '0 1px 2px rgba(194, 80, 31, 0.15)',
                          }}
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            router.push('/dashboard/pay-rent')
                          }}
                        >
                          {amountPaid > 0 ? 'Pay balance' : 'Pay rent'}
                          <ArrowRight size={11} />
                        </button>
                      </div>

                      {/* Progress Bar Track */}
                      <div
                        style={{
                          width: '100%',
                          height: 4,
                          borderRadius: 99,
                          background: '#ede5da',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${pctPaid}%`,
                            height: '100%',
                            background: 'var(--skin-primary, #c2501f)',
                            borderRadius: 99,
                            transition: 'width 300ms ease',
                          }}
                        />
                      </div>

                      {/* Bottom Row: Clear amounts that NEVER truncate */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 8,
                          fontSize: 11,
                          color: '#7a7268',
                        }}
                      >
                        <span style={{ whiteSpace: 'nowrap' }}>
                          Paid{' '}
                          <strong style={{ color: '#1a1714', fontWeight: 600 }}>
                            {formatCurrency(amountPaid)}
                          </strong>
                        </span>
                        <span style={{ whiteSpace: 'nowrap' }}>
                          <strong style={{ color: '#1a1714', fontWeight: 600 }}>
                            {formatCurrency(remainingAmount)}
                          </strong>{' '}
                          {amountPaid > 0 ? 'left' : 'due'}
                        </span>
                      </div>
                    </div>
                  )}
                  <div style={{ marginTop: 8 }}>
                    {prop.pmManualAccount ||
                    (prop.isVerified &&
                      (prop.isManaged || prop.isPlatformLinked || prop.companyName) &&
                      prop.manualAccount) ? (
                      <div
                        className="pay-flow__card-meta pay-flow__card-meta--muted"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          color: 'var(--forest)',
                        }}
                      >
                        <div
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: 'var(--forest)',
                            flexShrink: 0,
                          }}
                        />
                        <span>
                          Bank: {(prop.pmManualAccount || prop.manualAccount)?.bankName || 'Bank'} ·{' '}
                          {(prop.pmManualAccount || prop.manualAccount)?.accountNumber}
                        </span>
                      </div>
                    ) : prop.isPlatformLinked ||
                      pAny.pmId ||
                      pAny.pm ||
                      pAny.managerId ||
                      pAny.manager ||
                      prop.managerName ||
                      prop.companyName ||
                      prop.isManaged ? (
                      <div>
                        {prop.manualAccount ? (
                          <div
                            className="pay-flow__card-meta pay-flow__card-meta--muted"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              color: '#92400e',
                            }}
                          >
                            <div
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                background: '#f59e0b',
                                flexShrink: 0,
                              }}
                            />
                            <span>
                              Bank: {prop.manualAccount.bankName || 'Bank'} ·{' '}
                              {prop.manualAccount.accountNumber}{' '}
                              {prop.isVerified ? '' : '(Pending PM Confirmation)'}
                            </span>
                          </div>
                        ) : prop.isVerified ? (
                          <div
                            className="pay-flow__card-meta pay-flow__card-meta--muted"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              color: 'var(--error)',
                            }}
                          >
                            <div
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                background: 'var(--error)',
                                flexShrink: 0,
                              }}
                            />
                            PM hasn&apos;t configured bank details for this property
                          </div>
                        ) : (
                          <div
                            className="pay-flow__card-meta pay-flow__card-meta--muted"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              color: '#7a7268',
                            }}
                          >
                            <div
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                background: '#d97706',
                                flexShrink: 0,
                              }}
                            />
                            Linked to Property Manager (Pending Confirmation)
                          </div>
                        )}
                      </div>
                    ) : prop.manualAccount ? (
                      <div className="pay-flow__card-meta pay-flow__card-meta--muted">
                        Bank: {prop.manualAccount.bankName} - {prop.manualAccount.accountNumber}
                      </div>
                    ) : null}
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
    </PayPageShell>
  )
}
