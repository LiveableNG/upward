import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Financials & Payments',
  description: 'Track rent collections and financial performance.',
}

export default function PaymentsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
