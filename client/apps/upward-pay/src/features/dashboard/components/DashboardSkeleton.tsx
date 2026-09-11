'use client'

export function DashboardSkeleton() {
  return (
    <div className="dash-skeleton" aria-busy="true" aria-label="Loading dashboard">
      {/* Top Header Skeleton */}
      <div className="dash-skeleton__header">
        <div className="dash-skeleton__user">
          <div className="dash-skeleton__avatar skeleton-shimmer" />
          <div className="dash-skeleton__user-info">
            <div className="dash-skeleton__line dash-skeleton__line--sm skeleton-shimmer" />
            <div className="dash-skeleton__line dash-skeleton__line--md skeleton-shimmer" />
          </div>
        </div>
        <div className="dash-skeleton__actions">
          <div className="dash-skeleton__icon-btn skeleton-shimmer" />
          <div className="dash-skeleton__icon-btn skeleton-shimmer" />
        </div>
      </div>

      {/* Main Score & Status Card Skeleton */}
      <div className="dash-skeleton__hero skeleton-shimmer">
        <div className="dash-skeleton__hero-top">
          <div className="dash-skeleton__badge skeleton-shimmer" />
          <div className="dash-skeleton__badge skeleton-shimmer" style={{ width: '80px' }} />
        </div>

        <div className="dash-skeleton__hero-body">
          <div className="dash-skeleton__score-block">
            <div className="dash-skeleton__line dash-skeleton__line--xs skeleton-shimmer" />
            <div className="dash-skeleton__hero-number skeleton-shimmer" />
            <div className="dash-skeleton__line dash-skeleton__line--lg skeleton-shimmer" />
          </div>
          <div className="dash-skeleton__ring skeleton-shimmer" />
        </div>

        <div className="dash-skeleton__hero-footer">
          <div className="dash-skeleton__pill skeleton-shimmer" />
          <div className="dash-skeleton__pill skeleton-shimmer" style={{ width: '110px' }} />
        </div>
      </div>

      {/* Quick Action Grid (4 items) */}
      <div className="dash-skeleton__actions-grid">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="dash-skeleton__action-card skeleton-shimmer">
            <div className="dash-skeleton__action-icon skeleton-shimmer" />
            <div className="dash-skeleton__line dash-skeleton__line--xs skeleton-shimmer" style={{ width: '60%' }} />
          </div>
        ))}
      </div>

      {/* Activity List Section */}
      <div className="dash-skeleton__section">
        <div className="dash-skeleton__section-head">
          <div className="dash-skeleton__line dash-skeleton__line--md skeleton-shimmer" />
          <div className="dash-skeleton__line dash-skeleton__line--xs skeleton-shimmer" style={{ width: '50px' }} />
        </div>

        <div className="dash-skeleton__list">
          {[1, 2, 3].map((i) => (
            <div key={i} className="dash-skeleton__row skeleton-shimmer">
              <div className="dash-skeleton__row-left">
                <div className="dash-skeleton__row-icon skeleton-shimmer" />
                <div className="dash-skeleton__row-text">
                  <div className="dash-skeleton__line dash-skeleton__line--md skeleton-shimmer" />
                  <div className="dash-skeleton__line dash-skeleton__line--sm skeleton-shimmer" style={{ width: '70%' }} />
                </div>
              </div>
              <div className="dash-skeleton__row-right">
                <div className="dash-skeleton__line dash-skeleton__line--sm skeleton-shimmer" style={{ width: '60px' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
