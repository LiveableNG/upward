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
        {message && (
          <p
            style={{
              marginTop: '16px',
              color: 'var(--text-muted, #71717a)',
              fontSize: '14px',
              fontWeight: 500,
              textAlign: 'center',
              letterSpacing: '-0.01em',
            }}
          >
            {message}
          </p>
        )}
      </div>
    </div>
  )
}
