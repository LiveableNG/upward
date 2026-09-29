'use client';

import React, { useState } from 'react';
import { X, Send, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useSubmitAllianceInquiry } from '../hooks/useAllianceMarketplace';
import type { PublicPmProfile } from '../types/alliance.types';

interface AllianceInquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  listingUuid: string;
  listingTitle: string;
  referralToken?: string;
  referringPm?: PublicPmProfile;
  initialClientName?: string;
  initialClientEmail?: string;
}

export const AllianceInquiryModal: React.FC<AllianceInquiryModalProps> = ({
  isOpen,
  onClose,
  listingUuid,
  listingTitle,
  referralToken,
  referringPm,
  initialClientName = '',
  initialClientEmail = '',
}) => {
  const [clientName, setClientName] = useState(initialClientName);
  const [clientEmail, setClientEmail] = useState(initialClientEmail);
  const [clientPhone, setClientPhone] = useState('');
  const [message, setMessage] = useState(
    'Hello, I am interested in this listing and would like to receive more details and arrange an inspection.',
  );
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { mutate: submitInquiry, isPending } = useSubmitAllianceInquiry();

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!clientName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!clientEmail.trim() && !clientPhone.trim()) {
      setErrorMessage('Please provide an email or phone number.');
      return;
    }

    submitInquiry(
      {
        listingUuid,
        data: {
          clientName: clientName.trim(),
          clientEmail: clientEmail.trim() || undefined,
          clientPhone: clientPhone.trim() || undefined,
          message: message.trim(),
          referralToken: referralToken || undefined,
        },
      },
      {
        onSuccess: () => {
          setIsSuccess(true);
        },
        onError: (err: any) => {
          setErrorMessage(
            err.message || 'Failed to submit inquiry. Please try again.',
          );
        },
      },
    );
  };

  const handleClose = () => {
    setIsSuccess(false);
    setErrorMessage(null);
    onClose();
  };

  return (
    <div className="pay-alliance-modal-backdrop" onClick={handleClose}>
      <div className="pay-alliance-modal" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button
          type="button"
          onClick={handleClose}
          className="pay-alliance-modal__close"
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        {isSuccess ? (
          <div style={{ textAlign: 'center', padding: '16px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(22, 163, 74, 0.1)', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={32} />
            </div>
            <h3 className="pay-alliance-modal__title">Inquiry Sent Successfully</h3>
            <p className="pay-alliance-modal__subtitle" style={{ maxWidth: '380px' }}>
              The property manager has received your message and will reach out to you shortly.
            </p>
            {referringPm && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(217, 119, 87, 0.08)',
                  border: '1px solid rgba(217, 119, 87, 0.2)',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  fontSize: '12px',
                  color: 'var(--text)',
                  marginTop: '8px',
                }}
              >
                <ShieldCheck size={16} style={{ color: 'var(--clay)', flexShrink: 0 }} />
                <span>
                  Your referral by <strong>{referringPm.displayName}</strong> has been preserved.
                </span>
              </div>
            )}
            <button
              type="button"
              onClick={handleClose}
              className="pay-alliance-modal__submit-btn"
              style={{ width: '100%', marginTop: '16px' }}
            >
              Done
            </button>
          </div>
        ) : (
          <div>
            <h3 className="pay-alliance-modal__title">Contact Property Manager</h3>
            <p className="pay-alliance-modal__subtitle" style={{ display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              Inquiring about: <strong>{listingTitle}</strong>
            </p>

            {referringPm && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'var(--surface)',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  marginTop: '12px',
                }}
              >
                <ShieldCheck size={15} style={{ color: 'var(--clay)' }} />
                <span>
                  Referred by <strong>{referringPm.displayName}</strong>
                </span>
              </div>
            )}

            {errorMessage && (
              <div
                style={{
                  marginTop: '12px',
                  background: '#fee2e2',
                  color: '#b91c1c',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  fontSize: '12.5px',
                  fontWeight: 500,
                }}
              >
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="pay-alliance-modal__form" style={{ marginTop: '18px' }}>
              <div className="pay-alliance-modal__field">
                <label className="pay-alliance-modal__label">Full Name</label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g. Chukwuma Obi"
                  className="pay-alliance-modal__input"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <div className="pay-alliance-modal__field">
                  <label className="pay-alliance-modal__label">Email Address</label>
                  <input
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="pay-alliance-modal__input"
                  />
                </div>

                <div className="pay-alliance-modal__field">
                  <label className="pay-alliance-modal__label">Phone Number</label>
                  <input
                    type="tel"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="+234..."
                    className="pay-alliance-modal__input"
                  />
                </div>
              </div>

              <div className="pay-alliance-modal__field">
                <label className="pay-alliance-modal__label">Message</label>
                <textarea
                  rows={3}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="pay-alliance-modal__textarea"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={handleClose}
                  style={{
                    height: '44px',
                    padding: '0 18px',
                    borderRadius: '12px',
                    border: '1px solid var(--border-solid, #e2ddd7)',
                    background: '#ffffff',
                    color: 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="pay-alliance-modal__submit-btn"
                  style={{ padding: '0 24px' }}
                >
                  <Send size={15} />
                  <span>{isPending ? 'Sending...' : 'Send Inquiry'}</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
