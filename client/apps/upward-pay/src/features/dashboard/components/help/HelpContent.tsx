'use client'

import { useState } from 'react'
import { HelpCircle, Send, Mail, Clock } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'

type Tab = 'faq' | 'issue'

export function HelpContent() {
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

  const faqs = [
    {
      q: 'How do I download my tenancy agreement?',
      a: "Go to your Profile, select 'Tenancy Agreement', and you'll find a list of all your uploaded documents ready for download.",
    },
    {
      q: 'My rent payment is pending, what do I do?',
      a: "Don't worry! Bank transfers sometimes take up to 24 hours to clear. If it stays pending for more than 48 hours, please report an issue below.",
    },
    {
      q: 'Can I delete a transaction history?',
      a: 'For security and record-keeping purposes, transaction histories cannot be deleted. They serve as your official payment ledger.',
    },
    {
      q: 'How do I update my profile picture?',
      a: 'Tap on your avatar on the Profile page and paste a new image URL or use our upload feature coming soon.',
    },
  ]

  return (
    <div className="help-page dashboard--nav-offset">
      <PageHeader title="Customer Service" showBack backPath="/dashboard" showSettings={false} />

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
            {faqs.map((faq, idx) => (
              <div key={idx} className="faq-item theme-card">
                <h4 className="faq-item__title">
                  <HelpCircle size={18} color="var(--clay)" /> {faq.q}
                </h4>
                <p className="faq-item__text">{faq.a}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'issue' && (
          <div className="issue-report">
            <h3 className="issue-report__title">Log a Dispute or Issue</h3>
            <p className="issue-report__desc">
              Describe the problem below. Our support team typically responds within 2 hours.
            </p>

            {submitted ? (
              <div className="issue-report__success">
                <CheckCircle2 size={32} color="var(--clay)" />
                <p>Support ticket submitted successfully!</p>
              </div>
            ) : (
              <form onSubmit={handleIssueSubmit} className="issue-report__form">
                <textarea
                  className="issue-report__textarea"
                  value={issueText}
                  onChange={(e) => setIssueText(e.target.value)}
                  placeholder="Tell us what's wrong..."
                />
                <button
                  type="submit"
                  className="btn btn--primary btn--full"
                  disabled={!issueText.trim()}
                >
                  <Send size={16} /> Submit Ticket
                </button>
              </form>
            )}
          </div>
        )}
      </section>

      <style jsx>{`
        .help-page {
          padding-bottom: 5rem;
        }
        .help-section {
          padding: 1rem;
        }
        .contact-quick-cards {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          margin-bottom: 2rem;
        }
        .contact-card {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem !important;
          margin-bottom: 0 !important;
          cursor: pointer;
          border-radius: 16px !important;
        }
        .contact-card__icon-wrap {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: var(--clay-faint);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--clay);
        }
        .contact-card__info {
          display: flex;
          flex-direction: column;
        }
        .contact-card__label {
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--text-muted);
        }
        .contact-card__val {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text);
        }

        .help-tabs {
          display: flex;
          background: var(--surface2);
          padding: 0.25rem;
          border-radius: 12px;
          margin-bottom: 1.5rem;
        }
        .help-tab {
          flex: 1;
          padding: 0.75rem;
          border: none;
          background: none;
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--text-muted);
          cursor: pointer;
          border-radius: 10px;
          transition: all 0.2s;
        }
        .help-tab--active {
          background: var(--surface);
          color: var(--clay);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .theme-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 1.25rem;
          margin-bottom: 1rem;
        }

        .faq-item__title {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 0.75rem;
        }
        .faq-item__text {
          font-size: 0.9rem;
          line-height: 1.5;
          color: var(--text-secondary);
          padding-left: 1.75rem;
        }

        .issue-report__title {
          font-size: 1.1rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }
        .issue-report__desc {
          font-size: 0.9rem;
          color: var(--text-muted);
          margin-bottom: 2rem;
        }
        .issue-report__success {
          text-align: center;
          padding: 3rem 1rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          color: var(--text-secondary);
          font-weight: 600;
        }
        .issue-report__textarea {
          width: 100%;
          min-height: 150px;
          padding: 1rem;
          border: 1.5px solid var(--border-solid);
          border-radius: 16px;
          background: var(--bg);
          color: var(--text);
          font-family: inherit;
          margin-bottom: 1.5rem;
          resize: vertical;
        }
        .issue-report__textarea:focus {
          outline: none;
          border-color: var(--clay);
        }
      `}</style>
    </div>
  )
}
import { CheckCircle2 } from 'lucide-react'
