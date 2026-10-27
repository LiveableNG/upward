import { AppText, type AppTextProps } from '@/components/text/AppText'

/** 28px extrabold. Screen titles. */
export function TitleText(props: AppTextProps) {
  return <AppText textRole="title" {...props} />
}
