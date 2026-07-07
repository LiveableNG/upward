'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Building2, MapPin, CheckCircle2 } from 'lucide-react'

interface InvoiceHeaderProps {
  companyName: string
  description: string
  logo?: string
  propertyAddress?: string
  isVerified?: boolean
}

export function InvoiceHeader({ companyName, description, logo, propertyAddress, isVerified }: InvoiceHeaderProps) {
  const [showFullAddress, setShowFullAddress] = useState(false)
  const addressRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showFullAddress) return;
    const closePopup = (e: Event) => {
      if (addressRef.current && !addressRef.current.contains(e.target as Node)) {
        setShowFullAddress(false);
      }
    };
    document.addEventListener('mousedown', closePopup);
    document.addEventListener('touchstart', closePopup);
    window.addEventListener('scroll', closePopup, { passive: true });
    return () => {
      document.removeEventListener('mousedown', closePopup);
      document.removeEventListener('touchstart', closePopup);
      window.removeEventListener('scroll', closePopup);
    };
  }, [showFullAddress]);
  return (
    <header className="pay-invoice-header">
      <div className="pay-invoice-header__brand">
        {logo ? (
          <img src={logo} alt={companyName} className="pay-invoice-header__logo" />
        ) : (
          <div className="pay-invoice-header__placeholder">
            <Building2 size={24} strokeWidth={2.5} />
          </div>
        )}
      </div>
      <div className="pay-invoice-header__info">
        <span className="pay-invoice-header__tag">Secure Payment</span>
        <div className="pay-invoice-header__title-container">
          <h1 className="pay-invoice-header__title">{companyName}</h1>
          {isVerified && (
            <CheckCircle2 size={18} className="verified-badge" />
          )}
        </div>
        
        {propertyAddress && (
          <div className="pay-invoice-header__address-wrapper" ref={addressRef}>
            <div 
              className="pay-invoice-header__address"
              onClick={() => setShowFullAddress(!showFullAddress)}
            >
              <MapPin size={14} className="icon-clay" />
              <span className="pay-invoice-header__address-text">{propertyAddress}</span>
            </div>
            {showFullAddress && (
              <div className="pay-invoice-header__address-popup">
                {propertyAddress}
              </div>
            )}
          </div>
        )}

        <p className="pay-invoice-header__subtitle">{description}</p>
      </div>
      
      <style jsx>{`
        .pay-invoice-header {
          text-align: center;
          margin-bottom: 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .pay-invoice-header__brand {
          width: 64px;
          height: 64px;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg);
          border: 1px solid var(--border-solid);
          border-radius: 24px;
          padding: 14px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.04);
          transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .pay-invoice-header__brand:hover { transform: scale(1.05) rotate(2deg); }
        
        .pay-invoice-header__logo {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .pay-invoice-header__placeholder {
          color: var(--clay);
          opacity: 0.8;
        }
        .pay-invoice-header__info {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
        .pay-invoice-header__tag {
          display: inline-block;
          background: var(--clay-faint);
          color: var(--clay);
          font-size: 10px;
          font-weight: 800;
          padding: 5px 14px;
          border-radius: 100px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          border: 1px solid rgba(217, 119, 87, 0.1);
        }
        .pay-invoice-header__title {
          font-size: 18px;
          font-weight: 700;
          letter-spacing: -0.03em;
          margin: 0;
          color: var(--text);
          line-height: 1.2;
        }
        .pay-invoice-header__address-wrapper {
          position: relative;
          display: flex;
          justify-content: center;
          max-width: 100%;
          margin-top: 2px;
        }
        .pay-invoice-header__address {
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--text-muted);
          font-size: 13px;
          font-weight: 600;
          background: var(--surface);
          padding: 4px 14px;
          border-radius: 100px;
          border: 1px solid var(--border-solid);
          max-width: 260px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .pay-invoice-header__address:hover {
          border-color: var(--clay);
          background: var(--clay-faint);
        }
        .pay-invoice-header__address-text {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .pay-invoice-header__address svg {
          flex-shrink: 0;
        }
        .pay-invoice-header__address-popup {
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          margin-top: 8px;
          background: var(--bg);
          border: 1px solid var(--border-solid);
          padding: 12px 16px;
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
          color: var(--text);
          font-size: 13px;
          font-weight: 500;
          z-index: 100;
          width: max-content;
          max-width: 300px;
          text-align: center;
          line-height: 1.4;
          animation: popupFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes popupFadeIn {
          from { opacity: 0; transform: translate(-50%, -10px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        .icon-clay { color: var(--clay); }
        .pay-invoice-header__title-container {
          display: flex;
          align-items: center;
          gap: 8px;
          justify-content: center;
        }
        .verified-badge {
          color: #3b82f6;
          fill: #3b82f620;
        }
        .pay-invoice-header__subtitle {
          color: var(--text-muted);
          font-size: 14px;
          font-weight: 600;
          letter-spacing: -0.01em;
          opacity: 0.8;
        }
      `}</style>
    </header>
  )
}
