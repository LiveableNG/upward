'use client'

interface TransactionsPageShellProps {
  title: string
  onBack?: () => void
  rightElement?: React.ReactNode
  children: React.ReactNode
}

export function TransactionsPageShell({
  title,
  rightElement,
  children,
}: TransactionsPageShellProps) {
  return (
    <div className="tx-page dashboard--nav-offset">
      <div className="tx-page__container">
        <header className="tx-page__header">
          <div className="tx-page__header-row">
            <h1 className="tx-page__title">{title}</h1>
            {rightElement ? <div className="tx-page__header-right">{rightElement}</div> : null}
          </div>
        </header>
        <div className="tx-page__body">{children}</div>
      </div>
    </div>
  )
}
