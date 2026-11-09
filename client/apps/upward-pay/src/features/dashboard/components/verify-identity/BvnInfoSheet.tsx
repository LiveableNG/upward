import { Check, Lock } from 'lucide-react'

export function BvnInfoSheet() {
  return (
    <div className="verify-identity-page__info">
      <h3 className="verify-identity-page__info-title">Why we need your BVN?</h3>

      <p className="verify-identity-page__info-text">
        The goal of the Bank Verification Number (BVN) is to uniquely verify the identity of a customer
        for &apos;know your customer&apos; (KYC) purposes.
      </p>

      <div className="verify-identity-page__info-block">
        <div className="verify-identity-page__info-block-icon" aria-hidden="true">
          <Check size={14} strokeWidth={3} />
        </div>
        <div className="verify-identity-page__info-block-content">
          <strong>We only have access to your:</strong>
          <ul>
            <li>Name</li>
            <li>Phone number</li>
            <li>Email address</li>
            <li>Date of birth</li>
          </ul>
        </div>
      </div>

      <p className="verify-identity-page__info-disclaimer">
        Confirming your BVN does not give us access to details of your bank account(s) and we cannot use
        your BVN to transfer money from your account(s).
      </p>

      <div className="verify-identity-page__info-footer">
        <Lock size={14} className="verify-identity-page__info-footer-icon" aria-hidden="true" />
        <span>
          Your data is safe with us and we won&apos;t share your BVN with anyone.{' '}
          <strong>We do not save your BVN number</strong>.
        </span>
      </div>
    </div>
  )
}
