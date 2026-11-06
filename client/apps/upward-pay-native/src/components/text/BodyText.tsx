import { AppText, type AppTextProps } from '@/components/text/AppText'

/** 15px regular. Default reading text. */
export function BodyText(props: AppTextProps) {
  return <AppText textRole="body" {...props} />
}
