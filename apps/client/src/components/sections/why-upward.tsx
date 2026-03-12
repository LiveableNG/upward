'use client'

export function WhyUpward() {
    const stats = [
        { num: <>70<span style={{ color: 'var(--accent)' }}>%</span></>, label: 'of renters qualify for home ownership but don\'t know it' },
        { num: <>₦0</>, label: 'credit history built from on-time rent payments by default' },
        { num: <>3<span style={{ color: 'var(--accent)' }}>x</span></>, label: 'faster home approval with a verified Rent Passport' },
    ]

    const points = [
        { n: '01', h: 'Pay. Record. Build.', p: 'Record your rent payments voluntarily to build a verified history. We automate your receipts and invoices, turning every Kobo paid into a step toward ownership.' },
        { n: '02', h: 'Unified Contract Management', p: 'Securely upload rental contracts. Both tenants and managers agree to terms digitally, creating a single source of truth for your housing journey.' },
        { n: '03', h: 'The Rent Passport™', p: 'Your recorded payments generate a searchable ID and rental score. Share your verified credibility with landlords and PMs across Africa.' },
        { n: '04', h: 'Low-Cost Home Financing', p: 'Convert your Rent Passport into home ownership. Access structured, non-predatory financing for verified properties with clean titles.' },
    ]

    return (
        <section id="why" style={{ padding: '100px 40px', maxWidth: '1280px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
            <div className="section-label">Why Upwards</div>
            <h2 style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 'clamp(2rem,4vw,3.5rem)', letterSpacing: '-0.03em', lineHeight: 1, marginBottom: '16px', marginTop: '16px' }}>
                The renter&apos;s economy<br />is broken. We&apos;re fixing it.
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: '16px', maxWidth: '480px', marginBottom: '60px' }}>
                Millions of renters pay on time, every time — yet get zero credit for it. Upwards changes that.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', alignItems: 'center' }}>
                {/* Stats */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {stats.map(({ num, label }, i) => (
                        <div key={i} style={{
                            background: 'var(--surface)', border: '1px solid var(--border)', padding: '32px', borderRadius: '16px',
                            position: 'relative', overflow: 'hidden', transition: 'all 0.3s',
                        }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateX(4px)'; e.currentTarget.style.borderColor = 'rgba(200,242,92,0.2)' }}
                            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.borderColor = 'var(--border)' }}
                        >
                            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px', background: 'var(--accent)', borderRadius: '3px 0 0 3px' }} />
                            <div style={{ fontFamily: 'var(--font-head)', fontSize: '3.5rem', fontWeight: 800, lineHeight: 1, letterSpacing: '-0.04em', marginBottom: '8px' }}>{num}</div>
                            <div style={{ fontSize: '14px', color: 'var(--muted)' }}>{label}</div>
                        </div>
                    ))}
                </div>

                {/* Points */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {points.map(({ n, h, p }) => (
                        <div key={n} style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                            <span style={{ fontFamily: 'var(--font-head)', fontSize: '12px', fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.1em', flexShrink: 0, paddingTop: '2px' }}>{n}</span>
                            <div>
                                <h4 style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '16px', marginBottom: '6px' }}>{h}</h4>
                                <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.65 }}>{p}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
