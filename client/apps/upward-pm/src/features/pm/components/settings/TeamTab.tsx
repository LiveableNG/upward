
'use client'

import React, { useState } from 'react'
import { 
  Users, 
  UserPlus, 
  Shield, 
  MoreVertical, 
  Trash2, 
  Settings2,
  Building2,
  CheckCircle2,
  Clock,
  Info,
  History
} from 'lucide-react'
import { useTeam, useRevokeMember } from '@/features/pm/hooks/useTeam'
import { InviteMemberModal } from './modals/InviteMemberModal'
import { UpdatePermissionsModal } from './modals/UpdatePermissionsModal'
import { ActivityLogModal } from './modals/ActivityLogModal'
import { cn } from '@/lib/utils'

export function TeamTab() {
  const { data: team = [], isLoading } = useTeam()
  const { mutate: revokeMember } = useRevokeMember()
  
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [selectedCollab, setSelectedCollab] = useState<any>(null)
  const [showPermissionsModal, setShowPermissionsModal] = useState(false)
  const [showActivityModal, setShowActivityModal] = useState(false)

  const handleRevoke = (uuid: string, name: string) => {
    if (confirm(`Are you sure you want to remove ${name} from your team? They will lose access to all your properties.`)) {
      revokeMember(uuid)
    }
  }

  return (
    <section className="settings__section animate-fade-in">
      <div className="settings__section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 className="settings__section-title">Team Management</h2>
          <p className="settings__section-subtitle">Invite other managers to collaborate on your properties.</p>
        </div>
        <button 
            className="btn btn--primary" 
            onClick={() => setShowInviteModal(true)}
            style={{ borderRadius: 12, height: 44, padding: '0 20px', display: 'flex', alignItems: 'center', gap: 8 }}
        >
            <UserPlus size={18} /> Invite Member
        </button>
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
        <div style={{ color: 'var(--clay)', marginTop: 2 }}>
            <Info size={20} />
        </div>
        <div>
            <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>How Collaboration Works</h4>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, maxWidth: 800 }}>
                You can invite other PMs to manage your properties. Collaborators can manage rent, edit unit details, and create payment requests. 
                <strong> Privacy Note:</strong> If an invited manager creates a new property of their own, you will not have access to it unless they invite you back. Access is strictly per-property.
            </p>
        </div>
      </div>

      {isLoading ? (
        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>Loading team members...</div>
      ) : team.length === 0 ? (
        <div style={{ 
            padding: '80px 40px', 
            textAlign: 'center', 
            background: 'white', 
            borderRadius: 24, 
            border: '1px dashed var(--border)' 
        }}>
            <div style={{ 
                width: 64, 
                height: 64, 
                borderRadius: 20, 
                background: 'var(--bg)', 
                color: 'var(--text-muted)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                margin: '0 auto 20px'
            }}>
                <Users size={32} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No team members yet</h3>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', maxWidth: 400, margin: '0 auto 24px' }}>
                Start collaborating by inviting other property managers to your team.
            </p>
            <button className="btn btn--secondary" onClick={() => setShowInviteModal(true)}>
                Send your first invite
            </button>
        </div>
      ) : (
        <div className="team-list" style={{ background: 'white', borderRadius: 20, border: '1px solid var(--border)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
                        <th style={{ textAlign: 'left', padding: '16px 24px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Member</th>
                        <th style={{ textAlign: 'left', padding: '16px 24px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Access Level</th>
                        <th style={{ textAlign: 'left', padding: '16px 24px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Properties</th>
                        <th style={{ textAlign: 'left', padding: '16px 24px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status</th>
                        <th style={{ textAlign: 'right', padding: '16px 24px' }}></th>
                    </tr>
                </thead>
                <tbody>
                    {team.map((collab: any) => (
                        <tr key={collab.uuid} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '20px 24px' }}>
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
                            </td>
                            <td style={{ padding: '20px 24px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600 }}>
                                    <Shield size={16} color={collab.accessLevel === 'ALL' ? 'var(--clay)' : 'var(--forest)'} />
                                    {collab.accessLevel === 'ALL' ? 'All Properties' : 'Custom Selection'}
                                </div>
                            </td>
                            <td style={{ padding: '20px 24px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
                                    <Building2 size={16} />
                                    {collab.accessLevel === 'ALL' ? 'Everything' : `${collab.properties.length} Properties`}
                                </div>
                            </td>
                            <td style={{ padding: '20px 24px' }}>
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
                            </td>
                            <td style={{ padding: '20px 24px', textAlign: 'right' }}>
                                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                    <button 
                                        className="btn-icon" 
                                        onClick={() => {
                                            setSelectedCollab(collab)
                                            setShowActivityModal(true)
                                        }}
                                        title="View Activity"
                                    >
                                        <History size={18} />
                                    </button>
                                    <button 
                                        className="btn-icon" 
                                        onClick={() => {
                                            setSelectedCollab(collab)
                                            setShowPermissionsModal(true)
                                        }}
                                        title="Edit Permissions"
                                    >
                                        <Settings2 size={18} />
                                    </button>
                                    <button 
                                        className="btn-icon" 
                                        onClick={() => handleRevoke(collab.uuid, collab.member.firstName)}
                                        style={{ color: 'var(--error)' }}
                                        title="Remove Member"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      )}

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

      <style jsx>{`
        .btn-icon {
            width: 36px;
            height: 36px;
            border-radius: 10px;
            border: 1px solid var(--border);
            background: white;
            display: flex;
            alignItems: center;
            justifyContent: center;
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
