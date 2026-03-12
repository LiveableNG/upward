import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Upwards by GoodTenants — Build With Your Rent',
    template: '%s | Upwards by GoodTenants',
  },
  description:
    'Track rent payments, build your Rent Passport, and unlock low-cost home financing. The platform for responsible, hardworking African renters.',
  keywords: ['rent passport', 'rental history', 'home financing', 'Nigeria', 'Africa', 'GoodTenants', 'upwards'],
  openGraph: {
    title: 'Upwards by GoodTenants — Build With Your Rent',
    description: 'Unlock access to structured, low-cost home financing. Build credibility while you rent.',
    siteName: 'Upwards by GoodTenants',
    locale: 'en_NG',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Upwards by GoodTenants',
    description: 'Build your Rent Passport. Unlock home financing.',
  },
  robots: { index: true, follow: true },
  icons: {
    icon: '/favicon.svg',
  },
}

const GA_ID = process.env['NEXT_PUBLIC_GA_ID']

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
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
