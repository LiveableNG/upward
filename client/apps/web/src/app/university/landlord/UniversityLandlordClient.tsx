'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { Menu, X, Check, CheckCircle2, Clock, MessageSquare, Video } from 'lucide-react'

const landlordFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  whatsapp: z.string().min(6, 'Enter a valid phone number'),
  city: z.string().min(1, 'Please select your city'),
  properties: z.string().min(1, 'Please select how many properties you own'),
  status: z.string().min(1, 'Please select your landlord status'),
  management: z.string().min(1, 'Please select how you manage your property'),
})

type LandlordFormData = z.infer<typeof landlordFormSchema>

export function UniversityLandlordClient() {
  const [navOpen, setNavOpen] = useState(false)
  const [isContactOpen, setIsContactOpen] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [submittedName, setSubmittedName] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LandlordFormData>({
    resolver: zodResolver(landlordFormSchema),
  })

  useEffect(() => {
    const revealEls = document.querySelectorAll('[data-reveal]')
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12 }
    )
    revealEls.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [])

  const onSubmit = async (data: LandlordFormData) => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || ''
      const res = await fetch(`${baseUrl}/api/v1/early-access/landlord`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          whatsapp: data.whatsapp,
          city: data.city,
          propertyCount: data.properties,
          landlordStatus: data.status,
          managementStyle: data.management,
        }),
      })

      if (!res.ok) {
        const resData = await res.json().catch(() => ({}))
        throw new Error(resData.message || 'Failed to submit application')
      }

      setSubmittedName(data.name)
      setSubmitted(true)
    } catch (err: any) {
      console.error('Submission error:', err)
      setSubmittedName(data.name)
      setSubmitted(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="uni-body">
      {/* Header */}
      <header className="uni-header">
        <nav className="uni-wrap uni-nav">
          <Link href="/university/landlord" className="uni-logo">
            <span className="mark">
              <img
                src="/university-logos/upward_university_logo.jpeg"
                alt="Upward University Logo"
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px' }}
              />
            </span>
            <div>
              UPWARD
              <br />
              <small>Landlord Programme</small>
            </div>
          </Link>

          <div className={`uni-nav-links ${navOpen ? 'open' : ''}`}>
            <Link href="/" className="uni-nav-home" onClick={() => setNavOpen(false)}>
              ← Upward Home
            </Link>
            <a href="#roi" onClick={() => setNavOpen(false)}>
              Assure Income
            </a>
            <a href="#protect" onClick={() => setNavOpen(false)}>
              Protect Asset
            </a>
            <a href="#family" onClick={() => setNavOpen(false)}>
              Cement Legacy
            </a>
            <Link href="/university" onClick={() => setNavOpen(false)}>
              Student Programme
            </Link>
          </div>

          <div className="uni-nav-right">
            <a
              href="#start"
              className="uni-btn uni-btn-primary"
              style={{ padding: '11px 20px', fontSize: '13.5px' }}
            >
              Start Free
            </a>
            <button
              className="uni-nav-toggle"
              onClick={() => setNavOpen(!navOpen)}
              aria-label="Toggle menu"
              aria-expanded={navOpen}
            >
              {navOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="uni-section uni-hero">
        <div className="uni-wrap uni-hero-grid">
          <div>
            <span className="uni-eyebrow">For Current &amp; Aspiring Nigerian Landlords</span>
            <h1>
              Assure your income. Protect your asset. <em className="accent">Cement your legacy.</em>
            </h1>
            <p className="uni-hero-sub">
              Whether you already own property or you're working toward your first one — understand your property's economics, protect rental income and assets, and build a property-management system that can work for your family over time.
            </p>
            <div>
              <a href="#start" className="uni-btn uni-btn-primary">
                Start Free
              </a>
            </div>
            <div className="uni-hero-feature-strip">
              <div className="uni-h-feat-item">
                <Clock size={14} />
                <span>14 lessons, daily over 2 weeks</span>
              </div>
              <span className="uni-h-feat-divider">•</span>
              <div className="uni-h-feat-item">
                <MessageSquare size={14} />
                <span>Delivered via WhatsApp</span>
              </div>
              <span className="uni-h-feat-divider">•</span>
              <div className="uni-h-feat-item">
                <Video size={14} />
                <span>Weekly live Q&amp;A</span>
              </div>
            </div>
          </div>
          <div className="uni-hero-image-card">
            <img
              src="/university-logos/landlord.jfif"
              alt="Upward Landlord Programme"
              className="uni-hero-student-img"
            />
          </div>
        </div>
      </section>

      {/* Module 1 */}
      <section id="roi" className="uni-section" data-reveal>
        <div className="uni-wrap">
          <div className="uni-module-tag">Module 1 · Lessons 1–5</div>
          <div className="uni-sec-head">
            <span className="uni-eyebrow">Assure Income</span>
            <h2>Make your property work harder for you.</h2>
            <p className="lead">
              Your property isn't just a home you rent out — it's an investment. Whether you already own one or you're working toward your first, most landlords never look at it that way.
            </p>
          </div>
          <div className="uni-roi-grid">
            <div className="uni-roi-item">Rental yield</div>
            <div className="uni-roi-item">Gross vs net income</div>
            <div className="uni-roi-item">Vacancy</div>
            <div className="uni-roi-item">Maintenance costs</div>
            <div className="uni-roi-item">Service charges</div>
            <div className="uni-roi-item">PM fees</div>
            <div className="uni-roi-item">Tenant acquisition</div>
            <div className="uni-roi-item">Renewals</div>
            <div className="uni-roi-item">Property appreciation</div>
            <div className="uni-roi-item">Management's impact on ROI</div>
          </div>
          <p className="uni-roi-close">
            "My property needs to be managed like an investment."
          </p>
        </div>
      </section>

      {/* Module 2 */}
      <section id="protect" className="uni-section" data-reveal>
        <div className="uni-wrap">
          <div className="uni-m2-band">
            <div className="uni-module-tag" style={{ color: 'var(--uni-rust)' }}>
              Module 2 · Lessons 6–10
            </div>
            <div className="uni-sec-head">
              <span className="uni-eyebrow">Protect Asset</span>
              <h2>Get paid. Stay liquid. Protect what you've built.</h2>
            </div>
            <div className="uni-m2-grid">
              <div className="uni-m2-card">
                <div className="uni-m2-problem">Problem: You don't know who you're renting to.</div>
                <h3>Verified Tenant Identity</h3>
                <p>KYC on tenants before they move in.</p>
                <div className="uni-m2-cap">Powered by: Upward Score</div>
              </div>
              <div className="uni-m2-card">
                <div className="uni-m2-problem">Problem: Rent collection is unpredictable.</div>
                <h3>Get Paid, Reliably</h3>
                <p>Better collection and visibility on payments.</p>
                <div className="uni-m2-cap">Powered by: Upward Payment Infrastructure</div>
              </div>
              <div className="uni-m2-card">
                <div className="uni-m2-problem">Problem: A vacant unit or defaulting tenant hits your income directly.</div>
                <h3>Protect Rental Income</h3>
                <p>Protection against specified rental losses.</p>
                <div className="uni-m2-cap">Powered by: Rent Insurance</div>
              </div>
              <div className="uni-m2-card">
                <div className="uni-m2-problem">Problem: Deposits get mismanaged or disputed.</div>
                <h3>Protect the Deposit</h3>
                <p>Structured, transparent handling of security deposits.</p>
                <div className="uni-m2-cap">Powered by: Upward Security Deposit System</div>
              </div>
              <div className="uni-m2-card">
                <div className="uni-m2-problem">Problem: Good tenants have no reason to stay good.</div>
                <h3>Reward Good Tenants</h3>
                <p>Incentivise timely payment and responsible tenancy.</p>
                <div className="uni-m2-cap">Powered by: Rental Equity</div>
              </div>
              <div className="uni-m2-card">
                <div className="uni-m2-problem">Problem: Your equity is tied up in the property, not accessible.</div>
                <h3>Access Liquidity</h3>
                <p>Potential financing against qualifying property/income.</p>
                <div className="uni-m2-cap">Powered by: Landlord Loans / Financing</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Module 3 */}
      <section id="family" className="uni-section" data-reveal>
        <div className="uni-wrap">
          <div className="uni-module-tag">Module 3 · Lessons 11–14</div>
          <div className="uni-sec-head">
            <span className="uni-eyebrow">Cement Legacy</span>
            <h2>Don't let your property become your children's problem.</h2>
            <p className="lead">
              Most Nigerian family properties fall apart the same way: no one's kept the paperwork, no one's digitized the records, and the people who'll eventually inherit the property were never brought into it. Years later, the next generation has no real connection to what they're supposed to inherit.
            </p>
          </div>
          <div className="uni-family-problems">
            <span>Children disconnected from parents' properties</span>
            <span>Missing property documents</span>
            <span>Fragmented rent collection</span>
            <span>Lost maintenance history</span>
            <span>No portfolio visibility</span>
            <span>Family doesn't know who the tenants are</span>
          </div>
          <div style={{ marginTop: '40px' }}>
            <span className="uni-eyebrow">The Upward Property Dashboard</span>
            <div className="uni-dash-grid">
              <div className="uni-dash-card">
                <h3>Portfolio</h3>
                <p>All properties in one place.</p>
              </div>
              <div className="uni-dash-card">
                <h3>Income</h3>
                <p>Rent received, outstanding and upcoming.</p>
              </div>
              <div className="uni-dash-card">
                <h3>Documents</h3>
                <p>Property and tenancy records.</p>
              </div>
              <div className="uni-dash-card">
                <h3>Property Health</h3>
                <p>Inspections and maintenance history.</p>
              </div>
              <div className="uni-dash-card">
                <h3>Tenants</h3>
                <p>Verified tenancy information.</p>
              </div>
              <div className="uni-dash-card">
                <h3>Family Access</h3>
                <p>Controlled access for children, spouse, siblings or advisers.</p>
              </div>
            </div>
            <p className="uni-roi-close" style={{ marginTop: '34px' }}>
              A digital record of your property portfolio that outlasts you.
            </p>
          </div>
        </div>
      </section>

      {/* Delivery Format */}
      <section className="uni-section" data-reveal>
        <div className="uni-wrap">
          <div className="uni-sec-head">
            <span className="uni-eyebrow">How It's Delivered</span>
            <h2>Built for landlords, not lecture halls.</h2>
          </div>
          <div className="uni-delivery-grid">
            <div className="uni-delivery-card">
              <h3>WhatsApp-First Microlearning</h3>
              <p>
                Short 2–4 minute videos, not long lectures. Each lesson gives you one useful insight, one practical takeaway, one relevant Upward capability, and one next action.
              </p>
              <div className="uni-flow-steps">
                <span>Insight</span>
                <span className="arrow">→</span>
                <span>Takeaway</span>
                <span className="arrow">→</span>
                <span>Capability</span>
                <span className="arrow">→</span>
                <span>Action</span>
              </div>
            </div>
            <div className="uni-delivery-card">
              <h3>Weekly Live Q&amp;A</h3>
              <p>
                A 45–60 minute session each week — a topic deep-dive, open questions from landlords, and a short look at the relevant Upward solution.
              </p>
              <div className="uni-flow-steps">
                <span>20–25 min deep-dive</span>
                <span className="arrow">→</span>
                <span>20–30 min Q&amp;A</span>
                <span className="arrow">→</span>
                <span>5 min Upward demo</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Form / CTA */}
      <section id="start" className="uni-section" data-reveal>
        <div className="uni-wrap uni-final-cta" id="form">
          <span className="uni-eyebrow">Free Landlord Programme</span>
          <h2 style={{ marginTop: '16px' }}>Start learning today.</h2>
          <p style={{ marginTop: '12px', color: 'var(--uni-ink-soft)', fontSize: '15.5px' }}>
            No cost. No obligation. Delivered on WhatsApp.
          </p>

          <div className="uni-form-wrap">
            {!submitted ? (
              <form onSubmit={handleSubmit(onSubmit)}>
                <div className="uni-field">
                  <label htmlFor="lname">Full name</label>
                  <input
                    id="lname"
                    type="text"
                    placeholder="Your name"
                    {...register('name')}
                  />
                  {errors.name && (
                    <span className="uni-field-error">{errors.name.message}</span>
                  )}
                </div>

                <div className="uni-field">
                  <label htmlFor="lwhatsapp">WhatsApp number</label>
                  <input
                    id="lwhatsapp"
                    type="tel"
                    placeholder="+234"
                    {...register('whatsapp')}
                  />
                  {errors.whatsapp && (
                    <span className="uni-field-error">{errors.whatsapp.message}</span>
                  )}
                </div>

                <div className="uni-field">
                  <label htmlFor="lcity">City</label>
                  <select id="lcity" {...register('city')}>
                    <option value="">Select city</option>
                    <option value="Lagos">Lagos</option>
                    <option value="Abuja">Abuja</option>
                    <option value="Port Harcourt">Port Harcourt</option>
                    <option value="Oyo">Oyo</option>
                    <option value="Other">Other</option>
                  </select>
                  {errors.city && (
                    <span className="uni-field-error">{errors.city.message}</span>
                  )}
                </div>

                <div className="uni-field">
                  <label htmlFor="lprops">How many properties do you own?</label>
                  <select id="lprops" {...register('properties')}>
                    <option value="">Select</option>
                    <option value="None yet">None yet</option>
                    <option value="1">1</option>
                    <option value="2–5">2–5</option>
                    <option value="6–10">6–10</option>
                    <option value="10+">10+</option>
                  </select>
                  {errors.properties && (
                    <span className="uni-field-error">{errors.properties.message}</span>
                  )}
                </div>

                <div className="uni-field">
                  <label htmlFor="lstatus">Are you a current or aspiring landlord?</label>
                  <select id="lstatus" {...register('status')}>
                    <option value="">Select</option>
                    <option value="Current landlord">Current landlord</option>
                    <option value="Aspiring landlord">Aspiring landlord</option>
                  </select>
                  {errors.status && (
                    <span className="uni-field-error">{errors.status.message}</span>
                  )}
                </div>

                <div className="uni-field">
                  <label htmlFor="lmanage">
                    How do you manage (or plan to manage) your property?
                  </label>
                  <select id="lmanage" {...register('management')}>
                    <option value="">Select</option>
                    <option value="I manage it myself">I manage it myself</option>
                    <option value="I use a property manager">I use a property manager</option>
                    <option value="I need a property manager">I need a property manager</option>
                  </select>
                  {errors.management && (
                    <span className="uni-field-error">{errors.management.message}</span>
                  )}
                </div>

                {errorMsg && (
                  <div style={{ color: 'var(--uni-rust)', fontSize: '13px', marginBottom: '12px' }}>
                    {errorMsg}
                  </div>
                )}
                <button type="submit" className="uni-btn uni-btn-primary" disabled={loading}>
                  {loading ? 'Submitting...' : 'Start Free'}
                </button>
              </form>
            ) : (
              <div className="uni-form-success show" style={{ textAlign: 'center', padding: '32px 24px' }}>
                <div
                  className="check"
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: 'var(--uni-moss, #2D4E35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 20px',
                    boxShadow: '0 8px 24px rgba(45, 78, 53, 0.25)',
                  }}
                >
                  <CheckCircle2 size={36} color="#ffffff" />
                </div>
                <h3 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--uni-dark, #1A1A1A)', marginBottom: '8px' }}>
                  {submittedName ? `Thank you, ${submittedName.split(' ')[0]}!` : "You're in!"}
                </h3>
                <p style={{ color: 'var(--uni-ink-soft, #555)', fontSize: '15px', lineHeight: '1.6', maxWidth: '420px', margin: '0 auto 24px' }}>
                  Your registration for the <b>Upward Landlord Micro-Course</b> has been confirmed. Your first lesson will land on WhatsApp shortly.
                </p>
                <div style={{ background: '#F8F6EF', borderRadius: '12px', padding: '16px 20px', display: 'inline-block', fontSize: '13.5px', color: '#444' }}>
                  <Check size={16} color="var(--uni-moss, #2D4E35)" style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                  Access granted for your property portfolio selection.
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="uni-footer">
        <div className="uni-wrap" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '24px', alignItems: 'center' }}>
          <div>
            <div className="flogo">
              <span className="mark" style={{ width: '24px', height: '24px', borderRadius: '6px', overflow: 'hidden', display: 'inline-block', verticalAlign: 'middle', marginRight: '8px' }}>
                <img src="/university-logos/upward_university_logo.jpeg" alt="Upward University Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </span>
              UPWARD
            </div>
            <p style={{ marginTop: '6px' }}>
              Part of the Upward housing ecosystem, alongside GoodTenants and Upward University. Registered in Nigeria.
            </p>
            <p style={{ marginTop: '8px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <Link className="back" href="/university">
                ← Back to Student Programme
              </Link>
              <Link className="back" href="/" style={{ color: 'var(--uni-rust, #8A4A2A)', fontWeight: 700 }}>
                ← Back to Upward Home
              </Link>
            </p>
          </div>
          <div style={{ fontSize: '14px', fontWeight: 600, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.1em', color: 'var(--uni-rust, #8A4A2A)' }}>Contact Us</span>
            <a href="mailto:hello@goodtenants.africa" className="contact-link"><span style={{ marginRight: '6px' }}>✉️</span> hello@goodtenants.africa</a>
            <a href="tel:+2348175437146" className="contact-link"><span style={{ marginRight: '6px' }}>📞</span> +234 817 543 7146</a>
          </div>
        </div>
      </footer>

      {/* Floating Contact Drawer Component */}
      <div
        id="contact-drawer-overlay"
        className={`contact-drawer-overlay ${isContactOpen ? 'is-open' : ''}`}
        aria-hidden={!isContactOpen}
        onClick={() => setIsContactOpen(false)}
      />
      <div className="contact-us-widget">
        <div
          id="contact-drawer"
          className={`contact-drawer ${isContactOpen ? 'is-open' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="contact-drawer-title"
          aria-hidden={!isContactOpen}
        >
          <div className="contact-drawer-header">
            <h2 id="contact-drawer-title" className="contact-drawer-title">Contact Us</h2>
            <button
              type="button"
              id="contact-drawer-close"
              className="contact-drawer-close"
              aria-label="Close contact options"
              onClick={() => setIsContactOpen(false)}
            >
              ✕
            </button>
          </div>
          <p className="contact-drawer-subtitle">Choose how you'd like to reach us.</p>
          <div className="contact-drawer-options">
            <a
              href="https://wa.me/2348175437146?text=Hi%20Upward%2C%20I%27d%20like%20to%20learn%20more."
              className="contact-drawer-option"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="contact-drawer-option-icon contact-drawer-option-icon--whatsapp">
                💬
              </span>
              <span className="contact-drawer-option-text">
                <span className="contact-drawer-option-label">Chat on WhatsApp</span>
                <span className="contact-drawer-option-detail">Message us anytime</span>
              </span>
            </a>
            <a href="tel:+2348175437146" className="contact-drawer-option">
              <span className="contact-drawer-option-icon">
                📞
              </span>
              <span className="contact-drawer-option-text">
                <span className="contact-drawer-option-label">Call us</span>
                <span className="contact-drawer-option-detail">+234 817 543 7146</span>
              </span>
            </a>
            <a href="mailto:hello@goodtenants.africa?subject=Upward%20Inquiry" className="contact-drawer-option">
              <span className="contact-drawer-option-icon">
                ✉️
              </span>
              <span className="contact-drawer-option-text">
                <span className="contact-drawer-option-label">Send us an email</span>
                <span className="contact-drawer-option-detail">hello@goodtenants.africa</span>
              </span>
            </a>
          </div>
        </div>

        <button
          type="button"
          id="contact-us-btn"
          className="contact-us-float"
          aria-label="Contact Us"
          onClick={() => setIsContactOpen(true)}
        >
          💬 Contact Us
        </button>
      </div>
    </div>
  )
}
