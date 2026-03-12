'use client'

export function WhyUpward() {
  const stats = [
    {
      num: (
        <>
          70<span style={{ color: 'var(--accent)' }}>%</span>
        </>
      ),
      label: "of renters qualify for home ownership but don't know it",
    },
    { num: <>₦0</>, label: 'credit history built from on-time rent payments by default' },
    {
      num: (
        <>
          3<span style={{ color: 'var(--accent)' }}>x</span>
        </>
      ),
      label: 'faster home approval with a verified Rent Passport',
    },
  ]

  const points = [
    {
      n: '01',
      h: 'Pay. Record. Build.',
      p: 'Record your rent payments voluntarily to build a verified history. We automate your receipts and invoices, turning every Kobo paid into a step toward ownership.',
    },
    {
      n: '02',
      h: 'Unified Contract Management',
      p: 'Securely upload rental contracts. Both tenants and managers agree to terms digitally, creating a single source of truth for your housing journey.',
    },
    {
      n: '03',
      h: 'The Rent Passport™',
      p: 'Your recorded payments generate a searchable ID and rental score. Share your verified credibility with landlords and PMs across Africa.',
    },
    {
      n: '04',
      h: 'Low-Cost Home Financing',
      p: 'Convert your Rent Passport into home ownership. Access structured, non-predatory financing for verified properties with clean titles.',
    },
  ]

  return (
    <section
      id="why"
      style={{
        padding: '100px 40px',
        maxWidth: '1280px',
        margin: '0 auto',
        position: 'relative',
        zIndex: 1,
      }}
      className="container-padding"
    >
      <div className="section-label">Why Upward</div>
      <h2
        style={{
          fontFamily: 'var(--font-head)',
          fontWeight: 800,
          fontSize: 'clamp(2.2rem, 5vw, 3.8rem)',
          letterSpacing: '-0.04em',
          lineHeight: 1.1,
          marginBottom: '24px',
          marginTop: '16px',
        }}
      >
        The renter&apos;s economy
        <br className="mobile-hide" /> is broken. We&apos;re fixing it.
      </h2>
      <p
        style={{
          color: 'var(--muted)',
          fontSize: '18px',
          maxWidth: '520px',
          marginBottom: '60px',
          lineHeight: 1.7,
        }}
      >
        Millions of renters pay on time, every time — yet get zero credit for it. Upward changes
        that.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '60px',
          alignItems: 'start',
        }}
        className="grid-stack-mobile"
      >
        {/* Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {stats.map(({ num, label }, i) => (
            <div
              key={i}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                padding: '32px',
                borderRadius: '20px',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.3s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.borderColor = 'rgba(217, 119, 87, 0.4)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = ''
                e.currentTarget.style.borderColor = 'var(--border)'
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: '4px',
                  background: 'var(--accent)',
                  borderRadius: '4px 0 0 4px',
                }}
              />
              <div
                style={{
                  fontFamily: 'var(--font-head)',
                  fontSize: 'clamp(3rem, 5vw, 4rem)',
                  fontWeight: 800,
                  lineHeight: 1.1,
                  letterSpacing: '-0.05em',
                  marginBottom: '12px',
                }}
              >
                {num}
              </div>
              <div style={{ fontSize: '15px', color: 'var(--muted)', lineHeight: 1.5 }}>
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* Points */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', paddingTop: '10px' }}>
          {points.map(({ n, h, p }) => (
            <div key={n} style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
              <span
                style={{
                  fontFamily: 'var(--font-head)',
                  fontSize: '13px',
                  fontWeight: 800,
                  color: 'var(--accent)',
                  letterSpacing: '0.1em',
                  flexShrink: 0,
                  paddingTop: '4px',
                }}
              >
                {n}
              </span>
              <div>
                <h4
                  style={{
                    fontFamily: 'var(--font-head)',
                    fontWeight: 700,
                    fontSize: '18px',
                    marginBottom: '8px',
                    color: 'var(--text)',
                  }}
                >
                  {h}
                </h4>
                <p style={{ fontSize: '15px', color: 'var(--muted)', lineHeight: 1.7 }}>{p}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
