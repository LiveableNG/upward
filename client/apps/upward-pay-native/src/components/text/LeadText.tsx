import { AppText, type AppTextProps } from '@/components/text/AppText'

/** 16px semibold. Primary pay actions and emphasized lines. */
export function LeadText(props: AppTextProps) {
  return <AppText textRole="lead" {...props} />
}
