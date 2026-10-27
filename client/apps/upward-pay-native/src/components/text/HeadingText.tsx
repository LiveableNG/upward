import { AppText, type AppTextProps } from '@/components/text/AppText'

/** 20px bold. Section headings. */
export function HeadingText(props: AppTextProps) {
  return <AppText textRole="heading" {...props} />
}
