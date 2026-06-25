'use client'

import {
  NOTIFICATION_TABS,
  type NotificationTab,
} from '../utils/notificationTabs'

interface NotificationTabBarProps {
  activeTab: NotificationTab
  onTabChange: (tab: NotificationTab) => void
  unreadCounts: Record<NotificationTab, number>
  variant?: 'panel' | 'page'
}

function formatUnreadCount(count: number) {
  return count > 9 ? '9+' : String(count)
}

export function NotificationTabBar({
  activeTab,
  onTabChange,
  unreadCounts,
  variant = 'panel',
}: NotificationTabBarProps) {
  return (
    <nav
      className={`notification-tab-bar notification-tab-bar--${variant}`}
      aria-label="Notification categories"
    >
      {NOTIFICATION_TABS.map((tab) => {
        const unreadCount = unreadCounts[tab]
        const isActive = activeTab === tab

        return (
          <button
            key={tab}
            type="button"
            className={`notification-tab-bar__tab ${isActive ? 'is-active' : ''}`}
            onClick={(event) => {
              event.stopPropagation()
              onTabChange(tab)
            }}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className="notification-tab-bar__label">{tab}</span>
            {unreadCount > 0 && (
              <span
                className="notification-tab-bar__badge"
                aria-label={`${unreadCount} unread`}
              >
                {formatUnreadCount(unreadCount)}
              </span>
            )}
          </button>
        )
      })}

      <style jsx>{`
        .notification-tab-bar {
          display: flex;
          gap: 8px;
          padding: 4px;
          background: #f0e9df;
          border-radius: 14px;
          border: 1px solid #e9dfd3;
        }

        .notification-tab-bar--page {
          gap: 6px;
          border-radius: 12px;
          border: none;
          margin-bottom: 8px;
        }

        .notification-tab-bar__tab {
          position: relative;
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          min-width: 0;
          padding: 8px 10px;
          border-radius: 10px;
          border: 1px solid transparent;
          background: transparent;
          color: #8a8178;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          text-align: center;
        }

        .notification-tab-bar--page .notification-tab-bar__tab {
          padding: 9px 8px;
          border-radius: 8px;
          border: none;
        }

        .notification-tab-bar__tab:hover {
          background: #fff;
          border-color: #eadfd4;
          color: #5c544b;
        }

        .notification-tab-bar--page .notification-tab-bar__tab:hover {
          border-color: transparent;
        }

        .notification-tab-bar__tab.is-active {
          background: var(--skin-primary, #c2501f);
          border-color: var(--skin-primary, #c2501f);
          color: #fff;
          box-shadow: 0 4px 10px rgba(194, 80, 31, 0.28);
          transform: translateY(-1px);
        }

        .notification-tab-bar--page .notification-tab-bar__tab.is-active {
          background: #fff;
          color: var(--skin-primary, #c2501f);
          border-color: transparent;
          box-shadow: 0 1px 2px rgba(60, 40, 20, 0.08);
          transform: none;
        }

        .notification-tab-bar__label {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .notification-tab-bar__badge {
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 18px;
          height: 18px;
          padding: 0 5px;
          border-radius: 9px;
          background: var(--error, #ef4444);
          color: #fff;
          font-size: 10px;
          font-weight: 800;
          line-height: 1;
        }

        .notification-tab-bar__tab.is-active .notification-tab-bar__badge {
          background: #fff;
          color: var(--error, #ef4444);
        }
      `}</style>
    </nav>
  )
}
