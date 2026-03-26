export interface FairnessStory {
  id: string
  name?: string
  categories: string[]
  story: string
  audioUrl?: string
  fileUrls: string[]
  createdAt: Date | string
  updatedAt: Date | string
}

export interface CreateFairnessStoryDto {
  name?: string
  categories: string[]
  story: string
  audioUrl?: string
  fileUrls?: string[]
}
