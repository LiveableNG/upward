export type FontWeight = 'regular' | 'medium' | 'semibold' | 'bold' | 'extrabold'

export type TextRole =
  | 'display'
  | 'title'
  | 'heading'
  | 'subheading'
  | 'lead'
  | 'body'
  | 'label'
  | 'caption'
  | 'eyebrow'
  | 'mono'

export type TextRoleStyle = {
  fontSize: number
  lineHeight: number
  weight: FontWeight
  letterSpacing: number
  uppercase?: boolean
}

/**
 * Sizes follow the upward-pay type scale and the sizes already used in product CSS:
 * display 64, title 28 / extrabold, heading 20, subheading 18, lead 16,
 * body 15, label 13, caption 12, eyebrow 11.
 */
export const textRoles: Record<TextRole, TextRoleStyle> = {
  display: { fontSize: 64, lineHeight: 72, weight: 'extrabold', letterSpacing: -1.2 },
  title: { fontSize: 28, lineHeight: 32, weight: 'extrabold', letterSpacing: -0.56 },
  heading: { fontSize: 20, lineHeight: 26, weight: 'bold', letterSpacing: -0.3 },
  subheading: { fontSize: 18, lineHeight: 24, weight: 'bold', letterSpacing: -0.2 },
  lead: { fontSize: 16, lineHeight: 22, weight: 'semibold', letterSpacing: 0.16 },
  body: { fontSize: 15, lineHeight: 23, weight: 'regular', letterSpacing: 0 },
  label: { fontSize: 13, lineHeight: 18, weight: 'medium', letterSpacing: 0 },
  caption: { fontSize: 12, lineHeight: 16, weight: 'medium', letterSpacing: 0 },
  eyebrow: {
    fontSize: 11,
    lineHeight: 14,
    weight: 'bold',
    letterSpacing: 0.6,
    uppercase: true,
  },
  mono: { fontSize: 16, lineHeight: 22, weight: 'bold', letterSpacing: 0 },
}
