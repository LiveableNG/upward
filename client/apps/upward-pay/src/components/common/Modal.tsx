'use client'

import React from 'react'
import { BottomSheetModal } from './BottomSheetModal'

export { BottomSheetModal } from './BottomSheetModal'
export type { BottomSheetModalProps } from './BottomSheetModal'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showClose?: boolean
  className?: string
  title?: React.ReactNode
  subtitle?: React.ReactNode
}

export function Modal({
  isOpen,
  onClose,
  children,
  size = 'md',
  showClose = true,
  className = '',
  title,
  subtitle,
}: ModalProps) {
  return (
    <BottomSheetModal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth={size}
      showClose={showClose}
      title={title}
      subtitle={subtitle}
      bodyClassName={className}
    >
      {children}
    </BottomSheetModal>
  )
}
