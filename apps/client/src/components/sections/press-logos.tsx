'use client'

export function PressLogos() {
    const press = [
        { src: '/featured/01.png', alt: 'Press 1' },
        { src: '/featured/02.png', alt: 'Press 2' },
        { src: '/featured/03.webp', alt: 'Press 3' },
        { src: '/featured/04.png', alt: 'Press 4' },
        { src: '/featured/05.png', alt: 'Press 5' },
        { src: '/featured/06.png', alt: 'Press 6' },
        { src: '/featured/07.png', alt: 'Press 7' },
    ]

    return (
        <div style={{
            marginTop: '40px',
            paddingTop: '32px',
            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
            animation: 'fadeUp 0.7s 0.6s ease both'
        }}>
            <p style={{
                fontSize: '10px',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: 'var(--muted)',
                marginBottom: '20px',
                opacity: 0.7
            }}>
                As seen on
            </p>
            <div style={{
                display: 'flex',
                gap: '32px',
                alignItems: 'center',
                flexWrap: 'wrap',
                filter: 'grayscale(1) contrast(0.8)',
                opacity: 0.4
            }}>
                {press.map((logo, i) => (
                    <img
                        key={i}
                        src={logo.src}
                        alt={logo.alt}
                        style={{ height: '20px', width: 'auto', objectFit: 'contain' }}
                    />
                ))}
            </div>
        </div>
    )
}
