'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { 
  ArrowRight, 
  Check, 
  Building2, 
  Mail, 
  Lock, 
  User, 
  ArrowLeft,
  ChevronRight,
  ShieldCheck
} from 'lucide-react'
import { UpwardLogo } from '@/components/common/UpwardLogo'
import { useToast } from '@/components/common/Toast'
import '@/styles/auth.css'

export default function SignupPage() {
  const [step, setStep] = useState(1)
  const { success } = useToast()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    businessName: '',
    units: ''
  })

  const nextStep = () => setStep(s => s + 1)
  const prevStep = () => setStep(s => s - 1)

  const handleFinish = (e: React.FormEvent) => {
    e.preventDefault()
    success("Account created successfully!")
    // Redirect simulation
    setTimeout(() => window.location.href = '/', 1500)
  }

  return (
    <div className="auth-page">
      <div className="auth-page__ornament" />
      
      <div className="auth-sidebar">
        <div className="auth-sidebar__logo">
          <UpwardLogo size={40} color="#ffffff" />
        </div>
        <div className="auth-sidebar__content">
          <h1>Manage your <br/> portfolio with <br/> confidence.</h1>
          <p>Join the next generation of property managers in Nigeria. Automated collections, simplified tenant management.</p>
        </div>
        <div className="auth-sidebar__footer">
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <ShieldCheck size={20} className="text-clay" />
            <span style={{ fontSize: 13, color: '#888' }}>ISO 27001 Certified Security</span>
          </div>
        </div>
      </div>

      <div className="auth-main animate-fade-in">
        <div className="auth-card">
          <div className="auth-card__header">
            <div className="auth-card__logo mobile-only">
              <UpwardLogo size={32} />
            </div>
            <h2 className="auth-card__title">
              {step === 1 ? "Create your account" : "About your business"}
            </h2>
            <p className="auth-card__subtitle">
              {step === 1 
                ? "Start your 30-day free trial. No credit card required."
                : "Tell us a bit about the properties you manage."}
            </p>
          </div>

          <div className="step-indicator">
            <div className={`step-dot ${step >= 1 ? 'step-dot--active' : ''}`} />
            <div className={`step-dot ${step >= 2 ? 'step-dot--active' : ''}`} />
            <div className={`step-dot ${step >= 3 ? 'step-dot--active' : ''}`} />
          </div>

          <form onSubmit={step === 2 ? handleFinish : (e) => { e.preventDefault(); nextStep(); }}>
            {step === 1 ? (
              <div className="animate-fade-in">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <div style={{ position: 'relative' }}>
                    <User size={16} style={{ position: 'absolute', left: 14, top: 14, color: '#aaa' }} />
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. Segun Arinze" 
                      style={{ paddingLeft: 42 }}
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Work Email</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} style={{ position: 'absolute', left: 14, top: 14, color: '#aaa' }} />
                    <input 
                      type="email" 
                      className="form-input" 
                      placeholder="segun@company.com" 
                      style={{ paddingLeft: 42 }}
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={16} style={{ position: 'absolute', left: 14, top: 14, color: '#aaa' }} />
                    <input 
                      type="password" 
                      className="form-input" 
                      placeholder="••••••••" 
                      style={{ paddingLeft: 42 }}
                      required
                    />
                  </div>
                </div>
                <button type="submit" className="auth-btn auth-btn--primary">
                  Continue <ChevronRight size={18} />
                </button>
              </div>
            ) : (
              <div className="animate-fade-in">
                <div className="form-group">
                  <label className="form-label">Management Company Name</label>
                  <div style={{ position: 'relative' }}>
                    <Building2 size={16} style={{ position: 'absolute', left: 14, top: 14, color: '#aaa' }} />
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. Blue Lagoon Realty" 
                      style={{ paddingLeft: 42 }}
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Approximate Number of Units</label>
                  <select className="form-input" required>
                    <option value="">Select range...</option>
                    <option value="1-10">1 - 10 units</option>
                    <option value="11-50">11 - 50 units</option>
                    <option value="51-200">51 - 200 units</option>
                    <option value="201+">201+ units</option>
                  </select>
                </div>
                
                <div style={{ display: 'flex', gap: 12 }}>
                  <button type="button" className="auth-btn auth-btn--secondary" onClick={prevStep} style={{ width: '120px' }}>
                    <ArrowLeft size={18} />
                  </button>
                  <button type="submit" className="auth-btn auth-btn--primary" style={{ flex: 1 }}>
                    Finish Setup <Check size={18} />
                  </button>
                </div>
              </div>
            )}
          </form>

          <div className="auth-footer">
            Already have an account? <Link href="/login">Log in</Link>
          </div>
        </div>
      </div>


    </div>
  )
}
