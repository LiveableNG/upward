'use client'
import Link from 'next/link'

export function Footer() {
    return (
        <footer style={{ borderTop: '1px solid var(--border)', padding: '60px 40px', position: 'relative', zIndex: 1 }}>
            <div style={{
                maxWidth: '1280px', margin: '0 auto',
                display: 'grid', gridTemplateColumns: '2fr 1fr 1fr',
                gap: '60px', marginBottom: '48px',
            }}>
                <div>
                    <h3 style={{
                        fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: '20px',
                        letterSpacing: '-0.02em', marginBottom: '12px',
                        background: 'var(--heading-mix)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}>
                        Don&apos;t just pay rent, build with it.
                    </h3>
                    <p style={{ fontSize: '13px', color: 'var(--muted)', maxWidth: '320px', lineHeight: 1.7 }}>
                        We help everyday renters unlock the financing they deserve through verified housing credibility. Your rent is your resume.
                    </p>
                </div>
                <div>
                    <h4 style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '13px', marginBottom: '16px', letterSpacing: '0.05em' }}>Equity</h4>
                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {[['#why', 'Our Vision'], ['#how', 'How it Works'], ['#ambassador', 'Ambassador'], ['#', 'FAQ']].map(([href, label]) => (
                            <li key={label}><Link href={href} style={{ fontSize: '12px', color: 'var(--muted)', textDecoration: 'none', letterSpacing: '0.08em', textTransform: 'uppercase', transition: 'color 0.2s' }}
                                onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
                                onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
                            >{label}</Link></li>
                        ))}
                    </ul>
                </div>
                <div>
                    <h4 style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '13px', marginBottom: '16px', letterSpacing: '0.05em' }}>Legal</h4>
                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {[['Privacy Policy'], ['Terms of Use'], ['Cookie Policy']].map(([label]) => (
                            <li key={label}><Link href="#" style={{ fontSize: '12px', color: 'var(--muted)', textDecoration: 'none', letterSpacing: '0.08em', textTransform: 'uppercase', transition: 'color 0.2s' }}
                                onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
                                onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
                            >{label}</Link></li>
                        ))}
                    </ul>
                </div>
            </div>
            <div style={{
                maxWidth: '1280px', margin: '0 auto', paddingTop: '24px',
                borderTop: '1px solid var(--border)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
                <p style={{ fontSize: '11px', color: 'var(--muted)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                    © 2026 UPWARDS by GoodTenants. All Rights Reserved.
                </p>
                <div style={{ display: 'flex', gap: '20px' }}>
                    {['Twitter', 'LinkedIn', 'Instagram'].map(name => (
                        <Link key={name} href="#" style={{ fontSize: '11px', color: 'var(--muted)', textDecoration: 'none', letterSpacing: '0.1em', textTransform: 'uppercase', transition: 'color 0.2s' }}
                            onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
                            onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
                        >{name}</Link>
                    ))}
                </div>
            </div>
        </footer>
    )
}
