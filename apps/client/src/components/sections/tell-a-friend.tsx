'use client'

function showToast(msg: string) {
    const t = document.getElementById('toast')
    const msgEl = document.getElementById('toast-msg')
    if (t && msgEl) { msgEl.textContent = msg; t.classList.add('toast-show'); setTimeout(() => t.classList.remove('toast-show'), 3000) }
}

export function TellAFriend() {
    const caption = `🏠 Tired of paying rent with nothing to show for it? UPWARDS by GoodTenants is changing that — turning your rental history into a passport to home ownership. Join me on the early access waitlist: https://upwards.goodtenants.com #RentPassport #GoodTenants #Upwards`

    return (
        <section id="share" style={{ padding: '80px 40px', maxWidth: '1280px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
            <div style={{
                background: 'linear-gradient(135deg, rgba(200,242,92,0.08) 0%, rgba(123,245,196,0.05) 100%)',
                border: '1px solid rgba(200,242,92,0.15)', borderRadius: '20px', padding: '48px', textAlign: 'center',
            }}>
                <div style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: '2rem', letterSpacing: '-0.03em', marginBottom: '12px' }}>
                    Tell a Friend. Build a Movement.
                </div>
                <p style={{ fontSize: '15px', color: 'var(--muted)', marginBottom: '32px' }}>
                    Every person you refer who joins gets priority access — and so do you. Share Upwards and help your community win.
                </p>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' as const }}>
                    {[
                        {
                            label: 'Share on WhatsApp',
                            icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>,
                            onClick: () => window.open('https://wa.me/?text=' + encodeURIComponent(caption), '_blank'),
                        },
                        {
                            label: 'Post on Twitter / X',
                            icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" /></svg>,
                            onClick: () => window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(caption), '_blank'),
                        },
                        {
                            label: 'Copy Link',
                            icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>,
                            onClick: () => navigator.clipboard.writeText(caption).then(() => showToast('Caption copied to clipboard!')),
                        },
                        {
                            label: 'Share on LinkedIn',
                            icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" /><rect width="4" height="12" x="2" y="9" /><circle cx="4" cy="4" r="2" /></svg>,
                            onClick: () => window.open('https://www.linkedin.com/sharing/share-offsite/?url=https://upwards.goodtenants.com', '_blank'),
                        },
                    ].map(({ label, icon, onClick }) => (
                        <button key={label} onClick={onClick} style={{
                            display: 'flex', alignItems: 'center', gap: '10px', padding: '13px 22px',
                            borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--surface)',
                            color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '13px',
                            cursor: 'pointer', transition: 'all 0.2s',
                        }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(200,242,92,0.4)'; e.currentTarget.style.background = 'var(--surface2)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.transform = '' }}
                        >
                            {icon} {label}
                        </button>
                    ))}
                </div>

                <div style={{
                    marginTop: '24px', padding: '16px 24px', background: 'var(--surface2)',
                    border: '1px solid var(--border)', borderRadius: '10px',
                    fontSize: '13px', color: 'var(--muted)', maxWidth: '600px',
                    marginLeft: 'auto', marginRight: 'auto', textAlign: 'left', position: 'relative',
                }}>
                    <span style={{ fontFamily: 'var(--font-head)', fontSize: '48px', color: 'var(--accent)', opacity: 0.3, position: 'absolute', top: '-8px', left: '16px', lineHeight: 1 }}>&quot;</span>
                    <span style={{ display: 'block', paddingLeft: '24px' }}>
                        Tired of paying rent with nothing to show for it? UPWARDS by GoodTenants is changing that — turning your rental history into a passport to home ownership. Join me on the early access waitlist: [your-link] #RentPassport #GoodTenants #Upwards
                    </span>
                </div>
            </div>
        </section>
    )
}
