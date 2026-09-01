"use client"

import { useState, useEffect } from 'react'
import { tenantService } from '../services/tenantService'

export interface FoundUser {
  firstName: string
  lastName: string
  email: string
  phone?: string | null
}

export function useUserLookup(email?: string, phone?: string) {
  const [foundUser, setFoundUser] = useState<FoundUser | null>(null)
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    const trimmedEmail = email?.trim()
    const trimmedPhone = phone?.trim()

    // Require valid basic length to search
    const hasValidEmail = !!trimmedEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)
    const hasValidPhone = !!trimmedPhone && trimmedPhone.length >= 8

    if (!hasValidEmail && !hasValidPhone) {
      setFoundUser(null)
      setIsSearching(false)
      return
    }

    setIsSearching(true)

    const timer = setTimeout(async () => {
      try {
        const queryParams: { email?: string; phone?: string } = {}
        if (hasValidEmail) queryParams.email = trimmedEmail
        else if (hasValidPhone) queryParams.phone = trimmedPhone

        const res = await tenantService.lookupUser(queryParams)
        if (res?.exists && res.user) {
          setFoundUser(res.user)
        } else {
          setFoundUser(null)
        }
      } catch (e) {
        // Fail silently
        setFoundUser(null)
      } finally {
        setIsSearching(false)
      }
    }, 400) // Debounce fast search

    return () => clearTimeout(timer)
  }, [email, phone])

  return { foundUser, isSearching }
}
