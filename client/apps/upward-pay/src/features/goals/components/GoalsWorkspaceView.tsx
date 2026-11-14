'use client'

import React from 'react'
import { UpwardGoalsInteractiveView } from './UpwardGoalsInteractiveView'

export function GoalsWorkspaceView() {
  return (
    <div className="goals-workspace">
      <UpwardGoalsInteractiveView mode="workspace" />
    </div>
  )
}
