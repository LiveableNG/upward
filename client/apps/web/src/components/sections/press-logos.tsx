'use client'

export function PressLogos() {
  const press = [
    {
      src: '/featured/01.png',
      alt: 'BusinessDay',
      link: 'https://businessday.ng/companies/article/technology-seen-enabling-property-industry-growth/',
    },
    {
      src: '/featured/02.png',
      alt: 'Channels TV',
      link: 'https://www.channelstv.com/',
    },
    {
      src: '/featured/03.webp',
      alt: 'City People',
      link: 'https://citypeopleonline.com/',
    },
    {
      src: '/featured/04.png',
      alt: 'Guardian',
      link: 'https://guardian.ng/',
    },
    {
      src: '/featured/05.png',
      alt: 'Leadership',
      link: 'https://leadership.ng/',
    },
    {
      src: '/featured/06.png',
      alt: 'The Sun',
      link: 'https://thesun.ng/deploy-data-tech-to-unlock-property-industrys-potential-deremi-atanda-advises-operators-startups/',
    },
    {
      src: '/featured/07.png',
      alt: 'TechEconomy',
      link: 'https://techeconomy.ng/proptech-deploy-data-tech-to-unlock-property-industrys-potential-atanda-advices-operators-startups/',
    },
  ]

  return (
    <div
      style={{
        marginTop: '24px',
        paddingTop: '24px',
        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        animation: 'fadeUp 0.7s 0.6s ease both',
        maxWidth: '700px',
      }}
    >
      <p
        style={{
          fontSize: '10px',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
          marginBottom: '20px',
          opacity: 0.6,
        }}
      >
        As seen on
      </p>
      <div
        style={{
          display: 'flex',
          gap: '40px',
          alignItems: 'center',
          flexWrap: 'wrap',
          transition: 'all 0.4s ease',
        }}
        className="press-logos-container"
      >
        {press.map((logo, i) => (
          <a
            key={i}
            href={logo.link}
            target="_blank"
            rel="noopener noreferrer"
            className="press-logo-item"
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              textDecoration: 'none',
              transition: 'transform 0.2s ease',
            }}
          >
            <img
              src={logo.src}
              alt={logo.alt}
              style={{ height: '22px', width: 'auto', objectFit: 'contain', opacity: 0.8 }}
            />
            <span className="press-tooltip">{logo.alt}</span>
          </a>
        ))}
      </div>
      <style>{`
        .press-logo-item:hover {
          transform: translateY(-2px);
        }
        .press-logo-item:hover img {
          opacity: 1 !important;
        }
        .press-tooltip {
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%) translateY(0);
          background: var(--surface2);
          color: var(--text);
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 600;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transition: all 0.2s ease;
          border: 1px solid var(--border);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          margin-bottom: 10px;
          z-index: 10;
        }
        .press-logo-item:hover .press-tooltip {
          opacity: 1;
          transform: translateX(-50%) translateY(-4px);
        }
        .press-tooltip::after {
          content: '';
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          border-width: 5px;
          border-style: solid;
          border-color: var(--border) transparent transparent transparent;
        }
      `}</style>
    </div>
  )
}
