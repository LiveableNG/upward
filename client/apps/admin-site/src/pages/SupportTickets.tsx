import React, { useState, useEffect } from 'react'
import { LifeBuoy, CheckCircle2 } from 'lucide-react'
import { apiService } from '../services/api.service'
import { showToast } from '@upward/client-core'
import { Link } from 'react-router-dom'

interface SupportTicket {
  id: number
  userId: number
  message: string
  status: string
  createdAt: string
  user: {
    id: number
    firstName: string
    lastName: string
    email: string
  }
}

interface SupportTicketsProps {
  token: string
}

const SupportTickets: React.FC<SupportTicketsProps> = ({ token }) => {
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [resolvingId, setResolvingId] = useState<number | null>(null)
  const [responseMessage, setResponseMessage] = useState('')

  useEffect(() => {
    fetchTickets()
  }, [token])

  const fetchTickets = async () => {
    try {
      const result = await apiService.get('/admin/support', token)
      setTickets(result.tickets || [])
    } catch (err) {
      console.error(err)
      showToast('Failed to fetch support tickets', true)
    } finally {
      setLoading(false)
    }
  }

  const handleResolve = async (e: React.FormEvent, ticketId: number) => {
    e.preventDefault()
    try {
      await apiService.post(`/admin/support/${ticketId}/resolve`, { responseMessage }, token)
      setResponseMessage('')
      setResolvingId(null)
      showToast('Ticket marked as resolved!')
      fetchTickets()
    } catch (err) {
      console.error(err)
      showToast('Failed to resolve ticket', true)
    }
  }

  return (
    <div className="page-container fade-in">
      <div style={{ marginBottom: '32px' }}>
        <h2 className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <LifeBuoy /> Support Tickets
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
          Manage user issues and disputes from the Help Center. Resolving a ticket will notify the user.
        </p>
      </div>

      <div style={{ maxWidth: '1000px' }}>
        <div className="card" style={{ padding: '0' }}>
          <div style={{ padding: '24px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Open & Recent Tickets</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {loading ? (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading tickets...
              </div>
            ) : tickets.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No support tickets found. Wow, everything is perfect!
              </div>
            ) : (
              tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid var(--border)',
                    backgroundColor: ticket.status === 'RESOLVED' ? 'var(--surface-hover)' : 'transparent',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>
                        {ticket.user ? (
                          <Link to={`/users/${(ticket.user as any).uuid}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                            {ticket.user.firstName} {ticket.user.lastName}
                          </Link>
                        ) : 'Unknown User'}
                        {ticket.user && (
                          <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: '8px' }}>
                            {ticket.user.email}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{new Date(ticket.createdAt).toLocaleString()}</div>
                    </div>
                    {ticket.status?.toUpperCase() === 'RESOLVED' ? (
                      <span className="badge badge-success">
                        RESOLVED
                      </span>
                    ) : (
                      <span className="badge badge-warning">
                        OPEN
                      </span>
                    )}
                  </div>
                  
                  <div style={{ backgroundColor: 'var(--surface)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '15px', lineHeight: '1.6' }}>
                    {ticket.message}
                  </div>

                  {ticket.status?.toUpperCase() === 'OPEN' && (
                    <div style={{ marginTop: '8px' }}>
                      {resolvingId === ticket.id ? (
                        <form onSubmit={(e) => handleResolve(e, ticket.id)} style={{ display: 'flex', flexDirection: 'column', gap: '12px'}}>
                          <textarea 
                            value={responseMessage}
                            onChange={(e) => setResponseMessage(e.target.value)}
                            placeholder="Message to send to user (optional)"
                            className="input"
                            style={{ minHeight: '100px', resize: 'vertical' }}
                          />
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button type="submit" className="btn btn-primary" style={{ backgroundColor: 'var(--success)' }}>Mark as Resolved</button>
                            <button type="button" onClick={() => setResolvingId(null)} className="btn btn-secondary">Cancel</button>
                          </div>
                        </form>
                      ) : (
                        <button onClick={() => setResolvingId(ticket.id)} className="btn btn-secondary" style={{ backgroundColor: 'var(--white)' }}>
                          <CheckCircle2 size={16} /> Resolve Issue
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default SupportTickets
