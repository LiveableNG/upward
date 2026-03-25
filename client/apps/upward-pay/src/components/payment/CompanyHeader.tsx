'use client'

export default function CompanyHeader({
  name,
  logoUrl,
  verified = true,
}: {
  name: string
  logoUrl: string
  verified?: boolean
}) {
  return (
    <div className="company-header">
      <div className="company-header__logo">
        <img src={logoUrl} alt={name} width={48} height={48} />
      </div>
      <div className="company-header__info">
        <h2 className="company-header__name">
          {name}
          {verified && (
            <span className="company-header__badge" title="Verified">
              ✓
            </span>
          )}
        </h2>
        <span className="company-header__label">Property Manager</span>
      </div>
    </div>
  )
}
