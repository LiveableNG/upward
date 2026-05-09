import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Log In',
  description: 'Log in to your Upward Property Manager account.',
}

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
