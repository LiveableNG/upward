'use client'

import React from 'react'
import { Check, Lock, EyeOff, Eye, ArrowRight } from 'lucide-react'
import { UpwardLogo } from '@/components/PoweredByUpward'
import { OnboardingFields } from '@/features/auth/components/OnboardingFields'

interface OnboardingStepProps {
  formData: any
  setFormData: (val: any) => void
  showPassword: boolean
  setShowPassword: (val: boolean) => void
  isSubmitting: boolean
  companyName: string
  handleActivation: (e: React.FormEvent) => void
}

export function OnboardingStep({
  formData,
  setFormData,
  showPassword,
  setShowPassword,
  isSubmitting,
  companyName,
  handleActivation
}: OnboardingStepProps) {
  return (
    <div className="auth-shell auth-shell--signup">
      <div className="auth-shell__brand">
        <UpwardLogo size={28} color="var(--clay)" />
      </div>

      <div className="auth-stage">
        <header className="auth-stage__header">
          <div className="success-icon mb-4">
            <Check size={32} color="white" />
          </div>
          <h1 className="auth-stage__title">Almost there!</h1>
          <p className="auth-stage__subtitle">
            Your payment to <strong>{companyName}</strong> is complete. Now, set up your profile to track your rent credibility and scores.
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
            {isSubmitting ? 'Creating account...' : 'Create Account & Continue'}
            <ArrowRight size={18} style={{ marginLeft: '8px' }} />
          </button>
        </form>
      </div>

      <style jsx>{`
        .success-icon {
          width: 56px;
          height: 56px;
          background: var(--clay);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto;
          box-shadow: 0 0 20px var(--clay-glow);
        }
        .auth-stage__header { text-align: center; }
        .auth-stage__title { font-size: 22px; font-weight: 800; margin-top: 16px; color: var(--dark); }
        .auth-stage__subtitle { font-size: 14px; color: var(--text-secondary); margin-top: 8px; line-height: 1.5; padding: 0 10px; }
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
        @media (max-width: 480px) {
          .auth-form__row { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}
