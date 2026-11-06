export const HEAR_ABOUT_US_OPTIONS = [
  { id: 'social_media', label: 'Social Media (X, Instagram, TikTok, LinkedIn)' },
  { id: 'friend_colleague', label: 'Friend or Colleague' },
  { id: 'google_search', label: 'Search Engine (Google, Bing)' },
  { id: 'campus_event', label: 'Campus / University Event' },
  { id: 'article_blog', label: 'Article, Blog, or Podcast' },
  { id: 'online_ad', label: 'Online Advertisement' },
  { id: 'other', label: 'Other' },
] as const

export type HearAboutUsId = (typeof HEAR_ABOUT_US_OPTIONS)[number]['id']
