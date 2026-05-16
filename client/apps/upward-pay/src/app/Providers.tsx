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
            staleTime: 5 * 60 * 1000,
            refetchOnWindowFocus: false,
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
        console.log('[Providers] appUrlOpen event:', event.url)
        handleUrl(event.url)
      })

      // Handle the link that launched the app
      const launchUrl = await App.getLaunchUrl()
      console.log('[Providers] getLaunchUrl result:', launchUrl)
      if (launchUrl?.url) {
        handleUrl(launchUrl.url)
      }
    }

    const handleUrl = async (urlString: string) => {
      console.log('[DeepLink] Processing URL:', urlString)
      try {
        const url = new URL(urlString)
        
        let targetPath = ''
        if (url.protocol === 'upward:') {
          targetPath = `/${url.host}${url.pathname}${url.search}${url.hash}`
        } else {
          targetPath = `${url.pathname}${url.search}${url.hash}`
        }

        if (!targetPath.startsWith('/')) {
          targetPath = '/' + targetPath
        }

        console.log('[DeepLink] Final targetPath:', targetPath)
        
        // Give the router a moment to be ready
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        console.log('[DeepLink] Executing router.push:', targetPath)
        router.push(targetPath)
      } catch (error) {
        console.error('[DeepLink] Error handling URL:', error)
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
