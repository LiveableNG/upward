import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, RefreshCcw } from 'lucide-react'

interface UniversityHeaderProps {
  onRefresh: () => void
}

export const UniversityHeader: React.FC<UniversityHeaderProps> = ({ onRefresh }) => {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '24px',
        gap: '16px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Link
          to="/dashboard"
          className="btn btn-secondary"
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="section-title" style={{ margin: 0 }}>
            Upward Academy Management
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '4px 0 0 0' }}>
            Review cohort applications, applicant profiles, and early access leads
          </p>
        </div>
      </div>

      <button
        onClick={onRefresh}
        className="btn btn-secondary"
        style={{ height: '40px', display: 'flex', alignItems: 'center', gap: '8px' }}
      >
        <RefreshCcw size={16} />
        Refresh
      </button>
    </div>
  )
}
