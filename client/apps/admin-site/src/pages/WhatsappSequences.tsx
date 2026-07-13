import { useState, useEffect } from 'react'

interface WhatsappSequencesProps {
  token: string
}

interface SequenceLog {
  id: number
  userId: number
  stage: string
  status: string
  scheduledFor: string
  sentAt: string | null
  errorReason: string | null
  templateName: string
  templateData: any
}

export default function WhatsappSequences({ token }: WhatsappSequencesProps) {
  const [logs, setLogs] = useState<SequenceLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')

  const fetchLogs = async () => {
    setLoading(true)
    setError(null)
    try {
      const query = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(statusFilter && { status: statusFilter }),
      })
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/whatsapp-sequences?${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch sequence logs')
      const data = await res.json()
      setLogs(data.data)
      setTotalPages(data.meta.totalPages)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [page, statusFilter])

  const handleRetry = async (id: number) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/whatsapp-sequences/${id}/retry`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || 'Retry failed')
      }
      await fetchLogs()
    } catch (err: any) {
      alert(err.message)
    }
  }

  return (
    <div className="logs-container" style={{ padding: '24px' }}>
      <header className="logs-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>WhatsApp Onboarding Sequences</h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setPage(1)
            }}
            style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="SENT">Sent</option>
            <option value="FAILED">Failed</option>
          </select>
          <button
            onClick={fetchLogs}
            style={{ padding: '8px 16px', background: '#3b82f6', color: 'white', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
          >
            Refresh
          </button>
        </div>
      </header>

      {error && <div style={{ color: 'red', marginBottom: '16px' }}>{error}</div>}

      <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
              <th style={{ padding: '12px 16px', fontWeight: '600' }}>ID</th>
              <th style={{ padding: '12px 16px', fontWeight: '600' }}>User ID</th>
              <th style={{ padding: '12px 16px', fontWeight: '600' }}>Stage</th>
              <th style={{ padding: '12px 16px', fontWeight: '600' }}>Template</th>
              <th style={{ padding: '12px 16px', fontWeight: '600' }}>Status</th>
              <th style={{ padding: '12px 16px', fontWeight: '600' }}>Scheduled For</th>
              <th style={{ padding: '12px 16px', fontWeight: '600' }}>Error Reason</th>
              <th style={{ padding: '12px 16px', fontWeight: '600' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ padding: '24px', textAlign: 'center' }}>Loading...</td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '24px', textAlign: 'center' }}>No sequences found.</td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '12px 16px' }}>{log.id}</td>
                  <td style={{ padding: '12px 16px' }}>{log.userId}</td>
                  <td style={{ padding: '12px 16px' }}>{log.stage}</td>
                  <td style={{ padding: '12px 16px' }}>{log.templateName}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span
                      style={{
                        padding: '4px 8px',
                        borderRadius: '999px',
                        fontSize: '12px',
                        fontWeight: '500',
                        backgroundColor:
                          log.status === 'SENT' ? '#dcfce7' : log.status === 'FAILED' ? '#fee2e2' : '#fef9c3',
                        color:
                          log.status === 'SENT' ? '#166534' : log.status === 'FAILED' ? '#991b1b' : '#854d0e',
                      }}
                    >
                      {log.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {new Date(log.scheduledFor).toLocaleString()}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#991b1b', fontSize: '12px' }}>
                    {log.errorReason || '-'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {log.status === 'FAILED' && (
                      <button
                        onClick={() => handleRetry(log.id)}
                        style={{ padding: '4px 8px', background: '#ef4444', color: 'white', borderRadius: '4px', border: 'none', cursor: 'pointer', fontSize: '12px' }}
                      >
                        Retry
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
        <span>
          Page {page} of {totalPages || 1}
        </span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{ padding: '6px 12px', border: '1px solid #ccc', borderRadius: '4px', background: page === 1 ? '#f3f4f6' : 'white', cursor: page === 1 ? 'not-allowed' : 'pointer' }}
          >
            Previous
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || totalPages === 0}
            style={{ padding: '6px 12px', border: '1px solid #ccc', borderRadius: '4px', background: page === totalPages || totalPages === 0 ? '#f3f4f6' : 'white', cursor: page === totalPages || totalPages === 0 ? 'not-allowed' : 'pointer' }}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}
