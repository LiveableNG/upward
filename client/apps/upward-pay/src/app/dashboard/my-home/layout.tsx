'use client'

import { useEffect } from 'react'
import { MyHomePropertyProvider } from '@/features/my-home/context/MyHomePropertyContext'
import '@/styles/my-home.css'
import '@/features/dashboard/styles/goals-dashboard.css'

export default function MyHomeLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof document === 'undefined') return
    document.body.classList.add('hide-subscreen-nav')
    return () => {
      document.body.classList.remove('hide-subscreen-nav')
    }
  }, [])

  return <MyHomePropertyProvider>{children}</MyHomePropertyProvider>
}
