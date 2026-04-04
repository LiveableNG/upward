'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, MessageSquare, HelpCircle, AlertTriangle, Send } from 'lucide-react'

type Tab = 'faq' | 'issue'

export function HelpContent() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('faq')
  const [issueText, setIssueText] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleIssueSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!issueText.trim()) return
    setSubmitted(true)
    setTimeout(() => {
      setSubmitted(false)
      setIssueText('')
    }, 3000)
  }

  return (
    <div className="help-page dashboard--nav-offset">
      <header className="dashboard__header">
        <div className="dashboard__header-left">
          <button className="dashboard__back" onClick={() => router.push('/dashboard')}>
            <ArrowLeft size={20} />
          </button>
          <h2 className="dashboard__title">Help Center</h2>
        </div>
      </header>

      <section className="help-section">
        <div className="help-tabs">
          <button
            className={`help-tab ${activeTab === 'faq' ? 'help-tab--active' : ''}`}
            onClick={() => setActiveTab('faq')}
          >
            FAQs
          </button>
          <button
            className={`help-tab ${activeTab === 'issue' ? 'help-tab--active' : ''}`}
            onClick={() => setActiveTab('issue')}
          >
            Report Issue
          </button>
        </div>

        {activeTab === 'faq' && (
          <div className="faq-list">
            <div className="faq-item">
              <h4 className="faq-item__title">
                <HelpCircle size={18} color="var(--clay)" /> How do I download my receipt?
              </h4>
              <p className="faq-item__text">
                You can download your receipt from the Transactions page or the Receipts quick
                access menu by clicking on a specific payment.
              </p>
            </div>
            <div className="faq-item">
              <h4 className="faq-item__title">
                <AlertTriangle size={18} color="var(--clay)" /> My payment is pending?
              </h4>
              <p className="faq-item__text">
                Sometimes bank transfers take up to 24 hours to clear. If your payment is marked as
                pending, we're securely tracking it.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'issue' && (
          <div className="issue-report">
            <h3 className="issue-report__title">Log a Dispute or Issue</h3>
            <p className="issue-report__desc">
              Our support team is here to help. Describe the problem below.
            </p>

            {submitted ? (
              <div className="issue-report__success">
                <MessageSquare size={32} />
                <p>Message sent successfully!</p>
              </div>
            ) : (
              <form onSubmit={handleIssueSubmit} className="issue-report__form">
                <textarea
                  className="issue-report__textarea"
                  value={issueText}
                  onChange={(e) => setIssueText(e.target.value)}
                  placeholder="Describe your issue here..."
                />
                <button
                  type="submit"
                  className="btn btn--primary btn--full"
                  disabled={!issueText.trim()}
                >
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
