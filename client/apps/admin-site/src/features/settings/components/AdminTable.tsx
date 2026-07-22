import React from 'react'
import { Shield, Mail, Trash2 } from 'lucide-react'
import { DataTable, type ColumnDef } from '../../../components/common/table/DataTable'

export interface AdminUser {
  id: string
  email: string
  phone?: string
  receivesSystemAlerts?: boolean
  role: 'SUPERADMIN' | 'CUSTOMER_SUPPORT' | 'DEVELOPER'
  createdAt: string
}

export interface AdminTableProps {
  admins: AdminUser[]
  loading: boolean
  currentAdminId: string
  isDeveloper: boolean
  onRoleChange: (id: string, newRole: string) => void
  onEdit: (admin: AdminUser) => void
  onRemove: (admin: AdminUser) => void
}

export const AdminTable: React.FC<AdminTableProps> = ({
  admins,
  loading,
  currentAdminId,
  isDeveloper,
  onRoleChange,
  onEdit,
  onRemove,
}) => {
  const columns: ColumnDef<AdminUser>[] = [
    {
      key: 'admin',
      label: 'Admin',
      render: (admin) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor:
                admin.role === 'DEVELOPER' ? 'var(--accent)' : 'var(--surface-hover)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: admin.role === 'DEVELOPER' ? 'white' : 'var(--text-muted)',
            }}
          >
            <Shield size={18} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontWeight: 600, fontSize: '14px' }}>{admin.email}</span>
              {admin.receivesSystemAlerts && (
                <div
                  title="Receives System Alerts"
                  style={{ color: 'var(--accent)', display: 'flex' }}
                >
                  <Mail size={14} />
                </div>
              )}
            </div>
            {admin.id === currentAdminId && (
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  color: 'var(--accent)',
                  marginTop: '2px',
                }}
              >
                YOU
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'phone',
      label: 'Phone',
      render: (admin) => (
        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{admin.phone || 'N/A'}</span>
      ),
    },
    {
      key: 'role',
      label: 'Role',
      render: (admin) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            className={`badge ${
              admin.role === 'DEVELOPER'
                ? 'badge-warning'
                : admin.role === 'SUPERADMIN'
                  ? 'badge-success'
                  : 'badge-secondary'
            }`}
            style={{
              backgroundColor:
                admin.role === 'DEVELOPER'
                  ? 'var(--accent-faint)'
                  : admin.role === 'SUPERADMIN'
                    ? '#e0f2fe'
                    : 'var(--surface-hover)',
              color:
                admin.role === 'DEVELOPER'
                  ? 'var(--accent)'
                  : admin.role === 'SUPERADMIN'
                    ? '#0369a1'
                    : 'var(--text-muted)',
            }}
          >
            {admin.role}
          </span>
          {isDeveloper && admin.role !== 'DEVELOPER' && (
            <select
              className="input"
              style={{
                width: 'auto',
                padding: '4px 8px',
                fontSize: '11px',
                height: 'auto',
                background: 'transparent',
              }}
              value={admin.role}
              onChange={(e) => onRoleChange(admin.id, e.target.value)}
            >
              <option value="CUSTOMER_SUPPORT">CUSTOMER_SUPPORT</option>
              <option value="SUPERADMIN">SUPERADMIN</option>
            </select>
          )}
        </div>
      ),
    },
    {
      key: 'joined',
      label: 'Joined',
      render: (admin) => (
        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          {new Date(admin.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      label: <span style={{ width: '100%', textAlign: 'right', display: 'block' }}>Actions</span>,
      align: 'right',
      render: (admin) => (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          {isDeveloper && admin.role !== 'DEVELOPER' && (
            <>
              <button
                onClick={() => onEdit(admin)}
                title="Edit Details"
                className="btn btn-secondary"
                style={{ padding: '6px 10px', fontSize: '12px' }}
              >
                Edit Details
              </button>
              <button
                onClick={() => onRemove(admin)}
                title="Remove Admin"
                className="btn btn-secondary"
                style={{ padding: '6px 10px', color: '#dc2626' }}
              >
                <Trash2 size={16} />
              </button>
            </>
          )}
        </div>
      ),
    },
  ]

  return (
    <DataTable
      data={admins}
      columns={columns}
      keyExtractor={(a) => a.id}
      isLoading={loading}
      emptyTitle="No administrators found"
    />
  )
}
