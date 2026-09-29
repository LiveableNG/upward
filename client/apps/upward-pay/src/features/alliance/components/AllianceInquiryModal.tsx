'use client';

import React, { useState } from 'react';
import { X, Send, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useSubmitAllianceInquiry } from '../hooks/useAllianceMarketplace';
import { PublicPmProfile } from '../types/alliance.types';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900">
        {/* Close Button */}
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
              Inquiry Sent Successfully
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-neutral-500">
              The property manager has received your message and will reach out to you shortly.
            </p>
            {referringPm && (
              <div className="mt-4 flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                <span>
                  Your referral by <strong>{referringPm.displayName}</strong> has been preserved.
                </span>
              </div>
            )}
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
              Contact Property Manager
            </h3>
            <p className="mt-1 line-clamp-1 text-xs text-neutral-500">
              Inquiring about: <strong>{listingTitle}</strong>
            </p>

            {referringPm && (
              <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-neutral-50 px-3 py-1.5 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>
                  Referred by <strong>{referringPm.displayName}</strong>
                </span>
              </div>
            )}

            {errorMessage && (
              <div className="mt-3 rounded-lg bg-red-50 p-2.5 text-xs text-red-600 dark:bg-red-950/40 dark:text-red-400">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g. Chukwuma Obi"
                  className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-xs text-neutral-900 focus:border-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-xs text-neutral-900 focus:border-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="+234..."
                    className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-xs text-neutral-900 focus:border-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Message
                </label>
                <textarea
                  rows={3}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
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
                  className="inline-flex items-center gap-1.5 rounded-xl bg-neutral-900 px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50 dark:bg-white dark:text-neutral-900"
                >
                  <Send className="h-3.5 w-3.5" />
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
