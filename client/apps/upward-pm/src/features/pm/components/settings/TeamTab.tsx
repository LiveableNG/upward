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
import { ConfirmationModal } from '@/components/common/ConfirmationModal'

export function TeamTab() {
  const { data: team = [], isLoading } = useTeam()
  const { mutate: revokeMember, isPending: isRevoking } = useRevokeMember()
  
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [selectedCollab, setSelectedCollab] = useState<any>(null)
  const [showPermissionsModal, setShowPermissionsModal] = useState(false)
  const [showActivityModal, setShowActivityModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [transferTarget, setTransferTarget] = useState<any>(null)
  const [revokeTarget, setRevokeTarget] = useState<{ uuid: string; name: string } | null>(null)

  const handleConfirmRevoke = () => {
    if (!revokeTarget) return
    revokeMember(revokeTarget.uuid, {
      onSuccess: () => setRevokeTarget(null),
    })
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
              setRevokeTarget({
                uuid: collab.uuid,
                name: `${collab.member.firstName} ${collab.member.lastName}`.trim(),
              })
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

  const renderMobileCard = (collab: any) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '14px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div style={{ 
            width: 38, 
            height: 38, 
            borderRadius: 12, 
            background: 'var(--dark)', 
            color: 'white', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            fontSize: 14,
            fontWeight: 700,
            flexShrink: 0
          }}>
            {collab.member.firstName.charAt(0)}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--dark)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {collab.member.firstName} {collab.member.lastName}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {collab.member.email}
            </div>
          </div>
        </div>
        <div style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: 4, 
          padding: '4px 8px', 
          borderRadius: 100, 
          fontSize: 11, 
          fontWeight: 700,
          background: collab.status === 'ACCEPTED' ? 'var(--forest-faint)' : 'var(--bg)',
          color: collab.status === 'ACCEPTED' ? 'var(--forest)' : 'var(--text-muted)',
          flexShrink: 0
        }}>
          {collab.status === 'ACCEPTED' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
          {collab.status === 'ACCEPTED' ? 'Active' : 'Pending'}
        </div>
      </div>

      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        padding: '8px 12px', 
        background: 'var(--bg)', 
        borderRadius: 8, 
        fontSize: 12, 
        color: 'var(--text-secondary)' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
          <Shield size={14} color={collab.accessLevel === 'ALL' ? 'var(--accent)' : 'var(--forest)'} />
          {collab.accessLevel === 'ALL' ? 'Admin' : 'Manager'}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Building2 size={14} />
          {collab.accessLevel === 'ALL' ? 'Everything' : collab.properties.length === 0 ? 'None assigned' : `${collab.properties.length} Props`}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
        <button 
          className="btn-icon" 
          onClick={(e) => {
            e.stopPropagation()
            setSelectedCollab(collab)
            setShowActivityModal(true)
          }}
          title="View Activity"
        >
          <History size={16} />
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
            <ArrowRightLeft size={16} />
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
          <Settings2 size={16} />
        </button>
        <button 
          className="btn-icon" 
          onClick={(e) => {
            e.stopPropagation()
            setRevokeTarget({
              uuid: collab.uuid,
              name: `${collab.member.firstName} ${collab.member.lastName}`.trim(),
            })
          }}
          style={{ color: 'var(--error)' }}
          title="Remove Member"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  )

  return (
    <section className="settings__section animate-fade-in" style={{ padding: 'clamp(14px, 3.5vw, 24px)', width: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>
      <div className="settings__section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14, marginBottom: 20 }}>
        <div style={{ flex: '1 1 240px', minWidth: 0 }}>
          <h2 className="settings__section-title">Team Management</h2>
          <p className="settings__section-subtitle" style={{ margin: '4px 0 0', lineHeight: 1.4 }}>
            Invite other managers to collaborate on your properties.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', width: '100%', maxWidth: 'max-content' }} className="team-header-actions">
          <button
            className="btn btn--secondary"
            onClick={() => {
              setTransferTarget(null)
              setShowTransferModal(true)
            }}
            style={{ borderRadius: 12, height: 42, padding: '0 14px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, flex: '1 1 auto', justifyContent: 'center', whiteSpace: 'nowrap' }}
          >
            <ArrowRightLeft size={16} /> Transfer Properties
          </button>
          <button 
            className="btn btn--primary" 
            onClick={() => setShowInviteModal(true)}
            style={{ borderRadius: 12, height: 42, padding: '0 14px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, flex: '1 1 auto', justifyContent: 'center', whiteSpace: 'nowrap' }}
          >
            <UserPlus size={16} /> Invite Member
          </button>
        </div>
      </div>

      <div className="team-info-card" style={{ 
          background: 'var(--bg)', 
          border: '1px solid var(--border)', 
          borderRadius: 14, 
          padding: 'clamp(14px, 3vw, 18px)', 
          marginBottom: 24,
          display: 'flex',
          gap: 12,
          alignItems: 'flex-start',
          width: '100%',
          boxSizing: 'border-box'
      }}>
        <div style={{ color: 'var(--accent)', marginTop: 2, flexShrink: 0 }}>
          <Info size={18} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h4 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 4px', color: 'var(--dark)' }}>How Collaboration Works</h4>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0, maxWidth: 800 }}>
            You can invite other PMs to manage your properties. Collaborators can manage rent, edit unit details, and create payment requests.
            Choose <strong>Admin</strong> for access to all properties (including ones added later), or <strong>Manager</strong> for assigned properties only (you can invite first and assign later).
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, margin: '8px 0 0' }}>
            <strong>Privacy Note:</strong> If an invited manager creates a new property of their own, you will not have access to it unless they invite you back. Access is strictly per-property.
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={team}
        isLoading={isLoading}
        emptyMessage="Start collaborating by inviting other property managers to your team."
        pageSize={10}
        renderMobileCard={renderMobileCard}
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

      <ConfirmationModal
        isOpen={!!revokeTarget}
        onClose={() => setRevokeTarget(null)}
        onConfirm={handleConfirmRevoke}
        title="Remove Team Member"
        message={
          revokeTarget
            ? `Are you sure you want to remove ${revokeTarget.name} from your team? They will lose access to all your properties.`
            : ''
        }
        confirmText="Remove Member"
        type="danger"
        isPending={isRevoking}
      />

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
        @media (max-width: 600px) {
          .team-header-actions {
            max-width: 100% !important;
            width: 100% !important;
          }
        }
      `}</style>
    </section>
  )
}
