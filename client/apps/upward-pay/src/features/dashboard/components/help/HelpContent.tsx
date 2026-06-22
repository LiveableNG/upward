'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, ChevronDown, Send } from 'lucide-react'
import { PayPageShell } from '@/features/dashboard/components/payment/PayPageShell'
import { api } from '@/lib/api'

type Tab = 'faq' | 'issue'

export function HelpContent() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('faq')
  const [issueText, setIssueText] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [expandedIndex, setExpandedIndex] = useState<string | null>(null)

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
    <PayPageShell
      title="Customer Service"
      showBack
      onBack={() => router.push('/dashboard/me')}
    >
      <div className="help-page__tabs">
        <button
          type="button"
          className={`help-page__tab ${activeTab === 'faq' ? 'help-page__tab--active' : ''}`}
          onClick={() => setActiveTab('faq')}
        >
          FAQs
        </button>
        <button
          type="button"
          className={`help-page__tab ${activeTab === 'issue' ? 'help-page__tab--active' : ''}`}
          onClick={() => setActiveTab('issue')}
        >
          Report Issue
        </button>
      </div>

      {activeTab === 'faq' ? (
        <div>
          {faqCategories.map((cat, catIdx) => (
            <div key={cat.category} className="help-page__category">
              <h3 className="help-page__category-title">{cat.category}</h3>
              <div className="help-page__faq-card">
                {cat.items.map((faq, idx) => {
                  const key = `${catIdx}-${idx}`
                  const isOpen = expandedIndex === key
                  return (
                    <div key={key} className="help-page__faq-item">
                      <button
                        type="button"
                        className="help-page__faq-trigger"
                        onClick={() => setExpandedIndex(isOpen ? null : key)}
                        aria-expanded={isOpen}
                      >
                        <span className="help-page__faq-question">{faq.q}</span>
                        <ChevronDown
                          size={16}
                          className="help-page__faq-chevron"
                          style={{
                            transform: isOpen ? 'rotate(180deg)' : 'none',
                            transition: 'transform 0.15s ease',
                          }}
                        />
                      </button>
                      {isOpen ? <p className="help-page__faq-answer">{faq.a}</p> : null}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="help-page__issue-card">
          <h3 className="help-page__issue-title">Log a Dispute or Issue</h3>
          <p className="help-page__issue-desc">
            Describe the problem below. Our support team typically responds within 2 hours.
          </p>

          {submitted ? (
            <div className="help-page__issue-success">
              <CheckCircle2 size={32} color="var(--skin-primary, #c2501f)" />
              <p>Support ticket submitted successfully!</p>
            </div>
          ) : (
            <form onSubmit={handleIssueSubmit}>
              <textarea
                className="help-page__textarea"
                value={issueText}
                onChange={(e) => setIssueText(e.target.value)}
                placeholder="Tell us what's wrong..."
              />
              <button
                type="submit"
                className="help-page__submit"
                disabled={!issueText.trim() || isSubmitting}
              >
                <Send size={16} />
                {isSubmitting ? 'Submitting...' : 'Submit Ticket'}
              </button>
            </form>
          )}
        </div>
      )}
    </PayPageShell>
  )
}
