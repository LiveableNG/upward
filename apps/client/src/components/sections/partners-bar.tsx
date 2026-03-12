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
    <section
      style={{
        padding: '80px 0',
        borderTop: '1px solid var(--border)',
        position: 'relative',
        zIndex: 1,
        overflow: 'hidden',
      }}
      className="partners-section"
    >
      <p
        style={{
          fontSize: '11px',
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
          marginBottom: '48px',
          opacity: 0.8,
          textAlign: 'center',
        }}
      >
        Trusted by leading real estate companies
      </p>

      <div
        className="marquee-container"
        style={{
          filter: 'grayscale(0.6)',
          opacity: 0.7,
          transition: 'all 0.5s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.filter = 'grayscale(0)'
          e.currentTarget.style.opacity = '1'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.filter = 'grayscale(0.6)'
          e.currentTarget.style.opacity = '0.7'
        }}
      >
        <div className="marquee-content ping-pong-scroll">
          {[...logos, ...logos].map((logo, i) => (
            <img
              key={i}
              src={logo.src}
              alt={logo.alt}
              style={{ height: '40px', width: 'auto', objectFit: 'contain' }}
              className="partner-logo"
            />
          ))}
        </div>
      </div>

      <style>{`
                @media (max-width: 768px) {
                    .partners-section {
                        padding: 40px 0 !important;
                    }
                    .partner-logo {
                        height: 32px !important;
                    }
                }
            `}</style>
    </section>
  )
}

// Side note: I noticed 'scrolled' wasn't defined in the original file but used in my logic.
// I'll keep it simple for now or add a small scroll effect if I had state.
// Actually let's just use hover-like behavior or keep it simple.
