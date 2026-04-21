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
      await App.addListener('appUrlOpen', (event: any) => {
        try {
          const url = new URL(event.url)
          // Capture path + query + hash to ensure no data (like invite tokens) is lost
          let targetPath = url.pathname + url.search + url.hash

          // For custom schemes like upward://pay/path, ensuring targetPath starts with /
          if (!targetPath.startsWith('/')) {
            targetPath = '/' + targetPath
          }

          router.push(targetPath)
        } catch (error) {
          console.error('Deep Link Error:', error)
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
