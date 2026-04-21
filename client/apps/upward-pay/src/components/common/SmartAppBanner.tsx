'use client'

import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { Capacitor } from '@capacitor/core'
import { UpwardLogo } from '../PoweredByUpward'

export const SmartAppBanner = () => {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // 1. Never show inside the Capacitor native app
    if (Capacitor.isNativePlatform()) return

    // 2. Check if user has dismissed it before in this session/device
    const isDismissed = localStorage.getItem('upward-banner-dismissed')
    if (isDismissed) return

    // 3. Only show on mobile browsers
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    if (isMobile) {
      setIsVisible(true)
      document.body.classList.add('has-smart-banner')
    }

    return () => {
      document.body.classList.remove('has-smart-banner')
    }
  }, [])

  const handleClose = () => {
    localStorage.setItem('upward-banner-dismissed', 'true')
    setIsVisible(false)
    document.body.classList.remove('has-smart-banner')
  }

  const handleOpenApp = () => {
    const start = Date.now()
    window.location.href = 'upward://pay/dashboard'
    setTimeout(() => {
      if (Date.now() - start < 3000) {
        window.location.href = 'https://play.google.com/store/apps/details?id=com.upward.pay'
      }
    }, 2000)
  }

  if (!isVisible) return null

  return (
    <div className="smart-banner">
      <div className="smart-banner__content">
        <button 
          className="smart-banner__close" 
          onClick={handleClose}
          aria-label="Close banner"
        >
          <X size={18} />
        </button>
        <div className="smart-banner__icon">
          <UpwardLogo size={28} />
        </div>
        <div className="smart-banner__info">
          <span className="smart-banner__title">Upward Pay</span>
          <span className="smart-banner__subtitle">Seamless rent payments</span>
        </div>
      </div>
      <button className="smart-banner__btn" onClick={handleOpenApp}>
        Get App
      </button>
    </div>
  )
}
