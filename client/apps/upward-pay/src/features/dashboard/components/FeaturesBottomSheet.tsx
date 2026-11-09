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

    const scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0
    const originalHtmlOverflow = document.documentElement.style.overflow
    const originalBodyOverflow = document.body.style.overflow
    const originalBodyPosition = document.body.style.position
    const originalBodyTop = document.body.style.top
    const originalBodyWidth = document.body.style.width

    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.left = '0'
    document.body.style.right = '0'
    document.body.style.width = '100%'

    return () => {
      document.documentElement.style.overflow = originalHtmlOverflow
      document.body.style.overflow = originalBodyOverflow
      document.body.style.position = originalBodyPosition
      document.body.style.top = originalBodyTop
      document.body.style.left = ''
      document.body.style.right = ''
      document.body.style.width = originalBodyWidth

      window.scrollTo(0, scrollY)
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
