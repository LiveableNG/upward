'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, CheckCircle2, ChevronLeft, Upload } from 'lucide-react'
import { PayPageShell } from '@/features/dashboard/components/payment/PayPageShell'
import {
  APPLICATION_KYC_COPY,
  MOCK_APPLICATION_KYC_SETTINGS,
  type KycCondition,
  type KycQuestion,
} from '@/features/dashboard/constants/exclusiveHomeApplicationKyc'
import { getExclusiveHomeApplicationById } from '@/features/dashboard/utils/exclusiveHomeApplications'

type FormValues = Record<string, string | string[]>
type ValidationErrors = Record<string, string>

export function ApplicationIdentityMockScreen({ applicationId }: { applicationId: string }) {
  const router = useRouter()
  const application = getExclusiveHomeApplicationById(applicationId)
  const backHref = `/dashboard/exclusive-homes/applications/${applicationId}`
  const formSchema = MOCK_APPLICATION_KYC_SETTINGS.form
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0)
  const [values, setValues] = useState<FormValues>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [uploadingQuestionId, setUploadingQuestionId] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<'saved' | 'saving'>('saved')
  const [submitting, setSubmitting] = useState(false)

  if (!application) {
    return (
      <PayPageShell
        title={APPLICATION_KYC_COPY.identityTitle}
        showBack
        onBack={() => router.push('/dashboard/exclusive-homes/applications')}
      >
        <div className="exclusive-homes__empty">
          <h3 className="exclusive-homes__empty-title">Application not found</h3>
        </div>
      </PayPageShell>
    )
  }

  useEffect(() => {
    const draftKey = `exclusive-home-kyc-draft-${applicationId}`
    const raw = window.localStorage.getItem(draftKey)
    if (!raw) return
    try {
      const parsed = JSON.parse(raw) as FormValues
      setValues(parsed)
    } catch {
      window.localStorage.removeItem(draftKey)
    }
  }, [applicationId])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      window.localStorage.setItem(`exclusive-home-kyc-draft-${applicationId}`, JSON.stringify(values))
      setSaveState('saved')
    }, 350)
    return () => window.clearTimeout(timer)
  }, [applicationId, values])

  const evaluateCondition = (condition?: KycCondition | null): boolean => {
    if (!condition || condition.questionId == null) return true
    const response = values[condition.questionId]
    switch (condition.type) {
      case 'equals':
        return response === condition.value
      case 'not_equals':
        return response !== condition.value
      case 'empty':
        return response === undefined || response === ''
      case 'not_empty':
        return response !== undefined && response !== ''
      default:
        return true
    }
  }

  const isVisible = (question: KycQuestion) => evaluateCondition(question.conditions?.visible_if)
  const isRequired = (question: KycQuestion) =>
    question.required || evaluateCondition(question.conditions?.required_if)

  const visibleQuestionIds = useMemo(
    () =>
      formSchema.sections.flatMap((section) =>
        section.questions.filter((question) => isVisible(question)).map((question) => question.id),
      ),
    [formSchema.sections, values],
  )

  const answeredCount = visibleQuestionIds.filter((id) => {
    const value = values[id]
    if (Array.isArray(value)) return value.length > 0
    return typeof value === 'string' ? value.trim().length > 0 : false
  }).length

  const progress = visibleQuestionIds.length
    ? Math.round((answeredCount / visibleQuestionIds.length) * 100)
    : 0

  const currentSection = formSchema.sections[currentSectionIndex]

  const getQuestionError = (question: KycQuestion): string | null => {
    if (!isVisible(question)) return null
    const value = values[question.id]
    if (isRequired(question)) {
      const isEmpty =
        value === undefined ||
        value === '' ||
        (Array.isArray(value) && value.length === 0)
      if (isEmpty) return 'This field is required.'
    }
    if (question.key === 'email' && typeof value === 'string' && value) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Enter a valid email address.'
    }
    if (question.key === 'phone' && typeof value === 'string' && value) {
      if (!/^\+?[\d\s-]{10,}$/.test(value)) return 'Enter a valid phone number.'
    }
    return null
  }

  const validateSection = (sectionIndex: number): boolean => {
    const section = formSchema.sections[sectionIndex]
    const nextErrors: ValidationErrors = {}
    for (const question of section.questions) {
      const message = getQuestionError(question)
      if (message) nextErrors[question.id] = message
    }
    setErrors((previous) => ({ ...previous, ...nextErrors }))
    setTouched((previous) => {
      const updates = { ...previous }
      for (const question of section.questions) updates[question.id] = true
      return updates
    })
    return Object.keys(nextErrors).length === 0
  }

  const setValue = (questionId: string, value: string | string[]) => {
    setSaveState('saving')
    setValues((previous) => ({ ...previous, [questionId]: value }))
    if (touched[questionId]) {
      setErrors((previous) => ({ ...previous, [questionId]: '' }))
    }
  }

  const findNextSection = (): number | 'submit' => {
    for (const question of currentSection.questions) {
      if (!question.sectionNavigation?.enabled) continue
      const response = values[question.id]
      const rule = question.sectionNavigation.rules.find((item) => item.value === response)
      if (!rule) continue
      if (rule.goToSection === 'submit') return 'submit'
      const index = formSchema.sections.findIndex((section) => section.id === rule.goToSection)
      if (index >= 0) return index
    }
    if (currentSection.nextSection === 'submit') return 'submit'
    if (currentSection.nextSection) {
      const index = formSchema.sections.findIndex((section) => section.id === currentSection.nextSection)
      if (index >= 0) return index
    }
    if (currentSectionIndex >= formSchema.sections.length - 1) return 'submit'
    return currentSectionIndex + 1
  }

  const submit = () => {
    setSubmitting(true)
    window.localStorage.removeItem(`exclusive-home-kyc-draft-${applicationId}`)
    window.setTimeout(() => {
      router.push(`/dashboard/exclusive-homes/applications/${applicationId}/profile`)
    }, 250)
  }

  const continueFlow = () => {
    if (!validateSection(currentSectionIndex)) return
    const next = findNextSection()
    if (next === 'submit') {
      submit()
      return
    }
    setCurrentSectionIndex(next)
  }

  const goBack = () => {
    setCurrentSectionIndex((previous) => Math.max(previous - 1, 0))
  }

  const renderInput = (question: KycQuestion) => {
    if (!isVisible(question)) return null
    const value = values[question.id]
    const message = touched[question.id] ? errors[question.id] : ''

    return (
      <div key={question.id} className="app-kyc__question-card">
        <label className="app-kyc__question-label">
          {question.title}
          {isRequired(question) ? <span className="app-kyc__required">*</span> : null}
        </label>
        {question.description ? <p className="app-kyc__question-help">{question.description}</p> : null}

        {question.type === 'short' ? (
          <input
            className="app-kyc__field"
            type={question.key === 'email' ? 'email' : 'text'}
            value={typeof value === 'string' ? value : ''}
            placeholder={question.placeholder ?? ''}
            onBlur={() => setTouched((previous) => ({ ...previous, [question.id]: true }))}
            onChange={(event) => setValue(question.id, event.target.value)}
            disabled={question.disabled}
            readOnly={question.readonly}
          />
        ) : null}

        {question.type === 'long' ? (
          <textarea
            className="app-kyc__field app-kyc__field--area"
            value={typeof value === 'string' ? value : ''}
            placeholder={question.placeholder ?? ''}
            onBlur={() => setTouched((previous) => ({ ...previous, [question.id]: true }))}
            onChange={(event) => setValue(question.id, event.target.value)}
            disabled={question.disabled}
            readOnly={question.readonly}
          />
        ) : null}

        {question.type === 'radio' ? (
          <div className="app-kyc__chips">
            {question.options.map((option) => (
              <button
                key={option}
                type="button"
                className={`app-kyc__chip${value === option ? ' app-kyc__chip--active' : ''}`}
                onClick={() => setValue(question.id, option)}
              >
                {option}
              </button>
            ))}
          </div>
        ) : null}

        {question.type === 'dropdown' ? (
          <select
            className="app-kyc__field"
            value={typeof value === 'string' ? value : ''}
            onBlur={() => setTouched((previous) => ({ ...previous, [question.id]: true }))}
            onChange={(event) => setValue(question.id, event.target.value)}
          >
            <option value="">Select an option</option>
            {question.options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        ) : null}

        {question.type === 'file' ? (
          <div className="app-kyc__upload">
            <label htmlFor={question.id} className="app-kyc__upload-label">
              <Upload size={16} aria-hidden />
              <span>{value ? 'Replace uploaded file' : 'Upload file'}</span>
            </label>
            <input
              id={question.id}
              type="file"
              className="app-kyc__upload-input"
              accept={question.accept}
              onChange={(event) => {
                const selected = event.target.files?.[0]
                if (!selected) return
                setUploadingQuestionId(question.id)
                window.setTimeout(() => {
                  setValue(question.id, selected.name)
                  setUploadingQuestionId(null)
                }, 500)
              }}
            />
            <p className="app-kyc__upload-note">
              {uploadingQuestionId === question.id
                ? 'Uploading...'
                : typeof value === 'string' && value
                  ? `Uploaded: ${value}`
                  : 'No file selected'}
            </p>
          </div>
        ) : null}

        {message ? <p className="app-kyc__question-error">{message}</p> : null}
      </div>
    )
  }

  return (
    <PayPageShell
      title={APPLICATION_KYC_COPY.identityTitle}
      subtitle={APPLICATION_KYC_COPY.identitySubtitle}
      showBack
      onBack={() => router.push(backHref)}
      footer={
        <div className="exclusive-homes__detail-actions">
          <button
            type="button"
            className="exclusive-homes__primary-btn"
            onClick={continueFlow}
            disabled={submitting}
          >
            {findNextSection() === 'submit' ? 'Submit KYC' : 'Continue'}
            <ArrowRight size={16} aria-hidden />
          </button>
          {currentSectionIndex > 0 ? (
            <button
              type="button"
              className="exclusive-homes__secondary-btn exclusive-homes__secondary-btn--full"
              onClick={goBack}
            >
              <ChevronLeft size={16} aria-hidden />
              Previous section
            </button>
          ) : (
            <button
              type="button"
              className="exclusive-homes__secondary-btn exclusive-homes__secondary-btn--full"
              onClick={() => router.push(backHref)}
            >
              Back to application
            </button>
          )}
        </div>
      }
    >
      <div className="app-kyc">
        <div className="app-kyc__meta">
          <p className="app-kyc__meta-title">{formSchema.title}</p>
          <p className="app-kyc__meta-desc">{formSchema.description}</p>
          <div className="app-kyc__meta-row">
            <span>{currentSectionIndex + 1} / {formSchema.sections.length} sections</span>
            <span>{progress}% complete</span>
            <span>{saveState === 'saving' ? 'Saving...' : 'Saved'}</span>
          </div>
          <div className="app-kyc__progress-track">
            <span className="app-kyc__progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="app-kyc__section-head">
          <h3>{currentSection.title}</h3>
          {currentSection.description ? <p>{currentSection.description}</p> : null}
        </div>

        <div className="app-kyc__questions">{currentSection.questions.map(renderInput)}</div>

        <div className="app-kyc__checks">
          <div className="app-kyc__check-row">
            <span className="app-kyc__check-icon app-kyc__check-icon--done">
              <CheckCircle2 size={13} />
            </span>
            <span>Form schema loaded from `kyc_settings.form`</span>
          </div>
          <div className="app-kyc__check-row">
            <span className="app-kyc__check-icon">{currentSectionIndex + 1}</span>
            <span>Adaptive section navigation enabled</span>
          </div>
        </div>

        <p className="app-kyc__note">{APPLICATION_KYC_COPY.identityMockNote}</p>
      </div>
    </PayPageShell>
  )
}
