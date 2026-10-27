import { useWindowDimensions } from 'react-native'

/** Compact phones called out in the migration spec (iPhone SE, Tecno, Infinix, itel). */
export const COMPACT_WIDTH = 375

/** Matches `--shell-max-w` in upward-pay. Phone layouts stay in this column on wider screens. */
export const SHELL_MAX_WIDTH = 480
const NARROW_WIDTH = 320

export function getTypeScale(width: number): number {
  if (width <= NARROW_WIDTH) return 0.88
  if (width <= 360) return 0.92
  if (width <= COMPACT_WIDTH) return 0.96
  if (width >= 430) return 1.02
  return 1
}

export function scaleFontSize(size: number, width: number): number {
  let factor = getTypeScale(width)
  if (size >= 28 && width <= COMPACT_WIDTH) factor *= 0.92
  const scaled = Math.round(size * factor)
  const floor = size >= 20 ? 16 : size >= 14 ? 13 : 11
  return Math.max(scaled, Math.min(size, floor))
}

export function getScreenPadding(width: number): number {
  if (width <= COMPACT_WIDTH) return 16
  return Math.min(24, Math.max(16, Math.round(width * 0.05)))
}

/** Card padding scales from 18 to 12 on compact viewports. */
export function getCardPadding(width: number): number {
  return width <= COMPACT_WIDTH ? 12 : 18
}

export function useResponsive() {
  const { width, height } = useWindowDimensions()

  return {
    width,
    height,
    isCompact: width <= COMPACT_WIDTH,
    stackActions: width <= COMPACT_WIDTH,
    typeScale: getTypeScale(width),
    screenPadding: getScreenPadding(width),
    cardPadding: getCardPadding(width),
    scaleFont: (size: number) => scaleFontSize(size, width),
  }
}
