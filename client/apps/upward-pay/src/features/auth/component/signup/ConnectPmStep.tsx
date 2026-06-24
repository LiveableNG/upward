import React, { useState, useEffect } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Building2, Search, CheckCircle2, Mail, Phone, User, Landmark, ArrowRight, Sparkles, Home, ShieldCheck } from 'lucide-react'
import { api } from '@/lib/api'
import { useToast } from '@/components/common/Toast'

interface DiscoveredProperty {
  address: string
  unitName: string
  pmName: string
  rentAmount: number
  currency: string
  alreadySynced?: boolean
}

interface ConnectPmStepProps {
  onComplete: () => void
  onSkip: () => void
}

export function ConnectPmStep({ onComplete, onSkip }: ConnectPmStepProps) {
  const [step, setStep] = useState<'DISCOVERING' | 'DISCOVERED' | 'LOOKUP' | 'FOUND' | 'NOT_FOUND'>('DISCOVERING')
  const [email, setEmail] = useState('')
  const [pmName, setPmName] = useState('')
  const [pmInviteEmail, setPmInviteEmail] = useState('')
  const [pmType, setPmType] = useState('Property Manager')
  const [companyName, setCompanyName] = useState('')
  const [pmDetails, setPmDetails] = useState<{ id: number, name: string, businessName: string } | null>(null)
  const [discoveredProps, setDiscoveredProps] = useState<DiscoveredProperty[]>([])

  const { refetch: discover } = useQuery({
    queryKey: ['discover-properties'],
    queryFn: async () => {
      const res = await api.get('/user/pm-connection/discover')
      return res.data
    },
    enabled: false,
  })

  useEffect(() => {
    const runDiscovery = async () => {
      try {
        const res = await discover()
        if (res.data?.success && res.data.data?.found) {
          setDiscoveredProps(res.data.data.properties)
          setStep('DISCOVERED')
        } else {
          setStep('LOOKUP')
        }
      } catch {
        setStep('LOOKUP')
      }
    }
    runDiscovery()
  }, [])

  const verifyMutation = useMutation({
    mutationFn: async (identifier: string) => {
      const res = await api.post('/user/pm-connection/verify', { identifier })
      return res.data
    },
    onSuccess: (data) => {
      const result = data.data
      if (result && result.found && result.pm) {
        setPmDetails({
          id: result.pm.id,
          name: `${result.pm.firstName} ${result.pm.lastName}`,
          businessName: result.pm.businessName || `${result.pm.firstName} ${result.pm.lastName}`,
        })
        setStep('FOUND')
      } else {
        setStep('NOT_FOUND')
      }
    },
    onError: () => {
      toastError('Unable to search for Property Manager. Please check your connection.')
    }
  })

  const confirmMutation = useMutation({
    mutationFn: async (pmId: number) => {
      await api.post('/user/pm-connection/confirm', { pmId })
    },
    onSuccess: () => {
      onComplete()
    }
  })

  const inviteMutation = useMutation({
    mutationFn: async () => {
      const targetEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? email : pmInviteEmail
      await api.post('/user/pm-connection/invite', {
        pmEmail: targetEmail,
        pmName,
        pmType,
        companyName: pmType === 'Property Manager' ? companyName : undefined
      })
    },
    onSuccess: () => {
      onComplete()
    }
  })

  const { error: toastError } = useToast()

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    const trimmed = email.trim()
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
    const isPhone = /^\+234\d{10}$/.test(trimmed)

    if (!isEmail && !isPhone) {
      toastError('Please enter a valid email or phone number in international format (+234...)')
      return
    }

    verifyMutation.mutate(trimmed)
  }

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault()
    if (pmName) inviteMutation.mutate()
  }

  if (step === 'DISCOVERING') {
    return (
      <div className="auth-stage auth-stage--center">
        <div className="connect-pm-loader">
          <Sparkles className="animate-pulse" />
        </div>
        <h2 className="auth-stage__title">Setting up your profile...</h2>
        <p className="auth-stage__subtitle">We&apos;re checking for properties already linked to your email.</p>
      </div>
    )
  }

  if (step === 'DISCOVERED') {
    return (
      <div className="auth-stage auth-stage--center">
        <div className="auth-stage__header">
          <div className="auth-stage__icon auth-stage__icon--success auth-stage__icon--center">
            <ShieldCheck />
          </div>
          <h2 className="auth-stage__title">Good News!</h2>
          <p className="auth-stage__subtitle">
            We found <strong>{discoveredProps.length} property</strong> linked to your account.
          </p>
        </div>

        <div className="connect-pm-list">
          {discoveredProps.map((prop, idx) => (
            <div key={idx} className="connect-pm-item">
              <div className="connect-pm-item__icon">
                <Home size={20} />
              </div>
              <div className="connect-pm-item__content">
                <h4 className="connect-pm-item__address">{prop.address}</h4>
                <p className="connect-pm-item__meta">{prop.unitName} • {prop.pmName}</p>
              </div>
              <div className="connect-pm-item__badge">
                <CheckCircle2 size={16} />
                <span>Synced</span>
              </div>
            </div>
          ))}
        </div>

        <div className="auth-stage__ctas">
          <button type="button" className="btn btn--primary btn--full btn--pay" onClick={onComplete}>
            Go to Dashboard <ArrowRight size={18} />
          </button>
          <button type="button" className="auth-btn-secondary btn--full" onClick={() => setStep('LOOKUP')}>
            Link Another Property
          </button>
        </div>
      </div>
    )
  }

  if (step === 'FOUND' && pmDetails) {
    return (
      <div className="auth-stage auth-stage--center">
        <div className="auth-stage__header">
          <div className="auth-stage__icon auth-stage__icon--center">
            <Building2 />
          </div>
          <h2 className="auth-stage__title">Is this your Property Manager?</h2>
          <p className="auth-stage__subtitle">We found a match for <strong>{email}</strong></p>
        </div>

        <div className="connect-pm-card">
          <h3 className="connect-pm-card__name">{pmDetails.businessName}</h3>
          <p className="connect-pm-card__person">{pmDetails.name}</p>
        </div>

        <div className="auth-stage__ctas">
          <button
            type="button"
            className="btn btn--primary btn--full btn--pay"
            onClick={() => confirmMutation.mutate(pmDetails.id)}
            disabled={confirmMutation.isPending}
          >
            {confirmMutation.isPending ? 'Connecting...' : 'Yes, Connect Me'}
            <CheckCircle2 size={18} />
          </button>
          <button
            type="button"
            className="auth-btn-secondary btn--full"
            onClick={() => setStep('LOOKUP')}
            disabled={confirmMutation.isPending}
          >
            No, try another detail
          </button>
        </div>
      </div>
    )
  }

  if (step === 'NOT_FOUND') {
    const isPhoneSearch = /^\+234\d{10}$/.test(email.trim())

    return (
      <div className="auth-stage">
        <div className="auth-stage__header">
          <div className="auth-stage__icon">
            <Landmark />
          </div>
          <h2 className="auth-stage__title">Invite your Landlord</h2>
          <p className="auth-stage__subtitle">
            We couldn&apos;t find them on Upward yet. Let&apos;s send them an invite to join the platform!
          </p>
        </div>

        <form onSubmit={handleInvite} className="auth-form">
          <div className="auth-form__field">
            <label>Manager&apos;s Category</label>
            <div className="input-with-icon">
              <Landmark size={17} />
              <select
                className="auth-select"
                value={pmType}
                onChange={(e) => setPmType(e.target.value)}
                required
              >
                <option value="Property Manager">Property Manager</option>
                <option value="Lawyer">Lawyer</option>
                <option value="Caretaker">Caretaker</option>
                <option value="Landlord">Landlord</option>
              </select>
            </div>
          </div>

          <div className="auth-form__field">
            <label>{pmType === 'Landlord' ? 'Landlord Name' : 'Manager / Firm Name'}</label>
            <div className="input-with-icon">
              <User size={17} />
              <input
                type="text"
                placeholder="e.g. John Smith"
                value={pmName}
                onChange={(e) => setPmName(e.target.value)}
                required
              />
            </div>
          </div>

          {pmType === 'Property Manager' && (
            <div className="auth-form__field">
              <label>Company Name (Optional)</label>
              <div className="input-with-icon">
                <Building2 size={17} />
                <input
                  type="text"
                  placeholder="e.g. Skyline Realty"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>
            </div>
          )}

          {isPhoneSearch && (
            <div className="auth-form__field">
              <label>Their Email Address</label>
              <div className="input-with-icon">
                <Mail size={17} />
                <input
                  type="email"
                  placeholder="manager@example.com"
                  value={pmInviteEmail}
                  onChange={(e) => setPmInviteEmail(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <div className="auth-stage__ctas">
            <button
              type="submit"
              className="btn btn--primary btn--full btn--pay"
              disabled={inviteMutation.isPending || !pmName || (isPhoneSearch && !pmInviteEmail)}
            >
              {inviteMutation.isPending ? 'Sending...' : 'Send Invitation'}
              <ArrowRight size={18} />
            </button>
            <button type="button" className="auth-btn-secondary btn--full" onClick={onSkip}>
              Skip for now
            </button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className="auth-stage">
      <div className="auth-stage__header">
        <div className="auth-stage__icon">
          <Search />
        </div>
        <h2 className="auth-stage__title">Find your Property Manager</h2>
        <p className="auth-stage__subtitle">
          Connect with your landlord to easily pay rent and view your property details.
        </p>
      </div>

      <form onSubmit={handleLookup} className="auth-form">
        <div className="auth-form__field">
          <label>Manager&apos;s Email or Phone Number</label>
          <div className="input-with-icon">
            {email.includes('@') ? <Mail size={17} /> : <Phone size={17} />}
            <input
              type="text"
              placeholder="e.g. manager@email.com or +2348030000000"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <p className="auth-form-note">Phone numbers must be in international format starting with +234</p>
        </div>

        {verifyMutation.isError && (
          <p className="auth-form-error-inline">Unable to search at the moment. Please try again.</p>
        )}

        <div className="auth-stage__ctas">
          <button
            type="submit"
            className="btn btn--primary btn--full btn--pay"
            disabled={verifyMutation.isPending || !email}
          >
            {verifyMutation.isPending ? 'Searching...' : 'Search'}
            <Search size={18} />
          </button>

          <button type="button" className="auth-form__link" onClick={onSkip}>
            I don&apos;t know their details, skip this
          </button>
        </div>
      </form>
    </div>
  )
}
