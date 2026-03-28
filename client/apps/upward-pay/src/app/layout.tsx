import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import AppDeepLinkHandler from '@/components/AppDeepLinkHandler'

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'Upward Pay — Secure Rent Payments',
  description:
    'Pay rent securely, get verified receipts, and build your payment credibility with Upward.',
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
    <html lang="en" className={`${inter.variable}`}>
      <head></head>
      <body>
        <AppDeepLinkHandler />
        {children}
      </body>
    </html>
  )
}
