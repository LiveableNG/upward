import React from 'react'
import type { Metadata } from 'next'
import Script from 'next/script'
import { Inter } from 'next/font/google'
import "./globals.css";

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

import { Providers } from "@/components/common/Providers";
import { AppLayout } from "@/components/layout/AppLayout";

export const metadata: Metadata = {
  title: {
    template: '%s | Upward PM',
    default: 'Upward PM — Property Management Redefined',
  },
  description: 'Manage your properties, tenants, and payments with ease. The all-in-one solution for modern property managers.',
  icons: {
    icon: '/favicon.svg',
  },
}

export const viewport: import('next').Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

const GA_ID = process.env.NEXT_PUBLIC_GA_ID

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className={inter.className}>
        <Providers>
          <AppLayout>
            {children}
          </AppLayout>
        </Providers>

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
                gtag('config', '${GA_ID}', { page_path: '/pm' + window.location.pathname });
              `}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
