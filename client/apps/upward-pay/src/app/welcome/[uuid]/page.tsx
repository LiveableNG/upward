import WelcomeClient from './WelcomeClient'

export function generateStaticParams() {
  return [{ uuid: 'placeholder' }]
}

export default function WelcomePage() {
  return <WelcomeClient />
}
