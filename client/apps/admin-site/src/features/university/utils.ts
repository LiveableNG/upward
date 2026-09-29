import { showToast } from '@upward/client-core'

export const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export const copyTrackingLink = (
  identifier: string,
  targetUrl = '/academy',
  onSuccess?: () => void
): void => {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://upward.ng'
  let fullUrl = `${origin}/academy/${identifier}`
  if (targetUrl && targetUrl.includes('/apply')) {
    fullUrl = `${origin}/academy/apply?ref=${identifier}`
  } else if (targetUrl && targetUrl !== '/academy' && targetUrl !== '/university') {
    fullUrl = `${origin}${targetUrl}${targetUrl.includes('?') ? '&' : '?'}ref=${identifier}`
  }

  navigator.clipboard
    .writeText(fullUrl)
    .then(() => {
      showToast('Tracking link copied to clipboard!')
      if (onSuccess) onSuccess()
    })
    .catch(() => {
      showToast('Could not copy link', true)
    })
}

export const getChannelBadgeTheme = (
  channel: string
): { bg: string; color: string; border: string } => {
  const ch = (channel || 'OTHER').toUpperCase()
  const colorMap: Record<string, { bg: string; color: string; border: string }> = {
    INSTAGRAM: { bg: '#fdf2f8', color: '#db2777', border: '#fbcfe8' },
    FACEBOOK: { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
    TIKTOK: { bg: '#f3f4f6', color: '#111827', border: '#e5e7eb' },
    TWITTER: { bg: '#f0f9ff', color: '#0284c7', border: '#bae6fd' },
    WHATSAPP: { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
    FLYER: { bg: '#fef3c7', color: '#b45309', border: '#fde68a' },
    INFLUENCER: { bg: '#f5f3ff', color: '#7c3aed', border: '#ddd6fe' },
    YOUTUBE: { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
    OTHER: { bg: '#f8fafc', color: '#475569', border: '#e2e8f0' },
  }
  return colorMap[ch] || colorMap.OTHER
}
