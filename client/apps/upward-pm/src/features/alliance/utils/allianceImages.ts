export const ALLIANCE_REAL_ESTATE_PLACEHOLDERS = [
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1556912172-45b7abe8b7e1?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
];

export function getDeterministicPlaceholderImage(seedStr?: string | number | null): string {
  if (!seedStr) return ALLIANCE_REAL_ESTATE_PLACEHOLDERS[0];
  const str = String(seedStr);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % ALLIANCE_REAL_ESTATE_PLACEHOLDERS.length;
  return ALLIANCE_REAL_ESTATE_PLACEHOLDERS[index];
}

export function getAllianceListingImage(listing?: {
  uuid?: string;
  id?: number;
  primaryMedia?: { publicUrl?: string; fileUrl?: string } | null;
  media?: Array<{ publicUrl?: string; fileUrl?: string }>;
} | null): string {
  if (!listing) return ALLIANCE_REAL_ESTATE_PLACEHOLDERS[0];
  const directUrl =
    listing.primaryMedia?.publicUrl ||
    listing.primaryMedia?.fileUrl ||
    (listing.media && listing.media.length > 0
      ? listing.media[0].publicUrl || listing.media[0].fileUrl
      : null);

  if (
    directUrl &&
    typeof directUrl === 'string' &&
    (directUrl.startsWith('http://') || directUrl.startsWith('https://')) &&
    !directUrl.includes('mock/listings')
  ) {
    return directUrl;
  }
  return getDeterministicPlaceholderImage(listing.uuid || listing.id);
}

export function getAllianceListingMediaList(listing?: {
  uuid?: string;
  id?: number;
  media?: Array<{ uuid?: string; publicUrl?: string; fileUrl?: string; mimeType?: string; sortOrder?: number }>;
  primaryMedia?: { uuid?: string; publicUrl?: string; fileUrl?: string; mimeType?: string; sortOrder?: number } | null;
} | null): Array<{ uuid: string; publicUrl: string; mimeType: string; sortOrder: number }> {
  const seed = listing?.uuid || String(listing?.id || 'upward');

  if (listing?.media && listing.media.length > 0) {
    return listing.media.map((m, idx) => {
      const url = m.publicUrl || m.fileUrl || '';
      const isValid =
        url &&
        (url.startsWith('http://') || url.startsWith('https://')) &&
        !url.includes('mock/listings');

      return {
        uuid: m.uuid || `media-${idx}`,
        publicUrl: isValid ? url : getDeterministicPlaceholderImage(`${seed}-${idx + 1}`),
        mimeType: m.mimeType || 'image/jpeg',
        sortOrder: m.sortOrder ?? idx,
      };
    });
  }

  const primary = getDeterministicPlaceholderImage(seed);
  const secondary = getDeterministicPlaceholderImage(`${seed}-2`);
  const tertiary = getDeterministicPlaceholderImage(`${seed}-3`);

  return [
    { uuid: `${seed}-ph-1`, publicUrl: primary, mimeType: 'image/jpeg', sortOrder: 0 },
    { uuid: `${seed}-ph-2`, publicUrl: secondary, mimeType: 'image/jpeg', sortOrder: 1 },
    { uuid: `${seed}-ph-3`, publicUrl: tertiary, mimeType: 'image/jpeg', sortOrder: 2 },
  ];
}
