import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Create Account',
  description: 'Join Upward and start managing your properties effectively.',
}

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
