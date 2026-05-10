
'use client'

import React from 'react'
import { X, History, FileText, Building2, User, CreditCard, Clock, Sparkles } from 'lucide-react'
import { useCollaboratorActivities } from '@/features/pm/hooks/useTeam'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

interface ActivityLogModalProps {
  collaboratorUuid: string
  onClose: () => void
}

export function ActivityLogModal({ collaboratorUuid, onClose }: ActivityLogModalProps) {
  const { data, isLoading } = useCollaboratorActivities(collaboratorUuid)
  
  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CREATE_PROPERTY': return <Building2 size={16} />
      case 'CREATE_UNIT': return <Sparkles size={16} className="text-[var(--forest)]" />
      case 'SEND_INVOICE': return <FileText size={16} className="text-[var(--clay)]" />
      case 'UPDATE_RENT': return <CreditCard size={16} className="text-[var(--forest)]" />
      case 'INVITE_TENANT': return <User size={16} className="text-[var(--clay)]" />
      default: return <Clock size={16} />
    }
  }

  const logs = data?.logs || []
  const collaborator = data?.collaborator

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div className="modal-container" style={{ maxWidth: 600, width: '90%', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <header className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
             <div style={{ 
                 width: 48, 
                 height: 48, 
                 borderRadius: 16, 
                 background: 'var(--bg)', 
                 color: 'var(--clay)', 
                 display: 'flex', 
                 alignItems: 'center', 
                 justifyContent: 'center'
             }}>
                <History size={24} />
             </div>
             <div>
                <h2 className="modal-title">Activity Feed</h2>
                <p className="modal-subtitle">
                    Recent actions by {collaborator ? `${collaborator.firstName} ${collaborator.lastName}` : 'this member'}
                </p>
             </div>
          </div>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </header>

        <div className="modal-body" style={{ padding: '24px 32px', flex: 1, overflow: 'auto' }}>
          {isLoading ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>Loading activities...</div>
          ) : logs.length === 0 ? (
            <div style={{ padding: '60px 40px', textAlign: 'center' }}>
                <div style={{ color: 'var(--text-muted)', opacity: 0.2, marginBottom: 16 }}>
                    <History size={48} style={{ margin: '0 auto' }} />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>No activity recorded yet</h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    When this collaborator takes actions in your portfolio, they will appear here.
                </p>
            </div>
          ) : (
            <div className="activity-timeline" style={{ position: 'relative' }}>
                <div style={{ 
                    position: 'absolute', 
                    left: 17, 
                    top: 8, 
                    bottom: 8, 
                    width: 2, 
                    background: 'var(--border)', 
                    opacity: 0.5 
                }} />
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                    {logs.map((log: any) => (
                        <div key={log.uuid} style={{ display: 'flex', gap: 20, position: 'relative' }}>
                            <div style={{ 
                                width: 36, 
                                height: 36, 
                                borderRadius: 12, 
                                background: 'white', 
                                border: '2px solid var(--border)', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                zIndex: 1,
                                color: 'var(--text-secondary)'
                            }}>
                                {getActionIcon(log.action)}
                            </div>
                            
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--dark)' }}>{log.description}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', marginTop: 3 }}>
                                        {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                                    </div>
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                    Target: <span style={{ fontWeight: 600 }}>{log.entityType}</span>
                                </div>
                                {log.metadata && (
                                    <div style={{ 
                                        marginTop: 12, 
                                        padding: 12, 
                                        background: 'var(--bg)', 
                                        borderRadius: 12, 
                                        fontSize: 12, 
                                        border: '1px solid var(--border)' 
                                    }}>
                                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                                            {JSON.stringify(log.metadata, null, 2)}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ padding: '20px 32px', borderTop: '1px solid var(--border)' }}>
            <button className="btn btn--secondary w-full" onClick={onClose}>Close Feed</button>
        </div>
      </div>
    </div>
  )
}
