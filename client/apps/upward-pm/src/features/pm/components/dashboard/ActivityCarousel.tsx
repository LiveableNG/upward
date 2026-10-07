'use client'

import React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useActivityTasks } from '@/features/pm/hooks/useActivityTasks'
import { ArrowRight } from 'lucide-react'

export function ActivityCarousel() {
  const { tasks: carouselItems, isLoading } = useActivityTasks()

  if (carouselItems.length === 0 || isLoading) return null

  return (
    <section className="action-center-compact" aria-label="Action Center">
      <div className="action-center-compact__header">
        <div className="action-center-compact__title-wrap">
          <h2 className="action-center-compact__title">Action Center</h2>
          <span className="action-center-compact__count-pill">
            {carouselItems.length}
          </span>
        </div>
        <Link href="/notifications" className="action-center-compact__all-link">
          <span>View all tasks</span>
          <ArrowRight size={13} />
        </Link>
      </div>

      <div className={cn(
        "action-center-compact__grid",
        carouselItems.length === 1 && "action-center-compact__grid--single"
      )}>
        {carouselItems.map(item => {
          const isHighPriority = item.priority === 'HIGH PRIORITY' || item.color === 'warning'
          const badgeText = item.badgeText || (item.count ? `${item.count} pending` : item.actionLabel)

          return (
            <Link
              key={item.id}
              href={item.link}
              className={cn(
                "action-chip",
                isHighPriority ? "action-chip--high" : "action-chip--normal"
              )}
            >
              <div className="action-chip__left">
                <span
                  className={cn(
                    "action-chip__dot",
                    isHighPriority ? "action-chip__dot--high" : "action-chip__dot--normal"
                  )}
                  aria-hidden="true"
                />
                <span className="action-chip__title">{item.title}</span>
              </div>

              <div className="action-chip__right">
                <span className={cn(
                  "action-chip__badge",
                  isHighPriority ? "action-chip__badge--high" : "action-chip__badge--normal"
                )}>
                  {badgeText}
                </span>
                <ArrowRight size={13} className="action-chip__arrow" />
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
