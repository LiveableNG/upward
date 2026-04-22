export function setCookie(name: string, value: string, days: number = 7) {
  if (typeof document === 'undefined') return
  
  const expires = new Date()
  expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000))
  
  const secure = window.location.protocol === 'https:' ? 'Secure;' : ''
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;${secure}SameSite=Lax`
}

export function deleteCookie(name: string) {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`
}
