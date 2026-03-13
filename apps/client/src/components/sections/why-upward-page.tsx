'use client'
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface FAQItemProps {
  question: string
  answer: string | React.ReactNode
}

function FAQItem({ question, answer }: FAQItemProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div
      style={{
        borderBottom: '1px solid rgba(217, 119, 87, 0.1)',
        marginBottom: '8px',
      }}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '24px 0',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          gap: '20px',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-head)',
            fontSize: '18px',
            fontWeight: 700,
            color: 'var(--text)',
            lineHeight: 1.4,
          }}
        >
          {question}
        </span>
        <ChevronDown
          size={20}
          style={{
            color: 'var(--accent)',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s ease',
            flexShrink: 0,
          }}
        />
      </button>
      <div
        style={{
          maxHeight: isOpen ? '500px' : '0',
          overflow: 'hidden',
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          opacity: isOpen ? 1 : 0,
        }}
      >
        <div
          style={{
            paddingBottom: '24px',
            color: 'var(--muted)',
            fontSize: '16px',
            lineHeight: 1.7,
            maxWidth: '90%',
          }}
        >
          {answer}
        </div>
      </div>
    </div>
  )
}

export function WhyUpwardPage({
  onBack,
  onOpenSignup,
}: {
  onBack: () => void
  onOpenSignup: () => void
}) {
  const faqs = [
    {
      question: 'What is Upward by GT?',
      answer:
        'Upward by GT tracks your rent payments and rental behavior to create a rental score, help members save, access rent support, get loans for household needs, and work towards owning a home.',
    },
    {
      question: 'What is rental score?',
      answer:
        'A rental score is a number that shows how reliable and responsible you are as a tenant. It is affected by factors like paying your rent on time, saving regularly, staying in your home for a reasonable period, and keeping the property in good condition. A higher score can give you access to benefits like rent support, loans for household needs, and even a pathway to owning a home.',
    },
    {
      question: "What's the benefit of being a GoodTenants community member?",
      answer: (
        <ul style={{ paddingLeft: '20px', margin: 0 }}>
          <li>Easier, structured savings for rent.</li>
          <li>Access to rent support loans when needed.</li>
          <li>Loans for household essentials.</li>
          <li>Build a pathway toward home ownership.</li>
          <li>Show reliability as a tenant through your rental score.</li>
        </ul>
      ),
    },
    {
      question: 'Who can join Upward by GT?',
      answer:
        'Anyone who is a tenant (Salary earners, freelancers, creatives and business owners).',
    },
    {
      question: 'How do I join the platform?',
      answer: 'To join, just click the Sign Up button and follow the steps.',
    },
    {
      question: 'Is there a sign-up fee and what does it cover?',
      answer:
        'Yes, there’s a small sign-up fee. It gives you access to the platform and lets you start building your rental score.',
    },
    {
      question: 'Can I track my rental score myself?',
      answer:
        'Yes, Your rental score is fully visible on the platform, so you can check it anytime and see how your payments and behavior affect it.',
    },
    {
      question: 'Is my rent data private?',
      answer:
        'Yes. Your rent information is private and protected on your account. Only you can access it with your login details, and it is not shared without your permission.',
    },
    {
      question: 'Who sees my passport?',
      answer:
        'Other people cannot see it unless you choose to share your ID number with them for verification.',
    },
    {
      question: "What if my landlord won't cooperate?",
      answer:
        'You can still use the platform. While landlord or property manager confirmation helps strengthen your rental record, you can still track your rent payments and build your rental history on your own account.',
    },
  ]

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: '120px 40px 120px',
        maxWidth: '1280px',
        margin: '0 auto',
        position: 'relative',
        zIndex: 1,
      }}
      className="why-page-container"
    >
      <style>{`
        .why-page-container {
          padding: 90px 20px 20px;
        }
        @media (max-width: 768px) {
          .why-page-container {
            padding: 90px 20px 20px !important;
          }
        }
      `}</style>
      <div
        style={{
          position: 'absolute',
          top: '10%',
          right: '5%',
          width: '400px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(217, 119, 87, 0.05) 0%, transparent 70%)',
          filter: 'blur(80px)',
          zIndex: -1,
        }}
      />

      <button
        onClick={onBack}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          color: 'var(--text)',
          cursor: 'pointer',
          fontFamily: 'var(--font-head)',
          fontWeight: 700,
          fontSize: '13px',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          marginBottom: '32px',
          padding: '12px 20px',
          borderRadius: '100px',
          transition: 'all 0.3s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateX(-4px)'
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = ''
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        Back to Home
      </button>

      <div
        style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) 1fr', gap: '100px' }}
        className="grid-stack-mobile"
      >
        <div style={{ animation: 'fadeUp 0.8s ease backwards' }}>
          <div className="section-label">Our Philosophy</div>
          <h1
            style={{
              fontFamily: 'var(--font-head)',
              fontWeight: 800,
              fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
              letterSpacing: '-0.04em',
              lineHeight: 1,
              marginBottom: '40px',
              marginTop: '16px',
              background: 'var(--heading-mix)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Why We Built Upward
          </h1>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            <p style={{ fontSize: '20px', lineHeight: 1.6, color: 'var(--text)', fontWeight: 500 }}>
              Housing should be a source of stability, productivity, and memories but, for many
              people today, renting feels uncertain.
            </p>

            <p style={{ color: 'var(--muted)', fontSize: '17px', lineHeight: 1.8 }}>
              Tenants worry about finding trustworthy landlords and safe homes. Landlords worry
              about unreliable tenants and disputes. Property managers struggle to operate in a
              system with little transparency.
            </p>

            <div
              style={{
                padding: '32px',
                background: 'rgba(217, 119, 87, 0.03)',
                border: '1px solid rgba(217, 119, 87, 0.15)',
                borderLeft: '4px solid var(--accent)',
                borderRadius: '0 20px 20px 0',
                margin: '12px 0',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
              }}
            >
              <p
                style={{
                  fontSize: '19px',
                  fontStyle: 'italic',
                  color: 'var(--text)',
                  lineHeight: 1.6,
                  fontWeight: 600,
                }}
              >
                &ldquo;Housing improves when responsible people are rewarded for responsible
                behavior.&rdquo;
              </p>
            </div>

            <p style={{ color: 'var(--muted)', fontSize: '17px', lineHeight: 1.8 }}>
              Over the last five years at GoodTenants, we have worked closely with thousands of
              residents, landlords, and property managers. Through those conversations we learned
              something important: trust is the foundation of every home.
            </p>

            <p style={{ color: 'var(--muted)', fontSize: '17px', lineHeight: 1.8 }}>
              Upward helps renters build a verified housing reputation through their rental history,
              discipline, and participation in a trusted housing network. Over time, that reputation
              becomes more powerful. It can unlock better rental opportunities, stronger community
              networks, and eventually new pathways to owning a home with other responsible members.
            </p>

            <p style={{ color: 'var(--text)', fontSize: '18px', lineHeight: 1.6, fontWeight: 600 }}>
              Because solving housing requires more than technology. It requires trust,
              transparency, and people who are committed to building something better together.
            </p>

            <p
              style={{
                color: 'var(--accent)',
                fontSize: '19px',
                fontWeight: 800,
                letterSpacing: '-0.01em',
              }}
            >
              That is what Upward is about. A better housing system &mdash; built by the people who
              live in it.
            </p>
          </div>
        </div>

        <div style={{ paddingTop: '20px', animation: 'fadeUp 0.8s ease 0.2s backwards' }}>
          <div className="section-label">Common Questions</div>
          <h2
            style={{
              fontFamily: 'var(--font-head)',
              fontWeight: 800,
              fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
              marginBottom: '32px',
              marginTop: '16px',
            }}
          >
            FAQs
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '60px' }}>
            {faqs.map((faq, index) => (
              <FAQItem key={index} question={faq.question} answer={faq.answer} />
            ))}
          </div>

          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '24px',
              padding: '40px',
              textAlign: 'center',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
            }}
          >
            <h3
              style={{
                fontFamily: 'var(--font-head)',
                fontSize: '24px',
                fontWeight: 800,
                marginBottom: '12px',
              }}
            >
              Ready to build your reputation?
            </h3>
            <p style={{ color: 'var(--muted)', marginBottom: '24px', fontSize: '15px' }}>
              Join the waitlist today and get early access to the Upward platform.
            </p>
            <button
              onClick={onOpenSignup}
              style={{
                background: 'var(--accent)',
                color: '#000',
                border: 'none',
                padding: '16px 32px',
                borderRadius: '100px',
                fontFamily: 'var(--font-head)',
                fontWeight: 800,
                fontSize: '14px',
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              Get Priority Access
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
