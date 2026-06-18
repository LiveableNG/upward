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
        borderBottom: '1px solid var(--accent-faint)',
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
      question: 'What is Upward?',
      answer:
        "Upward is a platform that turns your rent payments \u2014 money you're already spending \u2014 into something that works for you. Every time you pay rent through Upward, you build a verified rental history, earn a Rental Score, and unlock access to savings tools, household loans, and eventually a pathway to owning your own home. Think of it as making your rent count, finally.",
    },
    {
      question: 'What is a Rental Score?',
      answer:
        'Your Rental Score is a number that reflects how responsible and reliable you are as a tenant. It goes up when you pay rent on time and maintain your rental commitments. A higher score unlocks real benefits \u2014 better treatment from landlords, access to rent support, household appliance loans, and a clear path toward home ownership. It is the financial identity that responsible renters in Nigeria have always deserved but never had.',
    },
    {
      question: 'Why should I join Upward?',
      answer:
        'Because every Naira you pay in rent right now disappears with nothing to show for it. Upward changes that. As a member you get a verified rental history that makes you stand out to landlords and property managers, access to savings tools designed around how renters actually earn, loan options for household needs, and a structured pathway toward owning a home \u2014 together with a community of people building the same future. The longer you stay, the more valuable your membership becomes.',
    },
    {
      question: 'Who can join?',
      answer:
        'Anyone who pays rent in Nigeria. Whether you earn a salary, run a business, freelance, or work in the creative economy \u2014 if you pay rent and want to be rewarded for doing it responsibly, Upward is built for you.',
    },
    {
      question: 'Is there a sign-up fee?',
      answer:
        'No sign-up fee. Creating your account and starting to build your Rental Score is free. When you pay rent through the platform, a small transaction processing & verification fee of \u20A61,000\u2013\u20A62,500 applies \u2014 this is what keeps your payments verified, receipted, and permanently recorded on your rental history. Think of it as the cost of making your rent count.',
    },
    {
      question: 'How are payments made?',
      answer:
        'All payments are processed securely through Paystack, one of Africa\'s most trusted payment platforms. Your rent settles directly into your landlord or property manager\'s account, fully receipted and recorded on your Upward profile. No cash. No disputes. No "I never received it."',
    },
    {
      question: 'Can I track my Rental Score?',
      answer:
        "Yes. Your Rental Score is visible on your dashboard every time you log in. You can see exactly where you stand, what's affecting your score, and what steps will help you improve it. You are always in control of your own housing reputation.",
    },
    {
      question: 'Is my rent data private?',
      answer:
        'Yes, completely. Your rental data is private and accessible only to you. You choose if and when to share it \u2014 for example, when applying for a new rental or accessing home financing through our Rent Passport share tool. Nothing leaves your account without your explicit permission.',
    },
    {
      question: 'How does paying rent help me move closer to owning a home?',
      answer:
        'Every rent payment you make through Upward is verified, receipted, and added to your Rental Score. Over time, that score becomes your financial track record \u2014 proof that you are the kind of person who honours commitments. That track record is what unlocks the next steps: structured savings toward a home deposit, access to household loans, and eventually low-cost home financing through the Upward community. Most people never own a home because the system never saw them. Upward makes sure the system sees you.',
    },
    {
      question: 'Why should landlords and property managers accept Upward tenants?',
      answer:
        'Because an Upward tenant comes with receipts. Literally. Their payment history is verified, their rental score is documented, and their track record speaks before they even walk through the door. For landlords and property managers, that means less time chasing payments, fewer disputes, and a much lower chance of renting to someone who will cause problems. In a market where bad tenant experiences are common, an Upward-verified tenant is the safest bet in the room.',
    },
    {
      question: 'What is a Rent Passport?',
      answer:
        'Your Rent Passport is your housing CV. It is a verified profile containing your Rental Score, your confirmed payment history, and your record as a responsible tenant \u2014 all in one secure, shareable document. When you are applying for a new rental, accessing housing finance, or even relocating, your Rent Passport does the talking. Instead of begging a landlord to trust you, you show them proof. That changes everything about how a rental conversation goes.',
    },
    {
      question: 'What happens if I miss a rent payment?',
      answer:
        "Your Rental Score reflects your actual payment history \u2014 the good and the not-so-good. A missed payment will affect your score but one missed payment does not define you. Consistent on-time payments after that will rebuild your score over time. The system is designed to reward improvement, not punish people permanently. Upwards also has a rent support program for qualified members that ensure they don't miss a rent payment deadline.",
    },
    {
      question: 'Can paying rent really help me own a home someday?',
      answer:
        "Yes. Rent is already the single largest financial commitment most Nigerians make every year. The problem has never been that renters can't pay \u2014 it's that those payments vanish into a system that keeps no record of them. Upward captures that record. Over time, your verified payment history becomes the foundation for group home financing, and access to titled properties at terms that are simply not available to someone walking in off the street with no history. Your rent was always powerful. Now it can prove it.",
    },
    {
      question: 'Does my landlord need to be on Upward?',
      answer:
        "No. You can start building your Rental Score today regardless of whether your landlord or property manager is on the platform. Your payments are verified through Upward and recorded permanently on your Rent Passport. As more landlords and PMs join \u2014 and they are joining \u2014 your profile becomes even more powerful. But you don't need to wait for anyone else to start.",
    },
    {
      question: 'Why should I pay rent through Upward instead of directly to my landlord?',
      answer:
        'Paying your landlord directly means the payment happened and then disappeared. No record, no receipt that lasts, no proof that builds toward anything. Paying through Upward means that same payment \u2014 money you were spending anyway \u2014 now counts toward your Rental Score, your Rent Passport, and your long-term path to home ownership. The cost is the same. The difference is everything you get back for it. Why would you pay rent any other way?',
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
          background: 'radial-gradient(circle, var(--accent-faint) 0%, transparent 70%)',
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
          background: 'var(--surface2)',
          border: '1px solid var(--border)',
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
          e.currentTarget.style.background = 'var(--surface2)'
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
              fontWeight: 500,
              fontSize: 'clamp(2.2rem, 5.2vw, 3.8rem)',
              letterSpacing: '-0.04em',
              lineHeight: 1.1,
              marginBottom: '40px',
              marginTop: '16px',
              background: 'var(--heading-mix)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Why We Built Upward?
          </h1>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            <p
              style={{
                fontSize: 'clamp(15px, 1.6vw, 20px)',
                lineHeight: 1.6,
                color: 'var(--text)',
                fontWeight: 400,
              }}
            >
              Housing should be a source of stability, productivity, and memories but, for many
              people today, renting feels uncertain.
            </p>

            <p
              style={{
                color: 'var(--muted)',
                fontSize: 'clamp(14px, 1.3vw, 17px)',
                lineHeight: 'clamp(22px, 2vw, 28px)',
                fontWeight: 400,
              }}
            >
              Tenants worry about finding trustworthy landlords and safe homes. Landlords worry
              about unreliable tenants and disputes. Property managers struggle to operate in a
              system with little transparency.
            </p>

            <div
              style={{
                padding: '32px',
                background: 'var(--accent-faint)',
                border: '1px solid var(--accent-muted)',
                borderLeft: '4px solid var(--accent)',
                borderRadius: '0 20px 20px 0',
                margin: '12px 0',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
              }}
            >
              <p
                style={{
                  fontSize: 'clamp(15px, 1.5vw, 19px)',
                  fontStyle: 'italic',
                  color: 'var(--text)',
                  lineHeight: 1.6,
                  fontWeight: 500,
                }}
              >
                &ldquo;Housing improves when responsible people are rewarded for responsible
                behavior.&rdquo;
              </p>
            </div>

            <p
              style={{
                color: 'var(--muted)',
                fontSize: 'clamp(14px, 1.3vw, 17px)',
                lineHeight: 'clamp(22px, 2vw, 28px)',
                fontWeight: 400,
              }}
            >
              Over the last five years, we have worked closely with thousands of residents,
              landlords, and property managers. Through those conversations we learned something
              important: trust is the foundation of every home.
            </p>

            <p
              style={{
                color: 'var(--muted)',
                fontSize: 'clamp(14px, 1.3vw, 17px)',
                lineHeight: 'clamp(22px, 2vw, 28px)',
                fontWeight: 400,
              }}
            >
              Upward helps renters build a verified housing reputation through their rental history,
              discipline, and participation in a trusted housing network. Over time, that reputation
              becomes more powerful. It can unlock better rental opportunities, stronger community
              networks, and eventually new pathways to owning a home with other responsible members.
            </p>

            <p
              style={{
                color: 'var(--text)',
                fontSize: 'clamp(15px, 1.4vw, 18px)',
                lineHeight: 1.6,
                fontWeight: 500,
              }}
            >
              Because solving housing requires more than technology. It requires trust,
              transparency, and people who are committed to building something better together.
            </p>

            <p
              style={{
                color: 'var(--accent)',
                fontSize: 'clamp(15px, 1.5vw, 19px)',
                fontWeight: 500,
                letterSpacing: '-0.01em',
              }}
            >
              That is what Upward is about. A better housing system &mdash; built by the people who
              live in it.
            </p>
          </div>
        </div>

        <div id="faq" style={{ paddingTop: '20px', animation: 'fadeUp 0.8s ease 0.2s backwards' }}>
          <div className="section-label">Common Questions</div>
          <h2
            style={{
              fontFamily: 'var(--font-head)',
              fontWeight: 500,
              fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)',
              letterSpacing: '-0.03em',
              lineHeight: 1.15,
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
                fontWeight: 500,
                letterSpacing: '-0.03em',
                marginBottom: '12px',
              }}
            >
              Ready to build your reputation?
            </h3>
            <p style={{ color: 'var(--muted)', marginBottom: '24px', fontSize: '15px' }}>
              Register today to join the movement and start your home-ownership journey with Upward.
            </p>
            <button
              onClick={onOpenSignup}
              style={{
                background: 'var(--accent)',
                color: 'var(--btn-text)',
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
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#bf5f43'
                e.currentTarget.style.transform = 'scale(1.05)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--accent)'
                e.currentTarget.style.transform = 'scale(1)'
              }}
            >
              Join Now
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
