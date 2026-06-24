'use client'

import { useRouter } from 'next/navigation'
import { ChevronRight, Home, Plus } from 'lucide-react'
import { PayPageShell } from '@/features/dashboard/components/payment/PayPageShell'
import { formatCurrency, formatDate } from '@/lib/utils'
import { type UserProfile } from '@/features/auth/types'
import { setupAddPropertyEditPath, setupEditPropertyPath, SETUP_PATHS } from '../setupPaths'

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
  return prop.companyName || prop.managerName || 'Manager not set'
}

interface RentalPropertiesListViewProps {
  properties: Property[]
}

export function RentalPropertiesListView({ properties }: RentalPropertiesListViewProps) {
  const router = useRouter()

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
              <button
                key={prop.uuid || address}
                type="button"
                className="pay-flow__card pay-flow__property-card"
                onClick={() => {
                  if (prop.uuid) {
                    router.push(setupEditPropertyPath(prop.uuid))
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
                </div>
                <ChevronRight size={18} className="pay-flow__card-trailing" />
              </button>
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
