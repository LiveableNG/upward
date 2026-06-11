'use client'
import React, { useState } from 'react'
import { ChevronDown, HelpCircle } from 'lucide-react'

interface FAQItemProps {
  question: string
  answer: string
}

function FAQItem({ question, answer }: FAQItemProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="faq-item">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="faq-item__trigger"
        aria-expanded={isOpen}
      >
        <span className="faq-item__question">{question}</span>
        <ChevronDown
          size={18}
          className={`faq-item__arrow ${isOpen ? 'faq-item__arrow--open' : ''}`}
        />
      </button>
      <div
        className="faq-item__content-wrapper"
        style={{
          maxHeight: isOpen ? '250px' : '0',
          opacity: isOpen ? 1 : 0,
        }}
      >
        <p className="faq-item__answer">{answer}</p>
      </div>
    </div>
  )
}

export function FaqSection() {
  const faqs = [
    {
      question: 'What is Upward Pay and how does it work?',
      answer: "Upward is a platform that turns your rent payments — money you're already spending — into verified rental history. Every time you pay rent through Upward, you build a verified Rent Passport™, earn an Upward Rent Score, and unlock access to savings tools, rewards, and home financing.",
    },
    {
      question: 'Do I need to pay a signup fee?',
      answer: 'No. Creating your account and starting to build your Upward Rent Score is completely free.',
    },
    {
      question: 'Does my landlord need to be registered on Upward?',
      answer: "No. You can start building your Rent Passport today regardless of whether your landlord is on the platform. Your payments are verified through Upward and recorded permanently on your credentials.",
    },
    {
      question: 'Is my rent data kept private and secure?',
      answer: 'Yes, completely. Your rental data is secure, encrypted, and private. You choose if and when to share it, such as when applying for a new rental or accessing mortgage financing.',
    },
    {
      question: 'How does paying rent help me move closer to owning a home?',
      answer: "Every rent payment you make through Upward builds a verified Rent Passport™. Lenders and mortgage providers recognize this track record, unlocking single-digit interest mortgage equity options when you're ready to buy your first home.",
    },
  ]

  return (
    <section id="faq" className="faq-section">
      <div className="faq-container">
        
        {/* Header */}
        <div className="faq-header">
          <div className="faq-badge">
            <HelpCircle size={14} />
            <span>Got Questions?</span>
          </div>
          <h2 className="faq-title">Frequently Asked Questions</h2>
          <p className="faq-subtitle">
            Everything you need to know about the Upward Rent Passport™ program.
          </p>
        </div>

        {/* Accordions list */}
        <div className="faq-list">
          {faqs.map((faq, idx) => (
            <FAQItem key={idx} question={faq.question} answer={faq.answer} />
          ))}
        </div>

      </div>

      <style>{`
        .faq-section {
          padding: 100px 40px;
          background: var(--bg);
          position: relative;
          z-index: 1;
        }

        .faq-container {
          max-width: 800px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 60px;
        }

        .faq-header {
          text-align: center;
          max-width: 600px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .faq-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 100px;
          font-size: var(--font-xs);
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          background: var(--accent-faint);
          border: 1px solid var(--accent-muted);
          color: var(--accent);
        }

        .faq-title {
          font-family: var(--font-head);
          font-weight: 500;
          font-size: var(--font-h2);
          line-height: 1.15;
          letter-spacing: -0.04em;
          background: var(--heading-mix);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .faq-subtitle {
          font-size: clamp(14px, 1.4vw, 17px);
          color: var(--muted);
          line-height: 1.6;
        }

        /* FAQ List */
        .faq-list {
          display: flex;
          flex-direction: column;
          width: 100%;
          border-top: 1px solid var(--border);
        }

        .faq-item {
          border-bottom: 1px solid var(--border);
        }

        .faq-item__trigger {
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px 0;
          background: none;
          border: none;
          cursor: pointer;
          text-align: left;
          gap: 24px;
        }

        .faq-item__question {
          font-family: var(--font-head);
          font-size: var(--font-lg);
          font-weight: 700;
          color: var(--text);
          line-height: 1.4;
          transition: color 0.2s ease;
        }

        .faq-item__trigger:hover .faq-item__question {
          color: var(--accent);
        }

        .faq-item__arrow {
          color: var(--accent);
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          flex-shrink: 0;
        }

        .faq-item__arrow--open {
          transform: rotate(180deg);
        }

        /* Content block */
        .faq-item__content-wrapper {
          overflow: hidden;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .faq-item__answer {
          padding-bottom: 24px;
          color: var(--muted);
          font-size: var(--font-base);
          line-height: 1.7;
          max-width: 95%;
        }

        @media (max-width: 768px) {
          .faq-section {
            padding: 60px 20px;
          }
          .faq-item__trigger {
            padding: 20px 0;
          }
          .faq-item__question {
            font-size: 16px;
          }
        }
      `}</style>
    </section>
  )
}
