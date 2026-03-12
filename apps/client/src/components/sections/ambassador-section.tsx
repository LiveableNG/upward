'use client'

function showToast(msg: string) {
    const t = document.getElementById('toast')
    const msgEl = document.getElementById('toast-msg')
    if (t && msgEl) { msgEl.textContent = msg; t.classList.add('toast-show'); setTimeout(() => t.classList.remove('toast-show'), 3000) }
}

export function AmbassadorSection() {
    const sessions = [
        { title: 'Intro to Rent Passport', info: 'Webinar · Mar 20, 2026 · 6:00 PM WAT', badge: 'Register', live: false },
        { title: 'Home Ownership Pathways', info: 'Webinar · Mar 27, 2026 · 5:00 PM WAT', badge: 'Register', live: false },
        { title: 'Community Q&A — Open Office', info: 'Live Now · Every Friday · 12:00 PM WAT', badge: '● Live', live: true },
    ]

    return (
        <section id="ambassador" style={{ padding: '80px 40px', position: 'relative', zIndex: 1 }}>
            <div style={{
                maxWidth: '1280px', margin: '0 auto',
                background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '24px', padding: '64px',
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '64px', alignItems: 'center',
            }}>
                <div>
                    <div className="section-label" style={{ marginBottom: '16px' }}>Learn More</div>
                    <h2 style={{
                        fontFamily: 'var(--font-head)', fontWeight: 800,
                        fontSize: 'clamp(1.8rem, 3vw, 2.8rem)', lineHeight: 1.05,
                        letterSpacing: '-0.03em', marginBottom: '16px',
                    }}>
                        Want to be part of something bigger?
                    </h2>
                    <p style={{ fontSize: '15px', color: 'var(--muted)', lineHeight: 1.7, marginBottom: '32px' }}>
                        Join one of our live information sessions to learn how Upwards works, ask questions, and explore how you can become a community ambassador and earn rewards.
                    </p>
                    <button
                        onClick={() => showToast('Ambassador registration coming soon!')}
                        style={{
                            background: 'var(--accent)', color: '#0A0A0F', fontFamily: 'var(--font-head)',
                            fontWeight: 700, fontSize: '13px', letterSpacing: '0.05em', padding: '14px 24px',
                            borderRadius: '10px', border: 'none', cursor: 'pointer', display: 'flex',
                            alignItems: 'center', gap: '8px', transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#d8ff6e'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.transform = '' }}
                    >
                        Become an Ambassador
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {sessions.map(({ title, info, badge, live }) => (
                        <div
                            key={title}
                            onClick={() => showToast(live ? 'Community Q&A is live!' : 'Registration link coming soon!')}
                            style={{
                                background: 'var(--surface2)', border: '1px solid var(--border)',
                                borderRadius: '12px', padding: '20px',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                cursor: 'pointer', transition: 'all 0.2s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(200,242,92,0.3)'; e.currentTarget.style.transform = 'translateX(4px)' }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = '' }}
                        >
                            <div>
                                <h5 style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>{title}</h5>
                                <p style={{ fontSize: '12px', color: 'var(--muted)' }}>{info}</p>
                            </div>
                            <span style={{
                                fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase' as const,
                                padding: '4px 10px', borderRadius: '100px',
                                background: live ? 'rgba(123,245,196,0.1)' : 'rgba(200,242,92,0.1)',
                                color: live ? 'var(--accent2)' : 'var(--accent)',
                                border: `1px solid ${live ? 'rgba(123,245,196,0.2)' : 'rgba(200,242,92,0.2)'}`,
                            }}>{badge}</span>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
