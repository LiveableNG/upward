import React from 'react';
import { Copy, Check, Building2 } from 'lucide-react';

interface DedicatedAccountRowProps {
  dva: any;
  copied: boolean;
  onCopy: () => void;
  generateDva: () => void;
  isGeneratingDva: boolean;
}

export function DedicatedAccountRow({
  dva,
  copied,
  onCopy,
  generateDva,
  isGeneratingDva,
}: DedicatedAccountRowProps) {
  return (
    <div className="checkout-card">
      <div className="checkout-card__title">
        <span>Dedicated Funding Account</span>
        <Building2 size={20} color="var(--forest)" />
      </div>

      {!dva ? (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <p style={{ color: '#5D5954', marginBottom: 24, fontSize: 14, lineHeight: 1.6 }}>
            Generate a dedicated virtual account to instantly fund your wallet via bank transfers.
          </p>
          <button 
            className="btn-checkout-primary"
            onClick={generateDva}
            disabled={isGeneratingDva}
            style={{ width: 'auto', padding: '0 24px', margin: '0 auto' }}
          >
            {isGeneratingDva ? 'Generating account...' : 'Generate Bank Account'}
          </button>
        </div>
      ) : (
        <div>
          <p style={{ fontSize: 13, color: '#5D5954', lineHeight: 1.6, marginBottom: 20 }}>
            Send transfers to this account to automatically fund your wallet. Funds will reflect in your wallet balance in real-time.
          </p>

          <div className="checkout-breakdown" style={{ marginTop: 12 }}>
            <div className="checkout-breakdown__row">
              <span className="checkout-breakdown__label">Bank Name</span>
              <span className="checkout-breakdown__value">{dva.bankName}</span>
            </div>

            <div className="checkout-breakdown__row" style={{ padding: '12px 0' }}>
              <span className="checkout-breakdown__label">Account Number</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className="checkout-breakdown__value" style={{ fontFamily: 'monospace', fontSize: 15 }}>
                  {dva.accountNumber}
                </span>
                <button className="copy-pill-button" onClick={onCopy}>
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div className="checkout-breakdown__row">
              <span className="checkout-breakdown__label">Account Name</span>
              <span className="checkout-breakdown__value">{dva.accountName}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
