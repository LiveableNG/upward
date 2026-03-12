'use client'

export function BenefitsGrid() {
    const cards = [
        {
            icon: (
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--accent)" strokeWidth="1.8">
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
            ),
            title: 'Automated Rent Tracking',
            desc: 'Voluntarily record payments, get automated receipts, and manage digital invoices for every Kobo paid.',
        },
        {
            icon: (
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--accent)" strokeWidth="1.8">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                </svg>
            ),
            title: 'Digital Rent Contracts',
            desc: 'Securely upload and store rental contracts. Tenants and managers agree to terms in one verified place.',
        },
        {
            icon: (
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--accent)" strokeWidth="1.8">
                    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
                    <path d="m9 12 2 2 4-4" />
                </svg>
            ),
            title: 'The Rent Passport',
            desc: 'Every payment builds your rental score. Share your verified ID with landlords to unlock better housing.',
        },
        {
            icon: (
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--accent)" strokeWidth="1.8">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
            ),
            title: 'Low-Cost Home Finance',
            desc: 'Convert your Rent Passport into home ownership. Access structured, low-cost financing for verified homes.',
        },
    ]

    return (
        <section style={{ position: 'relative', zIndex: 1, width: '100%' }}>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '1px', background: 'var(--border)',
                border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden',
            }}>
                {cards.map(({ icon, title, desc }) => (
                    <div
                        key={title}
                        style={{ background: 'var(--surface)', padding: '24px 20px', transition: 'background 0.2s', cursor: 'default' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface)')}
                    >
                        <div style={{
                            width: '44px', height: '44px', background: 'rgba(200,242,92,0.08)',
                            borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            marginBottom: '20px', transition: 'background 0.2s, transform 0.2s',
                        }}>
                            {icon}
                        </div>
                        <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '15px', color: 'var(--text)', marginBottom: '10px', lineHeight: 1.3 }}>{title}</div>
                        <div style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.65 }}>{desc}</div>
                    </div>
                ))}
            </div>
        </section>
    )
}
