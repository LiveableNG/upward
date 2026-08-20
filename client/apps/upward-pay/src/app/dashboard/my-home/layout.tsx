'use client'

import { MyHomePropertyProvider } from '@/features/my-home/context/MyHomePropertyContext'
import '@/styles/my-home.css'

export default function MyHomeLayout({ children }: { children: React.ReactNode }) {
  return <MyHomePropertyProvider>{children}</MyHomePropertyProvider>
}
