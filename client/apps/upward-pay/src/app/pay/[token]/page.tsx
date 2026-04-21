import PayClient from './PayClient'

export function generateStaticParams() {
  return [{ token: 'placeholder' }]
}

export default function UnifiedPayPage() {
  return <PayClient />
}