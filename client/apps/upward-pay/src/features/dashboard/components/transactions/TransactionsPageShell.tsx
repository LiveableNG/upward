'use client'

import { ArrowLeft } from 'lucide-react'

interface TransactionsPageShellProps {
  title: string
  onBack: () => void
  rightElement?: React.ReactNode
  children: React.ReactNode
}

export function TransactionsPageShell({
  title,
  onBack,
  rightElement,
  children,
}: TransactionsPageShellProps) {
  return (
    <div className="tx-page dashboard--nav-offset">
      <div className="tx-page__container">
        <header className="tx-page__header">
          <div className="tx-page__header-row">
            <button
              type="button"
              className="tx-page__back"
              onClick={onBack}
              aria-label="Back to dashboard"
            >
              <ArrowLeft size={15} />
            </button>
            <h1 className="tx-page__title">{title}</h1>
            {rightElement ? <div className="tx-page__header-right">{rightElement}</div> : null}
          </div>
        </header>
        <div className="tx-page__body">{children}</div>
      </div>
    </div>
  )
}
