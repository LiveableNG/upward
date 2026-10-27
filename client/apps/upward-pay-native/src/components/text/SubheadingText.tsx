import { AppText, type AppTextProps } from '@/components/text/AppText'

/** 18px bold. Subsection headings. */
export function SubheadingText(props: AppTextProps) {
  return <AppText textRole="subheading" {...props} />
}
