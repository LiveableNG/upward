'use client'

import { ArrowLeft, Check } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface SetupPageShellProps {
  title?: string
  subtitle?: string
  progress?: { step: number; total: number }
  stepNames?: string[]
  backHref?: string
  onBack?: () => void
  className?: string
  children: React.ReactNode
  footer?: React.ReactNode
}

export function SetupPageShell({
  title,
  subtitle,
  progress,
  stepNames,
  backHref,
  onBack,
  className,
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
    <div className={['setup-page', className].filter(Boolean).join(' ')}>
      <header className="setup-page__header">
        <div className="setup-page__header-row">
          <button type="button" className="setup-page__back" onClick={handleBack} aria-label="Go back">
            <ArrowLeft size={15} />
          </button>
          {title && <h1 className="setup-page__header-title">{title}</h1>}
        </div>
        {stepNames && stepNames.length > 0 && (
          <div className="setup-page__substeps" style={{ marginTop: 12, marginBottom: 4 }}>
            {stepNames.map((name, idx) => {
              const stepNum = idx + 1
              const isComplete = progress ? progress.step > stepNum : false
              const isActive = progress ? progress.step === stepNum : false
              return (
                <div
                  key={name}
                  className={`setup-page__substep ${isActive ? 'setup-page__substep--active' : ''} ${isComplete ? 'setup-page__substep--complete' : ''}`}
                >
                  {isComplete ? <Check size={12} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 2 }} /> : null}
                  {name}
                </div>
              )
            })}
          </div>
        )}
        {progress && (
          <div className="setup-page__progress-wrap" style={{ marginTop: stepNames ? 8 : 14 }}>
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
        <div className="setup-page__inner">
          {subtitle ? <p className="setup-page__header-subtitle">{subtitle}</p> : null}
          {children}
        </div>
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
  form,
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  type?: 'button' | 'submit'
  form?: string
}) {
  return (
    <button type={type} form={form} className="setup-page__cta" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )
}
