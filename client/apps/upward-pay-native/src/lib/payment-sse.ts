import { API_BASE_URL } from '@/lib/config'
import { getAccessToken } from '@/lib/auth-storage'

export type PaymentSsePayload = {
  type?: string
  [key: string]: unknown
}

function parseSseChunk(chunk: string, onEvent: (data: PaymentSsePayload) => void) {
  const lines = chunk.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('data:')) continue
    const jsonText = trimmed.slice(5).trim()
    if (!jsonText) continue
    try {
      onEvent(JSON.parse(jsonText) as PaymentSsePayload)
    } catch {
      // Ignore malformed frames.
    }
  }
}

/** Opens a long-lived SSE stream using XMLHttpRequest (works on React Native). */
export function connectPaymentSse(options: {
  userUuid: string
  onEvent: (data: PaymentSsePayload) => void
  onDisconnect?: () => void
}): () => void {
  let xhr: XMLHttpRequest | null = null
  let bufferLength = 0
  let closed = false

  void (async () => {
    const token = await getAccessToken()
    if (closed) return

    xhr = new XMLHttpRequest()
    xhr.open('GET', `${API_BASE_URL}/payments/sse/${options.userUuid}`)
    xhr.setRequestHeader('Accept', 'text/event-stream')
    xhr.setRequestHeader('Cache-Control', 'no-cache')
    xhr.setRequestHeader('x-client-platform', 'react-native')
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    }

    xhr.onprogress = () => {
      if (!xhr) return
      const text = xhr.responseText
      const chunk = text.slice(bufferLength)
      bufferLength = text.length
      if (chunk) parseSseChunk(chunk, options.onEvent)
    }

    xhr.onerror = () => {
      if (!closed) options.onDisconnect?.()
    }

    xhr.onloadend = () => {
      if (!closed) options.onDisconnect?.()
    }

    xhr.send()
  })()

  return () => {
    closed = true
    xhr?.abort()
    xhr = null
  }
}
