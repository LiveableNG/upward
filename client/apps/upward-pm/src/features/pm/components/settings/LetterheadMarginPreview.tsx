'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'

type MarginBox = {
  top: number
  bottom: number
  left: number
  right: number
}

const MIN_INNER_PT = 56
const HANDLE_HIT = 14

type DragKind = 'none' | 'top' | 'bottom' | 'left' | 'right' | 'tl' | 'tr' | 'bl' | 'br'

type Props = {
  imageSrc: string
  pageWidthPt: number
  pageHeightPt: number
  previewScale: number
  margins: MarginBox
  onChange: (next: MarginBox) => void
  caption: string
  helperText?: string
}

function parseM(m: MarginBox): MarginBox {
  return {
    top: Math.max(0, Number(m.top) || 0),
    bottom: Math.max(0, Number(m.bottom) || 0),
    left: Math.max(0, Number(m.left) || 0),
    right: Math.max(0, Number(m.right) || 0),
  }
}

function clampMargins(raw: MarginBox, pw: number, ph: number): MarginBox {
  let { top, bottom, left, right } = raw
  top = Math.max(0, top)
  bottom = Math.max(0, bottom)
  left = Math.max(0, left)
  right = Math.max(0, right)

  if (top + bottom > ph - MIN_INNER_PT) {
    const maxTotal = ph - MIN_INNER_PT
    const sum = top + bottom
    if (sum > 0) {
      top = (top * maxTotal) / sum
      bottom = (bottom * maxTotal) / sum
    } else {
      top = maxTotal / 2
      bottom = maxTotal / 2
    }
  }

  if (left + right > pw - MIN_INNER_PT) {
    const maxTotal = pw - MIN_INNER_PT
    const sum = left + right
    if (sum > 0) {
      left = (left * maxTotal) / sum
      right = (right * maxTotal) / sum
    } else {
      left = maxTotal / 2
      right = maxTotal / 2
    }
  }

  return {
    top: Math.round(Math.max(0, top)),
    bottom: Math.round(Math.max(0, bottom)),
    left: Math.round(Math.max(0, left)),
    right: Math.round(Math.max(0, right)),
  }
}

function dispDeltaToPdfPt(deltaDisp: number, naturalSize: number, dispSize: number, previewScale: number): number {
  if (dispSize <= 0 || previewScale <= 0) {
    return 0
  }
  return (deltaDisp * naturalSize) / (previewScale * dispSize)
}

export function LetterheadMarginPreview({
  imageSrc,
  pageWidthPt,
  pageHeightPt,
  previewScale,
  margins,
  onChange,
  caption,
  helperText,
}: Props) {
  const imgRef = useRef<HTMLImageElement>(null)
  const [nat, setNat] = useState({ w: 0, h: 0 })
  const [disp, setDisp] = useState({ w: 0, h: 0 })

  const dragKind = useRef<DragKind>('none')
  const startMargins = useRef(parseM(margins))
  const startClient = useRef({ x: 0, y: 0 })

  const measure = useCallback(() => {
    const el = imgRef.current
    if (!el) return
    setNat({ w: el.naturalWidth, h: el.naturalHeight })
    setDisp({ w: el.clientWidth, h: el.clientHeight })
  }, [])

  useEffect(() => {
    const el = imgRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => measure())
    ro.observe(el)
    return () => ro.disconnect()
  }, [measure, imageSrc])

  const endDrag = useCallback(() => {
    dragKind.current = 'none'
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', endDrag)
    window.removeEventListener('pointercancel', endDrag)
  }, [])

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      if (dragKind.current === 'none') return
      const dx = e.clientX - startClient.current.x
      const dy = e.clientY - startClient.current.y
      startClient.current = { x: e.clientX, y: e.clientY }

      const m = startMargins.current
      const dxt = dispDeltaToPdfPt(dx, nat.w, disp.w, previewScale)
      const dyt = dispDeltaToPdfPt(dy, nat.h, disp.h, previewScale)
      let next = { ...m }

      const k = dragKind.current
      if (k === 'left' || k === 'tl' || k === 'bl') {
        next.left = m.left + dxt
      }
      if (k === 'right' || k === 'tr' || k === 'br') {
        next.right = m.right - dxt
      }
      if (k === 'top' || k === 'tl' || k === 'tr') {
        next.top = m.top + dyt
      }
      if (k === 'bottom' || k === 'bl' || k === 'br') {
        next.bottom = m.bottom - dyt
      }

      const boxed = clampMargins(next, pageWidthPt, pageHeightPt)
      startMargins.current = parseM(boxed)
      onChange(boxed)
    },
    [disp.h, disp.w, nat.h, nat.w, onChange, pageHeightPt, pageWidthPt, previewScale]
  )

  const beginDrag = (e: React.PointerEvent, kind: DragKind) => {
    e.preventDefault()
    e.stopPropagation()
    dragKind.current = kind
    startMargins.current = parseM(margins)
    startClient.current = { x: e.clientX, y: e.clientY }
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', endDrag)
    window.addEventListener('pointercancel', endDrag)
  }

  useEffect(() => {
    return endDrag
  }, [endDrag])

  const m = parseM(margins)
  const sW = disp.w > 0 && nat.w > 0 ? disp.w / nat.w : 1
  const sH = disp.h > 0 && nat.h > 0 ? disp.h / nat.h : 1

  const topD = m.top * previewScale * sH
  const bottomD = m.bottom * previewScale * sH
  const leftD = m.left * previewScale * sW
  const rightD = m.right * previewScale * sW
  const innerW = Math.max(0, disp.w - leftD - rightD)
  const innerH = Math.max(0, disp.h - topD - bottomD)

  return (
    <div>
      <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{caption}</p>
      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.4 }}>
        {helperText ??
          'Drag the dashed box or handles to set the safe print margins. Values stay synchronized in real time.'}
      </p>
      <div 
        style={{ 
          position: 'relative', 
          display: 'inline-block', 
          maxWidth: '100%', 
          borderRadius: 12, 
          border: '1px solid var(--border)', 
          background: 'var(--bg)', 
          overflow: 'hidden', 
          touchAction: 'none' 
        }}
      >
        <img
          ref={imgRef}
          src={imageSrc}
          alt=""
          draggable={false}
          style={{ display: 'block', maxWidth: '100%', height: 'auto', userSelect: 'none' }}
          onLoad={measure}
        />
        {nat.w > 0 && disp.w > 0 && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 10 }} aria-hidden>
            {/* Darken area outside margins */}
            <div
              style={{
                position: 'absolute',
                left: leftD,
                top: topD,
                width: innerW,
                height: innerH,
                border: '2px dashed var(--brand, #3b82f6)',
                pointerEvents: 'none',
                boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.4)',
              }}
            />
            {/* Draggable container box */}
            <button
              type="button"
              title="Drag to reposition safe area"
              style={{ 
                position: 'absolute', 
                zIndex: 5, 
                cursor: 'move', 
                background: 'rgba(59, 130, 246, 0.05)', 
                border: 'none',
                left: leftD, 
                top: topD, 
                width: innerW, 
                height: innerH 
              }}
              onPointerDown={(e) => {
                e.preventDefault()
                dragKind.current = 'none'
                const origin = parseM(margins)
                const start = { x: e.clientX, y: e.clientY }
                const move = (ev: PointerEvent) => {
                  const dx = ev.clientX - start.x
                  const dy = ev.clientY - start.y
                  const dxt = dispDeltaToPdfPt(dx, nat.w, disp.w, previewScale)
                  const dyt = dispDeltaToPdfPt(dy, nat.h, disp.h, previewScale)
                  const next = {
                    top: origin.top + dyt,
                    bottom: origin.bottom - dyt,
                    left: origin.left + dxt,
                    right: origin.right - dxt,
                  }
                  const c = clampMargins(next, pageWidthPt, pageHeightPt)
                  onChange(c)
                }
                const up = () => {
                  window.removeEventListener('pointermove', move)
                  window.removeEventListener('pointerup', up)
                  window.removeEventListener('pointercancel', up)
                }
                window.addEventListener('pointermove', move)
                window.addEventListener('pointerup', up)
                window.addEventListener('pointercancel', up)
              }}
            />
            {/* Sizing Edges */}
            <button
              type="button"
              style={{ position: 'absolute', zIndex: 20, cursor: 'ns-resize', background: 'transparent', left: leftD, top: topD - HANDLE_HIT / 2, width: innerW, height: HANDLE_HIT, border: 'none' }}
              onPointerDown={(e) => beginDrag(e, 'top')}
            />
            <button
              type="button"
              style={{ position: 'absolute', zIndex: 20, cursor: 'ns-resize', background: 'transparent', left: leftD, top: topD + innerH - HANDLE_HIT / 2, width: innerW, height: HANDLE_HIT, border: 'none' }}
              onPointerDown={(e) => beginDrag(e, 'bottom')}
            />
            <button
              type="button"
              style={{ position: 'absolute', zIndex: 20, cursor: 'ew-resize', background: 'transparent', left: leftD - HANDLE_HIT / 2, top: topD, width: HANDLE_HIT, height: innerH, border: 'none' }}
              onPointerDown={(e) => beginDrag(e, 'left')}
            />
            <button
              type="button"
              style={{ position: 'absolute', zIndex: 20, cursor: 'ew-resize', background: 'transparent', left: leftD + innerW - HANDLE_HIT / 2, top: topD, width: HANDLE_HIT, height: innerH, border: 'none' }}
              onPointerDown={(e) => beginDrag(e, 'right')}
            />
            {/* Handles corners */}
            <button
              type="button"
              style={{ position: 'absolute', zIndex: 30, height: 12, width: 12, transform: 'translate(-50%, -50%)', cursor: 'nwse-resize', borderRadius: '50%', border: '2px solid white', backgroundColor: 'var(--brand, #3b82f6)', left: leftD, top: topD }}
              onPointerDown={(e) => beginDrag(e, 'tl')}
            />
            <button
              type="button"
              style={{ position: 'absolute', zIndex: 30, height: 12, width: 12, transform: 'translate(50%, -50%)', cursor: 'nesw-resize', borderRadius: '50%', border: '2px solid white', backgroundColor: 'var(--brand, #3b82f6)', left: leftD + innerW, top: topD }}
              onPointerDown={(e) => beginDrag(e, 'tr')}
            />
            <button
              type="button"
              style={{ position: 'absolute', zIndex: 30, height: 12, width: 12, transform: 'translate(-50%, 50%)', cursor: 'nesw-resize', borderRadius: '50%', border: '2px solid white', backgroundColor: 'var(--brand, #3b82f6)', left: leftD, top: topD + innerH }}
              onPointerDown={(e) => beginDrag(e, 'bl')}
            />
            <button
              type="button"
              style={{ position: 'absolute', zIndex: 30, height: 12, width: 12, transform: 'translate(50%, 50%)', cursor: 'nwse-resize', borderRadius: '50%', border: '2px solid white', backgroundColor: 'var(--brand, #3b82f6)', left: leftD + innerW, top: topD + innerH }}
              onPointerDown={(e) => beginDrag(e, 'br')}
            />
          </div>
        )}
      </div>
    </div>
  )
}
