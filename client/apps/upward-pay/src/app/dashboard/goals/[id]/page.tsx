import React, { Suspense } from 'react'
import { GoalsWorkspaceView } from '@/features/goals'

export function generateStaticParams() {
  return [{ id: 'placeholder' }]
}

export default async function GoalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <div className="dashboard dashboard--nav-offset">
      <Suspense fallback={null}>
        <GoalsWorkspaceView initialGoalId={id === 'placeholder' ? null : id} />
      </Suspense>
    </div>
  )
}
