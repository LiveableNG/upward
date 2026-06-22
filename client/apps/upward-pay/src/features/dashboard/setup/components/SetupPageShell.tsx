'use client'

import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface SetupPageShellProps {
  title?: string
  progress?: { step: number; total: number }
  backHref?: string
  onBack?: () => void
  children: React.ReactNode
  footer?: React.ReactNode
}

export function SetupPageShell({
  title,
  progress,
  backHref,
  onBack,
  children,
  footer,
}: SetupPageShellProps) {
  const router = useRouter()

  const handleBack = () => {
    if (onBack) {
      onBack()
      return
    }
    if (backHref) {
      router.push(backHref)
      return
    }
    router.back()
  }

  const pct = progress ? Math.round((progress.step / progress.total) * 100) : null

  return (
    <div className="setup-page">
      <header className="setup-page__header">
        <div className="setup-page__header-row">
          <button type="button" className="setup-page__back" onClick={handleBack} aria-label="Go back">
            <ArrowLeft size={15} />
          </button>
          {title && <h1 className="setup-page__header-title">{title}</h1>}
        </div>
        {progress && (
          <div className="setup-page__progress-wrap">
            <div className="setup-page__progress-meta">
              <span>
                Step {progress.step} of {progress.total}
              </span>
              <span>{pct}%</span>
            </div>
            <div className="setup-page__progress-track">
              <div className="setup-page__progress-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}
      </header>

      <div className="setup-page__scroll">
        <div className="setup-page__inner">{children}</div>
      </div>

      {footer && <footer className="setup-page__footer">{footer}</footer>}
    </div>
  )
}

export function SetupPrimaryButton({
  children,
  onClick,
  disabled,
  type = 'button',
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  type?: 'button' | 'submit'
}) {
  return (
    <button type={type} className="setup-page__cta" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )
}
