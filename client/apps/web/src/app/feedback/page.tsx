'use client'
import { useState, Suspense } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { useToast } from '@/components/common/Toast'
import { MessageSquare, AlertCircle, Sparkles, Send, CheckCircle2, HelpCircle } from 'lucide-react'

const feedbackSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional().or(z.literal('')),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  type: z.enum(['BUG', 'SUGGESTION', 'DIFFICULTY', 'OTHER'], {
    message: 'Please select a feedback type',
  }),
  message: z.string().min(10, 'Message must be at least 10 characters'),
})

type FeedbackFormData = z.infer<typeof feedbackSchema>

function FeedbackContent() {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const toast = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      type: 'SUGGESTION',
    },
  })

  const selectedType = watch('type')

  const onSubmit = async (data: FeedbackFormData) => {
    setStatus('submitting')
    setErrorMessage('')

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'
      const response = await fetch(`${apiUrl}/public/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.message || 'Failed to submit feedback')
      }

      toast.success('Your feedback has been received. Thank you for helping us build Upward!')
      setStatus('success')
      reset()
    } catch (err) {
      console.error('Feedback submission error:', err)
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      setErrorMessage(msg)
      toast.error(msg)
      setStatus('error')
    }
  }

  const feedbackTypes = [
    { id: 'BUG', label: 'Report a Bug', icon: AlertCircle, description: 'Something isn\'t working correctly' },
    { id: 'SUGGESTION', label: 'Suggestion', icon: Sparkles, description: 'Idea to make Upward better' },
    { id: 'DIFFICULTY', label: 'Difficulty', icon: HelpCircle, description: 'Struggling with a specific feature' },
    { id: 'OTHER', label: 'Other', icon: MessageSquare, description: 'Anything else on your mind' },
  ]

  if (status === 'success') {
    return (
      <div className="feedback-success">
        <div className="feedback-success__icon">
          <CheckCircle2 size={48} />
        </div>
        <h1 className="feedback-success__title">Thank You!</h1>
        <p className="feedback-success__text">
          Your feedback has been received. Our team of builders will review it and use it to make Upward even better.
        </p>
        <button onClick={() => setStatus('idle')} className="feedback-success__btn">
          Submit More Feedback
        </button>
      </div>
    )
  }

  return (
    <div className="feedback-container">
      <div className="feedback-card">
        <div className="section-label">Beta Feedback</div>
        <h1 className="feedback-card__title">Help Us Build the Future</h1>
        <p className="feedback-card__description">
          We&apos;re constantly evolving. Whether it&apos;s a bug you found or an idea you have, 
          your input is invaluable to our closed testing community.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="feedback-form">
          <div className="feedback-form__grid">
            <div className="feedback-form__group">
              <label className="feedback-form__label">Full Name (Optional)</label>
              <input
                {...register('name')}
                placeholder="John Doe"
                className="feedback-form__input"
              />
              {errors.name && <span className="feedback-form__error">{errors.name.message}</span>}
            </div>

            <div className="feedback-form__group">
              <label className="feedback-form__label">Email (Optional)</label>
              <input
                {...register('email')}
                placeholder="john@example.com"
                className="feedback-form__input"
              />
              {errors.email && <span className="feedback-form__error">{errors.email.message}</span>}
            </div>
          </div>

          <div className="feedback-form__group">
            <label className="feedback-form__label">Feedback Type</label>
            <div className="feedback-type-grid">
              {feedbackTypes.map((t) => (
                <label 
                  key={t.id} 
                  className={`feedback-type-item ${selectedType === t.id ? 'feedback-type-item--active' : ''}`}
                >
                  <input
                    type="radio"
                    value={t.id}
                    {...register('type')}
                    className="feedback-type-item__radio"
                  />
                  <div className="feedback-type-item__content">
                    <t.icon size={20} className="feedback-type-item__icon" />
                    <div className="feedback-type-item__text">
                      <span className="feedback-type-item__label">{t.label}</span>
                      <span className="feedback-type-item__desc">{t.description}</span>
                    </div>
                  </div>
                </label>
              ))}
            </div>
            {errors.type && <span className="feedback-form__error">{errors.type.message}</span>}
          </div>

          <div className="feedback-form__group">
            <label className="feedback-form__label">Your Message</label>
            <textarea
              {...register('message')}
              placeholder="Tell us what's on your mind..."
              className="feedback-form__textarea"
              rows={5}
            />
            {errors.message && <span className="feedback-form__error">{errors.message.message}</span>}
          </div>

          {status === 'error' && (
            <div className="feedback-form__alert-error">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={status === 'submitting'}
            className="feedback-form__submit"
          >
            {status === 'submitting' ? (
              <div className="spinner" />
            ) : (
              <>
                Send Feedback <Send size={18} />
              </>
            )}
          </button>
        </form>
      </div>

      <style jsx>{`
        .feedback-container {
          min-height: 80vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 80px 20px;
          position: relative;
          z-index: 1;
        }

        .feedback-card {
          max-width: 720px;
          width: 100%;
          padding: 48px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 32px;
          box-shadow: 0 40px 80px rgba(0,0,0,0.15);
          animation: fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .feedback-card__title {
          font-family: var(--font-head);
          font-weight: 800;
          font-size: 2.5rem;
          margin: 16px 0 12px;
          background: var(--heading-mix);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          letter-spacing: -0.03em;
          line-height: 1.1;
        }

        .feedback-card__description {
          color: var(--muted);
          font-size: 1.05rem;
          line-height: 1.6;
          margin-bottom: 40px;
        }

        .feedback-form__grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 24px;
        }

        @media (max-width: 600px) {
          .feedback-form__grid {
            grid-template-columns: 1fr;
          }
          .feedback-card {
            padding: 32px 24px;
          }
          .feedback-card__title {
            font-size: 2rem;
          }
        }

        .feedback-form__group {
          margin-bottom: 24px;
          display: flex;
          flex-direction: column;
        }

        .feedback-form__label {
          font-size: 11px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--muted);
          margin-bottom: 8px;
          font-weight: 600;
        }

        .feedback-form__input,
        .feedback-form__textarea {
          width: 100%;
          background: var(--surface2);
          border: 1px solid var(--border);
          color: var(--text);
          font-family: var(--font-body);
          font-size: 15px;
          padding: 14px 18px;
          border-radius: 12px;
          outline: none;
          transition: all 0.2s;
        }

        .feedback-form__input:focus,
        .feedback-form__textarea:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 4px var(--accent-faint);
          background: var(--bg);
        }

        .feedback-type-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        @media (max-width: 500px) {
          .feedback-type-grid {
            grid-template-columns: 1fr;
          }
        }

        .feedback-type-item {
          position: relative;
          cursor: pointer;
        }

        .feedback-type-item__radio {
          position: absolute;
          opacity: 0;
        }

        .feedback-type-item__content {
          padding: 16px;
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: 12px;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          transition: all 0.2s;
        }

        .feedback-type-item:hover .feedback-type-item__content {
          border-color: var(--accent-muted);
          transform: translateY(-2px);
        }

        .feedback-type-item--active .feedback-type-item__content {
          border-color: var(--accent);
          background: var(--accent-faint);
          box-shadow: 0 4px 12px var(--accent-faint);
        }

        .feedback-type-item__icon {
          color: var(--muted);
          transition: color 0.2s;
          margin-top: 2px;
        }

        .feedback-type-item--active .feedback-type-item__icon {
          color: var(--accent);
        }

        .feedback-type-item__text {
          display: flex;
          flex-direction: column;
        }

        .feedback-type-item__label {
          font-weight: 700;
          font-size: 14px;
          color: var(--text);
          margin-bottom: 2px;
        }

        .feedback-type-item__desc {
          font-size: 11px;
          color: var(--muted);
          line-height: 1.3;
        }

        .feedback-form__error {
          font-size: 12px;
          color: var(--error);
          margin-top: 6px;
        }

        .feedback-form__alert-error {
          padding: 12px 16px;
          background: rgba(239, 68, 68, 0.1);
          color: var(--error);
          border-radius: 12px;
          font-size: 13px;
          margin-bottom: 24px;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }

        .feedback-form__submit {
          width: 100%;
          background: var(--accent);
          color: #fff;
          font-family: var(--font-head);
          font-weight: 800;
          font-size: 16px;
          padding: 18px;
          border-radius: 14px;
          border: none;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          box-shadow: 0 10px 20px var(--accent-faint);
          margin-top: 12px;
        }

        .feedback-form__submit:hover:not(:disabled) {
          transform: translateY(-3px);
          box-shadow: 0 15px 30px var(--accent-muted);
          background: #e47d5c;
        }

        .feedback-form__submit:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .feedback-success {
          text-align: center;
          padding: 60px 20px;
          animation: fadeIn 0.5s ease;
        }

        .feedback-success__icon {
          width: 96px;
          height: 96px;
          background: var(--accent-faint);
          color: var(--accent);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 32px;
          box-shadow: 0 20px 40px var(--accent-faint);
        }

        .feedback-success__title {
          font-family: var(--font-head);
          font-weight: 800;
          font-size: 2.8rem;
          margin-bottom: 16px;
          background: var(--heading-mix);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .feedback-success__text {
          color: var(--muted);
          max-width: 480px;
          margin: 0 auto 40px;
          font-size: 1.1rem;
          line-height: 1.6;
        }

        .feedback-success__btn {
          background: var(--surface2);
          color: var(--text);
          padding: 14px 28px;
          border-radius: 12px;
          font-weight: 700;
          border: 1px solid var(--border);
          cursor: pointer;
          transition: all 0.2s;
        }

        .feedback-success__btn:hover {
          background: var(--surface);
          border-color: var(--accent);
          color: var(--accent);
        }

        .spinner {
          width: 20px;
          height: 20px;
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  )
}

export default function FeedbackPage() {
  return (
    <>
      {/* Background Glows */}
      <div
        style={{
          position: 'fixed',
          borderRadius: '50%',
          filter: 'blur(160px)',
          pointerEvents: 'none',
          zIndex: 0,
          width: '800px',
          height: '800px',
          background: 'radial-gradient(circle, var(--glow-1) 0%, transparent 70%)',
          top: '-300px',
          right: '-200px',
        }}
      />
      <div
        style={{
          position: 'fixed',
          borderRadius: '50%',
          filter: 'blur(140px)',
          pointerEvents: 'none',
          zIndex: 0,
          width: '700px',
          height: '700px',
          background: 'radial-gradient(circle, var(--glow-2) 0%, transparent 70%)',
          bottom: '-100px',
          left: '-200px',
        }}
      />

      <Suspense fallback={null}>
        <Header
          onSetView={(view) => (window.location.href = `/?view=${view}`)}
          currentView="home"
          onOpenSignup={() => (window.location.href = '/?signup=true')}
          trackInteraction={() => {}}
        />
        <main style={{ position: 'relative', zIndex: 1 }}>
          <FeedbackContent />
        </main>
        <Footer
          onSetView={() => {}}
        />
      </Suspense>
    </>
  )
}
