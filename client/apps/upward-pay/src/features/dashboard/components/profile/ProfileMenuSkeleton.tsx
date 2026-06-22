'use client'

import { ProfilePageShell } from './ProfilePageShell'

export function ProfileMenuSkeleton() {
  const noop = () => {}

  return (
    <ProfilePageShell
      title="Profile"
      subtitle="Manage your account and settings"
      onSettings={noop}
    >
      <div className="profile-page--skeleton">
        <div className="profile-page__hero">
          <div
            className="profile-page__skeleton-block"
            style={{ width: 56, height: 56, borderRadius: '50%', flexShrink: 0 }}
          />
          <div style={{ flex: 1 }}>
            <div className="profile-page__skeleton-block" style={{ width: '55%', height: 18 }} />
            <div
              className="profile-page__skeleton-block"
              style={{ width: '40%', height: 13, marginTop: 8 }}
            />
            <div
              className="profile-page__skeleton-block"
              style={{ width: 110, height: 22, marginTop: 10, borderRadius: 99 }}
            />
          </div>
        </div>

        <div className="profile-page__section">
          <div
            className="profile-page__skeleton-block"
            style={{ width: 72, height: 11, margin: '4px 4px 10px' }}
          />
          <div className="profile-page__menu-card">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="profile-page__menu-item" style={{ pointerEvents: 'none' }}>
                <div
                  className="profile-page__skeleton-block"
                  style={{ width: 38, height: 38, borderRadius: 11, flexShrink: 0 }}
                />
                <div style={{ flex: 1 }}>
                  <div className="profile-page__skeleton-block" style={{ width: '50%', height: 14 }} />
                  <div
                    className="profile-page__skeleton-block"
                    style={{ width: '65%', height: 11, marginTop: 6 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          className="profile-page__skeleton-block"
          style={{ width: '100%', height: 52, borderRadius: 15, marginTop: 4 }}
        />
      </div>
    </ProfilePageShell>
  )
}
