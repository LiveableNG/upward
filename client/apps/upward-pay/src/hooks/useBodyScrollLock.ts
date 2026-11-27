'use client'

import { useEffect } from 'react'

let lockCount = 0
let originalHtmlOverflow = ''
let originalBodyOverflow = ''
let originalBodyPosition = ''
let originalBodyTop = ''
let originalBodyLeft = ''
let originalBodyRight = ''
let originalBodyWidth = ''
let savedScrollY = 0

/**
 * Robust, cross-platform scroll locking for modals, bottom sheets, and drawers.
 * Uses reference counting so nested or sequentially opened modals/sheets
 * (e.g. Cart Drawer -> Checkout Modal -> Delivery Coverage Zone Picker)
 * maintain scroll lock without leaking background scrolling or losing scroll position.
 */
export function lockBodyScroll() {
  if (typeof window === 'undefined') return

  if (lockCount === 0) {
    savedScrollY =
      window.scrollY ||
      window.pageYOffset ||
      document.documentElement.scrollTop ||
      0

    originalHtmlOverflow = document.documentElement.style.overflow
    originalBodyOverflow = document.body.style.overflow
    originalBodyPosition = document.body.style.position
    originalBodyTop = document.body.style.top
    originalBodyLeft = document.body.style.left
    originalBodyRight = document.body.style.right
    originalBodyWidth = document.body.style.width

    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.top = `-${savedScrollY}px`
    document.body.style.left = '0'
    document.body.style.right = '0'
    document.body.style.width = '100%'
  }
  lockCount++
}

export function unlockBodyScroll() {
  if (typeof window === 'undefined') return

  lockCount = Math.max(0, lockCount - 1)
  if (lockCount === 0) {
    const prevScrollBehavior = document.documentElement.style.scrollBehavior
    document.documentElement.style.scrollBehavior = 'auto'

    document.documentElement.style.overflow = originalHtmlOverflow
    document.body.style.overflow = originalBodyOverflow
    document.body.style.position = originalBodyPosition
    document.body.style.top = originalBodyTop
    document.body.style.left = originalBodyLeft
    document.body.style.right = originalBodyRight
    document.body.style.width = originalBodyWidth

    window.scrollTo({ top: savedScrollY, left: 0, behavior: 'instant' as ScrollBehavior })
    document.documentElement.style.scrollBehavior = prevScrollBehavior
  }
}

export function useBodyScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (!isLocked) return

    lockBodyScroll()
    return () => {
      unlockBodyScroll()
    }
  }, [isLocked])
}
