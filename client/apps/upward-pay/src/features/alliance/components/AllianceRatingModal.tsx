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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900">
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        {isSuccess ? (
          <div className="flex flex-col items-center py-6 text-center">
            <CheckCircle2 className="h-14 w-14 text-emerald-500" />
            <h3 className="mt-3 text-lg font-bold text-neutral-900 dark:text-white">
              Thank You for Your Feedback!
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-neutral-500">
              Your rating helps build trust and recognition across the Upward Alliance network.
            </p>
            <button
              type="button"
              onClick={handleClose}
              className="mt-6 w-full rounded-xl bg-neutral-900 py-3 text-xs font-semibold text-white transition-opacity hover:opacity-90 dark:bg-white dark:text-neutral-900"
            >
              Done
            </button>
          </div>
        ) : (
          <div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
              Rate Your Experience
            </h3>
            <p className="mt-1 text-xs text-neutral-500">
              Rate your completed experience with <strong>{pmName}</strong>
            </p>

            {errorMessage && (
              <div className="mt-3 rounded-lg bg-red-50 p-2.5 text-xs text-red-600 dark:bg-red-950/40 dark:text-red-400">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
              {/* Star Rating Selector */}
              <div className="flex flex-col items-center gap-1.5 py-2">
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const active = (hoverScore ?? score) >= star;
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setScore(star)}
                        onMouseEnter={() => setHoverScore(star)}
                        onMouseLeave={() => setHoverScore(null)}
                        className="p-1 transition-transform hover:scale-125 focus:outline-none"
                      >
                        <Star
                          className={`h-8 w-8 ${
                            active
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-neutral-300 dark:text-neutral-700'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
                <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
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
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Feedback (Optional)
                </label>
                <textarea
                  rows={3}
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  placeholder="Share details about the communication, reliability, or transaction experience..."
                  className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-xs text-neutral-900 focus:border-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                />
              </div>

              <div className="mt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-xl border border-neutral-200 px-4 py-2.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-neutral-900 px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50 dark:bg-white dark:text-neutral-900"
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
