'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { App } from '@capacitor/app'
import { isLoggedIn } from '@/lib/auth'

export default function AppDeepLinkHandler() {
  const router = useRouter()

  useEffect(() => {
    // Initial check for launch URL
    App.getLaunchUrl().then((launchUrl) => {
      if (launchUrl?.url) {
        handleUrl(launchUrl.url)
      }
    })

    const listenerPromise = App.addListener('appUrlOpen', (data) => {
      handleUrl(data.url)
    })

    function handleUrl(url: string) {
      try {
        console.log('App URL opened:', url)
        // Skip current simulation/page from link, go to login/dashboard
        if (isLoggedIn()) {
          router.push('/dashboard')
        } else {
          router.push('/login')
        }
      } catch (err) {
        console.error('Deep link error:', err)
      }
    }

    return () => {
      listenerPromise.then(handle => handle.remove())
    }
  }, [router])

  return null
}
