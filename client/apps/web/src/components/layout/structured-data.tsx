import React from 'react'

export function StructuredData() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': 'https://goodtenants.io#organization',
    name: 'GoodTenants',
    url: 'https://goodtenants.io',
    logo: 'https://goodtenants.io/favicon.svg',
    sameAs: ['https://twitter.com/goodtenants', 'https://linkedin.com/company/goodtenants'],
  }

  const projectLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Upward',
    url: 'https://upward.ng',
    description: 'Track rent payments, build your Rent Passport, and unlock home financing.',
    publisher: {
      '@id': 'https://goodtenants.io#organization',
    },
    copyrightHolder: {
      '@id': 'https://goodtenants.io#organization',
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(projectLd) }}
      />
    </>
  )
}
