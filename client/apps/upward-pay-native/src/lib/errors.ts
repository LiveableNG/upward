type ApiErrorShape = {
  message?: string | { message?: string }
  data?: { message?: string | { message?: string } }
}

export function getErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (!error) return fallback
  if (typeof error === 'string') return error
  if (error instanceof Error && error.message && error.message !== '[object Object]') {
    return error.message
  }

  const shaped = error as ApiErrorShape
  const nested = shaped.data?.message ?? shaped.message
  if (typeof nested === 'string') return nested
  if (nested && typeof nested === 'object' && nested.message) return nested.message

  return fallback
}
