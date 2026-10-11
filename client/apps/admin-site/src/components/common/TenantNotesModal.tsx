import React, { useState, useEffect } from 'react'
import { FileText, Plus, Trash2, ShieldCheck, CheckCircle2, MessageSquare, AlertCircle } from 'lucide-react'
import { Modal } from './modal/Modal'
import { apiService } from '../../services/api.service'
import { showToast } from '@upward/client-core'

export interface TenantNote {
  id: number
  uuid: string
  userId?: number
  adminId?: string | null
  adminEmail?: string | null
  adminName?: string | null
  category: 'PAID_OUTSIDE' | 'GENERAL' | string
  note: string
  createdAt: string
  updatedAt: string
}

interface TenantNotesModalProps {
  isOpen: boolean
  onClose: () => void
  tenant: {
    uuid: string
    id?: string | number
    name?: string
    firstName?: string
    lastName?: string
    email?: string
  } | null
  initialNotes?: TenantNote[]
  onNotesUpdated?: (tenantUuid: string, updatedNotes: TenantNote[]) => void
  token?: string
}

export const TenantNotesModal: React.FC<TenantNotesModalProps> = ({
  isOpen,
  onClose,
  tenant,
  initialNotes,
  onNotesUpdated,
  token,
}) => {
  const [notes, setNotes] = useState<TenantNote[]>(initialNotes || [])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Form State
  const [newNote, setNewNote] = useState('')
  const [category, setCategory] = useState<'PAID_OUTSIDE' | 'GENERAL'>('PAID_OUTSIDE')

  const tenantName =
    tenant?.name ||
    [tenant?.firstName, tenant?.lastName].filter(Boolean).join(' ') ||
    tenant?.email ||
    'Tenant'

  const authToken = token || localStorage.getItem('upward_token') || ''

  const fetchNotes = async () => {
    if (!tenant?.uuid) return
    setLoading(true)
    try {
      const res = await apiService.get(`/admin/users/${tenant.uuid}/notes`, authToken)
      const fetched = res.data || []
      setNotes(fetched)
      onNotesUpdated?.(tenant.uuid, fetched)
    } catch (err: any) {
      console.error('Failed to load notes', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && tenant?.uuid) {
      if (initialNotes && initialNotes.length > 0) {
        setNotes(initialNotes)
      } else {
        fetchNotes()
      }
    }
    if (!isOpen) {
      setNewNote('')
      setCategory('PAID_OUTSIDE')
    }
  }, [isOpen, tenant?.uuid])

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenant?.uuid || !newNote.trim()) return

    setSubmitting(true)
    try {
      const res = await apiService.post(
        `/admin/users/${tenant.uuid}/notes`,
        {
          note: newNote.trim(),
          category,
        },
        authToken,
      )

      showToast('Note added successfully')
      const createdNote = res.data
      const updated = [createdNote, ...notes]
      setNotes(updated)
      setNewNote('')
      onNotesUpdated?.(tenant.uuid, updated)
    } catch (err: any) {
      console.error(err)
      showToast(err.message || 'Failed to save note', true)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteNote = async (noteUuid: string) => {
    if (!tenant?.uuid) return
    setDeletingId(noteUuid)
    try {
      await apiService.delete(`/admin/users/notes/${noteUuid}`, authToken)
      showToast('Note deleted')
      const updated = notes.filter((n) => n.uuid !== noteUuid)
      setNotes(updated)
      onNotesUpdated?.(tenant.uuid, updated)
    } catch (err: any) {
      console.error(err)
      showToast(err.message || 'Failed to delete note', true)
    } finally {
      setDeletingId(null)
    }
  }

  const hasPaidOutside = notes.some((n) => n.category === 'PAID_OUTSIDE')

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="580px"
      icon={<FileText size={22} />}
      title="Tenant Admin Notes"
      description={`Follow-up notes & payment tracking for ${tenantName}`}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Status Callout if Paid Outside */}
        {hasPaidOutside && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 14px',
              borderRadius: '10px',
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              color: '#d97706',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>
              Flagged as <strong>Paid Outside App</strong>. Do not disturb with rent collection follow-ups.
            </span>
          </div>
        )}

        {/* New Note Form */}
        <form
          onSubmit={handleAddNote}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            padding: '16px',
            backgroundColor: 'var(--surface-hover)',
            borderRadius: '12px',
            border: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
              Add New Note
            </span>

            {/* Category Toggle */}
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setCategory('PAID_OUTSIDE')}
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: '100px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  backgroundColor: category === 'PAID_OUTSIDE' ? '#f59e0b' : 'transparent',
                  color: category === 'PAID_OUTSIDE' ? '#ffffff' : 'var(--text-muted)',
                  border: category === 'PAID_OUTSIDE' ? '1px solid #f59e0b' : '1px solid var(--border)',
                }}
              >
                Paid Outside App
              </button>
              <button
                type="button"
                onClick={() => setCategory('GENERAL')}
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: '100px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  backgroundColor: category === 'GENERAL' ? 'var(--text)' : 'transparent',
                  color: category === 'GENERAL' ? 'var(--surface)' : 'var(--text-muted)',
                  border: category === 'GENERAL' ? '1px solid var(--text)' : '1px solid var(--border)',
                }}
              >
                General Note
              </button>
            </div>
          </div>

          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder={
              category === 'PAID_OUTSIDE'
                ? 'e.g. Paid full year rent directly to PM on Oct 10th via bank transfer. Do not disturb.'
                : 'Enter notes about communication, preference, or account status...'
            }
            required
            rows={3}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--surface)',
              color: 'var(--text)',
              fontSize: '13px',
              fontFamily: 'inherit',
              resize: 'vertical',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              disabled={submitting || !newNote.trim()}
              className="btn btn-primary"
              style={{
                height: '34px',
                padding: '0 14px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              <Plus size={14} />
              {submitting ? 'Saving Note...' : 'Save Note'}
            </button>
          </div>
        </form>

        {/* Existing Notes Thread */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
              Note History ({notes.length})
            </span>
          </div>

          {loading ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              Loading notes...
            </div>
          ) : notes.length === 0 ? (
            <div
              style={{
                padding: '28px 16px',
                textAlign: 'center',
                borderRadius: '10px',
                border: '1px dashed var(--border)',
                color: 'var(--text-muted)',
                fontSize: '13px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <MessageSquare size={24} style={{ opacity: 0.3 }} />
              <span>No notes recorded for this tenant yet.</span>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                maxHeight: '320px',
                overflowY: 'auto',
                paddingRight: '4px',
              }}
            >
              {notes.map((n) => {
                const isPaidOutside = n.category === 'PAID_OUTSIDE'
                return (
                  <div
                    key={n.uuid}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '10px',
                      backgroundColor: 'var(--surface)',
                      border: isPaidOutside
                        ? '1px solid rgba(245, 158, 11, 0.35)'
                        : '1px solid var(--border)',
                      boxShadow: 'var(--shadow-xs)',
                      position: 'relative',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '100px',
                            backgroundColor: isPaidOutside ? 'rgba(245, 158, 11, 0.12)' : 'var(--surface-hover)',
                            color: isPaidOutside ? '#d97706' : 'var(--text-secondary)',
                            border: isPaidOutside
                              ? '1px solid rgba(245, 158, 11, 0.25)'
                              : '1px solid var(--border)',
                          }}
                        >
                          {isPaidOutside ? 'Paid Outside App' : 'General Note'}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          by {n.adminEmail || n.adminName || 'Admin'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {new Date(n.createdAt).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteNote(n.uuid)}
                          disabled={deletingId === n.uuid}
                          title="Delete note"
                          style={{
                            padding: '4px',
                            background: 'transparent',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--danger)')}
                          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-muted)')}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <p
                      style={{
                        margin: 0,
                        fontSize: '13px',
                        color: 'var(--text)',
                        lineHeight: 1.45,
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {n.note}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
