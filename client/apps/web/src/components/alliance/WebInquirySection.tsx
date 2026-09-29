'use client';

import React, { useState } from 'react';
import { Send, CheckCircle2, MessageSquare } from 'lucide-react';
import { submitInquiry } from '@/lib/alliance';

interface WebInquirySectionProps {
  listingUuid: string;
  listingTitle: string;
  referralToken?: string;
  initialClientName?: string;
}

export const WebInquirySection: React.FC<WebInquirySectionProps> = ({
  listingUuid,
  listingTitle,
  referralToken,
  initialClientName = '',
}) => {
  const [name, setName] = useState(initialClientName);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState(
    'Hello, I am interested in this listing and would like to learn more.',
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!email.trim() && !phone.trim()) {
      setError('Please provide an email address or phone number.');
      return;
    }

    try {
      setIsSubmitting(true);
      await submitInquiry(listingUuid, {
        clientName: name.trim(),
        clientEmail: email.trim() || undefined,
        clientPhone: phone.trim() || undefined,
        message: message.trim(),
        referralToken,
      });
      setIsSuccess(true);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send inquiry. Please try again.';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: 24, borderRadius: 16, textAlign: 'center' }}>
        <CheckCircle2 size={36} color="#059669" style={{ margin: '0 auto 12px' }} />
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#065f46', margin: '0 0 6px' }}>Inquiry Sent Successfully</h3>
        <p style={{ fontSize: 13, color: '#047857', margin: 0 }}>
          The managing partner has received your inquiry and will contact you directly.
        </p>
      </div>
    );
  }

  return (
    <div style={{ background: '#fff', padding: 24, borderRadius: 16, border: '1px solid rgba(20, 20, 19, 0.08)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <MessageSquare size={18} color="#141413" />
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Send an Instant Inquiry</h3>
          {listingTitle && (
            <p style={{ fontSize: 12, color: '#685c49', margin: '2px 0 0' }}>
              Regarding: {listingTitle}
            </p>
          )}
        </div>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '10px 14px', borderRadius: 10, fontSize: 13, color: '#b91c1c', marginBottom: 16 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#685c49', marginBottom: 4 }}>
            Full Name *
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Tunde Adeyemi"
            style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #e5e5e5', fontSize: 13, outline: 'none' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#685c49', marginBottom: 4 }}>
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #e5e5e5', fontSize: 13, outline: 'none' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#685c49', marginBottom: 4 }}>
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+234..."
              style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #e5e5e5', fontSize: 13, outline: 'none' }}
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#685c49', marginBottom: 4 }}>
            Message
          </label>
          <textarea
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #e5e5e5', fontSize: 13, outline: 'none', resize: 'vertical' }}
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            background: '#141413',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            opacity: isSubmitting ? 0.6 : 1,
            marginTop: 4,
          }}
        >
          <Send size={14} />
          <span>{isSubmitting ? 'Sending...' : 'Send Inquiry'}</span>
        </button>
      </form>
    </div>
  );
};
