'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, User, Settings, CreditCard, Palette, LogOut, 
  Mail, Phone, Calendar, Briefcase, Heart, MapPin, 
  ShieldAlert, AlertCircle, ChevronRight, Check, X, Edit2, 
  Trophy, Star, Crown, Shield, Users, Vote
} from 'lucide-react'
import { logout, getTenant, setTenant as setLocalTenant } from '@/lib/auth'
import { api, type TenantProfile } from '@/lib/api'

export default function MePage() {
  const router = useRouter()
  const [view, setView] = useState<'menu' | 'personal'>('menu')
  const [isEditing, setIsEditing] = useState(false)
  const [tenant, setTenant] = useState<TenantProfile | null>(null)
  const [formData, setFormData] = useState<Partial<TenantProfile>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const t = getTenant()
    setTenant(t)
    if (t) setFormData(t)
  }, [])

  function handleLogout() {
    logout()
  }

  async function handleSave() {
    if (!tenant) return
    setSaving(true)
    try {
      const res = await api.updateProfile(formData)
      if (res.success) {
        setTenant(res.tenant)
        setLocalTenant(res.tenant)
        setIsEditing(false)
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const sections = [
    { id: 'personal', title: 'Personal Details', icon: User, label: 'Profile' },
    { id: 'payment', title: 'Payment Methods', icon: CreditCard, label: 'Cards' },
    { id: 'personalization', title: 'Personalization', icon: Palette, label: 'Themes' },
    { id: 'settings', title: 'Settings', icon: Settings, label: 'Preferences' },
  ]

  if (!tenant) return null

  const hasMissingFields = !tenant.dateOfBirth || !tenant.gender || !tenant.occupation || !tenant.address || !tenant.emergencyContactName

  if (view === 'personal') {
    return (
      <div className="dashboard dashboard--nav-offset">
        <header className="dashboard__header dashboard__header--mobile">
          <div className="dashboard__header-left">
            <button className="dashboard__back" onClick={() => { setView('menu'); setIsEditing(false); }}>
              <ArrowLeft size={20} />
            </button>
            <h2 className="dashboard__title">{isEditing ? 'Edit Details' : 'Personal Details'}</h2>
          </div>
          <div className="dashboard__header-right">
            {!isEditing ? (
               <button className="dashboard__icon-btn" onClick={() => setIsEditing(true)}>
                 <Edit2 size={18} />
               </button>
            ) : (
               <button className="dashboard__icon-btn" onClick={handleSave} disabled={saving}>
                 <Check size={20} color="var(--success)" />
               </button>
            )}
          </div>
        </header>

        <header className="dashboard__header--desktop">
          <div className="dashboard__desktop-header-left">
            <button className="btn btn--ghost" onClick={() => { setView('menu'); setIsEditing(false); }} style={{ marginBottom: 16, paddingLeft: 0 }}>
              <ArrowLeft size={18} style={{ marginRight: 8 }} /> Back to Settings
            </button>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', maxWidth: 800 }}>
              <div>
                <h1 className="dashboard__desktop-title">{isEditing ? 'Edit Profile' : 'Personal Details'}</h1>
                <p className="dashboard__desktop-subtitle">Your basic information used across Upward Pay</p>
              </div>
              {!isEditing ? (
                <button className="btn btn--secondary" onClick={() => setIsEditing(true)}>
                  <Edit2 size={16} /> Edit Profile
                </button>
              ) : (
                <div style={{ display: 'flex', gap: 12 }}>
                   <button className="btn btn--secondary" onClick={() => setIsEditing(false)} disabled={saving}>
                     Cancel
                   </button>
                   <button className="btn btn--primary" onClick={handleSave} disabled={saving}>
                     {saving ? 'Saving...' : 'Save Changes'}
                   </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="dashboard__main-grid">
          <div className="dashboard__col--left">
            <div className="dashboard__card" style={{ padding: 0 }}>
              <div className="profile-details-list">
                <DetailOrEdit 
                  isEditing={isEditing}
                  icon={User} 
                  label="Full Name" 
                  value={formData.fullName || ''}
                  onChange={v => setFormData({...formData, fullName: v})}
                />
                <DetailOrEdit 
                  isEditing={false} // Email restricted
                  icon={Mail} 
                  label="Email Address" 
                  value={tenant.email} 
                />
                <DetailOrEdit 
                  isEditing={isEditing}
                  icon={Phone} 
                  label="Phone Number" 
                  value={formData.phone || ''}
                  onChange={v => setFormData({...formData, phone: v})}
                />
                <DetailOrEdit 
                  isEditing={isEditing}
                  icon={Calendar} 
                  label="Date of Birth" 
                  value={formData.dateOfBirth || ''}
                  placeholder="YYYY-MM-DD"
                  onChange={v => setFormData({...formData, dateOfBirth: v})}
                />
                <DetailOrEdit 
                  isEditing={isEditing}
                  icon={User} 
                  label="Gender" 
                  value={formData.gender || ''}
                  onChange={v => setFormData({...formData, gender: v})}
                />
                <DetailOrEdit 
                  isEditing={isEditing}
                  icon={Briefcase} 
                  label="Occupation" 
                  value={formData.occupation || ''}
                  onChange={v => setFormData({...formData, occupation: v})}
                />
                 <DetailOrEdit 
                  isEditing={isEditing}
                  icon={Heart} 
                  label="Marital Status" 
                  value={formData.maritalStatus || ''}
                  onChange={v => setFormData({...formData, maritalStatus: v})}
                />
                <DetailOrEdit 
                  isEditing={isEditing}
                  icon={MapPin} 
                  label="Residential Address" 
                  value={formData.address || ''}
                  onChange={v => setFormData({...formData, address: v})}
                />
                
                <div style={{ padding: '24px 20px 8px 20px', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                   Emergency Contact
                </div>
                
                <DetailOrEdit 
                  isEditing={isEditing}
                  icon={ShieldAlert} 
                  label="Contact Name" 
                  value={formData.emergencyContactName || ''}
                  onChange={v => setFormData({...formData, emergencyContactName: v})}
                />
                <DetailOrEdit 
                  isEditing={isEditing}
                  icon={Phone} 
                  label="Contact Phone" 
                  value={formData.emergencyContactPhone || ''}
                  onChange={v => setFormData({...formData, emergencyContactPhone: v})}
                />
              </div>
              
              {!isEditing && (
                <div style={{ padding: 20, borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 10 }}>
                   <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                     Need to change your primary email or delete your account? <span style={{ color: 'var(--clay)', cursor: 'pointer' }} onClick={() => router.push('/dashboard/help')}>Contact Support</span>.
                   </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard dashboard--nav-offset">
      <header className="dashboard__header dashboard__header--mobile">
        <div className="dashboard__header-left">
           <button className="dashboard__back" onClick={() => router.push('/dashboard')}>
             <ArrowLeft size={20} />
           </button>
           <h2 className="dashboard__title">Me</h2>
        </div>
      </header>

      <header className="dashboard__header--desktop">
        <div className="dashboard__desktop-header-left">
          <h1 className="dashboard__desktop-title">Account Settings</h1>
          <p className="dashboard__desktop-subtitle">Manage your personal information and preferences</p>
        </div>
      </header>

      <div className="dashboard__main-grid">
        <div className="dashboard__col--left">

          <div className="dashboard__card profile-hero" style={{ textAlign: 'center', padding: '30px 20px', position: 'relative', overflow: 'hidden' }}>
             <div className="dashboard__avatar profile-hero__avatar" style={{ width: 80, height: 80, fontSize: 32, margin: '0 auto 16px auto', background: 'linear-gradient(135deg, #d97757 0%, #b25e41 100%)', position: 'relative', zIndex: 1 }}>
               {tenant.fullName.charAt(0)}
             </div>
             
             <div className="membership-badge">
                <MembershipIcon level={tenant.membershipLevel} />
                <span>{tenant.membershipLevel || 'Window Shopper'}</span>
             </div>

             <h2 style={{ marginBottom: 4, fontSize: 20 }}>{tenant.fullName}</h2>
             <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>{tenant.email}</p>
             
             {tenant.totalInvites > 0 && (
               <div style={{ marginTop: 12, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'rgba(255,255,255,0.05)', borderRadius: 20, color: 'rgba(255,255,255,0.6)' }}>
                  <Users size={12} /> {tenant.totalInvites} People Invited
               </div>
             )}
          </div>
      
          <div className="dashboard__transaction-items" style={{ marginTop: 20 }}>
            {sections.map((s, idx) => {
              const Icon = s.icon
              const isPersonal = s.id === 'personal'
              const showWarning = isPersonal && hasMissingFields

              return (
                <div 
                  key={idx} 
                  className="dashboard__transaction-item" 
                  onClick={() => isPersonal && setView('personal')}
                  style={{ cursor: isPersonal ? 'pointer' : 'default' }}
                >
                  <div className="dashboard__transaction-left">
                    <div className="dashboard__transaction-info" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(217, 119, 87, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                         <Icon size={18} color="#d97757" />
                      </div>
                      <span className="dashboard__transaction-company" style={{ fontSize: 15 }}>{s.title}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {showWarning && (
                      <div className="detail-item__warning" style={{ width: 18, height: 18 }}>
                        <AlertCircle size={12} color="#eab308" />
                      </div>
                    )}
                    <ChevronRight size={16} color="rgba(255,255,255,0.3)" />
                  </div>
                </div>
              )
            })}
            
            <div className="dashboard__transaction-item" onClick={handleLogout} style={{ marginTop: 24, border: '1px solid rgba(239, 68, 68, 0.2)', backgroundColor: 'rgba(239, 68, 68, 0.05)' }}>
               <div className="dashboard__transaction-left">
                    <div className="dashboard__transaction-info" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <LogOut size={18} color="#ef4444" />
                      </div>
                      <span className="dashboard__transaction-company" style={{ color: '#ef4444', fontSize: 15 }}>Logout</span>
                    </div>
                  </div>
            </div>
          </div>
        </div>
      
        <div className="dashboard__col--right dashboard__col--desktop-only">
           <div className="dashboard__card">
              <h3 style={{ marginBottom: 12, fontSize: 16 }}>Need Help?</h3>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5, marginBottom: 16 }}>
                Having issues with your account or need to update restricted information?
              </p>
              <button className="btn btn--secondary btn--full" onClick={() => router.push('/dashboard/help')}>
                Contact Support
              </button>
           </div>
        </div>
      </div>
    </div>
  )
}

function MembershipIcon({ level }: { level?: string }) {
  if (!level) return <Users size={14} color="rgba(255,255,255,0.4)" />
  if (level.includes('Stakeholder')) return <Shield size={14} color="#a855f7" />
  if (level === 'Voter') return <Vote size={14} color="#3b82f6" />
  if (level.includes('Club Member')) return <Crown size={14} color="#fbbf24" />
  if (level === 'Contributor') return <Star size={14} color="#22c55e" />
  if (level === 'General Member') return <Trophy size={14} color="#d97757" />
  return <Users size={14} color="rgba(255,255,255,0.4)" />
}

function DetailOrEdit({ 
  isEditing, icon: Icon, label, value, placeholder, onChange 
}: { 
  isEditing: boolean, 
  icon: any, 
  label: string, 
  value: string, 
  placeholder?: string,
  onChange?: (v: string) => void 
}) {
  const isMissing = !value || value === ''
  
  return (
    <div className={`detail-item ${isEditing ? 'detail-item--editing' : ''}`}>
      <div className="detail-item__left">
        <Icon size={18} color={isEditing ? 'var(--clay)' : 'rgba(255,255,255,0.4)'} />
        <div className="detail-item__info">
          <span className="detail-item__label">{label}</span>
          {isEditing ? (
             <input 
               type="text"
               className="detail-item__input"
               value={value}
               placeholder={placeholder || `Enter ${label}`}
               onChange={e => onChange?.(e.target.value)}
             />
          ) : (
            <span className={`detail-item__value ${isMissing ? 'detail-item__value--missing' : ''}`}>
               {isMissing ? 'Not provided' : value}
            </span>
          )}
        </div>
      </div>
      {!isEditing && isMissing && (
        <div className="detail-item__warning" title="Field not filled">
          <AlertCircle size={10} color="#eab308" />
        </div>
      )}
    </div>
  )
}

function DetailItem({ icon: Icon, label, value }: { icon: any, label: string, value?: string | null }) {
  const isMissing = !value || value === ''
  
  return (
    <div className="detail-item">
      <div className="detail-item__left">
        <Icon size={18} color="rgba(255,255,255,0.4)" />
        <div className="detail-item__info">
          <span className="detail-item__label">{label}</span>
          <span className={`detail-item__value ${isMissing ? 'detail-item__value--missing' : ''}`}>
            {isMissing ? 'Not provided' : value}
          </span>
        </div>
      </div>
      {isMissing && (
        <div className="detail-item__warning" title="Field not filled">
          <AlertCircle size={16} color="#eab308" />
        </div>
      )}
    </div>
  )
}
