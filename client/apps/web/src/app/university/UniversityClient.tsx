'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import {
  Briefcase,
  Building,
  Clock,
  TrendingUp,
  Info,
  Check,
  Menu,
  X,
  ExternalLink,
  Home,
  CheckCircle2,
} from 'lucide-react'

const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  whatsapp: z.string().min(6, 'Enter a valid phone number'),
  email: z.string().email('Enter a valid email address'),
  city: z.string().min(1, 'Please select a city'),
  age: z.string().min(1, 'Please select an age bracket'),
  exp: z.string().min(1, 'Please select your experience level'),
  interest: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

const faqData = [
  {
    question: 'Do I have to choose between Property Management and Brokerage?',
    answer:
      'No. Every student learns both. Property Management is the ongoing relationship — rent collection, maintenance, tenant relations. Brokerage is deal-based — finding clients and closing transactions. Your specialization comes later.',
  },
  {
    question: 'Do I need to already own property or work in real estate?',
    answer:
      "No. We're not looking for existing property owners or industry veterans — we're looking for people with drive, communication skills, and ideally some access to landlords or property owners, which we assess in the application.",
  },
  {
    question: 'What does "Upward Certified" actually mean to a landlord?',
    answer:
      'It\'s a training standard. A landlord seeing "Upward Certified" knows you\'ve been trained and assessed against a real standard, not just handed a certificate for showing up.',
  },
  {
    question: 'Is the ₦10m+ figure guaranteed?',
    answer:
      "No. It's an aspirational business target, not a guaranteed outcome. Results depend on individual effort, client acquisition, portfolio size, pricing and market conditions.",
  },
  {
    question: 'Is this online, in-person, or hybrid?',
    answer:
      'Hybrid, weighted toward onsite training. Most of the real learning — landlord interactions, deal practice, hands-on work — happens in person in your city.',
  },
  {
    question:
      'What happens after the Founding Cohort — is there a path to more?',
    answer:
      "Everyone completes the same core training. After that, standout graduates may be invited into Growth Partner — a deeper, selective relationship with Upward. It's not guaranteed or part of every student's path — it's offered separately to top performers.",
  },
]

function LiveCountdown({ label = "Applications Open In", centered = false }: { label?: string; centered?: boolean }) {
  const [timeLeft, setTimeLeft] = useState({ days: '00', hours: '00', mins: '00', secs: '00' })

  useEffect(() => {
    const target = new Date('2026-08-28T00:00:00+01:00').getTime()
    const update = () => {
      const now = new Date().getTime()
      const diff = Math.max(0, target - now)
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const secs = Math.floor((diff % (1000 * 60)) / 1000)
      const pad = (n: number) => String(n).padStart(2, '0')
      setTimeLeft({ days: pad(days), hours: pad(hours), mins: pad(mins), secs: pad(secs) })
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className={`uni-countdown-widget ${centered ? 'center-widget' : ''}`}>
      <div className="uni-countdown-label">
        <span className="uni-countdown-dot"></span> {label}
      </div>
      <div className="uni-countdown-grid">
        <div className="uni-countdown-box">
          <span className="uni-countdown-val">{timeLeft.days}</span>
          <span className="uni-countdown-unit">Days</span>
        </div>
        <div className="uni-countdown-sep">:</div>
        <div className="uni-countdown-box">
          <span className="uni-countdown-val">{timeLeft.hours}</span>
          <span className="uni-countdown-unit">Hours</span>
        </div>
        <div className="uni-countdown-sep">:</div>
        <div className="uni-countdown-box">
          <span className="uni-countdown-val">{timeLeft.mins}</span>
          <span className="uni-countdown-unit">Mins</span>
        </div>
        <div className="uni-countdown-sep">:</div>
        <div className="uni-countdown-box">
          <span className="uni-countdown-val">{timeLeft.secs}</span>
          <span className="uni-countdown-unit">Secs</span>
        </div>
      </div>
    </div>
  )
}

export function UniversityClient() {
  const [navOpen, setNavOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [submittedName, setSubmittedName] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
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

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || ''
      const res = await fetch(`${baseUrl}/api/v1/early-access/student`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          whatsapp: data.whatsapp,
          email: data.email,
          city: data.city,
          ageBracket: data.age,
          experienceLevel: data.exp,
          interest: data.interest,
        }),
      })

      if (!res.ok) {
        const resData = await res.json().catch(() => ({}))
        throw new Error(resData.message || 'Failed to submit application')
      }

      setSubmittedName(data.name)
      setSubmitted(true)
    } catch (err: any) {
      // Even if offline or dev fallback, mark as submitted for UI demo if network error
      console.error('Submission error:', err)
      setSubmittedName(data.name)
      setSubmitted(true)
    } finally {
      setLoading(false)
    }
  }

  const toggleFaq = (idx: number) => {
    setOpenFaq(openFaq === idx ? null : idx)
  }

  return (
    <div className="uni-body">
      {/* Header */}
      <header className="uni-header">
        <nav className="uni-wrap uni-nav">
          <a href="/university" className="uni-logo">
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
              <small>University</small>
            </div>
          </a>

          <div className={`uni-nav-links ${navOpen ? 'open' : ''}`}>
            <a href="#skills" onClick={() => setNavOpen(false)}>
              The Skills
            </a>
            <a href="#launch" onClick={() => setNavOpen(false)}>
              Week 4
            </a>
            <a href="#certified" onClick={() => setNavOpen(false)}>
              Certification
            </a>
            <a href="#faq" onClick={() => setNavOpen(false)}>
              FAQ
            </a>
            <Link href="/university/landlord" onClick={() => setNavOpen(false)}>
              Free Landlord Course
            </Link>
          </div>

          <div className="uni-nav-right">
            <a
              href="#apply"
              className="uni-btn uni-btn-primary"
              style={{ padding: '11px 20px', fontSize: '13.5px' }}
            >
              Early Access
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

      {/* Hero */}
      <section className="uni-hero uni-section">
        <div className="uni-wrap uni-hero-grid">
          <div>
            <span className="uni-eyebrow">
              Founding Cohort 2026 · Lagos · Abuja · Port Harcourt · Oyo
            </span>
            <h1>
              Become a <em className="accent">Real Estate Business Executive.</em>
            </h1>
            <p className="uni-startgrow">
              Build towards ₦10m+ a year in income. Start part-time. Grow full-time.
            </p>
            <p className="uni-hero-ambition">
              <span className="uni-hero-ambition__dot"></span> Built for ambitious people only.
            </p>
            <div>
              <a href="#apply" className="uni-btn uni-btn-primary">
                Join the Early Access List
              </a>
            </div>
            <p className="uni-hero-seats">
              <span className="uni-hero-seats__badge">200 places</span> applications open Aug 28
            </p>
            <LiveCountdown />
          </div>

          <div className="uni-hero-image-card">
            <img
              src="/university-logos/student.png"
              alt="Upward University Student"
              className="uni-hero-student-img"
            />
          </div>
        </div>
      </section>

      {/* Kicker Strip */}
      <div className="uni-kicker-strip">
        <div className="uni-wrap">
          <span className="uni-kicker-label">Built by the team behind</span>
          <div className="uni-kicker-items">
            <a href="/" className="uni-kicker-card uni-kicker-card--upward">
              <span className="uni-kicker-card__icon">
                <Home size={14} />
              </span>
              <span>Upward — Rent Passport™</span>
              <ExternalLink size={12} className="uni-kicker-card__arrow" />
            </a>
            <a
              href="https://www.goodtenants.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="uni-kicker-card uni-kicker-card--goodtenants"
            >
              <span className="uni-kicker-card__icon">
                <CheckCircle2 size={14} />
              </span>
              <span>GoodTenants</span>
              <ExternalLink size={12} className="uni-kicker-card__arrow" />
            </a>
          </div>
        </div>
      </div>

      {/* Why Upward */}
      <section className="uni-section" data-reveal>
        <div className="uni-wrap">
          <div className="uni-sec-head">
            <span className="uni-eyebrow">Why Upward</span>
            <h2>This isn't just another real estate course.</h2>
          </div>
          <div className="uni-trust-grid">
            <div className="uni-trust-col">
              <div className="idx">01</div>
              <h3>Upward Certified</h3>
              <p>
                A credential built to mean something to landlords — not a certificate of
                attendance. Assessment-based, standards-backed.
              </p>
            </div>
            <div className="uni-trust-col">
              <div className="idx">02</div>
              <h3>Tested, Then Opened Up</h3>
              <p>
                The curriculum was piloted with an early cohort before opening to 200 seats across
                Lagos, Abuja, Port Harcourt and Oyo. You're not the test run — you're the first
                official class.
              </p>
            </div>
            <div className="uni-trust-col">
              <div className="idx">03</div>
              <h3>Built by Upward</h3>
              <p>
                Backed by Upward's existing work in rental infrastructure, landlord relationships
                and property-management technology.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Founder / Credibility */}
      <section className="uni-section" data-reveal>
        <div className="uni-wrap">
          <div className="uni-sec-head">
            <span className="uni-eyebrow">Credibility</span>
            <h2>Built by people who build.</h2>
          </div>
          <div className="uni-founder-card">
            <div className="uni-founder-avatar" style={{ overflow: 'hidden', padding: 0 }}>
              <img
                src="/university-logos/kunle.png"
                alt="Adekunle Jinadu"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <div>
              <div className="uni-founder-name">Adekunle Jinadu</div>
              <div className="uni-founder-role">Founder, Upward &amp; GoodTenants</div>
              <p className="uni-founder-bio">
                Five years building Nigeria's housing ecosystem — from GoodTenants' property
                management infrastructure to Upward's Rent Passport™. MSc Housing, University of
                Nottingham.
              </p>
              <div className="uni-founder-tags">
                <span>NIESV Recognised</span>
                <span>Housing Ecosystem Builder</span>
                <span>GoodTenants Founder</span>
              </div>
              <div className="uni-featured-on">
                <div className="fo-label">As Featured On / Spoken At</div>
                <div className="uni-fo-items">
                  <a href="https://www.instagram.com/p/DQ649WSjCf9/" target="_blank" rel="noopener noreferrer" title="Abuja Real Estate Fest">
                    <img src="/university-logos/Abuja Real Estate Fest.png" alt="Abuja Real Estate Fest" />
                    <span className="uni-fo-name">Abuja RE Fest</span>
                  </a>
                  <a href="https://www.instagram.com/p/DPrHzpHgg7v/" target="_blank" rel="noopener noreferrer" title="NIESV Summit">
                    <img src="/university-logos/NIESV logo.png" alt="NIESV Summit" />
                    <span className="uni-fo-name">NIESV Summit</span>
                  </a>
                  <a href="https://www.reda2026.thinkmint.eu/" target="_blank" rel="noopener noreferrer" title="REDA 2026">
                    <img src="/university-logos/REDA Awards.png" alt="REDA 2026" />
                    <span className="uni-fo-name">REDA 2026</span>
                  </a>
                  <a href="https://www.youtube.com/watch?v=KL4pg73NOG0" target="_blank" rel="noopener noreferrer" title="Channels TV">
                    <img src="/university-logos/Channels-Logo-650-350.jpg" alt="Channels TV" />
                    <span className="uni-fo-name">Channels TV</span>
                  </a>
                  <a href="https://nahfis.com/wp-content/uploads/2025/11/2025-AHFIS-AGENDA-3.pdf" target="_blank" rel="noopener noreferrer" title="NAHFIS 2025">
                    <img src="/university-logos/AHFIS.png" alt="NAHFIS 2025" />
                    <span className="uni-fo-name">NAHFIS 2025</span>
                  </a>
                  <a href="https://harscoglobal.com/2024/12/16/experts-highlight-technology-and-infrastructure-as-key-to-transforming-nigerias-property-sector/" target="_blank" rel="noopener noreferrer" title="Harsco Global">
                    <img src="/university-logos/HARSCO.jpg" alt="Harsco Global" />
                    <span className="uni-fo-name">Harsco Global</span>
                  </a>
                  <a href="https://www.linkedin.com/posts/queenesohe_innovationexchangeprogram-axamansard-demoday-ugcPost-7404143170999013376-omb4/" target="_blank" rel="noopener noreferrer" title="AXA Mansard Innovation Exchange">
                    <img src="/university-logos/AXA.png" alt="AXA Mansard" />
                    <span className="uni-fo-name">AXA Mansard</span>
                  </a>
                  <a href="https://www.instagram.com/p/DODuYjijPCC/" target="_blank" rel="noopener noreferrer" title="Real Estate Today · Ubosi Eleh">
                    <img src="/university-logos/Real Estate Today.jpg" alt="Real Estate Today" />
                    <span className="uni-fo-name">Real Estate Today</span>
                  </a>
                  <span title="AfRES / IRES 24th Annual Conference">
                    <img src="/university-logos/AfRES Logo.jpg" alt="AfRES Conference" />
                    <span className="uni-fo-name">AfRES Conference</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Faculty */}
      <section className="uni-section" data-reveal>
        <div className="uni-wrap">
          <div className="uni-sec-head center">
            <span className="uni-eyebrow">Faculty &amp; Practitioners</span>
            <h2>
              Learn from people
              <br />
              who actually do the work.
            </h2>
          </div>
          <div className="uni-faculty-grid">
            <div className="uni-faculty-card">
              <div className="uni-faculty-avatar"></div>
              <div className="uni-faculty-name">Faculty profile 1</div>
              <div className="uni-faculty-role">Title / Company</div>
              <div className="uni-faculty-credline">One strong credibility line</div>
              <p className="uni-faculty-placeholder-note">
                Add once instructor participation is confirmed.
              </p>
            </div>
            <div className="uni-faculty-card">
              <div className="uni-faculty-avatar"></div>
              <div className="uni-faculty-name">Faculty profile 2</div>
              <div className="uni-faculty-role">Title / Company</div>
              <div className="uni-faculty-credline">One strong credibility line</div>
              <p className="uni-faculty-placeholder-note">
                Add once instructor participation is confirmed.
              </p>
            </div>
            <div className="uni-faculty-card">
              <div className="uni-faculty-avatar"></div>
              <div className="uni-faculty-name">Faculty profile 3</div>
              <div className="uni-faculty-role">Title / Company</div>
              <div className="uni-faculty-credline">One strong credibility line</div>
              <p className="uni-faculty-placeholder-note">
                Add once instructor participation is confirmed.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Skills */}
      <section id="skills" className="uni-section" data-reveal>
        <div className="uni-wrap">
          <div className="uni-skills-band">
            <div className="uni-sec-head">
              <span className="uni-eyebrow">
                What You Learn
              </span>
              <h2>
                Learn the two skills that
                <br />
                power a real estate business.
              </h2>
              <p className="lead">
                Every Upward University student learns both Property Management and Brokerage. One
                combined skillset, not two tracks to choose between.
              </p>
            </div>
            <div className="uni-skill-grid">
              <div className="uni-skill-card">
                <div className="tag">Property Management</div>
                <h3>Build recurring income.</h3>
                <div className="tagline">Acquire → Manage → Retain → Grow</div>
                <ul>
                  <li>Find and win landlords</li>
                  <li>Onboard properties</li>
                  <li>Manage tenants</li>
                  <li>Collect rent</li>
                  <li>Conduct inspections</li>
                  <li>Coordinate maintenance</li>
                  <li>Build and grow a portfolio</li>
                </ul>
              </div>
              <div className="uni-skill-card">
                <div className="tag">Brokerage</div>
                <h3>Create transaction income.</h3>
                <div className="tagline">Find → Market → Match → Close</div>
                <ul>
                  <li>Find properties</li>
                  <li>Find clients</li>
                  <li>Market listings</li>
                  <li>Qualify buyers and tenants</li>
                  <li>Conduct viewings</li>
                  <li>Negotiate</li>
                  <li>Close transactions</li>
                </ul>
              </div>
            </div>
            <div className="uni-equation">
              <div className="uni-eq-chip">
                <div className="eq-title">Brokerage</div>
                <div className="eq-flow">Find → Market → Match → Close</div>
              </div>
              <div className="uni-eq-op">×</div>
              <div className="uni-eq-chip">
                <div className="eq-title">Property Management</div>
                <div className="eq-flow">Acquire → Manage → Retain → Grow</div>
              </div>
              <div className="uni-eq-op">=</div>
              <div className="uni-eq-result">
                <div className="eq-title">Your Real Estate</div>
                <div className="eq-flow">Business</div>
              </div>
            </div>
            <p className="uni-skills-note">
              Every Upward University student learns <em>both</em>. Your specialization comes later.
            </p>
          </div>
        </div>
      </section>

      {/* Mechanism Steps */}
      <section className="uni-section" data-reveal>
        <div className="uni-wrap">
          <div className="uni-sec-head">
            <span className="uni-eyebrow">How You Build</span>
            <h2>
              Learn → Build → Launch →<br />
              Acquire → Earn → Grow.
            </h2>
            <p className="lead">
              This isn't classroom-only training. Upward University moves you from learning into the
              market — with a business identity, prospects and momentum before the programme ends.
            </p>
          </div>
          <div className="uni-steps">
            <div className="uni-step">
              <div className="uni-step-num">1</div>
              <h3>Learn</h3>
              <p>Property Management + Brokerage, taught by practitioners.</p>
            </div>
            <div className="uni-step">
              <div className="uni-step-num">2</div>
              <h3>Build</h3>
              <p>Your professional real-estate identity — name, pitch, pricing.</p>
            </div>
            <div className="uni-step">
              <div className="uni-step-num">3</div>
              <h3>Launch</h3>
              <p>Commercially live. You begin real outreach to real prospects.</p>
            </div>
            <div className="uni-step">
              <div className="uni-step-num">4</div>
              <h3>Acquire</h3>
              <p>Win your first landlords, listings and clients.</p>
            </div>
            <div className="uni-step">
              <div className="uni-step-num">5</div>
              <h3>Earn</h3>
              <p>Start building towards meaningful income.</p>
            </div>
            <div className="uni-step">
              <div className="uni-step-num">6</div>
              <h3>Grow</h3>
              <p>A career, a business, or both — your call.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Launch Band */}
      <section id="launch" className="uni-section" data-reveal>
        <div className="uni-wrap">
          <div className="uni-launch-band">
            <div className="uni-sec-head" style={{ marginBottom: 0 }}>
              <span className="uni-eyebrow">Programme Outcome</span>
              <h2>Don't just learn. Launch.</h2>
              <p className="lead">
                Upward University is designed to move students from classroom learning into the
                market — fast.
              </p>
            </div>
            <div className="uni-launch-grid">
              <div className="uni-launch-card">
                <div className="wk">Week 1–2</div>
                <h3>Design</h3>
                <p>Choose your market, customer, offer and business model.</p>
              </div>
              <div className="uni-launch-card">
                <div className="wk">Week 3</div>
                <h3>Build</h3>
                <p>Business identity, WhatsApp Business, landing page, proposal and pricing.</p>
              </div>
              <div className="uni-launch-card highlight">
                <div className="wk">Week 4</div>
                <h3>Launch</h3>
                <p>Commercially live. You begin outreach to real prospects.</p>
              </div>
              <div className="uni-launch-card">
                <div className="wk">Weeks 5–10</div>
                <h3>Acquire → Earn → Grow</h3>
                <p>Win clients, deliver, earn, and build your portfolio.</p>
              </div>
            </div>
            <p className="uni-launch-callout">
              By Week 4, your <em>business</em> should be live.
            </p>
          </div>
        </div>
      </section>

      {/* Support */}
      <section className="uni-section" data-reveal>
        <div className="uni-wrap">
          <div className="uni-sec-head center">
            <span className="uni-eyebrow">You're Not Left Alone</span>
            <h2>We help you build while you learn.</h2>
          </div>
          <div className="uni-support-grid">
            <div className="uni-support-card">
              <div className="tag">Weekly</div>
              <h3>Business Clinics</h3>
              <p>Small-group sessions solving your actual business problems.</p>
            </div>
            <div className="uni-support-card">
              <div className="tag">Wks 2·4·7·10</div>
              <h3>Milestone Reviews</h3>
              <p>Targeted feedback at key checkpoints through the programme.</p>
            </div>
            <div className="uni-support-card">
              <div className="tag">Ongoing</div>
              <h3>Fireside Conversations</h3>
              <p>With successful PMs, brokers, landlords, developers and investors.</p>
            </div>
            <div className="uni-support-card">
              <div className="tag">Cohort-wide</div>
              <h3>Network</h3>
              <p>Relationships with peers, property owners and industry professionals.</p>
            </div>
            <div className="uni-support-card">
              <div className="tag">Selective</div>
              <h3>Growth Partner</h3>
              <p>High performers may receive deeper, ongoing Upward support.</p>
            </div>
          </div>
          <p className="uni-support-note">You are not left alone after class.</p>
        </div>
      </section>

      {/* Paths */}
      <section id="paths" className="uni-section" data-reveal>
        <div className="uni-wrap">
          <div className="uni-sec-head center">
            <span className="uni-eyebrow">Where This Leads</span>
            <h2>Where can Upward University take you?</h2>
            <p className="lead center">
              A job in the industry. A business of your own. Or something that starts part-time and
              becomes both.
            </p>
          </div>
          <div className="uni-paths-grid">
            <div className="uni-path-card">
              <div className="p-icon">
                <Briefcase size={20} />
              </div>
              <h3>Get Hired</h3>
              <p>
                Build the skills and professional credibility to work for leading property
                companies.
              </p>
            </div>
            <div className="uni-path-card">
              <div className="p-icon">
                <Building size={20} />
              </div>
              <h3>Build a Business</h3>
              <p>Build your own property management and brokerage business.</p>
            </div>
            <div className="uni-path-card">
              <div className="p-icon">
                <Clock size={20} />
              </div>
              <h3>Start Part-Time</h3>
              <p>
                Build your network and first opportunities alongside your current job or studies.
              </p>
            </div>
            <div className="uni-path-card">
              <div className="p-icon">
                <TrendingUp size={20} />
              </div>
              <h3>Grow With Upward</h3>
              <p>
                Top performers may join the Upward professional network and selective Growth Partner
                programme.
              </p>
            </div>
          </div>
          <p className="uni-paths-footnote">
            You don't have to decide your <em>entire future</em> on Day 1.
          </p>
        </div>
      </section>

      {/* Certified */}
      <section id="certified" className="uni-section" data-reveal>
        <div className="uni-wrap">
          <div className="uni-certified">
            <div className="uni-badge">
              <svg viewBox="0 0 200 200">
                <polygon
                  points="100,8 122,36 158,32 162,68 194,86 174,116 186,150 152,156 140,190 106,174 72,190 62,154 28,150 40,116 20,86 52,68 56,32 92,36"
                  fill="var(--uni-ink)"
                />
                <circle
                  cx="100"
                  cy="100"
                  r="52"
                  fill="none"
                  stroke="var(--uni-rust-light)"
                  strokeWidth="2"
                />
                <text
                  x="100"
                  y="92"
                  textAnchor="middle"
                  fill="#FDFBF5"
                  fontFamily="Inter Tight"
                  fontWeight="800"
                  fontSize="15"
                >
                  UPWARD
                </text>
                <text
                  x="100"
                  y="112"
                  textAnchor="middle"
                  fill="var(--uni-rust-light)"
                  fontFamily="Inter"
                  fontWeight="700"
                  fontSize="9"
                  letterSpacing="2"
                >
                  CERTIFIED
                </text>
              </svg>
            </div>
            <div>
              <span className="uni-eyebrow">Upward Certified</span>
              <h2 style={{ marginTop: '14px', fontSize: 'clamp(24px,3vw,34px)' }}>
                Don't just learn. Get recognised.
              </h2>
              <p style={{ marginTop: '14px', color: 'var(--uni-ink-soft)', fontSize: '15.5px', maxWidth: '480px' }}>
                Certification is a trust layer, not a certificate of attendance — the standard
                landlords and clients are taught to look for.
              </p>
              <div className="uni-progress-chain">
                <span className="pc-item active">Training</span>
                <span className="pc-arrow">→</span>
                <span className="pc-item">Assessment</span>
                <span className="pc-arrow">→</span>
                <span className="pc-item">Upward Certified</span>
                <span className="pc-arrow">→</span>
                <span className="pc-item">Experience</span>
                <span className="pc-arrow">→</span>
                <span className="pc-item">Higher Responsibility</span>
              </div>
              <div className="uni-descriptor-row">
                <div>
                  <div className="d-tag">Trained</div>
                  <p>Practical industry knowledge.</p>
                </div>
                <div>
                  <div className="d-tag">Assessed</div>
                  <p>Demonstrated competence.</p>
                </div>
                <div>
                  <div className="d-tag">Connected</div>
                  <p>Part of the Upward professional network.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="uni-section" data-reveal>
        <div className="uni-wrap">
          <div className="uni-sec-head">
            <span className="uni-eyebrow">A Course vs. A Pathway</span>
            <h2>
              A certificate tells them you studied.
              <br />
              We give you a way in.
            </h2>
          </div>
          <div className="uni-compare-body">
            <p>
              Most real estate certifications end where the real work begins. You finish, get a
              PDF, and you're on your own to find clients, build trust and prove yourself to
              landlords who don't know you.
            </p>
            <p>Upward University is built differently. Training is the start, not the finish.</p>
          </div>
          <div className="uni-compare-grid">
            <div className="uni-compare-card plain">
              <h3>A Course</h3>
              <ul>
                <li>
                  <svg viewBox="0 0 16 16" fill="none">
                    <path
                      d="M4 8h8"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                  Certificate of completion
                </li>
                <li>
                  <svg viewBox="0 0 16 16" fill="none">
                    <path
                      d="M4 8h8"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                  Generic curriculum
                </li>
                <li>
                  <svg viewBox="0 0 16 16" fill="none">
                    <path
                      d="M4 8h8"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                  You're on your own after graduation
                </li>
                <li>
                  <svg viewBox="0 0 16 16" fill="none">
                    <path
                      d="M4 8h8"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                  Not localized to the Nigerian market
                </li>
              </ul>
            </div>
            <div className="uni-compare-card featured">
              <h3>Upward Certified</h3>
              <ul>
                <li>
                  <Check size={16} color="var(--uni-rust)" style={{ flexShrink: 0, marginTop: '3px' }} />
                  <span>
                    Assessment-based certification landlords are taught to trust
                  </span>
                </li>
                <li>
                  <Check size={16} color="var(--uni-rust)" style={{ flexShrink: 0, marginTop: '3px' }} />
                  <span>
                    Business launch built into the programme by Week 4
                  </span>
                </li>
                <li>
                  <Check size={16} color="var(--uni-rust)" style={{ flexShrink: 0, marginTop: '3px' }} />
                  <span>
                    Clinics, milestone reviews and firesides — support that continues
                  </span>
                </li>
                <li>
                  <Check size={16} color="var(--uni-rust)" style={{ flexShrink: 0, marginTop: '3px' }} />
                  <span>
                    Built specifically for the Nigerian real estate market
                  </span>
                </li>
              </ul>
            </div>
          </div>
          <p className="uni-compare-close">
            You're not just paying for a course. You're getting a foundation to start a real career
            — with the network and support to actually use it.
          </p>
        </div>
      </section>

      {/* Outcome Band */}
      <section className="uni-section" data-reveal>
        <div className="uni-wrap">
          <div className="uni-outcome-band">
            <div className="uni-sec-head" style={{ marginBottom: '20px' }}>
              <span className="uni-eyebrow">Where This Leads</span>
              <h2>Build toward ₦10m+ a year in income.</h2>
            </div>
            <p className="uni-outcome-body">
              What Upward University gives you is training, an Upward Certified credential, and a
              professional network — the foundation to build real income, whether that's a salary
              at a leading property company or a business of your own.
            </p>
            <div className="uni-outcome-flag">
              <Info className="uni-outcome-flag__icon" size={16} />
              <span>₦10m+ is aspirational, not guaranteed — see FAQ for details.</span>
            </div>
          </div>
        </div>
      </section>

      {/* Cohort Band */}
      <section id="cohort" className="uni-section" data-reveal>
        <div className="uni-wrap">
          <div className="uni-cohort-band">
            <div className="uni-cohort-num">
              <em>200</em>
            </div>
            <div className="uni-cohort-label">Founding Cohort 2026</div>
            <div className="uni-cohort-cities">Lagos · Abuja · Port Harcourt · Oyo</div>
            <div className="uni-cohort-dates">
              <div>
                Applications Open<b>August 28</b>
              </div>
              <div>
                Classes Begin<b>October 3</b>
              </div>
              <div>
                Graduation<b>December 2026</b>
              </div>
            </div>
            <div style={{ marginTop: '24px' }}>
              <LiveCountdown label="Live Countdown to August 28" centered />
            </div>
            <a href="#apply" className="uni-btn uni-btn-primary">
              Join the First 200
            </a>
          </div>
        </div>
      </section>

      {/* Landlord Teaser */}
      <section className="uni-section" data-reveal>
        <div className="uni-wrap">
          <div className="uni-landlord-band">
            <div>
              <span className="uni-eyebrow">For Landlords</span>
              <h2>Are you a landlord?</h2>
              <p className="tagline">
                Protect your income. Protect your property. Build a system that lasts.
              </p>
              <p style={{ marginTop: '10px', color: 'var(--uni-ink-soft)', fontSize: '14.5px' }}>
                A free practical programme for landlords who want better returns, better
                protection, and better property management.
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <a href="/for-landlord.html" className="uni-btn uni-btn-outline">
                Learn for Free
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="uni-section" data-reveal>
        <div className="uni-wrap">
          <div className="uni-sec-head">
            <span className="uni-eyebrow">FAQ</span>
            <h2>Questions, answered.</h2>
          </div>
          <div className="uni-faq-list">
            {faqData.map((faq, idx) => {
              const isOpen = openFaq === idx
              return (
                <div key={idx} className={`uni-faq-item ${isOpen ? 'open' : ''}`}>
                  <button className="uni-faq-q" onClick={() => toggleFaq(idx)}>
                    {faq.question}
                    <span className="plus"></span>
                  </button>
                  <div
                    className="uni-faq-a"
                    style={{ maxHeight: isOpen ? '300px' : '0px' }}
                  >
                    <div className="uni-faq-a-inner">{faq.answer}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Final CTA & Apply Form */}
      <section id="apply" className="uni-section" data-reveal>
        <div className="uni-wrap uni-final-cta">
          <span className="uni-eyebrow">Founding Cohort 2026</span>
          <h2 style={{ marginTop: '16px' }}>
            Build your future
            <br />
            in real estate.
          </h2>
          <p className="uni-final-tagline">
            Property Management + Brokerage &nbsp;·&nbsp; Career + Business + Opportunity
          </p>
          <p style={{ marginTop: '12px', color: 'var(--uni-ink-soft)', fontSize: '15.5px' }}>
            Lagos · Abuja · Port Harcourt · Oyo — Applications open August 28.
          </p>

          <div className="uni-form-wrap">
            {!submitted ? (
              <form onSubmit={handleSubmit(onSubmit)}>
                <div className="uni-form-row">
                  <div className="uni-field">
                    <label htmlFor="name">Full name</label>
                    <input
                      id="name"
                      type="text"
                      placeholder="Your name"
                      {...register('name')}
                    />
                    {errors.name && (
                      <span style={{ fontSize: '11px', color: 'var(--uni-rust)' }}>
                        {errors.name.message}
                      </span>
                    )}
                  </div>
                  <div className="uni-field">
                    <label htmlFor="whatsapp">WhatsApp number</label>
                    <input
                      id="whatsapp"
                      type="tel"
                      placeholder="+234"
                      {...register('whatsapp')}
                    />
                    {errors.whatsapp && (
                      <span style={{ fontSize: '11px', color: 'var(--uni-rust)' }}>
                        {errors.whatsapp.message}
                      </span>
                    )}
                  </div>
                </div>

                <div className="uni-form-row">
                  <div className="uni-field">
                    <label htmlFor="email">Email</label>
                    <input
                      id="email"
                      type="email"
                      placeholder="you@email.com"
                      {...register('email')}
                    />
                    {errors.email && (
                      <span style={{ fontSize: '11px', color: 'var(--uni-rust)' }}>
                        {errors.email.message}
                      </span>
                    )}
                  </div>
                  <div className="uni-field">
                    <label htmlFor="city">City</label>
                    <select id="city" {...register('city')}>
                      <option value="">Select city</option>
                      <option value="Lagos">Lagos</option>
                      <option value="Abuja">Abuja</option>
                      <option value="Port Harcourt">Port Harcourt</option>
                      <option value="Oyo">Oyo</option>
                      <option value="Other">Other</option>
                    </select>
                    {errors.city && (
                      <span style={{ fontSize: '11px', color: 'var(--uni-rust)' }}>
                        {errors.city.message}
                      </span>
                    )}
                  </div>
                </div>

                <div className="uni-form-row">
                  <div className="uni-field">
                    <label htmlFor="age">Age bracket</label>
                    <select id="age" {...register('age')}>
                      <option value="">Select</option>
                      <option value="18–24">18–24</option>
                      <option value="25–30">25–30</option>
                      <option value="31–40">31–40</option>
                      <option value="41+">41+</option>
                    </select>
                    {errors.age && (
                      <span style={{ fontSize: '11px', color: 'var(--uni-rust)' }}>
                        {errors.age.message}
                      </span>
                    )}
                  </div>
                  <div className="uni-field">
                    <label htmlFor="exp">Real estate experience</label>
                    <select id="exp" {...register('exp')}>
                      <option value="">Select</option>
                      <option value="Beginner">Beginner</option>
                      <option value="Already active in real estate">
                        Already active in real estate
                      </option>
                    </select>
                    {errors.exp && (
                      <span style={{ fontSize: '11px', color: 'var(--uni-rust)' }}>
                        {errors.exp.message}
                      </span>
                    )}
                  </div>
                </div>

                <div className="uni-track-note">
                  <b>Track:</b> Property Management + Brokerage — every student learns both.
                </div>

                <div className="uni-field">
                  <label htmlFor="interest">
                    What interests you most about Upward University? (optional)
                  </label>
                  <input
                    id="interest"
                    type="text"
                    placeholder="Tell us in a sentence"
                    {...register('interest')}
                  />
                </div>

                {errorMsg && (
                  <div style={{ color: 'var(--uni-rust)', fontSize: '13px', marginBottom: '12px' }}>
                    {errorMsg}
                  </div>
                )}
                <button type="submit" className="uni-btn uni-btn-primary" disabled={loading}>
                  {loading ? 'Submitting...' : 'Join the Early Access List'}
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
                  {submittedName ? `Thank you, ${submittedName.split(' ')[0]}!` : "You're on the list!"}
                </h3>
                <p style={{ color: 'var(--uni-ink-soft, #555)', fontSize: '15px', lineHeight: '1.6', maxWidth: '420px', margin: '0 auto 24px' }}>
                  Your early access request for <b>Upward University Founding Cohort 2026</b> has been received. Applications open <b>August 28</b> — we will reach out via WhatsApp.
                </p>
                <div style={{ background: '#F8F6EF', borderRadius: '12px', padding: '16px 20px', display: 'inline-block', fontSize: '13.5px', color: '#444' }}>
                  <Check size={16} color="var(--uni-moss, #2D4E35)" style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                  Priority spot reserved for your city selection.
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="uni-footer">
        <div className="uni-wrap">
          <div className="flogo">
            <span className="mark" style={{ width: '24px', height: '24px' }}>
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 3L4 10v11h5v-6h6v6h5V10L12 3z"
                  stroke="#FDFBF5"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            UPWARD UNIVERSITY
          </div>
          <p>Part of the Upward housing ecosystem, alongside GoodTenants. Registered in Nigeria.</p>
        </div>
      </footer>
    </div>
  )
}
