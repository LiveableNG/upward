'use client'

import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'

export function PayRentMockFrame({
  subtitle,
  children,
}: {
  subtitle?: string
  children: ReactNode
}) {
  return (
    <div className="pay-rent-mock__frame">
      <div className="pay-flow">
        <div className="pay-flow__shell">
          <header className="pay-flow__header">
            <div className="pay-flow__header-row pay-flow__header-row--centered">
              <button type="button" className="pay-flow__back" aria-label="Go back">
                <ArrowLeft size={15} />
              </button>
              <h1 className="pay-flow__title">Pay Rent</h1>
              <span className="pay-flow__back-spacer" aria-hidden />
            </div>
          </header>
          <div className="pay-flow__scroll">
            <div className="pay-flow__inner">
              {subtitle ? <p className="pay-flow__intro">{subtitle}</p> : null}
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function MockCase({
  id,
  title,
  conditions,
  today,
  children,
}: {
  id: string
  title: string
  conditions: string[]
  today?: string
  children: ReactNode
}) {
  return (
    <section className="pay-rent-mock__case" id={id}>
      <p className="pay-rent-mock__case-label">Case</p>
      <h2 className="pay-rent-mock__case-title">{title}</h2>
      <div className="pay-rent-mock__conditions">
        <p className="pay-rent-mock__conditions-title">Conditions</p>
        <ul className="pay-rent-mock__conditions-list">
          {conditions.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        {today ? (
          <p className="pay-rent-mock__conditions-today">
            <strong>Today:</strong> {today}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  )
}
