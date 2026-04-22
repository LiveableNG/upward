let inMemoryToken: string | null = null

export const setAccessToken = (token: string | null) => {
  inMemoryToken = token
}

export const getAccessToken = () => {
  return inMemoryToken
}


