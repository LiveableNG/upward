import { redirect } from 'next/navigation'

export default function DashboardGoalsPage() {
  redirect('/dashboard/lifestyle?goals=open')
}
