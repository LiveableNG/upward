/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react'
import { UserRole, WaitlistBenefit, type CreateWaitlistEntryDto } from '@upward/shared-types'
import { SESSIONS, type CheckboxState } from '@upward/client-shared'
import { showToast } from '@upward/client-core'

export function SignupForm({
  initialEmail = '',
  initialStep = 1,
  abVariant = 'A',
}: {
  initialEmail?: string
  initialStep?: number
  abVariant?: 'A' | 'B'
}) {
  const [step, setStep] = useState(initialStep)
  const [email, setEmail] = useState(initialEmail)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<UserRole>(UserRole.TENANT)
  const [benefits, setBenefits] = useState<string[]>([])
  const [customBenefit, setCustomBenefit] = useState('')
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
  const [showCityDropdown, setShowCityDropdown] = useState(false)
  const [filteredCities, setFilteredCities] = useState<string[]>([])

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/locations/countries`)
      .then((res) => res.json())
      .then((json) => setCountries(json.data || []))
      .catch((err) => console.error('Failed to fetch countries', err))
  }, [])

  // Handle case-insensitive country matching (good for autofill)
  useEffect(() => {
    if (countries.length > 0 && country) {
      const match = countries.find((c) => c.name.toLowerCase() === country.toLowerCase())
      if (match && match.name !== country) {
        setCountry(match.name)
      }
    }
  }, [countries, country])

  useEffect(() => {
    if (country) {
      setFetchingCities(true)
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/locations/cities?country=${country.toLowerCase()}`)
        .then((res) => res.json())
        .then((json) => {
          const list = json.data || []
          setCities(list)

          // If current city is a case-insensitive match for something in the list, normalize it
          if (city && list.length > 0) {
            const match = list.find((c: string) => c.toLowerCase() === city.toLowerCase())
            if (match) {
              setCity(match)
            } else if (!fetchingCities && !showCityDropdown) {
              // Only clear if we are sure it's invalid and user isn't actively selecting
              // setCity('') // Removed to be less aggressive
            }
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

  useEffect(() => {
    if (city && cities.length > 0) {
      const filtered = cities
        .filter((c) => c.toLowerCase().includes(city.toLowerCase()))
        .slice(0, 10)
      setFilteredCities(filtered)
    } else {
      setFilteredCities(cities.slice(0, 10))
    }
  }, [city, cities])

  const goTo = (n: number) => {
    if (n === 2 && !email) {
      showToast('Please enter your email address.', true)
      return
    }
    if (n === 3 && step === 2) {
      if (!firstName) {
        showToast('Please enter your first name.', true)
        return
      }
      if (!lastName) {
        showToast('Please enter your last name.', true)
        return
      }
      if (!country) {
        showToast('Please select your country.', true)
        return
      }
      if (!city) {
        showToast('Please enter or search for your city.', true)
        return
      }
    }
    if (n === 4 && step === 3 && !role) {
      showToast('Please select your role.', true)
      return
    }
    if (n === 5) {
      if (benefits.length !== 2) {
        setBenefitWarning(true)
        return
      }
      setBenefitWarning(false)
    }
    if (n > step) {
      const payload: Partial<CreateWaitlistEntryDto> = {
        email,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        phone: phone || undefined,
        country: country || undefined,
        city: city || undefined,
        role,
        benefits: benefits.length > 0 ? benefits : undefined,
        acceptTerms: checkboxes.news,
        wantsAmbassador: checkboxes.ambassador,
        selectedSession: selectedSession || undefined,
        abVariant,
      }
      syncData(payload)
      if (step === 1 && email) {
        loadExistingData(email)
      }
    }
    setStep(n)
  }

  const toggleBenefit = (val: string) => {
    if (benefits.includes(val)) {
      setBenefits(benefits.filter((b) => b !== val))
    } else if (benefits.length >= 2) {
      showToast('You can only pick 2 benefits.', true)
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
        abVariant,
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
        if (data.benefits && data.benefits.length > 0) {
          const loadedBenefits = data.benefits as string[]
          setBenefits(loadedBenefits)
          const firstCustom = loadedBenefits.find(
            (b) => !Object.values(WaitlistBenefit).includes(b as any),
          )
          if (firstCustom) setCustomBenefit(firstCustom)
        }
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
      showToast('You must agree to receive updates to get started.', true)
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
        city: city || undefined,
        selectedSession: selectedSession || undefined,
        abVariant,
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
      showToast(result.message || 'Welcome to Upward!')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Submission failed. Please try again.'
      showToast(message, true)
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
    flexBasis: '20%',
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
    loading = false,
    disabled = false,
  }: {
    onClick: () => void
    children: React.ReactNode
    loading?: boolean
    disabled?: boolean
  }) => (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        background: disabled || loading ? 'var(--surface2)' : 'var(--accent)',
        color: disabled || loading ? 'var(--muted)' : 'var(--btn-text)',
        fontFamily: 'var(--font-head)',
        fontWeight: 700,
        fontSize: '13px',
        letterSpacing: '0.05em',
        padding: '12px 20px',
        borderRadius: '10px',
        border: 'none',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        opacity: disabled || loading ? 0.7 : 1,
      }}
      onMouseEnter={(e) => {
        if (!disabled && !loading) {
          e.currentTarget.style.background = '#bf5f43'
          e.currentTarget.style.transform = 'translateY(-1px)'
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !loading) {
          e.currentTarget.style.background = 'var(--accent)'
          e.currentTarget.style.transform = ''
        }
      }}
    >
      {loading ? (
        <>
          <svg
            className="animate-spin"
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            style={{ animation: 'spin 1s linear infinite' }}
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          Loading...
        </>
      ) : (
        children
      )}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
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
      title: 'Upward',
      text: 'I just signed up for Upward! Build your rental credibility and own your home.',
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
      {step > 1 && !done && (
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--border)',
            background: 'var(--surface2)',
          }}
        >
          {[
            ['01', 'Join'],
            ['02', 'Details'],
            ['03', 'Role'],
            ['04', 'Benefits'],
            ['05', 'Finalize'],
          ].map(([num, text], i) => (
            <div key={i} style={tabStyle(i + 1)}>
              <span>{num}</span>
              <span className="mobile-hide"> — {text}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ padding: '32px 24px' }} className="form-content">
        {done ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                background: 'var(--accent-faint)',
                border: '1px solid var(--accent-muted)',
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
              You're all set!
            </div>
            <p
              style={{
                color: 'var(--muted)',
                fontSize: '14px',
                maxWidth: '380px',
                margin: '0 auto 24px',
              }}
            >
              Welcome to the community! We'll send your access details to the email you provided. Be
              on the lookout — your journey begins now.
            </p>
            <button
              style={{
                background: 'var(--accent)',
                color: 'var(--btn-text)',
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
            {/* Step 1: Join (Email Only) */}
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
                  Get Started
                </div>
                <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '32px' }}>
                  Enter your email to start your journey with Upward.
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={labelStyle}>Email Address *</label>
                  <input
                    id="s1-email"
                    type="email"
                    placeholder="you@example.com"
                    style={{ ...inputStyle, textAlign: 'center' }}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border)'
                      // Add a small delay to prevent focus-loss re-renders from killing button clicks
                      setTimeout(() => {
                        loadExistingData(email)
                        syncData()
                      }, 120)
                    }}
                  />
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
                  <PrimaryBtn onClick={() => goTo(2)} loading={syncing}>
                    Get Started <ArrowIcon />
                  </PrimaryBtn>
                </div>
              </div>
            )}

            {/* Step 2: Details */}
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
                  Tell us about yourself
                </div>
                <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '32px' }}>
                  We&apos;ll use this to personalize your experience.
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
                    <label style={labelStyle}>First Name *</label>
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
                    <label style={labelStyle}>Last Name *</label>
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
                    <label style={labelStyle}>Country *</label>
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
                  <div style={{ position: 'relative' }}>
                    <label style={labelStyle}>City *</label>
                    <input
                      style={inputStyle}
                      value={city}
                      onChange={(e) => {
                        const val = e.target.value
                        setCity(val)
                        setShowCityDropdown(true)
                        syncData({ city: val || undefined })
                      }}
                      onFocus={() => {
                        setShowCityDropdown(true)
                      }}
                      onBlur={() => {
                        // On blur, if we have a direct match in wrong case, fix it
                        const match = cities.find((c) => c.toLowerCase() === city.toLowerCase())
                        if (match) setCity(match)

                        setTimeout(() => setShowCityDropdown(false), 200)
                      }}
                      placeholder={fetchingCities ? 'Loading...' : 'Type or search city...'}
                      disabled={!country || fetchingCities}
                    />
                    {showCityDropdown && filteredCities.length > 0 && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          background: 'var(--surface)',
                          border: '1px solid var(--border)',
                          borderRadius: '10px',
                          marginTop: '4px',
                          zIndex: 100,
                          maxHeight: '200px',
                          overflowY: 'auto',
                          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                        }}
                      >
                        {filteredCities.map((c) => (
                          <div
                            key={c}
                            onMouseDown={(e) => {
                              e.preventDefault() // Important: prevents blur from firing before selection
                              setCity(c)
                              setShowCityDropdown(false)
                              syncData({ city: c })
                            }}
                            style={{
                              padding: '12px 16px',
                              fontSize: '14px',
                              cursor: 'pointer',
                              borderBottom: '1px solid var(--border)',
                              transition: 'background 0.2s',
                              color: 'var(--text)',
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.background = 'var(--surface2)')
                            }
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                          >
                            {c}
                          </div>
                        ))}
                        {city && filteredCities.length === 0 && (
                          <div
                            style={{
                              padding: '16px',
                              fontSize: '13px',
                              color: 'var(--muted)',
                              textAlign: 'center',
                            }}
                          >
                            No matches found. You can keep typing...
                          </div>
                        )}
                      </div>
                    )}
                  </div>
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
                      of 5
                    </span>
                    <PrimaryBtn onClick={() => goTo(3)}>
                      Continue <ArrowIcon />
                    </PrimaryBtn>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Profile */}
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
                  I Am A... *
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
                        background: role === val ? 'var(--accent-faint)' : 'var(--surface2)',
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
                      of 5
                    </span>
                    <PrimaryBtn onClick={() => goTo(4)}>
                      Continue <ArrowIcon />
                    </PrimaryBtn>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Benefits */}
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
                  What Matters Most? *
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
                          background: sel ? 'var(--accent-faint)' : 'var(--surface2)',
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

                  {/* Render Custom-Typed Benefits as Cards */}
                  {benefits
                    .filter((b) => {
                      const predefined =
                        role === UserRole.TENANT
                          ? [
                              WaitlistBenefit.PRIORITY,
                              WaitlistBenefit.FINANCING,
                              WaitlistBenefit.OWNERSHIP,
                            ]
                          : [WaitlistBenefit.HISTORY, WaitlistBenefit.CREDIT, WaitlistBenefit.TITLE]
                      return !predefined.includes(b as WaitlistBenefit)
                    })
                    .map((customVal) => (
                      <div
                        key={customVal}
                        onClick={() => toggleBenefit(customVal)}
                        style={{
                          border: '1px solid var(--accent)',
                          background: 'var(--accent-faint)',
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
                        <svg
                          viewBox="0 0 24 24"
                          width="16"
                          height="16"
                          fill="none"
                          stroke="var(--accent)"
                          strokeWidth="2"
                        >
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                        <span style={{ flex: 1 }}>{customVal}</span>
                        <span style={{ fontSize: '10px', opacity: 0.6 }}>✕</span>
                      </div>
                    ))}

                  {/* Custom Benefit Input (Only if space available) */}
                  {benefits.length < 2 && (
                    <div
                      style={{
                        border: '1px solid var(--border)',
                        background: 'var(--surface2)',
                        borderRadius: '10px',
                        padding: '14px 16px',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          marginBottom: '8px',
                        }}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          width="16"
                          height="16"
                          fill="none"
                          stroke="var(--accent)"
                          strokeWidth="1.8"
                        >
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        <span style={{ fontSize: '13px', fontWeight: 600 }}>Something else?</span>
                      </div>
                      <input
                        type="text"
                        placeholder="Type and press Enter..."
                        value={customBenefit}
                        onChange={(e) => setCustomBenefit(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            const val = customBenefit.trim()
                            if (val) {
                              if (benefits.includes(val)) {
                                showToast('Already added.')
                              } else {
                                setBenefits([...benefits, val])
                                setCustomBenefit('')
                              }
                            }
                          }
                        }}
                        onBlur={() => {
                          const val = customBenefit.trim()
                          if (val) {
                            if (!benefits.includes(val)) {
                              setBenefits([...benefits, val])
                            }
                            setCustomBenefit('')
                          }
                        }}
                        style={{
                          width: '100%',
                          background: 'transparent',
                          border: 'none',
                          borderBottom: '1px solid var(--border)',
                          color: 'var(--text)',
                          fontSize: '12px',
                          padding: '4px 0',
                          outline: 'none',
                        }}
                      />
                    </div>
                  )}
                </div>
                {benefitWarning && (
                  <div
                    style={{
                      color: '#e60000',
                      fontSize: '12px',
                      marginTop: '12px',
                      fontWeight: 600,
                    }}
                  >
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
                      of 5
                    </span>
                    <PrimaryBtn onClick={() => goTo(5)}>
                      Continue <ArrowIcon />
                    </PrimaryBtn>
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Finalize */}
            {step === 5 && (
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
                  One important step before we confirm your access.
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
                      background: 'var(--accent-faint)',
                      border: '1px solid var(--accent-muted)',
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
                          stroke="var(--btn-text)"
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
                          agree to receive important updates, platform news, and exclusive
                          information from Upward. (Required to get started.)
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
                      {[
                        ...SESSIONS.map((s) => ({ ...s, isSession: true })),
                        { label: 'No, I am not interested', id: 'NONE', isSession: false },
                      ].map((item) => {
                        const isNo = item.id === 'NONE'
                        const isSelected = isNo
                          ? !selectedSession || selectedSession === 'NONE'
                          : selectedSession === item.label

                        let status = ''
                        let statusColor = 'var(--muted)'
                        if (item.isSession) {
                          const now = new Date()
                          const sDate = new Date((item as any).date)
                          const diff = sDate.getTime() - now.getTime()

                          if (diff < -7200000) {
                            // 2 hours past
                            status = 'ENDED'
                            statusColor = '#999'
                          } else if (diff < 3600000 && diff > -3600000) {
                            // 1 hour window
                            status = '● LIVE'
                            statusColor = '#7bf5c4'
                          }
                        }

                        return (
                          <div
                            key={item.id}
                            onClick={() => {
                              const val = item.label
                              const newVal = selectedSession === val ? 'NONE' : val
                              setSelectedSession(newVal)
                              syncData({ selectedSession: newVal })
                              if (isNo) {
                                setCheckboxes((p) => ({ ...p, ambassador: false }))
                              }
                            }}
                            style={{
                              border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                              background: isSelected
                                ? 'rgba(217, 119, 87, 0.05)'
                                : 'var(--surface2)',
                              borderRadius: '16px',
                              padding: '16px',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '12px',
                              position: 'relative',
                              overflow: 'hidden',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                                  fontWeight: 600,
                                  color: isSelected ? 'var(--text)' : 'var(--muted)',
                                }}
                              >
                                {item.label}
                              </span>
                            </div>

                            {item.isSession && (
                              <div
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'flex-end',
                                  marginTop: '4px',
                                }}
                              >
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <span
                                    style={{
                                      fontSize: '11px',
                                      color: 'var(--muted)',
                                      letterSpacing: '0.02em',
                                    }}
                                  >
                                    {(item as any).display}
                                  </span>
                                  {status && (
                                    <span
                                      style={{
                                        fontSize: '9px',
                                        fontWeight: 800,
                                        color: statusColor,
                                        marginTop: '4px',
                                        letterSpacing: '0.1em',
                                      }}
                                    >
                                      {status}
                                    </span>
                                  )}
                                </div>
                                <div
                                  style={{
                                    width: '32px',
                                    height: '32px',
                                    background: 'var(--accent-faint)',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: '1px solid var(--accent-muted)',
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: '8px',
                                      fontWeight: 800,
                                      color: 'var(--accent)',
                                      lineHeight: 1,
                                    }}
                                  >
                                    {item.label
                                      .split('(')[1]
                                      ?.split(' ')[0]
                                      ?.substring(0, 3)
                                      .toUpperCase()}
                                  </span>
                                  <span
                                    style={{
                                      fontSize: '12px',
                                      fontWeight: 900,
                                      color: 'var(--text)',
                                      lineHeight: 1,
                                    }}
                                  >
                                    {item.label.match(/\d+/)?.[0]}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div
                  className="step-footer"
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
                  <GhostBtn onClick={() => goTo(4)}>← Back</GhostBtn>
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
                        5
                      </span>{' '}
                      of 5
                    </span>
                    <PrimaryBtn onClick={submit} loading={loading}>
                      Get Started ✓
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
    gap: 14px !important;
  }

  .form-content {
    padding: 26px 18px !important;
  }

.step-footer {
  flex-direction: row !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 12px !important;
  flex-wrap: nowrap;
}

.step-footer span {
  display: none;
}

.step-footer > div {
  flex-direction: row !important;
  gap: 10px !important;
  flex-shrink: 0;
}

.step-footer button {
  width: auto !important;
  white-space: nowrap;
  flex-shrink: 0;
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
