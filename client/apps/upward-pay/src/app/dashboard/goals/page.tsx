'use client'

import React, { Suspense } from 'react'
import { GoalsWorkspaceView } from '@/features/goals'

export default function DashboardGoalsPage() {
  return (
    <div className="dashboard dashboard--nav-offset">
      <Suspense fallback={null}>
        <GoalsWorkspaceView />
      </Suspense>
    </div>
  )
}
