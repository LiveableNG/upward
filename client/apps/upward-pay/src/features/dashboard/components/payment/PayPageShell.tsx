'use client'

import { ArrowLeft } from 'lucide-react'

interface PayPageShellProps {
  title: string
  subtitle?: string
  showBack?: boolean
  onBack?: () => void
  rightElement?: React.ReactNode
  children: React.ReactNode
}

export function PayPageShell({
  title,
  subtitle,
  showBack = false,
  onBack,
  rightElement,
  children,
}: PayPageShellProps) {
  return (
    <div className="pay-flow dashboard--nav-offset">
      <div className="pay-flow__container">
        <header className="pay-flow__header">
          <div
            className={`pay-flow__header-row ${!subtitle ? 'pay-flow__header-row--centered' : ''}`}
          >
            {showBack ? (
              <button
                type="button"
                className="pay-flow__back"
                onClick={onBack}
                aria-label="Go back"
              >
                <ArrowLeft size={15} />
              </button>
            ) : (
              <span className="pay-flow__back-spacer" aria-hidden />
            )}
            <div className="pay-flow__header-text">
              <h1 className="pay-flow__title">{title}</h1>
              {subtitle ? <p className="pay-flow__subtitle">{subtitle}</p> : null}
            </div>
            {rightElement ? <div className="pay-flow__header-right">{rightElement}</div> : null}
          </div>
        </header>

        <div className="pay-flow__body">{children}</div>
      </div>
    </div>
  )
}

export function PayFlowPrimaryButton({
  children,
  onClick,
  disabled,
  type = 'button',
  loading,
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  type?: 'button' | 'submit'
  loading?: boolean
}) {
  return (
    <button
      type={type}
      className="pay-flow__cta"
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading && <span className="pay-flow__cta-spinner" aria-hidden />}
      {children}
    </button>
  )
}
