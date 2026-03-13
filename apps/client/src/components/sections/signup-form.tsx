import { useState, useEffect } from 'react'
import { UserRole, WaitlistBenefit, type CreateWaitlistEntryDto } from '@upward/shared-types'

type CheckboxState = { news: boolean; ambassador: boolean }

export function SignupForm({ initialEmail = '' }: { initialEmail?: string }) {
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState(initialEmail)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<UserRole>(UserRole.TENANT)
  const [benefits, setBenefits] = useState<WaitlistBenefit[]>([])
  const [checkboxes, setCheckboxes] = useState<CheckboxState>({ news: false, ambassador: false })
  const [done, setDone] = useState(false)
  const [benefitWarning, setBenefitWarning] = useState(false)
  const [loading, setLoading] = useState(false)
  const [country, setCountry] = useState('')
  const [city, setCity] = useState('')
  const [countries, setCountries] = useState<{ id: string; name: string }[]>([])
  const [cities, setCities] = useState<string[]>([])
  const [fetchingCities, setFetchingCities] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)
  const [selectedSession, setSelectedSession] = useState('')

  const SESSIONS = [
    'Saturday (10:00 AM)',
    'Tuesday (7:00 PM)',
    'Thursday (7:00 PM)',
    'Wednesday (12:00 PM)',
  ]

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/locations/countries`)
      .then((res) => res.json())
      .then((json) => setCountries(json.data || []))
      .catch((err) => console.error('Failed to fetch countries', err))
  }, [])

  useEffect(() => {
    if (country) {
      setFetchingCities(true)
      // The server expects lowercase country ID/Name
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/locations/cities?country=${country.toLowerCase()}`)
        .then((res) => res.json())
        .then((json) => {
          setCities(json.data || [])
          if (json.data && !json.data.includes(city)) {
            setCity('')
          }
        })
        .catch((err) => console.error('Failed to fetch cities', err))
        .finally(() => setFetchingCities(false))
    } else {
      setCities([])
      setCity('')
    }
  }, [country])

  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail)
      loadExistingData(initialEmail)
    }
  }, [initialEmail])

  const showToast = (msg: string) => {
    const t = document.getElementById('toast')
    const msgEl = document.getElementById('toast-msg')
    if (t && msgEl) {
      msgEl.textContent = msg
      t.classList.add('toast-show')
      setTimeout(() => t.classList.remove('toast-show'), 3000)
    }
  }

  const goTo = (n: number) => {
    if (n === 2 && !email) {
      showToast('Please enter your email address.')
      return
    }
    if (n === 3 && step === 2 && !role) {
      showToast('Please select your role.')
      return
    }
    if (n === 4) {
      if (benefits.length !== 2) {
        setBenefitWarning(true)
        return
      }
      setBenefitWarning(false)
    }
    if (n > step) {
      syncData()
    }
    setStep(n)
  }

  const toggleBenefit = (val: WaitlistBenefit) => {
    if (benefits.includes(val)) {
      setBenefits(benefits.filter((b) => b !== val))
    } else if (benefits.length >= 2) {
      showToast('You can only pick 2 benefits.')
    } else {
      setBenefits([...benefits, val])
    }
    setBenefitWarning(false)
  }

  const syncData = async (optionalPayload?: Partial<CreateWaitlistEntryDto>) => {
    const currentEmail = optionalPayload?.email || email
    if (!currentEmail || !currentEmail.includes('@')) return

    try {
      const payload: CreateWaitlistEntryDto = {
        email: currentEmail,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        phone: phone || undefined,
        role,
        benefits,
        acceptTerms: checkboxes.news,
        wantsAmbassador: checkboxes.ambassador,
        country: country || undefined,
        city: city || undefined,
        selectedSession: selectedSession || undefined,
        ...optionalPayload,
      }

      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } catch (err) {
      console.error('Background sync failed', err)
    }
  }

  const loadExistingData = async (emailToFetch: string) => {
    if (!emailToFetch || !emailToFetch.includes('@') || syncing) return

    setSyncing(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/waitlist/${emailToFetch}`)
      if (!res.ok) {
        syncData({ email: emailToFetch })
        return
      }

      const { data } = await res.json()
      if (data) {
        if (data.firstName) setFirstName(data.firstName)
        if (data.lastName) setLastName(data.lastName)
        if (data.phone) setPhone(data.phone)
        if (data.role) setRole(data.role as UserRole)
        if (data.benefits && data.benefits.length > 0)
          setBenefits(data.benefits as WaitlistBenefit[])
        if (data.country) setCountry(data.country)
        if (data.city) setCity(data.city)
        if (data.selectedSession) setSelectedSession(data.selectedSession)
        if (data.acceptTerms !== undefined) {
          setCheckboxes((prev) => ({ ...prev, news: data.acceptTerms }))
        }
        if (data.wantsAmbassador !== undefined) {
          setCheckboxes((prev) => ({ ...prev, ambassador: data.wantsAmbassador }))
        }
        if (!dataLoaded) {
          setDataLoaded(true)
        }
      }
    } catch (err) {
      console.error('Failed to load existing data', err)
    } finally {
      setSyncing(false)
    }
  }

  const submit = async () => {
    if (!checkboxes.news) {
      showToast('You must agree to receive updates to join the waitlist.')
      return
    }

    setLoading(true)
    try {
      const payload: CreateWaitlistEntryDto = {
        email,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        phone: phone || undefined,
        role,
        benefits,
        acceptTerms: checkboxes.news,
        wantsAmbassador: checkboxes.ambassador,
        country: country || undefined,
        city: city || undefined,
        selectedSession: selectedSession || undefined,
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'Something went wrong')
      }

      const result = await res.json()

      setDone(true)
      showToast(result.message || "You're on the list! Welcome to Upward")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Submission failed. Please try again.'
      showToast(message)
    } finally {
      setLoading(false)
    }
  }

  const tabStyle = (n: number): React.CSSProperties => ({
    flex: 1,
    padding: '16px 8px',
    textAlign: 'center',
    fontSize: '10px',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    borderRight: n < 4 ? '1px solid var(--border)' : 'none',
    transition: 'all 0.2s',
    position: 'relative',
    color: step === n ? 'var(--accent)' : step > n ? 'var(--accent2)' : 'var(--muted)',
    borderBottom: step === n ? '2px solid var(--accent)' : '2px solid transparent',
  })

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
    fontFamily: 'var(--font-body)',
    fontSize: '14px',
    padding: '13px 18px',
    borderRadius: '10px',
    outline: 'none',
    transition: 'border-color 0.2s',
  }

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    cursor: 'pointer',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M4 6l4 4 4-4'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 16px center',
    paddingRight: '45px',
    color: 'var(--text)',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: '12px',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--muted)',
    marginBottom: '8px',
    display: 'block',
  }

  const PrimaryBtn = ({
    onClick,
    children,
  }: {
    onClick: () => void
    children: React.ReactNode
  }) => (
    <button
      onClick={onClick}
      style={{
        background: 'var(--accent)',
        color: '#0A0A0F',
        fontFamily: 'var(--font-head)',
        fontWeight: 700,
        fontSize: '13px',
        letterSpacing: '0.05em',
        padding: '12px 20px',
        borderRadius: '10px',
        border: 'none',
        cursor: 'pointer',
        transition: 'all 0.2s',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = '#e68a6b'
        e.currentTarget.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'var(--accent)'
        e.currentTarget.style.transform = ''
      }}
    >
      {children}
    </button>
  )

  const GhostBtn = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => (
    <button
      onClick={onClick}
      style={{
        background: 'transparent',
        border: '1px solid var(--border)',
        color: 'var(--muted)',
        fontFamily: 'var(--font-body)',
        fontSize: '13px',
        padding: '12px 20px',
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--text)'
        e.currentTarget.style.color = 'var(--text)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border)'
        e.currentTarget.style.color = 'var(--muted)'
      }}
    >
      {children}
    </button>
  )

  const ArrowIcon = () => (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  )

  const handleShare = async () => {
    const shareData = {
      title: 'Upward by GoodTenants',
      text: 'I just joined the waitlist for Upward! Build your rental credibility and own your home.',
      url: window.location.origin,
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Error sharing:', err)
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareData.url)
        showToast('Link copied to clipboard!')
      } catch {
        showToast('Failed to copy link.')
      }
    }
  }

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '20px',
        overflow: 'hidden',
        maxWidth: '680px',
      }}
    >
      {/* Tab bar */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface2)',
        }}
      >
        {[
          ['01', 'Contact'],
          ['02', 'Profile'],
          ['03', 'Benefits'],
          ['04', 'Confirm'],
        ].map(([num, text], i) => (
          <div key={i} style={tabStyle(i + 1)}>
            <span>{num}</span>
            <span className="mobile-hide"> — {text}</span>
          </div>
        ))}
      </div>

      <div style={{ padding: '32px 24px' }} className="form-content">
        {done ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                background: 'rgba(217, 119, 87, 0.1)',
                border: '1px solid rgba(217, 119, 87, 0.3)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
              }}
            >
              <svg
                viewBox="0 0 24 24"
                width="28"
                height="28"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="2"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <div
              style={{
                fontFamily: 'var(--font-head)',
                fontWeight: 700,
                fontSize: '22px',
                marginBottom: '12px',
              }}
            >
              You're on the list!
            </div>
            <p
              style={{
                color: 'var(--muted)',
                fontSize: '14px',
                maxWidth: '380px',
                margin: '0 auto 24px',
              }}
            >
              We'll send your invite to the email you provided. Be on the lookout — priority access
              drops soon.
            </p>
            <button
              style={{
                background: 'var(--accent)',
                color: '#0A0A0F',
                fontFamily: 'var(--font-head)',
                fontWeight: 700,
                fontSize: '13px',
                padding: '12px 24px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                margin: '0 auto',
                display: 'block',
              }}
              onClick={handleShare}
            >
              Share With a Friend →
            </button>
          </div>
        ) : (
          <>
            {/* Step 1 */}
            {step === 1 && (
              <div>
                <div
                  style={{
                    fontFamily: 'var(--font-head)',
                    fontWeight: 700,
                    fontSize: '22px',
                    marginBottom: '8px',
                  }}
                >
                  Your Contact Info
                </div>
                <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '32px' }}>
                  We&apos;ll use this to send your early access invite.
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={labelStyle}>Email Address *</label>
                  <input
                    id="s1-email"
                    type="email"
                    placeholder="you@example.com"
                    style={inputStyle}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border)'
                      loadExistingData(email)
                      syncData()
                    }}
                  />
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '16px',
                    marginBottom: '20px',
                  }}
                  className="grid-stack-mobile"
                >
                  <div>
                    <label style={labelStyle}>First Name</label>
                    <input
                      type="text"
                      placeholder="First name"
                      style={inputStyle}
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border)'
                        syncData()
                      }}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Last Name</label>
                    <input
                      type="text"
                      placeholder="Last name"
                      style={inputStyle}
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border)'
                        syncData()
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={labelStyle}>Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+234 800 000 0000"
                    style={inputStyle}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border)'
                      syncData()
                    }}
                  />
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '16px',
                    marginBottom: '20px',
                  }}
                  className="grid-stack-mobile"
                >
                  <div>
                    <label style={labelStyle}>Country</label>
                    <select
                      style={selectStyle}
                      value={country}
                      onChange={(e) => {
                        const val = e.target.value
                        setCountry(val)
                        syncData({ country: val || undefined })
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
                      onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
                    >
                      <option value="">Select Country</option>
                      {countries.map((c) => (
                        <option key={c.id} value={c.name} style={{ background: 'var(--surface2)' }}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Municipality</label>
                    <select
                      style={selectStyle}
                      value={city}
                      onChange={(e) => {
                        const val = e.target.value
                        setCity(val)
                        syncData({ city: val || undefined })
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
                      onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
                      disabled={!country || fetchingCities}
                    >
                      <option value="">
                        {fetchingCities ? 'Loading...' : 'Select Municipality'}
                      </option>
                      {cities.map((c) => (
                        <option key={c} value={c} style={{ background: 'var(--surface2)' }}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    gap: '16px',
                    marginTop: '32px',
                    paddingTop: '24px',
                    borderTop: '1px solid var(--border)',
                  }}
                >
                  <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                    Step{' '}
                    <span
                      style={{
                        color: 'var(--accent)',
                        fontFamily: 'var(--font-head)',
                        fontWeight: 700,
                      }}
                    >
                      1
                    </span>{' '}
                    of 4
                  </span>
                  <PrimaryBtn onClick={() => goTo(2)}>
                    Continue <ArrowIcon />
                  </PrimaryBtn>
                </div>
              </div>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <div>
                <div
                  style={{
                    fontFamily: 'var(--font-head)',
                    fontWeight: 700,
                    fontSize: '22px',
                    marginBottom: '8px',
                  }}
                >
                  I Am A...
                </div>
                <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '32px' }}>
                  Help us personalize your Upward experience.
                </div>
                <div
                  style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}
                  className="grid-stack-mobile"
                >
                  {[
                    {
                      val: UserRole.TENANT,
                      title: 'Tenant / Renter',
                      desc: 'I currently rent and want to build my rental credibility',
                    },
                    {
                      val: UserRole.OWNER,
                      title: 'Property Owner / Manager',
                      desc: 'I manage properties and want to attract quality tenants',
                    },
                  ].map(({ val, title, desc }) => (
                    <div
                      key={val}
                      onClick={() => setRole(val)}
                      style={{
                        border: `1px solid ${role === val ? 'var(--accent)' : 'var(--border)'}`,
                        background: role === val ? 'rgba(217, 119, 87, 0.05)' : 'var(--surface2)',
                        borderRadius: '10px',
                        padding: '16px 20px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div
                        style={{
                          fontFamily: 'var(--font-head)',
                          fontWeight: 700,
                          fontSize: '14px',
                          marginBottom: '4px',
                        }}
                      >
                        {title}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{desc}</div>
                    </div>
                  ))}
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '16px',
                    marginTop: '32px',
                    paddingTop: '24px',
                    borderTop: '1px solid var(--border)',
                  }}
                >
                  <GhostBtn onClick={() => goTo(1)}>← Back</GhostBtn>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                      Step{' '}
                      <span
                        style={{
                          color: 'var(--accent)',
                          fontFamily: 'var(--font-head)',
                          fontWeight: 700,
                        }}
                      >
                        2
                      </span>{' '}
                      of 4
                    </span>
                    <PrimaryBtn onClick={() => goTo(3)}>
                      Continue <ArrowIcon />
                    </PrimaryBtn>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3 */}
            {step === 3 && (
              <div>
                <div
                  style={{
                    fontFamily: 'var(--font-head)',
                    fontWeight: 700,
                    fontSize: '22px',
                    marginBottom: '8px',
                  }}
                >
                  What Matters Most?
                </div>
                <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '32px' }}>
                  Pick your top 2 benefits — this shapes what we build first.
                </div>
                <div
                  style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}
                  className="grid-stack-mobile"
                >
                  {(role === UserRole.TENANT
                    ? [
                        {
                          val: WaitlistBenefit.PRIORITY,
                          label: 'Get prioritized by landlords when moving homes',
                          icon: (
                            <svg
                              viewBox="0 0 24 24"
                              width="16"
                              height="16"
                              fill="none"
                              stroke="var(--accent)"
                              strokeWidth="1.8"
                            >
                              <circle cx="12" cy="12" r="10" />
                              <path d="M12 6v6l4 2" />
                            </svg>
                          ),
                        },
                        {
                          val: WaitlistBenefit.FINANCING,
                          label: 'Qualify for flexible rent payments while renting',
                          icon: (
                            <svg
                              viewBox="0 0 24 24"
                              width="16"
                              height="16"
                              fill="none"
                              stroke="var(--accent)"
                              strokeWidth="1.8"
                            >
                              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                              <polyline points="16 7 22 7 22 13" />
                            </svg>
                          ),
                        },
                        {
                          val: WaitlistBenefit.OWNERSHIP,
                          label: 'Own your own quality home with single-digit home loans',
                          icon: (
                            <svg
                              viewBox="0 0 24 24"
                              width="16"
                              height="16"
                              fill="none"
                              stroke="var(--accent)"
                              strokeWidth="1.8"
                            >
                              <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
                              <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                            </svg>
                          ),
                        },
                      ]
                    : [
                        {
                          val: WaitlistBenefit.HISTORY,
                          label: 'Find verified tenants and enjoy peace of mind',
                          icon: (
                            <svg
                              viewBox="0 0 24 24"
                              width="16"
                              height="16"
                              fill="none"
                              stroke="var(--accent)"
                              strokeWidth="1.8"
                            >
                              <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
                              <path d="m9 12 2 2 4-4" />
                            </svg>
                          ),
                        },
                        {
                          val: WaitlistBenefit.CREDIT,
                          label: 'Say Goodbye to consistent defaults. Get paid on-time',
                          icon: (
                            <svg
                              viewBox="0 0 24 24"
                              width="16"
                              height="16"
                              fill="none"
                              stroke="var(--accent)"
                              strokeWidth="1.8"
                            >
                              <rect width="20" height="14" x="2" y="5" rx="2" />
                              <path d="M2 10h20" />
                            </svg>
                          ),
                        },
                        {
                          val: WaitlistBenefit.TITLE,
                          label: 'Access exclusive brokerage deals',
                          icon: (
                            <svg
                              viewBox="0 0 24 24"
                              width="16"
                              height="16"
                              fill="none"
                              stroke="var(--accent)"
                              strokeWidth="1.8"
                            >
                              <path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4" />
                              <path d="m21 2-9.6 9.6" />
                              <circle cx="7.5" cy="15.5" r="5.5" />
                            </svg>
                          ),
                        },
                      ]
                  ).map(({ val, label, icon }) => {
                    const sel = benefits.includes(val)
                    return (
                      <div
                        key={val}
                        onClick={() => toggleBenefit(val)}
                        style={{
                          border: `1px solid ${sel ? 'var(--accent)' : 'var(--border)'}`,
                          background: sel ? 'rgba(217, 119, 87, 0.05)' : 'var(--surface2)',
                          borderRadius: '10px',
                          padding: '14px 16px',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          fontSize: '13px',
                        }}
                      >
                        {icon} {label}
                      </div>
                    )
                  })}
                </div>
                {benefitWarning && (
                  <div style={{ color: '#ff6b6b', fontSize: '12px', marginTop: '12px' }}>
                    Please select exactly 2 benefits to continue.
                  </div>
                )}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '16px',
                    marginTop: '32px',
                    paddingTop: '24px',
                    borderTop: '1px solid var(--border)',
                  }}
                >
                  <GhostBtn onClick={() => goTo(2)}>← Back</GhostBtn>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                      Step{' '}
                      <span
                        style={{
                          color: 'var(--accent)',
                          fontFamily: 'var(--font-head)',
                          fontWeight: 700,
                        }}
                      >
                        3
                      </span>{' '}
                      of 4
                    </span>
                    <PrimaryBtn onClick={() => goTo(4)}>
                      Continue <ArrowIcon />
                    </PrimaryBtn>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4 */}
            {step === 4 && (
              <div>
                <div
                  style={{
                    fontFamily: 'var(--font-head)',
                    fontWeight: 700,
                    fontSize: '22px',
                    marginBottom: '8px',
                  }}
                >
                  Almost There!
                </div>
                <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '32px' }}>
                  One important step before we confirm your spot.
                </div>

                {(['news', 'ambassador'] as const).map((key) => (
                  <div
                    key={key}
                    onClick={() => setCheckboxes((p) => ({ ...p, [key]: !p[key] }))}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '14px',
                      padding: '16px',
                      background: 'rgba(217, 119, 87, 0.04)',
                      border: '1px solid rgba(217, 119, 87, 0.15)',
                      borderRadius: '10px',
                      marginBottom: '16px',
                      cursor: 'pointer',
                    }}
                  >
                    <div
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '4px',
                        flexShrink: 0,
                        marginTop: '2px',
                        background: checkboxes[key] ? 'var(--accent)' : 'var(--surface2)',
                        border: `1px solid ${checkboxes[key] ? 'var(--accent)' : 'var(--border)'}`,
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {checkboxes[key] && (
                        <svg
                          viewBox="0 0 12 12"
                          width="10"
                          height="10"
                          fill="none"
                          stroke="#0A0A0F"
                          strokeWidth="2"
                          strokeLinecap="round"
                        >
                          <path d="M2 6l3 3 5-5" />
                        </svg>
                      )}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.6 }}>
                      {key === 'news' ? (
                        <>
                          <strong style={{ color: 'var(--text)' }}>Yes, keep me informed!</strong> I
                          agree to receive important updates, launch news, and exclusive
                          early-access information from Upward by GoodTenants. (Required to join the
                          waitlist.)
                        </>
                      ) : (
                        <>
                          I&apos;m interested in{' '}
                          <strong style={{ color: 'var(--text)' }}>
                            learning more or joining a live session
                          </strong>
                          . Sign me up for an information session.
                        </>
                      )}
                    </div>
                  </div>
                ))}

                {checkboxes.ambassador && (
                  <div style={{ marginTop: '24px', animation: 'fadeIn 0.3s ease' }}>
                    <div
                      style={{
                        fontFamily: 'var(--font-head)',
                        fontWeight: 700,
                        fontSize: '14px',
                        marginBottom: '12px',
                        color: 'var(--text)',
                      }}
                    >
                      Pick your preferred session time:
                    </div>
                    <div
                      style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}
                      className="grid-stack-mobile"
                    >
                      {[...SESSIONS, 'No, I am not interested'].map((time) => {
                        const isNo = time.includes('No')
                        const isSelected = isNo
                          ? !selectedSession || selectedSession === 'NONE'
                          : selectedSession === time
                        return (
                          <div
                            key={time}
                            onClick={() => {
                              const val = isNo ? 'NONE' : time
                              setSelectedSession(val)
                              syncData({ selectedSession: val })
                              if (isNo) {
                                setCheckboxes((p) => ({ ...p, ambassador: false }))
                              }
                            }}
                            style={{
                              border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                              background: isSelected
                                ? 'rgba(217, 119, 87, 0.05)'
                                : 'var(--surface2)',
                              borderRadius: '10px',
                              padding: '12px 14px',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                            }}
                          >
                            <div
                              style={{
                                width: '14px',
                                height: '14px',
                                borderRadius: '50%',
                                border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              {isSelected && (
                                <div
                                  style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    background: 'var(--accent)',
                                  }}
                                />
                              )}
                            </div>
                            <span
                              style={{
                                fontSize: '13px',
                                color: isSelected ? 'var(--text)' : 'var(--muted)',
                              }}
                            >
                              {time}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '16px',
                    marginTop: '32px',
                    paddingTop: '24px',
                    borderTop: '1px solid var(--border)',
                  }}
                >
                  <GhostBtn onClick={() => goTo(3)}>← Back</GhostBtn>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                      Step{' '}
                      <span
                        style={{
                          color: 'var(--accent)',
                          fontFamily: 'var(--font-head)',
                          fontWeight: 700,
                        }}
                      >
                        4
                      </span>{' '}
                      of 4
                    </span>
                    <PrimaryBtn onClick={submit}>
                      {loading ? 'Processing...' : 'Confirm My Spot ✓'}
                    </PrimaryBtn>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .grid-stack-mobile {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
          }
          .form-content {
            padding: 32px 20px !important;
          }
          .share-with-friend-btn {
            width: 100% !important;
          }
        }
        @media (max-width: 480px) {
           .mobile-hide {
             display: none;
           }
        }
      `}</style>
    </div>
  )
}
