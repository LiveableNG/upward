import React from 'react'
import type { Metadata } from 'next'
import "../styles/variables.css";
import "./globals.css";
import "../styles/sidebar.css";
import "../styles/header.css";
import "../styles/dashboard.css";
import "../styles/settings.css";
import "../styles/splash.css";
import "../styles/properties.css";
import "../styles/tenants.css";
import "../styles/payments.css";
import "../styles/toast.css";
import "../styles/features/requests.css";
import "../styles/auth.css";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <AppLayout>
            {children}
          </AppLayout>
        </Providers>
      </body>
    </html>
  );
}
