type LegalPageIntroProps = {
  title: string
  kicker?: string
  updated?: string
  subtitle?: string
}

export function LegalPageIntro({ title, kicker = 'Legal', updated, subtitle }: LegalPageIntroProps) {
  return (
    <header className="legal-page-intro">
      <p className="legal-page-kicker">{kicker}</p>
      <h1 className="legal-page-title">{title}</h1>
      <div className="legal-divider" aria-hidden="true" />
      {updated ? <p className="legal-page-updated">Last updated: {updated}</p> : null}
      {subtitle ? <p className="legal-page-updated">{subtitle}</p> : null}
    </header>
  )
}
