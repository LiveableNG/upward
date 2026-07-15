'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, X } from 'lucide-react'
import type { DashboardFeatureSectionView } from '../hooks/useDashboardFeatureSections'

interface FeaturesBottomSheetProps {
  isOpen: boolean
  onClose: () => void
  sections: DashboardFeatureSectionView[]
}

export function FeaturesBottomSheet({ isOpen, onClose, sections }: FeaturesBottomSheetProps) {
  const router = useRouter()

  useEffect(() => {
    if (!isOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSelect = (href?: string) => {
    if (!href) return
    onClose()
    router.push(href)
  }

  return (
    <div className="features-sheet__overlay" onClick={onClose} role="presentation">
      <div
        className="features-sheet"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="features-sheet-title"
      >
        <div className="features-sheet__handle" aria-hidden />

        <div className="features-sheet__header">
          <div>
            <p className="features-sheet__eyebrow">Explore</p>
            <h2 id="features-sheet-title" className="features-sheet__title">
              Features
            </h2>
            <p className="features-sheet__subtitle">
              Insurance, benefits, documents, and tools for your tenancy.
            </p>
          </div>
          <button
            type="button"
            className="features-sheet__close"
            onClick={onClose}
            aria-label="Close features menu"
          >
            <X size={18} />
          </button>
        </div>

        <div className="features-sheet__content">
          {sections.map((section) => (
            <section key={section.id} className="features-sheet__section">
              <p className="features-sheet__section-label">{section.label}</p>
              <div className="features-sheet__list">
                {section.items.map((item) => {
                  const Icon = item.icon
                  const isDisabled = !item.href

                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`features-sheet__item${isDisabled ? ' features-sheet__item--disabled' : ''}`}
                      onClick={() => handleSelect(item.href)}
                      disabled={isDisabled}
                    >
                      <span
                        className={`features-sheet__item-icon features-sheet__item-icon--${item.tone}`}
                      >
                        <Icon size={18} />
                      </span>
                      <span className="features-sheet__item-body">
                        <span className="features-sheet__item-head">
                          <span className="features-sheet__item-title">{item.title}</span>
                          {item.comingSoon ? (
                            <span className="features-sheet__item-soon">Soon</span>
                          ) : item.badge ? (
                            <span className="features-sheet__item-badge">{item.badge}</span>
                          ) : null}
                        </span>
                        <span className="features-sheet__item-desc">{item.description}</span>
                      </span>
                      {!isDisabled ? <ChevronRight size={16} className="features-sheet__item-chevron" /> : null}
                    </button>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
