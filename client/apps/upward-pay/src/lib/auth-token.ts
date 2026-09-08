let inMemoryToken: string | null = null

export const setAccessToken = (token: string | null) => {
  inMemoryToken = token
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('upward_pay_access_token', token)
    } else {
      localStorage.removeItem('upward_pay_access_token')
    }
  }
}

export const getAccessToken = () => {
  if (!inMemoryToken && typeof window !== 'undefined') {
    inMemoryToken = localStorage.getItem('upward_pay_access_token')
  }
  return inMemoryToken
}



