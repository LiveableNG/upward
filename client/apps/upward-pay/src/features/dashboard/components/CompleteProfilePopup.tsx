'use client'

import React, { useEffect, useState } from 'react'
import { Rocket, ShieldCheck, ArrowRight, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function CompleteProfilePopup() {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const hasSeen = localStorage.getItem('has_seen_complete_profile_popup')
    if (!hasSeen) {
      const timer = setTimeout(() => setIsOpen(true), 1500)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleClose = () => {
    localStorage.setItem('has_seen_complete_profile_popup', 'true')
    setIsOpen(false)
  }

  const handleGo = () => {
    handleClose()
    router.push('/dashboard/profile')
  }

  if (!isOpen) return null

  return (
    <div className="profile-popup-overlay">
      <div className="profile-popup">
        <button className="profile-popup__close" onClick={handleClose}>
          <X size={20} />
        </button>
        
        <div className="profile-popup__icon">
          <Rocket size={40} color="var(--clay)" />
        </div>
        
        <h2 className="profile-popup__title">Boost Your Credibility</h2>
        <p className="profile-popup__text">
          Complete your profile details to unlock your verified credibility score and gain access to better rent financial tools.
        </p>
        
        <div className="profile-popup__benefit">
          <ShieldCheck size={18} color="#22c55e" />
          <span>Verified ID & Address</span>
        </div>
        
        <button className="btn btn--primary btn--full" onClick={handleGo}>
          Complete Now <ArrowRight size={18} />
        </button>
      </div>

      <style jsx>{`
        .profile-popup-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          padding: 1.5rem;
          animation: fadeIn 0.3s ease;
        }

        .profile-popup {
          background: var(--surface);
          border-radius: 24px;
          padding: 2.5rem 2rem;
          max-width: 400px;
          width: 100%;
          text-align: center;
          position: relative;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
          animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .profile-popup__close {
          position: absolute;
          top: 1rem;
          right: 1rem;
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 50%;
          transition: background 0.2s;
        }

        .profile-popup__close:hover {
          background: var(--bg);
        }

        .profile-popup__icon {
          width: 80px;
          height: 80px;
          background: var(--clay-faint);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1.5rem;
        }

        .profile-popup__title {
          font-size: 1.5rem;
          font-weight: 800;
          margin-bottom: 0.75rem;
          color: var(--text);
        }

        .profile-popup__text {
          color: var(--text-muted);
          font-size: 0.95rem;
          line-height: 1.6;
          margin-bottom: 1.5rem;
        }

        .profile-popup__benefit {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          background: #f0fdf4;
          color: #166534;
          font-weight: 700;
          font-size: 0.85rem;
          padding: 0.6rem 1rem;
          border-radius: 12px;
          margin-bottom: 2rem;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
