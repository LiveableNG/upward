import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import { StructuredData } from '@/components/layout/structured-data'
import './globals.css'

export const viewport: Viewport = {
  themeColor: '#D97757',
  width: 'device-width',
  initialScale: 1,
}

export const metadata: Metadata = {
  metadataBase: new URL('https://upward.goodtenants.io'),
  title: {
    default: 'Upward by GoodTenants — Build With Your Rent',
    template: '%s | Upward by GoodTenants',
  },
  description:
    'Track rent payments, build your Rent Passport, and unlock low-cost home financing. The platform for responsible, hardworking African renters.',
  keywords: [
    'rent passport',
    'rental history',
    'home financing',
    'Nigeria',
    'Africa',
    'GoodTenants',
    'upward',
    'property management',
  ],
  authors: [{ name: 'GoodTenants' }],
  creator: 'GoodTenants',
  publisher: 'GoodTenants',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Upward by GoodTenants — Build With Your Rent',
    description:
      'Unlock access to structured, low-cost home financing. Build credibility while you rent.',
    url: 'https://upward.goodtenants.io',
    siteName: 'Upward by GoodTenants',
    images: [
      {
        url: '/branding/favicon.jpg',
        width: 800,
        height: 600,
        alt: 'Upward by GoodTenants — Build With Your Rent',
      },
    ],
    locale: 'en_NG',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Upward by GoodTenants',
    description: 'Build your Rent Passport. Unlock home financing.',
    images: ['/branding/favicon.jpg'],
    creator: '@goodtenants',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/branding/favicon.jpg', type: 'image/jpeg' },
    ],
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
}

const GA_ID = process.env['NEXT_PUBLIC_GA_ID']

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap"
          rel="stylesheet"
        />
        <StructuredData />
      </head>
      <body suppressHydrationWarning>
        {children}

        {GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}', { page_path: window.location.pathname });
              `}
            </Script>
          </>
        )}
      </body>
    </html>
  )
}
