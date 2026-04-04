import { UpwardLogo } from './PoweredByUpward'

interface FallbackSuspenseProps {
  message?: string
}

export default function FallbackSuspense({ message = 'Loading...' }: FallbackSuspenseProps) {
  return (
    <div className="dashboard">
      <div className="pay-page__splash">
        <div className="pay-page__logo-pulse">
          <UpwardLogo size={28} color="#fff" />
        </div>
        <p className="pay-page__splash-text">{message}</p>
      </div>
    </div>
  )
}
