'use client'

import { ArrowLeft } from 'lucide-react'

interface PayPageShellProps {
  title: string
  subtitle?: string
  showBack?: boolean
  onBack?: () => void
  rightElement?: React.ReactNode
  footer?: React.ReactNode
  pinFooter?: boolean
  children: React.ReactNode
}

export function PayPageShell({
  title,
  subtitle,
  showBack = false,
  onBack,
  rightElement,
  footer,
  pinFooter = false,
  children,
}: PayPageShellProps) {
  const headerBalanced = showBack && !rightElement

  return (
    <div className={`pay-flow dashboard--nav-offset${pinFooter ? ' pay-flow--pin-footer' : ''}`}>
      <div className="pay-flow__shell">
        <header className="pay-flow__header">
          <div
            className={`pay-flow__header-row${headerBalanced ? ' pay-flow__header-row--centered' : ''}`}
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
            <h1 className="pay-flow__title">{title}</h1>
            {rightElement ? (
              <div className="pay-flow__header-right">{rightElement}</div>
            ) : (
              <span className="pay-flow__back-spacer" aria-hidden />
            )}
          </div>
        </header>

        <div className="pay-flow__scroll">
          <div className="pay-flow__inner">
            {subtitle ? <p className="pay-flow__intro">{subtitle}</p> : null}
            {children}
          </div>
        </div>

        {footer ? (
          <footer className={`pay-flow__footer${pinFooter ? ' pay-flow__footer--pinned' : ''}`}>
            {footer}
          </footer>
        ) : null}
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
