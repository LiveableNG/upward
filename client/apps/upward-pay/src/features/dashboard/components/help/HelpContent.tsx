'use client'

import { useState } from 'react'
import { HelpCircle, Send, CheckCircle2 } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { api } from '@/lib/api'

type Tab = 'faq' | 'issue'

export function HelpContent() {
  const [activeTab, setActiveTab] = useState<Tab>('faq')
  const [issueText, setIssueText] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!issueText.trim() || isSubmitting) return
    
    setIsSubmitting(true)
    try {
      await api.createSupportTicket(issueText)
      
      setSubmitted(true)
      setTimeout(() => {
        setSubmitted(false)
        setIssueText('')
      }, 3000)
    } catch (error) {
      console.error('Failed to submit ticket:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const [expandedIndex, setExpandedIndex] = useState<string | null>(null)

  const faqCategories = [
    {
      category: 'Verification & Badges',
      items: [
        {
          q: 'What does "Identity Verified" mean?',
          a: 'Identity Verification means we have confirmed your identity using your Bank Verification Number (BVN). This is the first and most important step — without it, you cannot pay rent or build a credit score on Upward. It is completely secure and your BVN details are never shared.',
        },
        {
          q: 'What does "Property Connection Verified" mean?',
          a: 'A Property Connection is verified when your Property Manager (PM) has accepted and approved your connection request on Upward-PM. Until they approve, your property shows as "Pending Connection". This is separate from your identity or score verification.',
        },
        {
          q: 'What does it mean for a PM to be "Verified"?',
          a: "A Property Manager is verified when Upward's internal team has reviewed and approved them on the platform, or when they are linked to a verified real-estate platform. When your property is managed by a verified PM, it contributes to your shareable Upward Score.",
        },
        {
          q: 'What is a "Platform Synced" property?',
          a: "Platform Synced properties are those automatically imported from a verified real-estate management platform (e.g., Estateone, Spleet). These are automatically marked as verified and carry full weight towards your Upward Score.",
        },
        {
          q: 'When can I share my Upward Score?',
          a: 'Your score becomes shareable when all three conditions are met: (1) Your identity is verified via BVN, (2) You have made at least one rent payment, and (3) At least one of your properties is managed by a Verified PM or is Platform Synced.',
        },
        {
          q: 'I added a property manually — why is it unverified?',
          a: 'Manually added properties start as unverified because your PM has not yet confirmed the connection. Send them a connection request from your Property Management page. Once your PM approves it on Upward-PM, your property status will update automatically.',
        },
      ],
    },
    {
      category: 'Payments & Rent',
      items: [
        {
          q: 'My rent payment is pending, what do I do?',
          a: "Don't worry! Bank transfers sometimes take up to 24 hours to clear. If it stays pending for more than 48 hours, please report an issue below.",
        },
        {
          q: 'Can I delete a transaction history?',
          a: 'For security and record-keeping purposes, transaction histories cannot be deleted. They serve as your official payment ledger.',
        },
      ],
    },
    {
      category: 'Documents & Profile',
      items: [
        {
          q: 'How do I download my tenancy agreement?',
          a: "Go to your Profile, select 'Tenancy Agreement', and you'll find a list of all your uploaded documents ready for download.",
        },
        {
          q: 'How do I update my profile picture?',
          a: 'Tap on your avatar on the Profile page and paste a new image URL or use our upload feature coming soon.',
        },
      ],
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
            {faqCategories.map((cat, catIdx) => (
              <div key={catIdx} className="faq-category">
                <h3 className="faq-category__title">{cat.category}</h3>
                {cat.items.map((faq, idx) => {
                  const key = `${catIdx}-${idx}`
                  const isOpen = expandedIndex === key
                  return (
                    <div
                      key={key}
                      className={`faq-item theme-card ${isOpen ? 'faq-item--open' : ''}`}
                      onClick={() => setExpandedIndex(isOpen ? null : key)}
                    >
                      <h4 className="faq-item__title">
                        <HelpCircle size={18} color="var(--clay)" />
                        <span>{faq.q}</span>
                        <span className="faq-item__chevron">{isOpen ? '▲' : '▼'}</span>
                      </h4>
                      {isOpen && <p className="faq-item__text">{faq.a}</p>}
                    </div>
                  )
                })}
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
          margin-bottom: 0.75rem;
        }

        .faq-category {
          margin-bottom: 1.75rem;
        }
        .faq-category__title {
          font-size: 0.78rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--text-muted);
          margin-bottom: 0.75rem;
          padding-left: 0.25rem;
        }

        .faq-item {
          cursor: pointer;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .faq-item:hover {
          border-color: var(--clay-faint);
        }
        .faq-item--open {
          border-color: var(--clay) !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }

        .faq-item__title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.9rem;
          font-weight: 700;
          color: var(--text);
          margin: 0;
        }
        .faq-item__title span:nth-child(2) {
          flex: 1;
        }
        .faq-item__chevron {
          font-size: 0.65rem;
          color: var(--text-muted);
          flex-shrink: 0;
        }
        .faq-item__text {
          font-size: 0.88rem;
          line-height: 1.6;
          color: var(--text-secondary);
          padding-left: 1.75rem;
          margin-top: 0.75rem;
          border-top: 1px solid var(--border);
          padding-top: 0.75rem;
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

        /* Large Screen Desktop View Logic */
        @media (min-width: 1024px) {
          .help-page {
            max-width: 860px;
            margin: 0 auto;
            padding-top: 2rem;
          }
          
          .help-section {
            padding: 0;
            margin-top: 2rem;
          }

          .faq-item {
            box-shadow: var(--shadow-sm);
            padding: 1.5rem 2rem;
          }

          .issue-report {
            background: var(--surface);
            padding: 40px;
            border-radius: 24px;
            border: 1px solid var(--border-solid);
            box-shadow: var(--shadow-sm);
            margin-top: 20px;
          }
          
          .help-tabs {
            max-width: 400px;
            margin: 0 auto 2.5rem;
          }
        }
      `}</style>
    </div>
  )
}
