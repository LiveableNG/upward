'use client'

import React, { useState } from 'react'
import { 
  Users, 
  UserPlus, 
  Shield, 
  Trash2, 
  Settings2,
  Building2,
  CheckCircle2,
  Clock,
  Info,
  History,
  ArrowRightLeft
} from 'lucide-react'
import { useTeam, useRevokeMember } from '@/features/pm/hooks/useTeam'
import { InviteMemberModal } from './modals/InviteMemberModal'
import { UpdatePermissionsModal } from './modals/UpdatePermissionsModal'
import { TransferPropertiesModal } from './modals/TransferPropertiesModal'
import { ActivityLogModal } from './modals/ActivityLogModal'
import { DataTable, Column } from '@/components/common/DataTable'

export function TeamTab() {
  const { data: team = [], isLoading } = useTeam()
  const { mutate: revokeMember } = useRevokeMember()
  
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [selectedCollab, setSelectedCollab] = useState<any>(null)
  const [showPermissionsModal, setShowPermissionsModal] = useState(false)
  const [showActivityModal, setShowActivityModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [transferTarget, setTransferTarget] = useState<any>(null)

  const handleRevoke = (uuid: string, name: string) => {
    if (confirm(`Are you sure you want to remove ${name} from your team? They will lose access to all your properties.`)) {
      revokeMember(uuid)
    }
  }

  const columns: Column<any>[] = [
    {
      header: 'Member',
      render: (collab) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ 
            width: 40, 
            height: 40, 
            borderRadius: 12, 
            background: 'var(--dark)', 
            color: 'white', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            fontSize: 14,
            fontWeight: 700
          }}>
            {collab.member.firstName.charAt(0)}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{collab.member.firstName} {collab.member.lastName}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{collab.member.email}</div>
          </div>
        </div>
      )
    },
    {
      header: 'Role',
      render: (collab) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600 }}>
          <Shield size={16} color={collab.accessLevel === 'ALL' ? 'var(--accent)' : 'var(--forest)'} />
          {collab.accessLevel === 'ALL' ? 'Admin' : 'Manager'}
        </div>
      )
    },
    {
      header: 'Properties',
      render: (collab) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
          <Building2 size={16} />
          {collab.accessLevel === 'ALL' ? 'Everything' : collab.properties.length === 0 ? 'None assigned yet' : `${collab.properties.length} Properties`}
        </div>
      )
    },
    {
      header: 'Status',
      render: (collab) => (
        <div style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: 6, 
          padding: '4px 10px', 
          borderRadius: 100, 
          fontSize: 11, 
          fontWeight: 700,
          background: collab.status === 'ACCEPTED' ? 'var(--forest-faint)' : 'var(--bg)',
          color: collab.status === 'ACCEPTED' ? 'var(--forest)' : 'var(--text-muted)'
        }}>
          {collab.status === 'ACCEPTED' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
          {collab.status === 'ACCEPTED' ? 'Active' : 'Pending'}
        </div>
      )
    },
    {
      header: '',
      align: 'right',
      render: (collab) => (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button 
            className="btn-icon" 
            onClick={(e) => {
              e.stopPropagation()
              setSelectedCollab(collab)
              setShowActivityModal(true)
            }}
            title="View Activity"
          >
            <History size={18} />
          </button>
          {collab.accessLevel === 'CUSTOM' && collab.status === 'ACCEPTED' && (
            <button
              className="btn-icon"
              onClick={(e) => {
                e.stopPropagation()
                setTransferTarget(collab)
                setShowTransferModal(true)
              }}
              title="Transfer Properties"
            >
              <ArrowRightLeft size={18} />
            </button>
          )}
          <button 
            className="btn-icon" 
            onClick={(e) => {
              e.stopPropagation()
              setSelectedCollab(collab)
              setShowPermissionsModal(true)
            }}
            title="Edit Permissions"
          >
            <Settings2 size={18} />
          </button>
          <button 
            className="btn-icon" 
            onClick={(e) => {
              e.stopPropagation()
              handleRevoke(collab.uuid, collab.member.firstName)
            }}
            style={{ color: 'var(--error)' }}
            title="Remove Member"
          >
            <Trash2 size={18} />
          </button>
        </div>
      )
    }
  ];

  return (
    <section className="settings__section animate-fade-in">
      <div className="settings__section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 className="settings__section-title">Team Management</h2>
          <p className="settings__section-subtitle">Invite other managers to collaborate on your properties.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn--secondary"
            onClick={() => {
              setTransferTarget(null)
              setShowTransferModal(true)
            }}
            style={{ borderRadius: 12, height: 44, padding: '0 20px', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <ArrowRightLeft size={18} /> Transfer Properties
          </button>
          <button 
              className="btn btn--primary" 
              onClick={() => setShowInviteModal(true)}
              style={{ borderRadius: 12, height: 44, padding: '0 20px', display: 'flex', alignItems: 'center', gap: 8 }}
          >
              <UserPlus size={18} /> Invite Member
          </button>
        </div>
      </div>

      <div className="team-info-card" style={{ 
          background: 'var(--bg)', 
          border: '1px solid var(--border)', 
          borderRadius: 16, 
          padding: 20, 
          marginBottom: 32,
          display: 'flex',
          gap: 16
      }}>
        <div style={{ color: 'var(--accent)', marginTop: 2 }}>
            <Info size={20} />
        </div>
        <div>
            <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>How Collaboration Works</h4>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, maxWidth: 800 }}>
                You can invite other PMs to manage your properties. Collaborators can manage rent, edit unit details, and create payment requests.
                Choose <strong>Admin</strong> for access to all properties (including ones added later), or <strong>Manager</strong> for assigned properties only (you can invite first and assign later).
                <strong> Privacy Note:</strong> If an invited manager creates a new property of their own, you will not have access to it unless they invite you back. Access is strictly per-property.
            </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={team}
        isLoading={isLoading}
        emptyMessage="Start collaborating by inviting other property managers to your team."
        pageSize={10}
      />

      {showInviteModal && (
        <InviteMemberModal onClose={() => setShowInviteModal(false)} />
      )}

      {showPermissionsModal && selectedCollab && (
        <UpdatePermissionsModal 
            collaboration={selectedCollab} 
            onClose={() => {
                setShowPermissionsModal(false)
                setSelectedCollab(null)
            }} 
        />
      )}

      {showActivityModal && selectedCollab && (
        <ActivityLogModal 
            collaboratorUuid={selectedCollab.member.uuid} 
            onClose={() => {
                setShowActivityModal(false)
                setSelectedCollab(null)
            }} 
        />
      )}

      {showTransferModal && (
        <TransferPropertiesModal
          team={team}
          targetCollaboration={transferTarget}
          onClose={() => {
            setShowTransferModal(false)
            setTransferTarget(null)
          }}
        />
      )}

      <style jsx>{`
        .btn-icon {
            width: 36px;
            height: 36px;
            border-radius: 10px;
            border: 1px solid var(--border);
            background: white;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            color: var(--text-secondary);
            transition: all 0.2s;
        }
        .btn-icon:hover {
            background: var(--bg);
            border-color: var(--text-muted);
        }
      `}</style>
    </section>
  )
}
