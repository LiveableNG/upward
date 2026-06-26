'use client'

import { UpwardLogo } from '@/components/PoweredByUpward'

interface PublicProfileShellProps {
  showSignup?: boolean
  onJoin?: () => void
  children: React.ReactNode
}

export function PublicProfileShell({
  showSignup = true,
  onJoin,
  children,
}: PublicProfileShellProps) {
  return (
    <div className="public-profile-page">
      <header className="public-profile-page__header">
        <div className="public-profile-page__brand">
          <UpwardLogo size={28} color="var(--clay)" />
          <span className="public-profile-page__brand-text">Credibility Profile</span>
        </div>
        {showSignup ? (
          <button type="button" className="public-profile-page__header-link" onClick={onJoin}>
            Join Upward
          </button>
        ) : null}
      </header>

      <div className="public-profile-page__scroll">
        <div className="public-profile-page__content">{children}</div>
      </div>

      {showSignup ? (
        <footer className="public-profile-page__footer">
          <button type="button" className="public-profile-page__cta" onClick={onJoin}>
            Create Your Own Portfolio
          </button>
          <p className="public-profile-page__trust">Verified rent credibility by Upward</p>
        </footer>
      ) : null}
    </div>
  )
}
