'use client'

export function PartnersBar() {
    const logos = [
        { src: '/company-logos/diya_logo.png', alt: 'Diya Fatimilehin & Co.' },
        { src: '/company-logos/02.png', alt: 'Partner 2' },
        { src: '/company-logos/03.png', alt: 'Partner 3' },
        { src: '/company-logos/04.png', alt: 'Partner 4' },
        { src: '/company-logos/05.png', alt: 'Partner 5' },
        { src: '/company-logos/06.png', alt: 'Partner 6' },
    ]

    return (
        <section style={{ padding: '80px 0', borderTop: '1px solid var(--border)', position: 'relative', zIndex: 1, overflow: 'hidden' }}>
            <p style={{
                fontSize: '11px', letterSpacing: '0.25em', textTransform: 'uppercase',
                color: 'var(--muted)', marginBottom: '48px', opacity: 0.8, textAlign: 'center'
            }}>
                Trusted by leading real estate companies
            </p>

            <div className="marquee-container" style={{
                filter: 'grayscale(0.5)',
                opacity: 0.8,
                transition: 'all 0.3s ease'
            }}
                onMouseEnter={e => {
                    e.currentTarget.style.filter = 'grayscale(0)';
                    e.currentTarget.style.opacity = '1';
                }}
                onMouseLeave={e => {
                    e.currentTarget.style.filter = 'grayscale(0.5)';
                    e.currentTarget.style.opacity = '0.8';
                }}
            >
                <div className="marquee-content ping-pong-scroll">
                    {[...logos, ...logos].map((logo, i) => (
                        <img
                            key={i}
                            src={logo.src}
                            alt={logo.alt}
                            style={{ height: '48px', width: 'auto', objectFit: 'contain' }}
                        />
                    ))}
                </div>
            </div>
        </section>
    )
}
