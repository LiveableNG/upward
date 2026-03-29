'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ShieldCheck, CheckCircle, Award, Briefcase, MapPin, CheckSquare, CalendarDays } from 'lucide-react'
import PoweredByUpward from '@/components/payment/PoweredByUpward'

export default function ShareProfilePage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font)' }}>
      <header style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 500 }}>
          <ArrowLeft size={20} /> Back
        </button>
      </header>

      <main style={{ maxWidth: '480px', margin: '0 auto', padding: '32px 20px 100px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--clay) 0%, #0a0a0f 100%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 600, margin: '0 auto 16px', boxShadow: '0 8px 20px rgba(217,119,87,0.2)' }}>
            JD
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>John Doe</h1>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', background: 'rgba(34,197,94,0.1)', color: '#16a34a', borderRadius: '100px', fontSize: '14px', fontWeight: 600 }}>
            <ShieldCheck size={18} /> Verified Excellent Tenant
          </div>
        </div>

        <section style={{ background: 'var(--surface)', padding: '24px', borderRadius: 'var(--radius-lg)', marginBottom: '24px', border: '1px solid var(--border-solid)' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '20px' }}>Tenancy Reliability</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--clay)', flexShrink: 0 }}>
                <CheckCircle size={20} />
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600 }}>100% On-time Payment</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Over the last 12 months</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)', flexShrink: 0 }}>
                <CalendarDays size={20} />
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600 }}>Zero Eviction History</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Verified by Upward AI</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b5cf6', flexShrink: 0 }}>
                <Briefcase size={20} />
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600 }}>Verified Source of Income</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Salary earner track record</div>
              </div>
            </div>
          </div>
        </section>

        <section style={{ background: 'var(--surface)', padding: '24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-solid)' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '20px' }}>Previous Leases</h2>
          
          <div style={{ borderLeft: '2px solid var(--border)', marginLeft: '10px', paddingLeft: '24px', position: 'relative' }}>
            <div style={{ position: 'absolute', width: '12px', height: '12px', background: 'var(--clay)', borderRadius: '50%', left: '-7px', top: '4px', border: '2px solid var(--surface)' }} />
            <h3 style={{ fontSize: '14px', fontWeight: 600 }}>2-Bedroom Apartment, Yaba</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>2025 - Present</p>
            <p style={{ fontSize: '12px', background: 'var(--bg)', padding: '4px 8px', borderRadius: '4px', display: 'inline-block', color: 'var(--success)' }}>Completed via Upward Pay</p>
            
            <div style={{ height: '24px' }} />

            <div style={{ position: 'absolute', width: '12px', height: '12px', background: 'var(--border-solid)', borderRadius: '50%', left: '-7px', top: '100px', border: '2px solid var(--surface)' }} />
            <h3 style={{ fontSize: '14px', fontWeight: 600 }}>1-Bedroom, Surulere</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>2023 - 2025</p>
          </div>
        </section>

      </main>

      <div style={{ background: '#0a0a0f', color: '#fff', padding: '40px 20px', textAlign: 'center', borderTopLeftRadius: '24px', borderTopRightRadius: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '12px' }}>Are you a Landlord or Agent?</h2>
        <p style={{ fontSize: '14px', opacity: 0.8, marginBottom: '24px', maxWidth: '300px', margin: '0 auto 24px', lineHeight: 1.5 }}>
          Join Upward to easily verify tenants, collect rent seamlessly, and manage properties.
        </p>
        <button style={{ padding: '14px 28px', background: '#fff', color: '#0a0a0f', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 600, marginBottom: '32px', cursor: 'pointer' }}>
          Get Started with Upward
        </button>
        <div style={{ opacity: 0.5, transform: 'scale(0.8)' }}>
          <PoweredByUpward />
        </div>
      </div>
    </div>
  )
}
