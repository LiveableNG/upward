import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Landlord Registration - Upward',
  description: 'Register your landlord account to monitor your property portfolio.',
}

export default function LandlordSignupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
