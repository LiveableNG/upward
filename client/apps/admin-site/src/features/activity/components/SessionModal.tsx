import React from 'react'
import { Modal } from '../../../components/common/modal/Modal'

export interface SessionForm {
  name: string
  googleMeetLink: string
  startTime: string
  endTime: string
  duration: number
}

interface SessionModalProps {
  showModal: 'create' | 'edit' | null
  onClose: () => void
  sessionForm: SessionForm
  setSessionForm: (form: SessionForm) => void
  onSave: (e: React.FormEvent) => void
}

export const SessionModal: React.FC<SessionModalProps> = ({
  showModal,
  onClose,
  sessionForm,
  setSessionForm,
  onSave,
}) => {
  if (!showModal) return null

  return (
    <Modal
      isOpen={!!showModal}
      onClose={onClose}
      title={showModal === 'create' ? 'Schedule New Session' : 'Edit Session Details'}
      description={
        showModal === 'create'
          ? 'Create a new session block for attendance.'
          : 'Modify session times or meeting links.'
      }
      maxWidth="480px"
    >
      <form onSubmit={onSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '14px', fontWeight: 600 }}>Session Name (Identifier)</label>
          <input
            required
            type="text"
            value={sessionForm.name}
            onChange={(e) => setSessionForm({ ...sessionForm, name: e.target.value })}
            placeholder="e.g. Information Session #12"
            style={{
              padding: '12px',
              borderRadius: '10px',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
            }}
          />
          <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Matches 'selectedSession' in waitlist table.
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '14px', fontWeight: 600 }}>Google Meet Link</label>
          <input
            required
            type="url"
            value={sessionForm.googleMeetLink}
            onChange={(e) => setSessionForm({ ...sessionForm, googleMeetLink: e.target.value })}
            placeholder="https://meet.google.com/..."
            style={{
              padding: '12px',
              borderRadius: '10px',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
            }}
          />
        </div>
        <div
          className="flex-mobile-column"
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '14px', fontWeight: 600 }}>Start Time</label>
            <input
              required
              type="datetime-local"
              value={sessionForm.startTime}
              onChange={(e) => {
                const val = e.target.value
                if (!val) {
                  setSessionForm({ ...sessionForm, startTime: val })
                  return
                }
                const d = new Date(val)
                const end = new Date(d.getTime() + sessionForm.duration * 60 * 60 * 1000)
                const endVal = new Date(end.getTime() - end.getTimezoneOffset() * 60000)
                  .toISOString()
                  .slice(0, 16)

                setSessionForm({
                  ...sessionForm,
                  startTime: val,
                  endTime: endVal,
                })
              }}
              style={{
                padding: '12px',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
              }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '14px', fontWeight: 600 }}>Duration</label>
            <select
              value={sessionForm.duration}
              onChange={(e) => {
                const dur = parseInt(e.target.value)
                let endVal = sessionForm.endTime
                if (sessionForm.startTime) {
                  const d = new Date(sessionForm.startTime)
                  const end = new Date(d.getTime() + dur * 60 * 60 * 1000)
                  endVal = new Date(end.getTime() - end.getTimezoneOffset() * 60000)
                    .toISOString()
                    .slice(0, 16)
                }
                setSessionForm({ ...sessionForm, duration: dur, endTime: endVal })
              }}
              style={{
                padding: '12px',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
              }}
            >
              {[1, 2, 3, 4].map((h) => (
                <option key={h} value={h}>
                  {h} {h === 1 ? 'hour' : 'hours'}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: '12px',
              border: '1px solid var(--border)',
              background: 'var(--white)',
              borderRadius: '12px',
              fontWeight: 600,
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            style={{
              flex: 1,
              padding: '12px',
              border: 'none',
              background: 'var(--accent)',
              color: 'var(--white)',
              borderRadius: '12px',
              fontWeight: 600,
            }}
          >
            {showModal === 'create' ? 'Create Session' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
