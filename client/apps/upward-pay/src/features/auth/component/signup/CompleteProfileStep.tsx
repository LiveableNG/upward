import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Camera, 
  Briefcase, 
  Users, 
  ArrowRight, 
  SkipForward, 
  Phone, 
  MapPin, 
  Plus, 
  Trash2, 
  Building2, 
  User as UserIcon,
  Calendar,
  Globe,
  Map as MapIcon,
  Check
} from 'lucide-react'
import { UpwardLogo } from '@/components/PoweredByUpward'
import { completeProfile } from '@/features/auth/services/authService'
import { useAuth } from '@/features/auth/AuthContext'
import { setAccessToken } from '@/lib/auth-token'
import { setCookie } from '@/lib/cookie-utils'
import DateInput from '@/components/common/DateInput'

export function CompleteProfileStep() {
  const router = useRouter()
  const { user, login: updateAuthUser } = useAuth()
  
  const [stage, setStage] = useState<'personal' | 'property'>('personal')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // Personal Info
  const [gender, setGender] = useState(user?.gender || '')
  const [profilePic, setProfilePic] = useState(user?.profilePic || '')

  // Property Info
  const [properties, setProperties] = useState<any[]>(user?.properties || [])

  useEffect(() => {
    if (user?.properties && properties.length === 0) {
      setProperties(user.properties)
    }
  }, [user])

  const genders = ['Male', 'Female', 'Other', 'Prefer not to say']

  const addProperty = () => {
    setProperties([
      ...properties,
      {
        address: '',
        subarea: '',
        state: 'Lagos',
        country: 'Nigeria',
        rentDueDate: ''
      }
    ])
  }

  const removeProperty = (index: number) => {
    setProperties(properties.filter((_, i) => i !== index))
  }

  const updateProperty = (index: number, field: string, value: string) => {
    const updated = [...properties]
    updated[index] = { ...updated[index], [field]: value }
    setProperties(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    
    setLoading(true)
    setError('')
    
    try {
      const response = await completeProfile({
        email: user.email,
        fullName: `${user.firstName} ${user.lastName}`.trim(),
        gender,
        profilePic,
        properties: properties.map(p => ({
          uuid: p.uuid,
          address: p.address || p.location?.area,
          subarea: p.subarea || p.location?.subarea,
          state: p.state || p.location?.state,
          country: p.country || p.location?.country,
          rentDueDate: p.rentDueDate || p.rentEndDate
        }))
      })

      if (response.accessToken) {
        setAccessToken(response.accessToken)
        setCookie('pay_access_token', response.accessToken)
      }
      
      updateAuthUser(response.user)
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const handleNextStage = () => {
    if (stage === 'personal') {
      setStage('property')
      if (properties.length === 0) {
        addProperty()
      }
    }
  }

  return (
    <div className="auth-layout">
      {/* Visual Panel */}
      <div className="auth-layout__visual">
        <div className="auth-layout__visual-content">
          <div className="auth-layout__graphic">
            <div className="auth-layout__circle"></div>
            <div className="auth-layout__card-mock"></div>
          </div>
          <h1>{stage === 'personal' ? 'Make it yours.' : 'Where do you call home?'}</h1>
          <p>
            {stage === 'personal' 
              ? 'Complete your profile to build your unique rent identity and unlock detailed credibility insights.' 
              : 'Add your property details to track your residency status and build a verifiable history of your tenancy.'}
          </p>

          <div className="stage-indicators mt-10">
            <div className={`stage-indicator ${stage === 'personal' ? 'is-active' : 'is-done'}`}>
              <div className="stage-num">{stage === 'property' ? <Check size={14} /> : '1'}</div>
              <span>Personal</span>
            </div>
            <div className="stage-line"></div>
            <div className={`stage-indicator ${stage === 'property' ? 'is-active' : ''}`}>
              <div className="stage-num">2</div>
              <span>Properties</span>
            </div>
          </div>
        </div>
      </div>

      <div className="auth-layout__form">
        <div className="auth-shell auth-shell--complete">
          <div className="auth-shell__brand">
            <UpwardLogo size={28} color="var(--clay)" />
          </div>

          <div className="auth-stage">
            {stage === 'personal' ? (
              <div className="fade-in">
                <header className="auth-stage__header">
                  <h1 className="auth-stage__title">Perfect! One last thing…</h1>
                  <p className="auth-stage__subtitle">Tell us a bit more to complete your Upward profile.</p>
                </header>

                <div className="profile-pic-uploader mb-8">
                  <div className="profile-pic-preview">
                    {profilePic ? (
                      <img src={profilePic} alt="Profile" />
                    ) : (
                      <Camera size={24} color="var(--text-muted)" />
                    )}
                  </div>
                  <button type="button" className="btn btn--ghost btn--sm">Change Photo</button>
                </div>

                <div className="auth-form">


                  <div className="auth-form__field mt-4">
                    <label>Gender</label>
                    <div className="input-with-icon">
                      <Users size={17} />
                      <select value={gender} onChange={(e) => setGender(e.target.value)} className="auth-form__select">
                        <option value="">Select Gender</option>
                        {genders.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                  </div>

                  <button className="btn btn--primary btn--full btn--pay mt-8" onClick={handleNextStage}>
                    Next: Property Details <ArrowRight size={17} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="fade-in">
                <header className="auth-stage__header">
                  <button className="auth-shell__back-sm mb-4" onClick={() => setStage('personal')}>
                    <ArrowRight size={14} style={{ transform: 'rotate(180deg)' }} /> Back to Personal
                  </button>
                  <h1 className="auth-stage__title">Property Details</h1>
                  <p className="auth-stage__subtitle">Where are you currently renting? You can add multiple properties.</p>
                </header>

                <form className="auth-form" onSubmit={handleSubmit}>
                  <div className="properties-list">
                    {properties.map((prop, idx) => {
                      const isInvited = !!prop.manager || !!prop.company
                      return (
                        <div key={idx} className="property-card mb-6">
                          <div className="property-card__header">
                            <h3 className="flex items-center gap-2">
                              <Building2 size={16} color="var(--clay)" /> Property #{idx + 1}
                            </h3>
                            {!isInvited && properties.length > 1 && (
                              <button type="button" className="text-error" onClick={() => removeProperty(idx)}>
                                <Trash2 size={16} />
                              </button>
                            )}
                            {isInvited && <span className="invited-badge">Linked by Manager</span>}
                          </div>

                          <div className="property-card__body mt-4">
                            <div className="auth-form__field">
                              <label>Street Address</label>
                              <div className="input-with-icon">
                                <MapPin size={17} />
                                <input
                                  type="text"
                                  value={prop.address || prop.location?.area || ''}
                                  onChange={e => updateProperty(idx, 'address', e.target.value)}
                                  placeholder="e.g. 15, Admiralty Way"
                                  required
                                  disabled={isInvited}
                                />
                              </div>
                            </div>
                            
                            <div className="auth-form__row mt-3">
                              <div className="auth-form__field">
                                <label>Subarea / District</label>
                                <div className="input-with-icon">
                                  <MapIcon size={17} />
                                  <input
                                    type="text"
                                    value={prop.subarea || prop.location?.subarea || ''}
                                    onChange={e => updateProperty(idx, 'subarea', e.target.value)}
                                    placeholder="e.g. Lekki Phase 1"
                                    disabled={isInvited}
                                  />
                                </div>
                              </div>
                              <div className="auth-form__field">
                                <label>State</label>
                                <div className="input-with-icon">
                                  <Globe size={17} />
                                  <input
                                    type="text"
                                    value={prop.state || prop.location?.state || 'Lagos'}
                                    onChange={e => updateProperty(idx, 'state', e.target.value)}
                                    disabled={isInvited}
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="auth-form__field mt-3">
                              <DateInput 
                                id={`rent-due-date-${idx}`}
                                label="Rent Due Date"
                                value={prop.rentDueDate || (prop.rentEndDate ? prop.rentEndDate.split('T')[0] : '')}
                                onChange={(val) => updateProperty(idx, 'rentDueDate', val)}
                                required
                              />
                            </div>

                            {isInvited && (
                              <div className="invited-details mt-4">
                                <div className="invited-detail">
                                  <Building2 size={14} /> <span>{prop.company?.name || 'Private Landlord'}</span>
                                </div>
                                <div className="invited-detail">
                                  <UserIcon size={14} /> <span>{prop.manager?.firstName} {prop.manager?.lastName || '(Manager)'}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <button type="button" className="btn btn--ghost btn--full mb-6 gap-2" onClick={addProperty}>
                    <Plus size={16} /> Add Another Property
                  </button>

                  <button className="btn btn--primary btn--full btn--pay" type="submit" disabled={loading}>
                    {loading ? 'Finalizing...' : 'Complete My Profile'} <ArrowRight size={17} />
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .profile-pic-uploader { display: flex; flex-direction: column; align-items: center; gap: 12px; }
        .profile-pic-preview {
          width: 80px; height: 80px; border-radius: 50%;
          background: var(--surface2); display: flex; align-items: center;
          justify-content: center; overflow: hidden; border: 2px solid var(--border);
        }
        .profile-pic-preview img { width: 100%; height: 100%; object-fit: cover; }
        .auth-form__select { flex: 1; background: none; border: none; padding: 14px 12px; font-size: 15px; color: var(--text); outline: none; cursor: pointer; }
        
        .stage-indicators { display: flex; align-items: center; gap: 16px; }
        .stage-indicator { display: flex; align-items: center; gap: 8px; opacity: 0.6; transition: all 0.3s; }
        .stage-indicator.is-active { opacity: 1; transform: scale(1.05); }
        .stage-indicator.is-done { opacity: 0.8; color: var(--success); }
        .stage-num { 
          width: 24px; height: 24px; border-radius: 50%; background: rgba(255,255,255,0.1);
          display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700;
        }
        .stage-indicator.is-active .stage-num { background: #fff; color: var(--clay); }
        .stage-indicator.is-done .stage-num { background: var(--success); color: #fff; }
        .stage-line { height: 1px; width: 40px; background: rgba(255,255,255,0.2); }

        .property-card { 
          background: var(--surface); border: 1px solid var(--border-solid); border-radius: 16px; padding: 20px;
          animation: slideUp 0.4s ease-out;
        }
        .property-card__header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-solid); padding-bottom: 12px; }
        .property-card__header h3 { font-size: 14px; font-weight: 700; color: var(--text); text-transform: uppercase; letter-spacing: 0.05em; }
        .invited-badge { font-size: 10px; font-weight: 700; color: var(--clay); background: var(--clay-faint); padding: 4px 8px; border-radius: 6px; text-transform: uppercase; }
        
        .invited-details { 
          display: flex; flex-direction: column; gap: 8px; padding: 12px; background: var(--bg); border: 1px solid var(--border); border-radius: 12px;
        }
        .invited-detail { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--text-secondary); font-weight: 500; }
        
        .auth-form__row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .fade-in { animation: fadeIn 0.4s ease-out; }
        .items-center { align-items: center; }
        .gap-2 { gap: 8px; }
        .flex { display: flex; }
        .text-error { color: #ef4444; border: none; background: none; cursor: pointer; }

        @media (max-width: 480px) {
          .auth-form__row { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}
