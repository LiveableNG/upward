'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from 'lucide-react'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import '../styles/lightbox.css'

interface ProductImageLightboxProps {
  isOpen: boolean
  images: string[]
  activeIndex: number
  title: string
  onSelectIndex: (index: number) => void
  onClose: () => void
}

const MIN_SCALE = 1
const MAX_SCALE = 4
const DOUBLE_TAP_SCALE = 2.4

function clamp(val: number, min: number, max: number) {
  return Math.min(max, Math.max(min, val))
}

export const ProductImageLightbox: React.FC<ProductImageLightboxProps> = ({
  isOpen,
  images,
  activeIndex,
  title,
  onSelectIndex,
  onClose,
}) => {
  const [mounted, setMounted] = useState(false)
  const [scale, setScale] = useState(1)
  const [tx, setTx] = useState(0)
  const [ty, setTy] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [dismissOffsetY, setDismissOffsetY] = useState(0)

  const stageRef = useRef<HTMLDivElement>(null)
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map())
  const pinchStartDistRef = useRef<number | null>(null)
  const pinchStartScaleRef = useRef<number>(1)
  const dragStartRef = useRef<{
    x: number
    y: number
    tx: number
    ty: number
    mode: 'pan' | 'swipe'
  } | null>(null)
  const lastTapRef = useRef<{ time: number; x: number; y: number }>({
    time: 0,
    x: 0,
    y: 0,
  })

  useBodyScrollLock(isOpen)

  useEffect(() => {
    setMounted(true)
  }, [])

  const resetTransform = useCallback(() => {
    setScale(1)
    setTx(0)
    setTy(0)
    setDismissOffsetY(0)
    setIsDragging(false)
  }, [])

  // Reset zoom/pan whenever closed or image changes
  useEffect(() => {
    resetTransform()
  }, [isOpen, activeIndex, resetTransform])

  const clampTranslation = useCallback(
    (nextTx: number, nextTy: number, nextScale: number) => {
      if (nextScale <= 1) return { x: 0, y: 0 }
      const stage = stageRef.current
      if (!stage) return { x: nextTx, y: nextTy }
      const rect = stage.getBoundingClientRect()
      const maxX = ((nextScale - 1) * rect.width) / 2
      const maxY = ((nextScale - 1) * rect.height) / 2
      return {
        x: clamp(nextTx, -maxX, maxX),
        y: clamp(nextTy, -maxY, maxY),
      }
    },
    [],
  )

  const zoomToPoint = useCallback(
    (nextScaleRaw: number, clientX?: number, clientY?: number) => {
      const nextScale = clamp(nextScaleRaw, MIN_SCALE, MAX_SCALE)
      if (nextScale <= 1.02) {
        setScale(1)
        setTx(0)
        setTy(0)
        return
      }
      const stage = stageRef.current
      if (stage && clientX !== undefined && clientY !== undefined) {
        const rect = stage.getBoundingClientRect()
        const cx = rect.left + rect.width / 2
        const cy = rect.top + rect.height / 2
        const dx = clientX - cx
        const dy = clientY - cy
        const factor = nextScale / scale
        const rawTx = tx * factor - dx * (factor - 1)
        const rawTy = ty * factor - dy * (factor - 1)
        const clamped = clampTranslation(rawTx, rawTy, nextScale)
        setScale(nextScale)
        setTx(clamped.x)
        setTy(clamped.y)
      } else {
        const clamped = clampTranslation(tx, ty, nextScale)
        setScale(nextScale)
        setTx(clamped.x)
        setTy(clamped.y)
      }
    },
    [scale, tx, ty, clampTranslation],
  )

  // Keyboard navigation & zoom shortcuts
  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowLeft' && images.length > 1) {
        onSelectIndex(activeIndex === 0 ? images.length - 1 : activeIndex - 1)
      } else if (e.key === 'ArrowRight' && images.length > 1) {
        onSelectIndex(activeIndex === images.length - 1 ? 0 : activeIndex + 1)
      } else if (e.key === '+' || e.key === '=') {
        zoomToPoint(scale + 0.6)
      } else if (e.key === '-') {
        zoomToPoint(scale - 0.6)
      } else if (e.key === '0') {
        resetTransform()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, images.length, activeIndex, scale, onClose, onSelectIndex, zoomToPoint, resetTransform])

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // ignore if capture not supported
    }

    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (pointersRef.current.size === 2) {
      const pts = Array.from(pointersRef.current.values())
      pinchStartDistRef.current = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y)
      pinchStartScaleRef.current = scale
      dragStartRef.current = null
      setIsDragging(true)
      return
    }

    // Detect double-tap / double-click
    const now = Date.now()
    const dist = Math.hypot(
      e.clientX - lastTapRef.current.x,
      e.clientY - lastTapRef.current.y,
    )
    if (now - lastTapRef.current.time < 280 && dist < 36) {
      lastTapRef.current = { time: 0, x: 0, y: 0 }
      if (scale > 1.1) {
        resetTransform()
      } else {
        zoomToPoint(DOUBLE_TAP_SCALE, e.clientX, e.clientY)
      }
      return
    }
    lastTapRef.current = { time: now, x: e.clientX, y: e.clientY }

    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      tx,
      ty,
      mode: scale > 1.02 ? 'pan' : 'swipe',
    }
    setIsDragging(true)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(e.pointerId)) return
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    // Two-finger pinch zoom
    if (pointersRef.current.size === 2 && pinchStartDistRef.current) {
      const pts = Array.from(pointersRef.current.values())
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y)
      const ratio = dist / pinchStartDistRef.current
      const nextScale = clamp(pinchStartScaleRef.current * ratio, MIN_SCALE, MAX_SCALE)
      const clamped = clampTranslation(tx, ty, nextScale)
      setScale(nextScale)
      setTx(clamped.x)
      setTy(clamped.y)
      return
    }

    const drag = dragStartRef.current
    if (!drag) return
    const dx = e.clientX - drag.x
    const dy = e.clientY - drag.y

    if (drag.mode === 'pan') {
      const clamped = clampTranslation(drag.tx + dx, drag.ty + dy, scale)
      setTx(clamped.x)
      setTy(clamped.y)
    } else {
      // At 1x: allow vertical swipe-down to dismiss
      if (dy > 0 && Math.abs(dy) > Math.abs(dx)) {
        setDismissOffsetY(dy)
      }
    }
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(e.pointerId)
    if (pointersRef.current.size < 2) {
      pinchStartDistRef.current = null
    }

    const drag = dragStartRef.current
    if (drag && pointersRef.current.size === 0) {
      const dx = e.clientX - drag.x
      const dy = e.clientY - drag.y

      if (drag.mode === 'swipe') {
        if (dy > 110 && Math.abs(dy) > Math.abs(dx)) {
          dragStartRef.current = null
          setIsDragging(false)
          onClose()
          return
        }
        if (images.length > 1 && Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy)) {
          if (dx < 0) {
            onSelectIndex(activeIndex === images.length - 1 ? 0 : activeIndex + 1)
          } else {
            onSelectIndex(activeIndex === 0 ? images.length - 1 : activeIndex - 1)
          }
        }
        setDismissOffsetY(0)
      }
      dragStartRef.current = null
      setIsDragging(false)
    }
  }

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault()
    const delta = -e.deltaY * 0.0025
    zoomToPoint(scale + delta, e.clientX, e.clientY)
  }

  if (!isOpen || !mounted || images.length === 0) return null

  const currentSrc = images[activeIndex] || images[0]
  const dismissOpacity = clamp(1 - dismissOffsetY / 320, 0.35, 1)

  return createPortal(
    <div
      className="product-lightbox"
      style={{ opacity: dismissOpacity }}
      role="dialog"
      aria-modal="true"
      aria-label={`Product image viewer: ${title}`}
    >
      {/* Top Studio Bar */}
      <header className="product-lightbox__header">
        <div className="product-lightbox__title-wrap">
          <span className="product-lightbox__title">{title}</span>
          {images.length > 1 && (
            <span className="product-lightbox__counter">
              {activeIndex + 1} / {images.length}
            </span>
          )}
        </div>

        <button
          type="button"
          className="product-lightbox__close-btn"
          onClick={onClose}
          aria-label="Close image viewer"
        >
          <X size={20} strokeWidth={2.2} />
        </button>
      </header>

      {/* Interactive Zoom / Pan Stage */}
      <div
        ref={stageRef}
        className={`product-lightbox__stage ${
          scale > 1.02 ? 'product-lightbox__stage--zoomed' : ''
        } ${isDragging ? 'product-lightbox__stage--dragging' : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
      >
        {images.length > 1 && scale <= 1.02 && (
          <button
            type="button"
            className="product-lightbox__nav-btn product-lightbox__nav-btn--prev"
            onClick={(e) => {
              e.stopPropagation()
              onSelectIndex(activeIndex === 0 ? images.length - 1 : activeIndex - 1)
            }}
            aria-label="Previous image"
          >
            <ChevronLeft size={22} />
          </button>
        )}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={currentSrc}
          alt={title}
          draggable={false}
          className={`product-lightbox__img ${
            isDragging ? 'product-lightbox__img--dragging' : ''
          }`}
          style={{
            transform: `translate3d(${tx}px, ${ty + dismissOffsetY}px, 0) scale(${scale})`,
          }}
        />

        {images.length > 1 && scale <= 1.02 && (
          <button
            type="button"
            className="product-lightbox__nav-btn product-lightbox__nav-btn--next"
            onClick={(e) => {
              e.stopPropagation()
              onSelectIndex(activeIndex === images.length - 1 ? 0 : activeIndex + 1)
            }}
            aria-label="Next image"
          >
            <ChevronRight size={22} />
          </button>
        )}
      </div>

      {/* Bottom Controls & Thumbnails */}
      <footer className="product-lightbox__footer">
        {images.length > 1 && (
          <div className="product-lightbox__thumbs">
            {images.map((src, idx) => (
              <button
                key={`${src}-${idx}`}
                type="button"
                className={`product-lightbox__thumb ${
                  idx === activeIndex ? 'product-lightbox__thumb--active' : ''
                }`}
                onClick={() => onSelectIndex(idx)}
                aria-label={`View image ${idx + 1}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" />
              </button>
            ))}
          </div>
        )}

        <div className="product-lightbox__controls">
          <button
            type="button"
            className="product-lightbox__ctrl-btn"
            onClick={() => zoomToPoint(scale - 0.6)}
            disabled={scale <= MIN_SCALE}
            aria-label="Zoom out"
          >
            <ZoomOut size={16} />
          </button>

          <button
            type="button"
            className="product-lightbox__zoom-readout"
            onClick={resetTransform}
            title="Reset zoom"
          >
            {Math.round(scale * 100)}%
          </button>

          <button
            type="button"
            className="product-lightbox__ctrl-btn"
            onClick={() => zoomToPoint(scale + 0.6)}
            disabled={scale >= MAX_SCALE}
            aria-label="Zoom in"
          >
            <ZoomIn size={16} />
          </button>

          {scale > 1.02 && (
            <button
              type="button"
              className="product-lightbox__ctrl-btn"
              onClick={resetTransform}
              aria-label="Reset zoom"
              title="Reset"
            >
              <RotateCcw size={15} />
            </button>
          )}
        </div>

        <p className="product-lightbox__hint">
          {scale > 1.02
            ? 'Drag to pan • Double-tap to reset'
            : 'Pinch or double-tap to zoom • Swipe down to close'}
        </p>
      </footer>
    </div>,
    document.body,
  )
}
