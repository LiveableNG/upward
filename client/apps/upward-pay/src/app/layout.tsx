import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { AuthProvider } from '@/features/auth/AuthContext'
import Providers from './Providers'
import { SmartAppBanner } from '@/components/common/SmartAppBanner'
import './globals.css'

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
})


export const metadata: Metadata = {
  title: 'Upward Pay — Secure Rent Payments',
  description:
    'Pay rent securely, get verified receipts, and build your payment credibility with Upward.',
  icons: {
    icon: '/favicon.svg',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable}`} suppressHydrationWarning>
      <head>
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('upward-theme');
                  const supportDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches === true;
                  if (theme === 'dark' || (theme === 'system' && supportDarkMode) || (!theme && supportDarkMode)) {
                    document.documentElement.classList.add('theme--dark');
                  } else {
                    document.documentElement.classList.add('theme--light');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <Providers>
          <AuthProvider>
            <SmartAppBanner />
            {children}
          </AuthProvider>
        </Providers>
      </body>
    </html>
  )
}
