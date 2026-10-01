'use client';

import React, { useState } from 'react';
import { X, Star, CheckCircle2 } from 'lucide-react';
import { useSubmitClientRating } from '../hooks/useAllianceMarketplace';

interface AllianceRatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  referralUuid: string;
  pmName: string;
}

export const AllianceRatingModal: React.FC<AllianceRatingModalProps> = ({
  isOpen,
  onClose,
  referralUuid,
  pmName,
}) => {
  const [score, setScore] = useState(5);
  const [hoverScore, setHoverScore] = useState<number | null>(null);
  const [review, setReview] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { mutate: submitRating, isPending } = useSubmitClientRating();

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    submitRating(
      {
        referralUuid,
        score,
        review: review.trim() || undefined,
      },
      {
        onSuccess: () => {
          setIsSuccess(true);
        },
        onError: (err: any) => {
          setErrorMessage(
            err.message || 'Failed to submit rating. Please try again.',
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
            <h3 className="pay-alliance-modal__title">Thank You for Your Feedback!</h3>
            <p className="pay-alliance-modal__subtitle" style={{ maxWidth: '380px' }}>
              Your rating helps build trust and recognition across the Upward Alliance network.
            </p>
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
            <h3 className="pay-alliance-modal__title">Rate Your Experience</h3>
            <p className="pay-alliance-modal__subtitle">
              Rate your completed experience with <strong>{pmName}</strong>
            </p>

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
              {/* Star Rating Selector */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '8px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {[1, 2, 3, 4, 5].map((star) => {
                    const active = (hoverScore ?? score) >= star;
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setScore(star)}
                        onMouseEnter={() => setHoverScore(star)}
                        onMouseLeave={() => setHoverScore(null)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'transform 0.15s ease',
                        }}
                      >
                        <Star
                          size={32}
                          style={{
                            fill: active ? '#f59e0b' : 'transparent',
                            color: active ? '#f59e0b' : '#d1d5db',
                          }}
                        />
                      </button>
                    );
                  })}
                </div>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>
                  {score === 5
                    ? 'Excellent (5/5)'
                    : score === 4
                    ? 'Very Good (4/5)'
                    : score === 3
                    ? 'Good (3/5)'
                    : score === 2
                    ? 'Fair (2/5)'
                    : 'Poor (1/5)'}
                </span>
              </div>

              {/* Review Text */}
              <div className="pay-alliance-modal__field">
                <label className="pay-alliance-modal__label">Feedback (Optional)</label>
                <textarea
                  rows={3}
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  placeholder="Share details about the communication, reliability, or transaction experience..."
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
                  {isPending ? 'Submitting...' : 'Submit Rating'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
