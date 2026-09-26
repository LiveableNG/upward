import { redirect } from 'next/navigation'

interface Props {
  params: Promise<{ token: string }>
}

export default async function DashboardPayFallbackPage({ params }: Props) {
  const { token } = await params
  redirect(`/pay/${token}`)
}
