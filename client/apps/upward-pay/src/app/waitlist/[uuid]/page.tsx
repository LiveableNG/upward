import WaitlistClient from './WaitlistClient'

export function generateStaticParams() {
  return [{ uuid: 'placeholder' }]
}

export default function WaitlistPage() {
  return <WaitlistClient />
}
