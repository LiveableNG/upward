'use client'
const originalToLocaleString = Number.prototype.toLocaleString;
Number.prototype.toLocaleString = function (locales, options) {
  return originalToLocaleString.call(this, locales || 'en-US', options);
};

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'

import { ToastProvider } from '@/components/common/Toast'
import { ThemeProvider } from '@/features/dashboard/components/ThemeProvider'
import { GlobalPaymentSuccessModal } from '@/components/common/GlobalPaymentSuccessModal'
import { request } from '@/lib/api-client'

export default function Providers({ children }: { children: React.ReactNode }) {
  // ... existing setup ...
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 0,
            refetchOnWindowFocus: true,
            refetchOnReconnect: true,
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
        
        if (Capacitor.isNativePlatform()) {
          if (targetPath.startsWith('/invite/')) {
            const t = targetPath.split('/invite/')[1]?.split(/[?#]/)[0]
            if (t) {
              const extraSearch = url.search ? `&${url.search.replace(/^\?/, '')}` : ''
              const dest = `/signup?mode=invite&token=${t}${extraSearch}`
              console.log('[DeepLink] Native routing to:', dest)
              router.push(dest)
              return
            }
          } else if (targetPath.startsWith('/waitlist/')) {
            const t = targetPath.split('/waitlist/')[1]?.split(/[?#]/)[0]
            if (t) {
              const extraSearch = url.search ? `&${url.search.replace(/^\?/, '')}` : ''
              const dest = `/signup?mode=waitlist&uuid=${t}${extraSearch}`
              console.log('[DeepLink] Native routing to:', dest)
              router.push(dest)
              return
            }
          } else if (targetPath.startsWith('/welcome/')) {
            const t = targetPath.split('/welcome/')[1]?.split(/[?#]/)[0]
            if (t) {
              const extraSearch = url.search ? `&${url.search.replace(/^\?/, '')}` : ''
              const dest = `/signup?mode=priority&uuid=${t}${extraSearch}`
              console.log('[DeepLink] Native routing to:', dest)
              router.push(dest)
              return
            }
          }
        }

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

  useEffect(() => {
    const trackAppInstall = async () => {
      try {
        const isTrackingDone = localStorage.getItem('upward_pay_install_tracked')
        if (!isTrackingDone) {
          const platform = Capacitor.getPlatform()
          
          let installationId = localStorage.getItem('upward_pay_installation_id')
          if (!installationId) {
            installationId = crypto.randomUUID()
            localStorage.setItem('upward_pay_installation_id', installationId)
          }

          await request('/public/tracking/install', {
            method: 'POST',
            body: JSON.stringify({
              platform,
              installationId,
              deviceModel: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
              osVersion: typeof window !== 'undefined' ? window.navigator.platform : 'unknown',
            }),
          })
          
          localStorage.setItem('upward_pay_install_tracked', 'true')
        }
      } catch (err) {
        console.error('Failed to track app install:', err)
      }
    }

    trackAppInstall()
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>
          {children}
          <GlobalPaymentSuccessModal />
        </ToastProvider>
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
