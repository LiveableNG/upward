import { Check, Lock, Shield, PhoneCall } from 'lucide-react'

interface KycInfoSheetProps {
  idType?: 'BVN' | 'NIN'
}

export function KycInfoSheet({ idType = 'BVN' }: KycInfoSheetProps) {
  const isBvn = idType === 'BVN'

  return (
    <div className="verify-identity-page__info">
      <h3 className="verify-identity-page__info-title">
        {isBvn ? 'Why we need your BVN?' : 'Why we need your NIN?'}
      </h3>

      <p className="verify-identity-page__info-text">
        {isBvn
          ? 'The Bank Verification Number (BVN) uniquely verifies your identity for Know Your Customer (KYC) requirements, unlocking your Upward savings wallet and dedicated account.'
          : 'The National Identity Number (NIN) validates your legal identity against national records, satisfying CBN regulatory standards for your virtual wallet.'}
      </p>

      <div className="verify-identity-page__info-helper">
        <div className="verify-identity-page__info-helper-icon" aria-hidden="true">
          <PhoneCall size={14} />
        </div>
        <div className="verify-identity-page__info-helper-text">
          {isBvn ? (
            <>
              Forgot your BVN? Dial <strong>*565*0#</strong> from the phone number linked to your
              bank account.
            </>
          ) : (
            <>
              Forgot your NIN? Dial <strong>*346#</strong> or check your National e-ID card / NIMC
              slip.
            </>
          )}
        </div>
      </div>

      <div className="verify-identity-page__info-block">
        <div className="verify-identity-page__info-block-icon" aria-hidden="true">
          <Check size={14} strokeWidth={3} />
        </div>
        <div className="verify-identity-page__info-block-content">
          <strong>We only verify your:</strong>
          <ul>
            <li>Legal Full Name</li>
            <li>Date of Birth</li>
            <li>Phone Number</li>
            <li>Match Status</li>
          </ul>
        </div>
      </div>

      <p className="verify-identity-page__info-disclaimer">
        {isBvn
          ? 'Confirming your BVN does not grant Upward access to your bank balances, account history, or the ability to move funds without your permission.'
          : 'Confirming your NIN only verifies your biographic identity with national databases. It does not compromise your personal privacy.'}
      </p>

      <div className="verify-identity-page__info-footer">
        <Lock size={14} className="verify-identity-page__info-footer-icon" aria-hidden="true" />
        <span>
          Your data is encrypted with NDPR compliance.{' '}
          <strong>We do not save your {idType} number</strong>.
        </span>
      </div>
    </div>
  )
}

// Backwards compatibility alias
export const BvnInfoSheet = KycInfoSheet
