import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import { StructuredData } from '@/components/layout/structured-data'
import { ThemeProvider } from '@/components/ThemeProvider'
import { ToastProvider } from '@/components/common/Toast'
import './globals.css'
import '@/styles/legal.css'

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#141413' },
  ],
  width: 'device-width',
  initialScale: 1,
}

const webUrl = process.env.NEXT_PUBLIC_WEB_URL || 'https://upward.goodtenants.io'

export const metadata: Metadata = {
  metadataBase: new URL(webUrl),
  title: {
    default: 'Upward — Build With Your Rent',
    template: '%s | Upward',
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
    title: 'Upward — Build With Your Rent',
    description:
      'Unlock access to structured, low-cost home financing. Build credibility while you rent.',
    url: webUrl,
    siteName: 'Upward',
    images: [
      {
        url: '/branding/favicon.jpg',
        width: 800,
        height: 600,
        alt: 'Upward — Build With Your Rent',
      },
    ],
    locale: 'en_NG',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Upward',
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
    icon: '/favicon.svg',
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
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  // Default to light mode (dark mode support is temporarily disabled)
                  document.documentElement.classList.add('theme--light');
                  /*
                  const theme = localStorage.getItem('upward-theme');
                  const supportDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches === true;
                  if (theme === 'dark' || (theme === 'system' && supportDarkMode) || (!theme && supportDarkMode)) {
                    document.documentElement.classList.add('theme--dark');
                  } else {
                    document.documentElement.classList.add('theme--light');
                  }
                  */
                } catch (e) {}
              })();
            `,
          }}
        />
        <StructuredData />
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </ThemeProvider>

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
