'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, MessageSquare, HelpCircle, AlertTriangle, Send } from 'lucide-react'

export default function HelpPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'faq' | 'issue'>('faq')
  const [issueText, setIssueText] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleIssueSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!issueText.trim()) return
    // Mock submit
    setSubmitted(true)
    setTimeout(() => {
      setSubmitted(false)
      setIssueText('')
    }, 3000)
  }

  return (
    <div className="dashboard dashboard--nav-offset">
      <header className="dashboard__header">
        <div className="dashboard__header-left">
           <button className="dashboard__back" onClick={() => router.push('/dashboard')}>
             <ArrowLeft size={20} />
           </button>
           <h2 className="dashboard__title">Help Center</h2>
        </div>
      </header>

      <section className="dashboard__section" style={{ padding: '0 20px', marginTop: '16px' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', background: 'var(--surface)', padding: '4px', borderRadius: 'var(--radius-md)' }}>
          <button 
            style={{ 
              flex: 1, 
              padding: '10px', 
              borderRadius: '8px', 
              border: 'none', 
              background: activeTab === 'faq' ? 'var(--bg)' : 'transparent', 
              color: activeTab === 'faq' ? 'var(--text)' : 'var(--text-muted)',
              fontWeight: 600,
              boxShadow: activeTab === 'faq' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
              cursor: 'pointer'
            }}
            onClick={() => setActiveTab('faq')}
          >
            FAQs
          </button>
          <button 
            style={{ 
              flex: 1, 
              padding: '10px', 
              borderRadius: '8px', 
              border: 'none', 
              background: activeTab === 'issue' ? 'var(--bg)' : 'transparent',
              color: activeTab === 'issue' ? 'var(--text)' : 'var(--text-muted)',
              fontWeight: 600,
              boxShadow: activeTab === 'issue' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
              cursor: 'pointer'
            }}
            onClick={() => setActiveTab('issue')}
          >
            Report Issue
          </button>
        </div>

        {activeTab === 'faq' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: 'var(--surface)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 600, marginBottom: '8px' }}>
                <HelpCircle size={18} color="var(--clay)" /> How do I download my receipt?
              </h4>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                You can download your receipt from the Transactions page or the Receipts quick access menu by clicking on a specific payment.
              </p>
            </div>
            <div style={{ background: 'var(--surface)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 600, marginBottom: '8px' }}>
                <AlertTriangle size={18} color="var(--clay)" /> My payment is pending?
              </h4>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Sometimes bank transfers take up to 24 hours to clear. If your payment is marked as pending, we're securely tracking it.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'issue' && (
          <div style={{ background: 'var(--surface)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>Log a Dispute or Issue</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Our support team is here to help. Describe the problem below.
            </p>
            
            {submitted ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '24px 0', color: 'var(--success)' }}>
                <MessageSquare size={32} />
                <p style={{ fontWeight: 600 }}>Message sent successfully!</p>
              </div>
            ) : (
              <form onSubmit={handleIssueSubmit}>
                <textarea 
                  value={issueText}
                  onChange={(e) => setIssueText(e.target.value)}
                  placeholder="Describe your issue here..."
                  style={{
                    width: '100%',
                    minHeight: '120px',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    fontFamily: 'var(--font)',
                    fontSize: '14px',
                    color: 'var(--text)',
                    resize: 'none',
                    marginBottom: '16px'
                  }}
                />
                <button type="submit" className="btn btn--primary btn--full btn--sm" disabled={!issueText.trim()}>
                  <Send size={16} /> Submit
                </button>
              </form>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
