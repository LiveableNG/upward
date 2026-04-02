import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { login as authLogin } from '../services/authService'
import { useAuth } from '../AuthContext'

export function useLogin(redirect: string) {
  const router = useRouter()
  const { login: setAuthUser } = useAuth()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function login(email: string, password: string) {
    if (!email || !password) return

    setLoading(true)
    setError('')

    try {
      const result = await authLogin({ email, password })

      setAuthUser(result.tenant)

      router.push(redirect)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return {
    login,
    loading,
    error,
  }
}
