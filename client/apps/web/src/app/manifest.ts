import { type MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Upward by GoodTenants',
    short_name: 'Upward',
    description: 'Track rent payments, build your Rent Passport, and unlock home financing.',
    start_url: '/',
    display: 'standalone',
    background_color: '#000B1D',
    theme_color: '#D97757',
    icons: [
      {
        src: '/favicon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  }
}
