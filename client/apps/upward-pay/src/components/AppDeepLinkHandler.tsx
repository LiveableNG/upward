'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { App } from '@capacitor/app'

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
        const parsedUrl = new URL(url)
        const path = parsedUrl.pathname
        const token = parsedUrl.searchParams.get('token')

        if (path === '/pay' && token) {
          router.push(`/pay?token=${token}`)
        } else if (path === '/dashboard') {
          router.push('/dashboard')
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
