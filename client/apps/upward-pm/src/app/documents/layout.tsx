import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Document Center',
  description: 'Create, send, and manage digital documents and agreements.',
}

export default function DocumentsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
