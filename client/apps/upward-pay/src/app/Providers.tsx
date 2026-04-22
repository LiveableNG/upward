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
      // Handle links while app is already open
      await App.addListener('appUrlOpen', (event: any) => {
        handleUrl(event.url)
      })

      // Handle the link that launched the app
      const launchUrl = await App.getLaunchUrl()
      if (launchUrl?.url) {
        handleUrl(launchUrl.url)
      }
    }

    const handleUrl = async (urlString: string) => {
      console.log('[DeepLink] Received URL:', urlString)
      try {
        const url = new URL(urlString)
        
        let targetPath = ''
        if (url.protocol === 'upward:') {
          // For custom schemes like upward://pay/uuid, url.host is 'pay' and url.pathname is '/uuid'
          targetPath = `/${url.host}${url.pathname}${url.search}${url.hash}`
        } else {
          // For https links, we just want the path onwards
          targetPath = `${url.pathname}${url.search}${url.hash}`
        }

        // Ensure it's a valid relative path for the router
        if (!targetPath.startsWith('/')) {
          targetPath = '/' + targetPath
        }

        console.log('[DeepLink] Navigating to:', targetPath)
        
        // Give the router a moment to be ready, especially on cold starts
        if (Capacitor.isNativePlatform()) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
        
        router.push(targetPath)
      } catch (error) {
        console.error('Deep Link Error:', error)
      }
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
