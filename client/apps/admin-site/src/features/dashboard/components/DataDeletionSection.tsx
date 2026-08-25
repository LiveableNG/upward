import React, { useState } from 'react'
import { Trash2, Eye, ShieldAlert } from 'lucide-react'
import { showToast } from '@upward/client-core'
import { apiService } from '../../../services/api.service'
import { PermanentDeleteUserModal } from './PermanentDeleteUserModal'
import type { EligibleAccount } from './PermanentDeleteUserModal'

interface DataDeletionSectionProps {
  eligibleAccounts: EligibleAccount[]
  loading: boolean
  token: string
  onRefresh: () => void
  onReviewAccount?: (account: EligibleAccount) => void
}

export const DataDeletionSection: React.FC<DataDeletionSectionProps> = ({
  eligibleAccounts,
  loading,
  token,
  onRefresh,
  onReviewAccount,
}) => {
  const [selectedAccount, setSelectedAccount] = useState<EligibleAccount | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleOpenDelete = (account: EligibleAccount) => {
    // SAFEGUARD: Check if account is active
    if (!account.isBlocked && !account.isManuallyBlocked) {
      showToast('Cannot delete an active account. Please disable or suspend the account first.', true)
      return
    }
    setSelectedAccount(account)
    setIsModalOpen(true)
  }

  const handleConfirmDelete = async (account: EligibleAccount, reason: string) => {
    try {
      setDeleting(true)
      await apiService.delete(
        `/admin/users/${account.id}/permanent-delete`,
        token,
        {
          role: account.role,
          reason,
        }
      )

      showToast('User account and associated data have been permanently deleted.')
      setIsModalOpen(false)
      setSelectedAccount(null)
      onRefresh()
    } catch (err: any) {
      showToast(err.message || 'Failed to delete user account data', true)
    } finally {
      setDeleting(false)
    }
  }

  const eligible30PlusCount = eligibleAccounts.filter((a) => a.daysDisabled >= 30).length

  return (
    <div style={{ marginTop: '32px', marginBottom: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Data Deletion</h2>
            {eligible30PlusCount > 0 && (
              <span
                style={{
                  backgroundColor: '#fee2e2',
                  color: '#dc2626',
                  fontSize: '12px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '12px',
                }}
              >
                {eligible30PlusCount} Eligible (30+ Days)
              </span>
            )}
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px', margin: 0 }}>
            Accounts eligible for permanent data deletion after being disabled/blocked.
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="btn btn-secondary"
          style={{ height: '36px', fontSize: '13px', padding: '0 14px' }}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh List'}
        </button>
      </div>

      {eligibleAccounts.length === 0 ? (
        <div
          style={{
            padding: '32px',
            textAlign: 'center',
            backgroundColor: 'var(--card-bg, #ffffff)',
            borderRadius: '12px',
            border: '1px solid var(--border-color, #e5e7eb)',
            color: 'var(--text-muted)',
            fontSize: '14px',
          }}
        >
          <ShieldAlert size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
          <div>No disabled accounts currently logged.</div>
        </div>
      ) : (
        <div
          style={{
            backgroundColor: 'var(--card-bg, #ffffff)',
            borderRadius: '12px',
            border: '1px solid var(--border-color, #e5e7eb)',
            overflow: 'hidden',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13.5px' }}>
            <thead>
              <tr
                style={{
                  borderBottom: '1px solid var(--border-color, #e5e7eb)',
                  backgroundColor: 'var(--bg-subtle, #f9fafb)',
                  color: 'var(--text-muted)',
                  fontSize: '11.5px',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                }}
              >
                <th style={{ padding: '12px 16px' }}>User / Account</th>
                <th style={{ padding: '12px 16px' }}>Email</th>
                <th style={{ padding: '12px 16px' }}>Disabled At</th>
                <th style={{ padding: '12px 16px' }}>Days Disabled</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {eligibleAccounts.map((acc) => {
                const formattedDate = acc.disabledAt
                  ? new Date(acc.disabledAt).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })
                  : 'N/A'

                const isEligible = acc.daysDisabled >= 30

                return (
                  <tr
                    key={`${acc.role}-${acc.id}`}
                    style={{ borderBottom: '1px solid var(--border-color, #e5e7eb)' }}
                  >
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{acc.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{acc.role}</div>
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>{acc.email}</td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>{formattedDate}</td>
                    <td style={{ padding: '14px 16px', fontWeight: 600 }}>{acc.daysDisabled} days</td>
                    <td style={{ padding: '14px 16px' }}>
                      {isEligible ? (
                        <span
                          style={{
                            backgroundColor: '#fee2e2',
                            color: '#991b1b',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 700,
                          }}
                        >
                          Eligible (30+ Days)
                        </span>
                      ) : (
                        <span
                          style={{
                            backgroundColor: '#fef3c7',
                            color: '#92400e',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 600,
                          }}
                        >
                          Disabled ({acc.daysDisabled}d)
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        {onReviewAccount && (
                          <button
                            onClick={() => onReviewAccount(acc)}
                            className="btn btn-secondary"
                            style={{ height: '32px', padding: '0 10px', fontSize: '12px', gap: '4px' }}
                          >
                            <Eye size={13} /> Review
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenDelete(acc)}
                          className="btn"
                          style={{
                            height: '32px',
                            padding: '0 10px',
                            fontSize: '12px',
                            backgroundColor: '#fee2e2',
                            color: '#dc2626',
                            border: '1px solid transparent',
                            fontWeight: 600,
                            gap: '4px',
                          }}
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <PermanentDeleteUserModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedAccount(null)
        }}
        account={selectedAccount}
        onConfirm={handleConfirmDelete}
        deleting={deleting}
      />
    </div>
  )
}
