'use client'

import { useRouter } from 'next/navigation'
import { Check, ChevronRight } from 'lucide-react'
import type { ApplicationChecklistStep } from '@/features/dashboard/constants/exclusiveHomeApplications'
import { getChecklistIcon } from '@/features/dashboard/utils/exclusiveHomeApplications'

type ApplicationChecklistProps = {
  steps: ApplicationChecklistStep[]
  onViewingConfirm?: () => void
}

export function ApplicationChecklist({ steps, onViewingConfirm }: ApplicationChecklistProps) {
  const router = useRouter()

  const handleStep = (step: ApplicationChecklistStep) => {
    if (step.id === 'viewing_confirm' && onViewingConfirm) {
      onViewingConfirm()
      return
    }
    if (step.href.startsWith('/')) {
      router.push(step.href)
    }
  }

  return (
    <div className="home-app__checklist">
      {steps.map((step, index) => {
        const Icon = getChecklistIcon(step.id)
        const isLast = index === steps.length - 1

        return (
          <button
            key={step.id}
            type="button"
            className={`home-app__checklist-item${
              step.completed ? ' home-app__checklist-item--done' : ''
            }${isLast ? ' home-app__checklist-item--last' : ''}`}
            onClick={() => handleStep(step)}
          >
            <span
              className={`home-app__checklist-icon${
                step.completed ? ' home-app__checklist-icon--done' : ''
              }`}
              aria-hidden
            >
              {step.completed ? <Check size={14} strokeWidth={3} /> : <Icon size={16} />}
            </span>
            <span className="home-app__checklist-copy">
              <span className="home-app__checklist-title">{step.title}</span>
              <span className="home-app__checklist-desc">{step.description}</span>
            </span>
            <ChevronRight size={16} className="home-app__checklist-chevron" aria-hidden />
          </button>
        )
      })}
    </div>
  )
}
