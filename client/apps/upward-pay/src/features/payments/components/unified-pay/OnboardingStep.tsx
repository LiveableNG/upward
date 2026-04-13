'use client'

import React from 'react'
import { Check, Lock, EyeOff, Eye, ArrowRight } from 'lucide-react'
import { UpwardLogo } from '@/components/PoweredByUpward'
import { OnboardingFields } from '@/features/auth/components/OnboardingFields'
import { formatCurrency } from '@/lib/utils'

interface OnboardingStepProps {
  formData: any
  setFormData: (val: any) => void
  showPassword: boolean
  setShowPassword: (val: boolean) => void
  isSubmitting: boolean
  companyName: string
  handleActivation: (e: React.FormEvent) => void
  type?: 'payment' | 'invite'
  remainingBalance?: number
  currency?: string
}

export function OnboardingStep({
  formData,
  setFormData,
  showPassword,
  setShowPassword,
  isSubmitting,
  companyName,
  handleActivation,
  type = 'payment',
  remainingBalance = 0,
  currency = 'NGN'
}: OnboardingStepProps) {
  return (
    <div className="auth-layout">
      {/* Desktop Visual Panel - Hidden on Mobile */}
      <div className="auth-layout__visual">
        <div className="auth-layout__visual-content">
          <div className="auth-layout__graphic">
            <div className="auth-layout__circle"></div>
            <div className="auth-layout__card-mock"></div>
          </div>
          <h1>
            {type === 'payment' ? 'Almost Home.' : 'Your next chapter begins.'}
          </h1>
          <p>
            {type === 'payment' 
              ? 'Your payment is secured and verified. Now, set up your profile to unlock your dashboard and start monitoring your rent credibility.' 
              : 'You’ve been invited to join the platform. Secure your account to access property details, track payments, and boost your score.'}
          </p>
        </div>
      </div>

      <div className="auth-layout__form">
        <div className="auth-shell auth-shell--signup">
          <div className="auth-shell__brand">
            <UpwardLogo size={28} color="var(--clay)" />
          </div>

          <div className="auth-stage">
            <header className="auth-stage__header">
              <div className="success-icon mb-4">
                <Check size={32} color="white" />
              </div>
              <h1 className="auth-stage__title">
                {type === 'payment' ? 'Almost there!' : 'Complete Your Profile'}
              </h1>
              <p className="auth-stage__subtitle">
                {type === 'payment' ? (
                  <>
                    Your payment to <strong>{companyName}</strong> is complete.
                    {remainingBalance > 0 && (
                      <div className="balance-notice">
                        Remaining balance: <strong>{formatCurrency(remainingBalance, currency)}</strong>.
                        We advise paying your balance on time to maintain a strong rent credibility score.
                      </div>
                    )}
                    Now, set up your profile to track your rent credibility and scores.
                  </>
                ) : (
                  <>Set a secure password to activate your account and access your property details and rent dashboard.</>
                )}
              </p>
            </header>

            <form className="auth-form mt-8" onSubmit={handleActivation}>
              <OnboardingFields formData={formData} setFormData={setFormData} />

              <div className="auth-form__row mt-4">
                <div className="auth-form__field">
                  <label>Set Password</label>
                  <div className="input-with-icon">
                    <Lock size={17} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                      required
                      minLength={8}
                      placeholder="Min. 8 chars"
                    />
                  </div>
                </div>
                <div className="auth-form__field">
                  <label>Confirm Password</label>
                  <div className="input-with-icon">
                    <Lock size={17} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                      required
                    />
                    <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>

              <button className="btn btn--primary btn--full mt-8 btn--pill" type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  'Creating account...'
                ) : (
                  <>
                    <span>{type === 'payment' ? 'Secure My Account' : 'Create Account'}</span>
                    <ArrowRight size={18} style={{ marginLeft: '8px' }} />
                  </>
                )}
              </button>
            </form>
          </div>

          <style jsx>{`
            .success-icon {
              width: 56px;
              height: 56px;
              background: var(--success);
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0 auto;
              box-shadow: 0 8px 16px rgba(34, 197, 94, 0.2);
            }
            .auth-stage__header { text-align: center; }
            .auth-stage__title { 
              font-size: 26px; 
              font-weight: 800; 
              margin-top: 16px; 
              color: var(--dark); 
              letter-spacing: -0.02em;
            }
            .auth-stage__subtitle { 
              font-size: 14px; 
              color: var(--text-secondary); 
              margin-top: 8px; 
              line-height: 1.5; 
              padding: 0 10px; 
            }
            .auth-form { max-width: 440px; margin: 32px auto 0; }
            .auth-form__row {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 16px;
            }
            .password-toggle {
              position: absolute; right: 12px;
              background: none; border: none;
              color: var(--text-muted); cursor: pointer;
              display: flex;
            }
            .btn--pill { border-radius: 100px; padding: 14px; }
            .balance-notice {
              margin: 16px 0;
              padding: 12px;
              background: var(--clay-faint);
              border-radius: 12px;
              color: var(--clay);
              font-weight: 500;
              font-size: 13px;
              border: 1px solid rgba(217, 119, 87, 0.1);
            }
            .balance-notice strong {
              color: var(--dark);
              font-weight: 700;
            }
            @media (max-width: 480px) {
              .auth-form__row { grid-template-columns: 1fr; }
            }
          `}</style>
        </div>
      </div>
    </div>
  )
}
