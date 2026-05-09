import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Tenants Directory',
  description: 'Manage your tenants and their lease agreements.',
}

export default function TenantsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
