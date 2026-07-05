import React, { useState, useEffect } from 'react'
import {
  ShieldCheck,
  RefreshCcw,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
} from 'lucide-react'
import { apiService } from '../services/api.service'
import { showToast } from '@upward/client-core'
import { Link } from 'react-router-dom'

interface Verification {
  id: number
  pmId: number
  idType: string
  idNumber: string
  idImage: string | null
  status: string
  rejectionReason: string | null
  createdAt: string
  pm: {
    firstName: string
    lastName: string
    email: string
    businessName: string | null
    pmType: string | null
    uuid: string
    country: string | null
    phone: string | null
    cacNumber: string | null
  }
}

interface VerificationsProps {
  token: string
}

const Verifications: React.FC<VerificationsProps> = ({ token }) => {
  const [items, setItems] = useState<Verification[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('PENDING')
  const [processing, setProcessing] = useState<number | null>(null)
  
  const [modalState, setModalState] = useState<{
    isOpen: boolean
    type: 'APPROVE' | 'REJECT' | null
    itemId: number | null
    rejectReason: string
  }>({
    isOpen: false,
    type: null,
    itemId: null,
    rejectReason: ''
  })

  const fetchVerifications = async () => {
    setLoading(true)
    try {
      const response = await apiService.get(
        `/admin/pm-verifications?status=${statusFilter === 'All' ? '' : statusFilter}`,
        token
      )
      setItems(response.items)
    } catch (err) {
      console.error('Failed to fetch verifications', err)
      showToast('Failed to load verifications', true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVerifications()
  }, [statusFilter])

  const handleApprove = (id: number) => {
    setModalState({
      isOpen: true,
      type: 'APPROVE',
      itemId: id,
      rejectReason: ''
    })
  }

  const handleReject = (id: number) => {
    setModalState({
      isOpen: true,
      type: 'REJECT',
      itemId: id,
      rejectReason: ''
    })
  }

  const handleConfirmAction = async () => {
    if (!modalState.itemId || !modalState.type) return
    const id = modalState.itemId
    const type = modalState.type
    const reason = modalState.rejectReason

    setProcessing(id)
    setModalState(prev => ({ ...prev, isOpen: false }))

    try {
      if (type === 'APPROVE') {
        await apiService.post(`/admin/pm-verifications/${id}/approve`, {}, token)
        showToast('Verification approved successfully! ✓')
      } else {
        await apiService.post(`/admin/pm-verifications/${id}/reject`, { reason }, token)
        showToast('Verification rejected.')
      }
      fetchVerifications()
    } catch (err) {
      showToast(`${type === 'APPROVE' ? 'Approval' : 'Rejection'} failed`, true)
    } finally {
      setProcessing(null)
    }
  }

  return (
    <div className="page-container fade-in">
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: 'rgba(34, 197, 94, 0.1)', color: 'var(--accent)', width: 48, height: 48, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={24} color="#22c55e" />
          </div>
          <div>
            <h1 className="section-title" style={{ margin: 0 }}>Identity Verifications</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '4px 0 0 0' }}>Review and approve PM/Landlord identity documents.</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
            <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ padding: '10px 16px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--white)', fontWeight: 600 }}
            >
                <option value="All">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
            </select>
            <button 
              onClick={() => fetchVerifications()} 
              style={{ padding: '10px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--white)', cursor: 'pointer' }}
            >
                <RefreshCcw size={16} className={loading ? 'spin' : ''} />
            </button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
                <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Company Details</th>
                    <th style={{ padding: '16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Tenants Under Management</th>
                    <th style={{ padding: '16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>CAC Number</th>
                    <th style={{ padding: '16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status</th>
                    <th style={{ padding: '16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Submitted</th>
                    <th style={{ padding: '16px 24px', textAlign: 'right', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Actions</th>
                </tr>
            </thead>
            <tbody>
                {loading ? (
                    <tr><td colSpan={6} style={{ padding: 48, textAlign: 'center' }}><div className="loader" style={{ margin: '0 auto' }} /></td></tr>
                ) : items.length === 0 ? (
                    <tr><td colSpan={6} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>No verification requests found.</td></tr>
                ) : (
                    items.map(item => (
                        <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '16px 24px' }}>
                                <div style={{ fontWeight: 700, fontSize: '14px' }}>
                                    <Link to={`/pms/${item.pm.uuid}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                                        {item.pm.businessName || 'No Business Name'}
                                    </Link>
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Email: {item.pm.email}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Phone: {item.pm.phone || 'N/A'}</div>
                                {item.pm.country && (
                                    <div style={{ fontSize: 10, background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 6px', borderRadius: 4, marginTop: 4, fontWeight: 700 }}>
                                        <MapPin size={10} /> {item.pm.country}
                                    </div>
                                )}
                            </td>
                            <td style={{ padding: '16px' }}>
                                <div style={{ fontWeight: 600, fontSize: '13px' }}>{item.pm.pmType || 'Not specified'}</div>
                            </td>
                            <td style={{ padding: '16px' }}>
                                {item.pm.cacNumber ? (
                                    <div style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-main)', background: 'var(--surface)', padding: '4px 8px', borderRadius: 6, display: 'inline-block' }}>
                                        {item.pm.cacNumber}
                                    </div>
                                ) : (
                                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Not Provided</span>
                                )}
                            </td>
                            <td style={{ padding: '16px' }}>
                                <div style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: 6, 
                                    fontSize: 12, 
                                    fontWeight: 700,
                                    color: item.status === 'APPROVED' ? '#10b981' : item.status === 'REJECTED' ? '#ef4444' : '#f59e0b'
                                }}>
                                    {item.status === 'APPROVED' ? <CheckCircle size={14} /> : item.status === 'REJECTED' ? <XCircle size={14} /> : <Clock size={14} />}
                                    {item.status}
                                </div>
                            </td>
                            <td style={{ padding: '16px' }}>
                                <div style={{ fontSize: '13px' }}>{new Date(item.createdAt).toLocaleDateString()}</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                            </td>
                            <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                    {item.status === 'PENDING' && (
                                        <>
                                            <button 
                                                onClick={() => handleApprove(item.id)}
                                                disabled={processing === item.id}
                                                style={{ background: '#10b981', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                                            >
                                                Approve
                                            </button>
                                            <button 
                                                onClick={() => handleReject(item.id)}
                                                disabled={processing === item.id}
                                                style={{ background: '#ef4444', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                                            >
                                                Reject
                                            </button>
                                        </>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))
                )}
            </tbody>
        </table>
      </div>

      {modalState.isOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3 className="modal-title">
              {modalState.type === 'APPROVE' ? 'Approve Verification' : 'Reject Verification'}
            </h3>
            <p className="modal-body">
              {modalState.type === 'APPROVE' 
                ? 'Are you sure you want to approve this verification request? This will verify the property manager\'s profile.'
                : 'Please enter the reason for rejecting this verification request:'
              }
            </p>
            {modalState.type === 'REJECT' && (
              <textarea
                className="modal-input"
                rows={3}
                placeholder="Enter rejection reason..."
                value={modalState.rejectReason}
                onChange={(e) => setModalState(prev => ({ ...prev, rejectReason: e.target.value }))}
                style={{ resize: 'none', marginBottom: '20px' }}
              />
            )}
            <div className="modal-actions" style={{ marginTop: modalState.type === 'APPROVE' ? '20px' : '0' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => setModalState(prev => ({ ...prev, isOpen: false }))}
              >
                Cancel
              </button>
              <button 
                className={`btn ${modalState.type === 'APPROVE' ? 'btn-primary' : 'btn-danger'}`}
                onClick={handleConfirmAction}
                disabled={modalState.type === 'REJECT' && !modalState.rejectReason.trim()}
              >
                {modalState.type === 'APPROVE' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .loader {
            width: 24px;
            height: 24px;
            border: 3px solid rgba(0,0,0,0.1);
            border-top: 3px solid var(--accent);
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.2s ease-out;
        }
        .modal-card {
          background: var(--white);
          border-radius: 16px;
          width: 100%;
          max-width: 440px;
          padding: 24px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          animation: slideUp 0.2s ease-out;
        }
        .modal-title {
          font-size: 18px;
          font-weight: 700;
          color: var(--text-main);
          margin: 0 0 12px 0;
        }
        .modal-body {
          font-size: 14px;
          color: var(--text-muted);
          line-height: 1.5;
          margin-bottom: 20px;
        }
        .modal-input {
          width: 100%;
          padding: 10px 14px;
          border-radius: 8px;
          border: 1px solid var(--border);
          font-size: 14px;
          margin-bottom: 20px;
          outline: none;
          transition: border-color 0.15s ease;
          background: var(--white);
          color: var(--text-main);
        }
        .modal-input:focus {
          border-color: var(--accent);
        }
        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }
        .btn {
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: background 0.15s ease;
        }
        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .btn-secondary {
          background: var(--surface);
          color: var(--text-main);
          border: 1px solid var(--border);
        }
        .btn-secondary:hover {
          background: var(--border);
        }
        .btn-primary {
          background: #10b981;
          color: white;
        }
        .btn-primary:hover {
          filter: brightness(0.95);
        }
        .btn-danger {
          background: #ef4444;
          color: white;
        }
        .btn-danger:hover {
          background: #dc2626;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

export default Verifications
