import React from 'react'
import { Home, ChevronRight, AlertCircle, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function StepPropertySelect({
  properties,
  onSelect,
}: {
  properties: any[]
  onSelect: (prop: any) => void
}) {
  const router = useRouter()

  if (properties.length === 0) {
    return (
      <div style={{ padding: '40px 24px', textAlign: 'center' }}>
        <div style={{ 
          width: 64, height: 64, borderRadius: '50%', background: 'var(--clay-faint)', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
          color: 'var(--clay)'
        }}>
          <Home size={32} />
        </div>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>No Properties Linked</h3>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 24 }}>
          To build your credit score, we need to know which property you're paying for. Please add your property info first.
        </p>
        <button 
          className="btn btn--primary btn--full btn--pill"
          onClick={() => router.push('/dashboard/me')}
        >
          Add Property Info
        </button>
      </div>
    )
  }

  return (
    <div style={{ padding: '0 20px 32px' }}>
      <div style={{ padding: '12px 0 20px' }}>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          Select the property you are making a payment for to ensure your credit score is updated correctly.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {properties.map((prop) => {
          const loc = prop.location
          const fullAddr = [prop.address, loc?.area, loc?.state, loc?.country].filter(Boolean).join(', ')
          
          return (
            <button
              key={prop.uuid}
              onClick={() => onSelect(prop)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '20px',
                background: 'var(--bg)',
                border: '1px solid var(--border-solid)',
                borderRadius: '24px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--clay)'
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.05)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-solid)'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <div style={{
                minWidth: 48, height: 48, borderRadius: 14, background: 'var(--surface)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--clay)'
              }}>
                <Home size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>
                  {prop.company?.name || 
                   prop.companyName || 
                   (prop.manager?.firstName ? `${prop.manager.firstName} ${prop.manager.lastName || ''}` : null) ||
                   prop.managerName || 
                   'Private Landlord'}
                  {prop.subaccount && (
                    <span style={{ 
                      marginLeft: 8, padding: '2px 8px', background: 'var(--clay-faint)', 
                      color: 'var(--clay)', borderRadius: 12, fontSize: 10, fontWeight: 800,
                      textTransform: 'uppercase', letterSpacing: '0.05em', verticalAlign: 'middle',
                      display: 'inline-flex', alignItems: 'center', gap: 4
                    }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--clay)' }} />
                      {prop.isManaged ? 'Verified' : 'Verified Recipient'}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '240px' }}>
                  {fullAddr || 'Address not set'}
                </div>
              </div>
              <ChevronRight size={18} color="var(--text-muted)" />
            </button>
          )
        })}
      </div>

      <div style={{ 
        marginTop: 32, padding: 16, borderRadius: 20, background: 'var(--surface)', 
        border: '1px solid var(--border-solid)', display: 'flex', gap: 12 
      }}>
        <AlertCircle size={18} color="var(--clay)" style={{ flexShrink: 0 }} />
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          On-time payments will help your credit score.
        </p>
      </div>
    </div>
  )
}
