import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Properties & Units',
  description: 'Manage your real estate portfolio, properties, and individual units.',
}

export default function PropertiesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
