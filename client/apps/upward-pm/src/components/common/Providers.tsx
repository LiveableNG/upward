'use client'

import React, { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from './Toast'
import { AuthProvider } from '@/features/auth/AuthContext'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        retry: 1,
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          {children}
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  )
}
