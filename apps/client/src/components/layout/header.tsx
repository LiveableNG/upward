'use client'
import Link from 'next/link'

export function Header({ onOpenSignup }: { onOpenSignup: () => void }) {
    return (
        <nav style={{
            position: 'fixed',
            top: 0,
            width: '100%',
            zIndex: 100,
            padding: '14px 40px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backdropFilter: 'blur(24px)',
            background: 'rgba(14, 14, 13, 0.85)',
            borderBottom: '1px solid rgba(217, 119, 87, 0.12)',
        }}>
            <Link href="#" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
                <div style={{
                    width: '36px', height: '36px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(217, 119, 87, 0.08)',
                    borderRadius: '10px',
                    border: '1px solid rgba(217, 119, 87, 0.2)',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2), 0 0 10px rgba(217, 119, 87, 0.1)',
                }}>
                    <img src="/favicon.svg" alt="Upwards Logo" style={{ width: '70%', height: '70%', objectFit: 'contain' }} />
                </div>
                <span style={{
                    fontFamily: 'var(--font-head)',
                    fontWeight: 800,
                    fontSize: '16px',
                    background: 'var(--heading-mix)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    letterSpacing: '0.05em'
                }}>
                    UPWARDS BY GOODTENANTS
                </span>
            </Link>

            <ul style={{ display: 'flex', gap: '32px', listStyle: 'none' }}>
                {([['#why', 'Why Upwards'], ['#how', 'How it Works'], ['#ambassador', 'Ambassador']] as [string, string][]).map(([href, label]) => (
                    <li key={href}>
                        <Link href={href} style={{ fontSize: '13px', color: 'var(--muted)', textDecoration: 'none', transition: 'color 0.2s' }}
                            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
                            onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
                        >{label}</Link>
                    </li>
                ))}
            </ul>

            <button
                onClick={onOpenSignup}
                style={{
                    fontSize: '11px', letterSpacing: '0.25em', textTransform: 'uppercase',
                    color: '#000', background: 'var(--accent)',
                    border: 'none', padding: '10px 20px', borderRadius: '100px',
                    fontFamily: 'var(--font-head)', fontWeight: 700, cursor: 'pointer',
                    transition: 'all 0.2s'
                }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
            >Get Started</button>
        </nav>
    )
}
