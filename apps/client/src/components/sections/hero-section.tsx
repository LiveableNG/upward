'use client'
import { useEffect, useRef, useState } from 'react'
import { PressLogos } from './press-logos'

export function HeroSection({ onOpenSignup }: { onOpenSignup: (email?: string) => void }) {
    const launchRef = useRef<number>(Date.now() + 29 * 24 * 60 * 60 * 1000 + 23 * 60 * 60 * 1000 + 56 * 60 * 1000 + 42 * 1000)
    const [time, setTime] = useState({ d: 29, h: 23, m: 56, s: 42 })

    useEffect(() => {
        const tick = () => {
            const diff = launchRef.current - Date.now()
            if (diff <= 0) return
            setTime({
                d: Math.floor(diff / (1000 * 60 * 60 * 24)),
                h: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                m: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
                s: Math.floor((diff % (1000 * 60)) / 1000),
            })
        }
        tick()
        const id = setInterval(tick, 1000)
        return () => clearInterval(id)
    }, [])

    const handleHeroEmail = () => {
        const emailEl = document.getElementById('hero-email') as HTMLInputElement
        const email = emailEl?.value.trim() ?? ''
        if (!email || !email.includes('@')) {
            showToast('Please enter a valid email address.')
            return
        }
        onOpenSignup(email)
    }

    const showToast = (msg: string) => {
        const t = document.getElementById('toast')
        const msgEl = document.getElementById('toast-msg')
        if (t && msgEl) {
            msgEl.textContent = msg
            t.classList.add('toast-show')
            setTimeout(() => t.classList.remove('toast-show'), 3000)
        }
    }

    const pad = (n: number) => String(n).padStart(2, '0')

    return (
        <section style={{ position: 'relative', zIndex: 1 }}>
            <div style={{
                minHeight: '100vh',
                display: 'flex', flexDirection: 'column', justifyContent: 'center',
                padding: '100px 40px 80px', width: '100%',
            }}>
                <div style={{ animation: 'fadeUp 0.6s ease both', display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '11px', letterSpacing: '0.25em', textTransform: 'uppercase' as const, color: 'var(--accent)', marginBottom: '28px' }}>
                    <span style={{ display: 'inline-block', width: '24px', height: '1px', background: 'var(--accent)' }} />
                    Rent Passport Program — Now Open
                </div>

                <h1 style={{
                    fontFamily: 'var(--font-head)', fontWeight: 800,
                    fontSize: 'clamp(2.2rem, 4.5vw, 4rem)', lineHeight: 1.05,
                    letterSpacing: '-0.03em', marginBottom: '32px', maxWidth: '600px',
                    animation: 'fadeUp 0.7s 0.1s ease both',
                }}>
                    <span style={{
                        display: 'block',
                        background: 'var(--heading-mix)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                    }}>
                        Pay. Record. Own.
                    </span>
                    <span style={{ display: 'block' }}>Your Rent Is Your Credit.</span>
                </h1>

                <p style={{ fontSize: '17px', color: 'var(--muted)', maxWidth: '480px', lineHeight: 1.7, marginBottom: '56px', animation: 'fadeUp 0.7s 0.2s ease both' }}>
                    Record your rent, build your Rent Passport, and unlock low-cost home financing. Upwards turns every payment into proof of your reliability.
                </p>

                {/* COUNTDOWN */}
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '56px', animation: 'fadeUp 0.7s 0.3s ease both' }}>
                    {[['Days', pad(time.d)], ['Hours', pad(time.h)], ['Mins', pad(time.m)], ['Secs', pad(time.s)]].map(([label, val], i, arr) => (
                        <div key={label} style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                            paddingRight: i < arr.length - 1 ? '36px' : 0,
                            marginRight: i < arr.length - 1 ? '36px' : 0,
                            borderRight: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
                        }}>
                            <span style={{ fontFamily: 'var(--font-head)', fontSize: 'clamp(2rem,4vw,3.5rem)', fontWeight: 800, lineHeight: 1, letterSpacing: '-0.04em', transition: 'all 0.3s ease' }}>{val}</span>
                            <span style={{ fontSize: '10px', letterSpacing: '0.25em', textTransform: 'uppercase' as const, color: 'var(--accent)', marginTop: '8px' }}>{label}</span>
                        </div>
                    ))}
                </div>

                {/* EMAIL FORM */}
                <div style={{ animation: 'fadeUp 0.7s 0.4s ease both' }}>
                    <div style={{ display: 'flex', gap: '12px', maxWidth: '520px' }}>
                        <input
                            id="hero-email"
                            type="email"
                            placeholder="Enter your email address"
                            style={{
                                flex: 1, background: 'var(--surface2)', border: '1px solid var(--border)',
                                color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '14px',
                                padding: '14px 20px', borderRadius: '10px', outline: 'none', transition: 'border-color 0.2s',
                            }}
                            onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                            onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                        />
                        <button
                            onClick={handleHeroEmail}
                            style={{
                                background: 'var(--accent)', color: '#0A0A0F',
                                fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '13px',
                                letterSpacing: '0.05em', padding: '14px 24px', borderRadius: '10px',
                                border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                                transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#d8ff6e'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(200,242,92,0.2)' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
                        >
                            Get Priority Access
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                        </button>
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '12px', opacity: 0.6, fontStyle: 'italic' }}>
                        * Be the first to build a verified rental history and unlock rewards.
                    </p>
                </div>

                <PressLogos />
            </div>
        </section>
    )
}
