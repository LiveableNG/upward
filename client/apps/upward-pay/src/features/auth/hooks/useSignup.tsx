import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signup as authSignup } from '../services/authService'
import { useAuth } from '../AuthContext'

export function useSignup(redirect: string = '/dashboard') {
  const router = useRouter()
  const { login: setAuthUser } = useAuth()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function signup(data: {
    email: string
    password: string
    fullName: string
    phone?: string
  }) {
    if (!data.email || !data.password || !data.fullName) {
      setError('Please fill in all required fields')
      return
    }

    setLoading(true)
    setError('')

    try {
      const result = await authSignup(data)
      setAuthUser(result.tenant)

      router.push(redirect)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return {
    signup,
    loading,
    error,
  }
}
