import ForgotPasswordFlow from '@/features/auth/component/ForgotPasswordFlow'
import { UpwardLogo } from '@/components/PoweredByUpward'

export default function ForgotPasswordPage() {
  return (
    <main className="auth-page">
      <div className="auth-page__container">
        <header className="auth-page__header">
          <UpwardLogo />
        </header>

        <ForgotPasswordFlow />
      </div>
    </main>
  )
}
