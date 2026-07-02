import type { ApplicationTimelineStep } from '@/features/dashboard/constants/exclusiveHomeApplications'

export function ApplicationTimeline({ steps }: { steps: ApplicationTimelineStep[] }) {
  return (
    <ol className="home-app__timeline" aria-label="Application progress">
      {steps.map((step) => (
        <li
          key={step.label}
          className={`home-app__timeline-step home-app__timeline-step--${step.state}`}
        >
          <span className="home-app__timeline-dot" aria-hidden />
          <span className="home-app__timeline-label">{step.label}</span>
        </li>
      ))}
    </ol>
  )
}
