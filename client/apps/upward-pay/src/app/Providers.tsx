'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'

import { ToastProvider } from '@/components/common/Toast'
import { ThemeProvider } from '@/features/dashboard/components/ThemeProvider'

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      }),
  )

  const router = useRouter()

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    const setupDeepLink = async () => {
      await App.addListener('appUrlOpen', (event: any ) => {
        // Handle both https://domain.com/path and upward://pay/path
        const url = new URL(event.url)
        let path = url.pathname

        // For custom schemes like upward://pay/dashboard, path might be empty and host is 'pay'
        // If it's a custom scheme, we might need to adjust
        if (url.protocol === 'upward:') {
           // upward://pay/dashboard -> /dashboard
           path = url.pathname || '/'
        }

        if (path) {
          router.push(path)
        }
      })
    }

    setupDeepLink()

    return () => {
      App.removeAllListeners()
    }
  }, [router])

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>{children}</ToastProvider>
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
