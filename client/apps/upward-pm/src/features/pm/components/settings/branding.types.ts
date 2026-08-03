export type MarginBox = {
  top: number
  bottom: number
  left: number
  right: number
}

export type LetterheadTemplateConfig = {
  first_page?: MarginBox
  continuation_page?: MarginBox
  reuse_first_page_for_continuation?: boolean
}

export type SavedPmLetterhead = {
  id: number
  uuid: string
  isDefault: boolean
  pageCount: number
  templateFileKey: string | null
  previewFirstPageKey: string | null
  previewContinuationPageKey: string | null
  templateConfig?: LetterheadTemplateConfig | null
  createdAt: string
  previewFirstPageUrl?: string | null
  previewContinuationPageUrl?: string | null
}

export type SignatureConfig = {
  id: number
  name: string
  type: 'pad' | 'upload' | 'digital'
  isDefault: boolean
  content?: string
  fileUrl?: string
}
