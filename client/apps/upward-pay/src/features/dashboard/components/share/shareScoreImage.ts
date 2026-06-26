import { Capacitor } from '@capacitor/core'

export const SHARE_SCORE_CAPTURE_ID = 'share-score-story-capture'

export function getScoreRankColor(rank: string, isScorable: boolean, isVerified: boolean): string {
  if (!isScorable || !isVerified) return '#928e89'
  if (rank === 'A') return '#d97757'
  if (rank === 'B') return '#22c55e'
  if (rank === 'C') return '#3b82f6'
  if (rank === 'D') return '#f59e0b'
  return '#ef4444'
}

export function getProfileShareUrl(profileUuid: string): string {
  const defaultWebUrl = process.env.NEXT_PUBLIC_WEB_URL || 'https://upward.goodtenants.io'
  const baseUrl = Capacitor.isNativePlatform()
    ? defaultWebUrl
    : typeof window !== 'undefined'
      ? window.location.origin
      : defaultWebUrl

  return `${baseUrl}/profile/${profileUuid}`
}

export async function generateQrDataUrl(url: string): Promise<string> {
  const QRCode = (await import('qrcode')).default
  return QRCode.toDataURL(url, {
    width: 200,
    margin: 1,
    color: { dark: '#1a1714', light: '#ffffff' },
  })
}

export async function generateScoreShareImage(elementId: string = SHARE_SCORE_CAPTURE_ID): Promise<Blob> {
  const element = document.getElementById(elementId)
  if (!element) {
    throw new Error('Share card element not found')
  }

  const html2canvas = (await import('html2canvas')).default
  const canvas = await html2canvas(element, {
    scale: 1,
    useCORS: true,
    logging: false,
    backgroundColor: '#faf9f5',
    width: 1080,
    height: 1920,
  })

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Failed to generate image'))
      },
      'image/png',
      1,
    )
  })
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function shareScoreImageBlob(
  blob: Blob,
  filename: string,
  shareText: string,
): Promise<'shared' | 'downloaded'> {
  if (Capacitor.isNativePlatform()) {
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem')
      const { Share } = await import('@capacitor/share')

      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          const result = reader.result as string
          if (result) resolve(result.split(',')[1])
          else reject(new Error('Failed to convert blob to base64'))
        }
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })

      const writeResult = await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: Directory.Cache,
      })

      await Share.share({
        title: 'My Upward Score',
        text: shareText,
        url: writeResult.uri,
      })

      return 'shared'
    } catch (err) {
      console.error('Native score image sharing failed:', err)
    }
  }

  try {
    const file = new File([blob], filename, { type: 'image/png' })

    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: 'My Upward Score',
        text: shareText,
      })
      return 'shared'
    }
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') {
      throw err
    }
    console.error('Web score image sharing failed:', err)
  }

  downloadBlob(blob, filename)
  return 'downloaded'
}
