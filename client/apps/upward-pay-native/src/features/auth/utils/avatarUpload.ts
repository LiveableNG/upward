import { getAvatarUploadUrl, updateProfile } from '@/features/auth/services/authService'

export async function uploadProfilePhotoFromUri(
  uri: string,
  contentType: string,
  filename: string,
): Promise<string> {
  const { uploadUrl, publicUrl } = await getAvatarUploadUrl(contentType, filename)
  const fileResponse = await fetch(uri)
  const blob = await fileResponse.blob()
  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: blob,
  })
  if (!uploadResponse.ok) {
    throw new Error('Could not upload photo. Please try again.')
  }
  await updateProfile({ profilePic: publicUrl })
  return publicUrl
}
