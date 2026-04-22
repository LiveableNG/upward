import { UpwardLogo } from './PoweredByUpward'

interface FallbackSuspenseProps {
  message?: string
}

export default function FallbackSuspense({ message }: FallbackSuspenseProps) {
  return (
    <div className="pay-page__splash-container">
      <div className="pay-page__splash">
        <div className="pay-page__logo-pulse">
          <UpwardLogo size={52} color="var(--clay)" />
        </div>
      </div>
    </div>
  )
}
