'use client'

import React from 'react'
import { Building2, MapPin, CheckCircle2 } from 'lucide-react'

interface InvoiceHeaderProps {
  companyName: string
  description: string
  logo?: string
  propertyAddress?: string
  isVerified?: boolean
}

export function InvoiceHeader({ companyName, description, logo, propertyAddress, isVerified }: InvoiceHeaderProps) {
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
        <span className="pay-invoice-header__tag">Secure Invoice</span>
        <div className="pay-invoice-header__title-container">
          <h1 className="pay-invoice-header__title">{companyName}</h1>
          {isVerified && (
            <CheckCircle2 size={18} className="verified-badge" />
          )}
        </div>
        
        {propertyAddress && (
          <div className="pay-invoice-header__address">
            <MapPin size={14} className="icon-clay" />
            <span>{propertyAddress}</span>
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
          font-size: 20px;
          font-weight: 900;
          letter-spacing: -0.03em;
          margin: 0;
          color: var(--text);
          line-height: 1.2;
        }
        .pay-invoice-header__address {
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--text-muted);
          font-size: 13px;
          font-weight: 600;
          margin-top: 2px;
          background: var(--surface);
          padding: 4px 14px;
          border-radius: 100px;
          border: 1px solid var(--border-solid);
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
